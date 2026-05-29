import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { cache, cacheKeys } from '../utils/redis';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

const CODE_TTL = 300;
const THROTTLE_TTL = 60;
const VALID_PROVIDERS = ['wechat', 'qq', 'apple', 'weibo'] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

const generateCode = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

const sanitizeUser = (user: any) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  return obj;
};

const issueTokenPair = async (userId: string) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);
  await cache.set(cacheKeys.refreshToken(userId), refreshToken, 30 * 24 * 3600);
  return { accessToken, refreshToken };
};

export const authService = {
  async sendCode(phone: string) {
    const throttleKey = cacheKeys.verifyCodeThrottle(phone);
    const throttled = await cache.get(throttleKey);
    if (throttled) {
      throw new AppError(20005, '验证码发送过于频繁，请稍后再试', 429);
    }

    const code = generateCode();
    await cache.set(cacheKeys.verifyCode(phone), code, CODE_TTL);
    await cache.set(throttleKey, '1', THROTTLE_TTL);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Auth] SMS code for ${phone}: ${code}`);
    }

    return { expiresIn: CODE_TTL };
  },

  async login(phone: string, code: string) {
    const cachedCode = await cache.get<string>(cacheKeys.verifyCode(phone));
    if (!cachedCode || cachedCode !== code) {
      throw new AppError(20001, '验证码错误或已过期', 400);
    }

    await cache.del(cacheKeys.verifyCode(phone));

    let user = await User.findOne({ phone, status: { $ne: 'deleted' } });
    if (!user) {
      user = await User.create({
        phone,
        nickname: `用户${phone.slice(-4)}`,
      });
    }

    if (user.status === 'banned') {
      throw new AppError(20006, '账号已被封禁', 403);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await issueTokenPair(user._id.toString());
    return { user: sanitizeUser(user), ...tokens };
  },

  async loginThirdParty(provider: string, code: string) {
    if (!VALID_PROVIDERS.includes(provider as Provider)) {
      throw new AppError(10004, '不支持的第三方登录方式', 400);
    }

    const openId = `mock_${provider}_${code}`;
    const field = `thirdParty.${provider}` as const;
    let user = await User.findOne({ [field]: openId, status: { $ne: 'deleted' } });

    if (!user) {
      user = await User.create({
        phone: `tp_${provider}_${openId.slice(-8)}_${Date.now()}`,
        nickname: `${provider}用户`,
        thirdParty: { [provider]: openId },
      });
    }

    if (user.status === 'banned') {
      throw new AppError(20006, '账号已被封禁', 403);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await issueTokenPair(user._id.toString());
    return { user: sanitizeUser(user), ...tokens };
  },

  async refreshToken(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(20004, 'Refresh Token 无效', 401);
    }

    const stored = await cache.get<string>(cacheKeys.refreshToken(payload.userId));
    if (!stored || stored !== refreshToken) {
      throw new AppError(20004, 'Refresh Token 无效', 401);
    }

    const user = await User.findById(payload.userId);
    if (!user || user.status === 'deleted') {
      throw new AppError(20002, '用户不存在', 404);
    }
    if (user.status === 'banned') {
      throw new AppError(20006, '账号已被封禁', 403);
    }

    const accessToken = generateAccessToken(payload.userId);
    return { accessToken };
  },

  async logout(userId: string) {
    await cache.del(cacheKeys.refreshToken(userId));
  },

  async bindProvider(userId: string, provider: string, code: string) {
    if (!VALID_PROVIDERS.includes(provider as Provider)) {
      throw new AppError(10004, '不支持的第三方平台', 400);
    }

    const openId = `mock_${provider}_${code}`;
    const field = `thirdParty.${provider}` as const;
    const existing = await User.findOne({ [field]: openId, _id: { $ne: userId } });
    if (existing) {
      throw new AppError(20008, '该第三方账号已被其他用户绑定', 409);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    user.thirdParty = user.thirdParty || {};
    (user.thirdParty as any)[provider] = openId;
    await user.save();
    await cache.del(cacheKeys.userInfo(userId));

    return { thirdParty: user.thirdParty };
  },

  async unbindProvider(userId: string, provider: string) {
    if (!VALID_PROVIDERS.includes(provider as Provider)) {
      throw new AppError(10004, '不支持的第三方平台', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    if (user.thirdParty && (user.thirdParty as any)[provider]) {
      (user.thirdParty as any)[provider] = undefined;
      await user.save();
      await cache.del(cacheKeys.userInfo(userId));
    }

    return { thirdParty: user.thirdParty };
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    if (user.password) {
      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) {
        throw new AppError(20009, '原密码错误', 400);
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await cache.del(cacheKeys.refreshToken(userId));
  },

  async changePhone(userId: string, newPhone: string, code: string) {
    const cachedCode = await cache.get<string>(cacheKeys.verifyCode(newPhone));
    if (!cachedCode || cachedCode !== code) {
      throw new AppError(20001, '验证码错误或已过期', 400);
    }

    const phoneTaken = await User.findOne({ phone: newPhone, _id: { $ne: userId } });
    if (phoneTaken) {
      throw new AppError(20010, '该手机号已被使用', 409);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    user.phone = newPhone;
    await user.save();
    await cache.del(cacheKeys.verifyCode(newPhone));
    await cache.del(cacheKeys.userInfo(userId));

    return { phone: newPhone };
  },
};
