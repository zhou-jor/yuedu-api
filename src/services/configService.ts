import { Config, Banner, Category } from '../models';
import { cache, cacheKeys } from '../utils/redis';

const CLIENT_CONFIG_TTL = 600; // 10 minutes
const BANNER_TTL = 600;

const DEFAULT_CLIENT_CONFIG = {
  features: {
    darkMode: true,
    checkin: true,
    share: true,
    audio: true,
  },
  texts: {
    appName: '悦读',
    slogan: '发现好内容，遇见同好',
  },
  params: {
    maxUploadSize: 5242880,
    defaultPageSize: 20,
  },
  emptyStates: {
    noArticles: '暂无文章，去发现页看看吧',
    noComments: '还没有评论，来抢沙发吧',
    noMessages: '暂无消息',
  },
  loadingTexts: {
    default: '加载中...',
    articles: '正在加载文章...',
  },
};

export const configService = {
  async getClientConfig() {
    const cached = await cache.get(cacheKeys.clientConfig());
    if (cached) return cached;

    const configs = await Config.find({ group: 'client' }).lean();
    const result: Record<string, unknown> = { ...DEFAULT_CLIENT_CONFIG };

    for (const item of configs) {
      if (['features', 'texts', 'params', 'emptyStates', 'loadingTexts'].includes(item.key)) {
        result[item.key] = item.value;
      }
    }

    await cache.set(cacheKeys.clientConfig(), result, CLIENT_CONFIG_TTL);
    return result;
  },

  async getBanners() {
    const cached = await cache.get(cacheKeys.banners());
    if (cached) return cached;

    const now = new Date();
    const banners = await Banner.find({
      status: 'active',
      $or: [
        { startAt: { $exists: false }, endAt: { $exists: false } },
        { startAt: { $lte: now }, endAt: { $gte: now } },
        { startAt: { $lte: now }, endAt: { $exists: false } },
        { startAt: { $exists: false }, endAt: { $gte: now } },
      ],
    })
      .sort({ sort: 1 })
      .select('title image link linkType sort')
      .lean();

    await cache.set(cacheKeys.banners(), banners, BANNER_TTL);
    return banners;
  },

  async getColumns() {
    const cached = await cache.get(cacheKeys.categories());
    if (cached) return cached;

    const columns = await Category.find({ status: 'active' })
      .sort({ sort: 1, articleCount: -1 })
      .limit(10)
      .select('name icon color articleCount sort')
      .lean();

    await cache.set(cacheKeys.categories(), columns, CLIENT_CONFIG_TTL);
    return columns;
  },

  async getInterestTags() {
    const cached = await cache.get(cacheKeys.interestTags());
    if (cached) return cached;

    const configDoc = await Config.findOne({ key: 'interest_tags' }).lean();
    if (configDoc?.value && Array.isArray(configDoc.value)) {
      await cache.set(cacheKeys.interestTags(), configDoc.value, CLIENT_CONFIG_TTL);
      return configDoc.value;
    }

    const categories = await Category.find({ status: 'active' })
      .sort({ sort: 1 })
      .select('name icon color')
      .lean();

    const tags = categories.map((c) => ({ name: c.name, icon: c.icon, color: c.color }));
    await cache.set(cacheKeys.interestTags(), tags, CLIENT_CONFIG_TTL);
    return tags;
  },
};
