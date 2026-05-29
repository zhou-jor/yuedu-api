import { getRedis } from '../config/database';

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await getRedis().get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await getRedis().setex(key, ttlSeconds, data);
    } else {
      await getRedis().set(key, data);
    }
  },

  async del(key: string): Promise<void> {
    await getRedis().del(key);
  },

  async incr(key: string): Promise<number> {
    return getRedis().incr(key);
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await getRedis().expire(key, ttlSeconds);
  },
};

// Cache key generators
export const cacheKeys = {
  userInfo: (userId: string) => `user:${userId}`,
  verifyCode: (phone: string) => `sms:code:${phone}`,
  verifyCodeThrottle: (phone: string) => `sms:throttle:${phone}`,
  articleDetail: (articleId: string) => `article:${articleId}`,
  clientConfig: () => 'config:client',
  banners: () => 'config:banners',
  categories: () => 'config:categories',
  interestTags: () => 'config:interest-tags',
  hotSearch: () => 'search:hot',
  trendingTopics: () => 'topics:trending',
  unreadCount: (userId: string) => `notify:unread:${userId}`,
  messageUnread: (userId: string) => `msg:unread:${userId}`,
  onlineStatus: (userId: string) => `online:${userId}`,
  refreshToken: (userId: string) => `token:refresh:${userId}`,
  blockedUsers: (userId: string) => `user:${userId}:blocked`,
  dislikedArticles: (userId: string) => `user:${userId}:disliked`,
};
