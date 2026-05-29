import mongoose from 'mongoose';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { ReadingProgress } from '../models/ReadingProgress';
import { Article } from '../models/Article';
import { cache, cacheKeys } from '../utils/redis';
import { getRedis } from '../config/database';
import { paginate } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

const sanitizeUser = (user: any) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

const isBlocked = async (userId: string, targetId: string): Promise<boolean> => {
  const blocked = await getRedis().sismember(cacheKeys.blockedUsers(userId), targetId);
  return blocked === 1;
};

export const userService = {
  async getMe(userId: string) {
    const cached = await cache.get(cacheKeys.userInfo(userId));
    if (cached) return cached;

    const user = await User.findById(userId);
    if (!user || user.status === 'deleted') {
      throw new AppError(20002, '用户不存在', 404);
    }

    const data = sanitizeUser(user);
    await cache.set(cacheKeys.userInfo(userId), data, 3600);
    return data;
  },

  async updateProfile(userId: string, data: Record<string, any>) {
    const allowed = ['nickname', 'bio', 'gender', 'birthday', 'region', 'settings'];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key];
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    await cache.del(cacheKeys.userInfo(userId));
    return sanitizeUser(user);
  },

  async updateAvatar(userId: string, avatar: string) {
    if (!avatar) {
      throw new AppError(10004, '头像地址不能为空', 400);
    }

    const user = await User.findByIdAndUpdate(userId, { avatar }, { new: true });
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    await cache.del(cacheKeys.userInfo(userId));
    return { avatar: user.avatar };
  },

  async updateInterests(userId: string, interests: string[]) {
    const user = await User.findByIdAndUpdate(
      userId,
      { interests: interests.slice(0, 20) },
      { new: true },
    );
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    await cache.del(cacheKeys.userInfo(userId));
    return { interests: user.interests };
  },

  async getUserById(id: string, currentUserId?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(10004, '无效的用户ID', 400);
    }

    const user = await User.findById(id).select('-password');
    if (!user || user.status === 'deleted') {
      throw new AppError(20002, '用户不存在', 404);
    }

    const result: any = sanitizeUser(user);
    result.isFollowing = false;
    result.isBlocked = false;

    if (currentUserId && currentUserId !== id) {
      const follow = await Follow.findOne({ followerId: currentUserId, followingId: id });
      result.isFollowing = !!follow;
      result.isBlocked = await isBlocked(currentUserId, id);
    }

    return result;
  },

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new AppError(30001, '不能关注自己', 400);
    }

    const target = await User.findById(followingId);
    if (!target || target.status === 'deleted') {
      throw new AppError(20002, '用户不存在', 404);
    }

    if (await isBlocked(followerId, followingId) || await isBlocked(followingId, followerId)) {
      throw new AppError(30002, '无法关注该用户', 403);
    }

    const existing = await Follow.findOne({ followerId, followingId });
    if (existing) {
      return { isFollowing: true };
    }

    await Follow.create({ followerId, followingId });
    await Promise.all([
      User.findByIdAndUpdate(followerId, { $inc: { 'stats.following': 1 } }),
      User.findByIdAndUpdate(followingId, { $inc: { 'stats.followers': 1 } }),
    ]);

    return { isFollowing: true };
  },

  async unfollow(followerId: string, followingId: string) {
    const result = await Follow.findOneAndDelete({ followerId, followingId });
    if (result) {
      await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { 'stats.following': -1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { 'stats.followers': -1 } }),
      ]);
    }
    return { isFollowing: false };
  },

  async getFollowers(userId: string, page: number, pageSize: number) {
    const { list, total, page: p, pageSize: ps } = await paginate(
      Follow,
      { followingId: userId },
      { page, pageSize, populate: [{ path: 'followerId', select: 'nickname avatar bio stats' }] },
    );

    const users = list.map((item: any) => ({
      ...sanitizeUser(item.followerId),
      followedAt: item.createdAt,
    }));

    return { list: users, total, page: p, pageSize: ps };
  },

  async getFollowing(userId: string, page: number, pageSize: number) {
    const { list, total, page: p, pageSize: ps } = await paginate(
      Follow,
      { followerId: userId },
      { page, pageSize, populate: [{ path: 'followingId', select: 'nickname avatar bio stats' }] },
    );

    const users = list.map((item: any) => ({
      ...sanitizeUser(item.followingId),
      followedAt: item.createdAt,
    }));

    return { list: users, total, page: p, pageSize: ps };
  },

  async getReadingStats(userId: string) {
    const [progressAgg, articleCount] = await Promise.all([
      ReadingProgress.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalReadDuration: { $sum: '$readDuration' },
            totalArticles: { $sum: 1 },
            avgProgress: { $avg: '$progress' },
          },
        },
      ]),
      ReadingProgress.countDocuments({ userId, progress: { $gte: 100 } }),
    ]);

    const stats = progressAgg[0] || {
      totalReadDuration: 0,
      totalArticles: 0,
      avgProgress: 0,
    };

    return {
      totalReadDuration: stats.totalReadDuration,
      totalArticles: stats.totalArticles,
      finishedArticles: articleCount,
      avgProgress: Math.round(stats.avgProgress || 0),
    };
  },

  async getActivities(userId: string, page: number, pageSize: number) {
    const { list, total, page: p, pageSize: ps } = await paginate(
      ReadingProgress,
      { userId },
      {
        page,
        pageSize,
        sort: { lastReadAt: -1 },
        populate: [{
          path: 'articleId',
          select: 'title cover summary author stats',
          populate: { path: 'author', select: 'nickname avatar' },
        }],
      },
    );

    const activities = list.map((item: any) => ({
      type: 'reading',
      progress: item.progress,
      readDuration: item.readDuration,
      lastReadAt: item.lastReadAt,
      article: item.articleId,
    }));

    return { list: activities, total, page: p, pageSize: ps };
  },

  async getRecommended(userId: string, limit: number) {
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      throw new AppError(20002, '用户不存在', 404);
    }

    const following = await Follow.find({ followerId: userId }).select('followingId');
    const followingIds = following.map((f) => f.followingId);
    followingIds.push(new mongoose.Types.ObjectId(userId));

    const blockedIds = await getRedis().smembers(cacheKeys.blockedUsers(userId));
    const excludeIds = [...followingIds, ...blockedIds.map((id) => new mongoose.Types.ObjectId(id))];

    const filter: any = {
      _id: { $nin: excludeIds },
      status: 'active',
    };

    if (currentUser.interests?.length) {
      filter.interests = { $in: currentUser.interests };
    }

    const users = await User.find(filter)
      .select('nickname avatar bio stats interests')
      .sort({ 'stats.followers': -1 })
      .limit(limit)
      .lean();

    return users;
  },

  async blockUser(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new AppError(30003, '不能拉黑自己', 400);
    }

    const target = await User.findById(targetId);
    if (!target || target.status === 'deleted') {
      throw new AppError(20002, '用户不存在', 404);
    }

    await getRedis().sadd(cacheKeys.blockedUsers(userId), targetId);
    await this.unfollow(userId, targetId);
    await this.unfollow(targetId, userId);

    return { blocked: true };
  },

  async unblockUser(userId: string, targetId: string) {
    await getRedis().srem(cacheKeys.blockedUsers(userId), targetId);
    return { blocked: false };
  },

  async getBlockedUsers(userId: string) {
    const blockedIds = await getRedis().smembers(cacheKeys.blockedUsers(userId));
    if (!blockedIds.length) return [];

    const users = await User.find({ _id: { $in: blockedIds } })
      .select('nickname avatar bio')
      .lean();

    return users;
  },

  async deleteAccount(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    user.status = 'deleted';
    user.phone = `deleted_${userId}_${Date.now()}`;
    await user.save();

    await Promise.all([
      cache.del(cacheKeys.userInfo(userId)),
      cache.del(cacheKeys.refreshToken(userId)),
      Follow.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] }),
      Article.updateMany({ author: userId }, { status: 'deleted' }),
    ]);
  },
};
