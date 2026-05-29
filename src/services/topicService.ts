import { Article } from '../models';
import { cache, cacheKeys } from '../utils/redis';

const TRENDING_TTL = 3600;
const TRENDING_LIMIT = 20;

async function aggregateTrendingTopics() {
  return Article.aggregate([
    { $match: { status: 'published', tags: { $exists: true, $ne: [] } } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', articleCount: { $sum: 1 } } },
    { $sort: { articleCount: -1 } },
    { $limit: TRENDING_LIMIT },
    { $project: { tag: '$_id', articleCount: 1, _id: 0 } },
  ]);
}

export const topicService = {
  async getTrending() {
    const cached = await cache.get<{ tag: string; articleCount: number }[]>(
      cacheKeys.trendingTopics(),
    );
    if (cached) return cached;

    const topics = await aggregateTrendingTopics();
    await cache.set(cacheKeys.trendingTopics(), topics, TRENDING_TTL);
    return topics;
  },

  async getSuggest(keyword: string, limit: number) {
    const trimmed = keyword?.trim();
    if (!trimmed) return [];

    const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = await Article.aggregate([
      { $match: { status: 'published', tags: { $regex: regex } } },
      { $unwind: '$tags' },
      { $match: { tags: { $regex: regex } } },
      { $group: { _id: '$tags', articleCount: { $sum: 1 } } },
      { $sort: { articleCount: -1 } },
      { $limit: limit },
      { $project: { tag: '$_id', articleCount: 1, _id: 0 } },
    ]);

    return results;
  },
};
