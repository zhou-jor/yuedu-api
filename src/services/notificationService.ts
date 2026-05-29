import { Types } from 'mongoose';
import { Notification } from '../models';
import { cache, cacheKeys } from '../utils/redis';
import { paginate } from '../utils/pagination';
import { emitToUser } from '../socket';
import { AppError } from '../middleware/errorHandler';

const UNREAD_CACHE_TTL = 300;

const TYPE_GROUPS: Record<string, string[]> = {
  interaction: ['like', 'comment'],
  follow: ['follow'],
  system: ['system', 'achievement'],
};

const expandTypeFilter = (type?: string): string[] | undefined => {
  if (!type) return undefined;
  return TYPE_GROUPS[type] || [type];
};

export interface CreateNotificationData {
  userId: string;
  fromUserId: string;
  type: 'like' | 'comment' | 'follow' | 'system' | 'achievement';
  targetType?: 'article' | 'comment';
  targetId?: string;
  content: string;
}

const invalidateUnreadCache = async (userId: string) => {
  await cache.del(cacheKeys.unreadCount(userId));
};

export const notificationService = {
  async getList(userId: string, type?: string, page = 1, pageSize = 20) {
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    const types = expandTypeFilter(type);
    if (types) {
      filter.type = types.length === 1 ? types[0] : { $in: types };
    }

    return paginate(Notification, filter, {
      page,
      pageSize,
      sort: { createdAt: -1 },
      populate: { path: 'fromUserId', select: 'nickname avatar' } as any,
    });
  },

  async readAll(userId: string, type?: string) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      isRead: false,
    };
    const types = expandTypeFilter(type);
    if (types) {
      filter.type = types.length === 1 ? types[0] : { $in: types };
    }

    await Notification.updateMany(filter, { $set: { isRead: true } });
    await invalidateUnreadCache(userId);
    return { success: true };
  },

  async readOne(userId: string, notificationId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: new Types.ObjectId(userId) },
      { $set: { isRead: true } },
      { new: true },
    );

    if (!notification) {
      throw new AppError(40401, '通知不存在', 404);
    }

    await invalidateUnreadCache(userId);
    return notification;
  },

  async getUnreadCount(userId: string) {
    const cacheKey = cacheKeys.unreadCount(userId);
    const cached = await cache.get<Record<string, number>>(cacheKey);
    if (cached) return cached;

    const results = await Notification.aggregate([
      { $match: { userId: new Types.ObjectId(userId), isRead: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const byType: Record<string, number> = {};
    let total = 0;
    for (const row of results) {
      byType[row._id] = row.count;
      total += row.count;
    }

    const grouped = {
      total,
      interaction: (byType.like || 0) + (byType.comment || 0),
      follow: byType.follow || 0,
      system: (byType.system || 0) + (byType.achievement || 0),
      byType,
    };

    await cache.set(cacheKey, grouped, UNREAD_CACHE_TTL);
    return grouped;
  },

  async createNotification(data: CreateNotificationData) {
    if (data.userId === data.fromUserId) {
      return null;
    }

    const notification = await Notification.create({
      userId: new Types.ObjectId(data.userId),
      fromUserId: new Types.ObjectId(data.fromUserId),
      type: data.type,
      targetType: data.targetType || null,
      targetId: data.targetId ? new Types.ObjectId(data.targetId) : null,
      content: data.content,
    });

    await invalidateUnreadCache(data.userId);

    emitToUser(data.userId, 'new_notification', {
      id: notification._id,
      type: notification.type,
      content: notification.content,
      fromUserId: data.fromUserId,
      targetType: notification.targetType,
      targetId: notification.targetId,
      createdAt: (notification as any).createdAt,
    });

    return notification;
  },
};
