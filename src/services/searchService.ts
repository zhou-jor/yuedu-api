import mongoose from 'mongoose';
import { Article, User, SearchHistory } from '../models';
import { cache, cacheKeys } from '../utils/redis';
import { paginate } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

const HOT_SEARCH_LIMIT = 20;
const HOT_SEARCH_TTL = 3600;

async function recordSearchHistory(userId: string, keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  await SearchHistory.findOneAndUpdate(
    { userId, keyword: trimmed },
    { userId, keyword: trimmed },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function aggregateHotSearch() {
  const results = await SearchHistory.aggregate([
    { $group: { _id: '$keyword', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: HOT_SEARCH_LIMIT },
    { $project: { keyword: '$_id', count: 1, _id: 0 } },
  ]);
  return results;
}

export const searchService = {
  async search(
    keyword: string,
    type: 'article' | 'user' | 'topic',
    page: number,
    pageSize: number,
    userId?: string,
  ) {
    const trimmed = keyword?.trim();
    if (!trimmed) {
      throw new AppError(10004, '搜索关键词不能为空', 400);
    }

    if (userId) {
      await recordSearchHistory(userId, trimmed);
    }

    if (type === 'article') {
      const result = await paginate(
        Article,
        {
          $text: { $search: trimmed },
          status: 'published',
        },
        {
          page,
          pageSize,
          sort: { score: { $meta: 'textScore' } as any, publishedAt: -1 },
          populate: [{ path: 'author', select: 'nickname avatar' }, { path: 'category', select: 'name' }],
          select: '-content',
        },
      );
      return result;
    }

    if (type === 'user') {
      const filter = {
        nickname: { $regex: trimmed, $options: 'i' },
        status: 'active',
      };
      const result = await paginate(User, filter, {
        page,
        pageSize,
        select: 'nickname avatar bio stats followers following',
      });
      return {
        ...result,
        list: result.list.map((u: any) => {
          const { password, ...rest } = u;
          return rest;
        }),
      };
    }

    // topic: aggregate tags matching keyword
    const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const topics = await Article.aggregate([
      { $match: { status: 'published', tags: { $regex: regex } } },
      { $unwind: '$tags' },
      { $match: { tags: { $regex: regex } } },
      { $group: { _id: '$tags', articleCount: { $sum: 1 } } },
      { $sort: { articleCount: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      { $project: { tag: '$_id', articleCount: 1, _id: 0 } },
    ]);

    const countResult = await Article.aggregate([
      { $match: { status: 'published', tags: { $regex: regex } } },
      { $unwind: '$tags' },
      { $match: { tags: { $regex: regex } } },
      { $group: { _id: '$tags' } },
      { $count: 'total' },
    ]);
    const total = countResult[0]?.total ?? 0;

    return { list: topics, total, page, pageSize };
  },

  async getHot() {
    const cached = await cache.get<{ keyword: string; count: number }[]>(cacheKeys.hotSearch());
    if (cached) return cached;

    const hot = await aggregateHotSearch();
    await cache.set(cacheKeys.hotSearch(), hot, HOT_SEARCH_TTL);
    return hot;
  },

  async getHistory(userId: string) {
    const history = await SearchHistory.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('keyword createdAt updatedAt')
      .lean();
    return history;
  },

  async clearHistory(userId: string) {
    await SearchHistory.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
    return { cleared: true };
  },
};
