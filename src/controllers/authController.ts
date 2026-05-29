import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success } from '../utils/response';
import { authService } from '../services/authService';

export const authController = {
  async sendCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await authService.sendCode(req.body.phone);
      return success(res, data, '验证码已发送');
    } catch (error) {
      next(error);
    }
  },

  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await authService.login(req.body.phone, req.body.code);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async loginThirdParty(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await authService.loginThirdParty(req.body.provider, req.body.code);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await authService.refreshToken(req.body.refreshToken);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.user!.userId);
      return success(res, null, '已退出登录');
    } catch (error) {
      next(error);
    }
  },

  async bindProvider(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await authService.bindProvider(
        req.user!.userId,
        req.params.provider as string,
        req.body.code,
      );
      return success(res, data, '绑定成功');
    } catch (error) {
      next(error);
    }
  },

  async unbindProvider(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await authService.unbindProvider(req.user!.userId, req.params.provider as string);
      return success(res, data, '解绑成功');
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await authService.changePassword(
        req.user!.userId,
        req.body.oldPassword,
        req.body.newPassword,
      );
      return success(res, null, '密码修改成功');
    } catch (error) {
      next(error);
    }
  },

  async changePhone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await authService.changePhone(
        req.user!.userId,
        req.body.newPhone,
        req.body.code,
      );
      return success(res, data, '手机号更换成功');
    } catch (error) {
      next(error);
    }
  },
};
