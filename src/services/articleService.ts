import mongoose, { SortOrder } from 'mongoose';
import dayjs from 'dayjs';
import { Article } from '../models/Article';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { Interaction } from '../models/Interaction';
import { ReadingProgress } from '../models/ReadingProgress';
import { Category } from '../models/Category';
import { cache, cacheKeys } from '../utils/redis';
import { getRedis } from '../config/database';
import { paginate } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

const calcWordCount = (content: string): number => {
  const text = content.replace(/<[^>]+>/g, '').trim();
  return text.length;
};

const calcReadTime = (wordCount: number): number => Math.max(1, Math.ceil(wordCount / 300));

const buildSort = (sort?: string): Record<string, SortOrder> => {
  switch (sort) {
    case 'popular':
      return { 'stats.views': -1 };
    case 'likes':
      return { 'stats.likes': -1 };
    case 'latest':
    default:
      return { publishedAt: -1 };
  }
};

const getPeriodDate = (period: string) => {
  switch (period) {
    case 'week':
      return dayjs().subtract(7, 'day').toDate();
    case 'month':
      return dayjs().subtract(30, 'day').toDate();
    case 'day':
    default:
      return dayjs().subtract(1, 'day').toDate();
  }
};

export const articleService = {
  async create(userId: string, data: Record<string, any>) {
    const category = await Category.findById(data.category);
    if (!category || category.status !== 'active') {
      throw new AppError(40001, '分类不存在', 400);
    }

    const wordCount = calcWordCount(data.content || '');
    const readTime = calcReadTime(wordCount);

    const article = await Article.create({
      author: userId,
      title: data.title,
      content: data.content,
      summary: data.summary || '',
      cover: data.cover || '',
      category: data.category,
      tags: data.tags || [],
      status: 'published',
      wordCount,
      readTime,
      publishedAt: new Date(),
    });

    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { 'stats.articles': 1 } }),
      Category.findByIdAndUpdate(data.category, { $inc: { articleCount: 1 } }),
    ]);

    return article;
  },

  async update(userId: string, articleId: string, data: Record<string, any>) {
    const article = await Article.findById(articleId);
    if (!article || article.status === 'deleted') {
      throw new AppError(40002, '文章不存在', 404);
    }
    if (article.author.toString() !== userId) {
      throw new AppError(40003, '无权编辑该文章', 403);
    }

    const allowed = ['title', 'content', 'summary', 'cover', 'category', 'tags'];
    for (const key of allowed) {
      if (data[key] !== undefined) (article as any)[key] = data[key];
    }

    if (data.content !== undefined) {
      article.wordCount = calcWordCount(data.content);
      article.readTime = calcReadTime(article.wordCount);
    }

    if (data.category && data.category !== article.category.toString()) {
      const category = await Category.findById(data.category);
      if (!category || category.status !== 'active') {
        throw new AppError(40001, '分类不存在', 400);
      }
      await Category.findByIdAndUpdate(article.category, { $inc: { articleCount: -1 } });
      await Category.findByIdAndUpdate(data.category, { $inc: { articleCount: 1 } });
    }

    await article.save();
    await cache.del(cacheKeys.articleDetail(articleId));
    return article;
  },

  async delete(userId: string, articleId: string) {
    const article = await Article.findById(articleId);
    if (!article || article.status === 'deleted') {
      throw new AppError(40002, '文章不存在', 404);
    }
    if (article.author.toString() !== userId) {
      throw new AppError(40003, '无权删除该文章', 403);
    }

    article.status = 'deleted';
    await article.save();

    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { 'stats.articles': -1 } }),
      Category.findByIdAndUpdate(article.category, { $inc: { articleCount: -1 } }),
      cache.del(cacheKeys.articleDetail(articleId)),
    ]);
  },

  async getById(articleId: string, userId?: string) {
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      throw new AppError(10004, '无效的文章ID', 400);
    }

    let article: any = await cache.get(cacheKeys.articleDetail(articleId));
    if (!article) {
      article = await Article.findById(articleId)
        .populate('author', 'nickname avatar bio stats')
        .populate('category', 'name icon color')
        .lean();
      if (article && article.status === 'published') {
        await cache.set(cacheKeys.articleDetail(articleId), article, 600);
      }
    }

    if (!article || article.status === 'deleted') {
      throw new AppError(40002, '文章不存在', 404);
    }

    if (article.status !== 'published' && article.author?._id?.toString() !== userId) {
      throw new AppError(40002, '文章不存在', 404);
    }

    await Article.findByIdAndUpdate(articleId, { $inc: { 'stats.views': 1 } });

    const result = { ...article, isLiked: false, isCollected: false };

    if (userId) {
      const [like, collect] = await Promise.all([
        Interaction.findOne({ userId, articleId, type: 'like' }),
        Interaction.findOne({ userId, articleId, type: 'collect' }),
      ]);
      result.isLiked = !!like;
      result.isCollected = !!collect;
    }

    return result;
  },

  async getFeed(userId: string, cursor: string | null, limit: number, direction: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    const blockedIds = await getRedis().smembers(cacheKeys.blockedUsers(userId));
    const dislikedIds = await getRedis().smembers(cacheKeys.dislikedArticles(userId));

    const filter: any = {
      status: 'published',
      author: { $nin: [...blockedIds] },
      _id: { $nin: dislikedIds.map((id) => new mongoose.Types.ObjectId(id)) },
    };

    if (user.interests?.length) {
      filter.tags = { $in: user.interests };
    }

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (direction === 'newer') {
        filter.publishedAt = { $gt: cursorDate };
      } else {
        filter.publishedAt = { $lt: cursorDate };
      }
    }

    const sort = direction === 'newer' ? { publishedAt: 1 as const } : { publishedAt: -1 as const };
    const articles = await Article.find(filter)
      .sort(sort)
      .limit(limit + 1)
      .populate('author', 'nickname avatar')
      .populate('category', 'name icon color')
      .lean();

    const hasMore = articles.length > limit;
    const list = hasMore ? articles.slice(0, limit) : articles;
    const lastItem = list[list.length - 1];
    const nextCursor = lastItem?.publishedAt ? lastItem.publishedAt.toISOString() : null;

    return { list, nextCursor, hasMore };
  },

  async list(filter: {
    authorId?: string;
    categoryId?: string;
    sort?: string;
    page: number;
    pageSize: number;
  }) {
    const query: any = { status: 'published' };

    if (filter.authorId) query.author = filter.authorId;
    if (filter.categoryId) query.category = filter.categoryId;

    const { list, total, page, pageSize } = await paginate(Article, query, {
      page: filter.page,
      pageSize: filter.pageSize,
      sort: buildSort(filter.sort),
      populate: [
        { path: 'author', select: 'nickname avatar' },
        { path: 'category', select: 'name icon color' },
      ],
    });

    return { list, total, page, pageSize };
  },

  async getTrending(type: string, period: string, limit: number) {
    const since = getPeriodDate(period);
    const filter = { status: 'published' as const, publishedAt: { $gte: since } };

    let sort: Record<string, -1>;
    switch (type) {
      case 'rising':
        sort = { 'stats.likes': -1, 'stats.views': -1 };
        break;
      case 'collected':
        sort = { 'stats.collects': -1 };
        break;
      case 'hot':
      default:
        sort = { 'stats.views': -1, 'stats.likes': -1 };
        break;
    }

    const articles = await Article.find(filter)
      .sort(sort)
      .limit(limit)
      .populate('author', 'nickname avatar')
      .populate('category', 'name icon color')
      .lean();

    return articles;
  },

  async getFriendsReading(userId: string, page: number, pageSize: number) {
    const following = await Follow.find({ followerId: userId }).select('followingId');
    const followingIds = following.map((f) => f.followingId);

    if (!followingIds.length) {
      return { list: [], total: 0, page, pageSize };
    }

    const recentProgress = await ReadingProgress.find({
      userId: { $in: followingIds },
      lastReadAt: { $gte: dayjs().subtract(7, 'day').toDate() },
    })
      .sort({ lastReadAt: -1 })
      .populate({
        path: 'articleId',
        match: { status: 'published' },
        populate: [
          { path: 'author', select: 'nickname avatar' },
          { path: 'category', select: 'name icon color' },
        ],
      })
      .populate('userId', 'nickname avatar')
      .lean();

    const seen = new Set<string>();
    const items: any[] = [];
    for (const p of recentProgress) {
      if (!p.articleId || seen.has((p.articleId as any)._id.toString())) continue;
      seen.add((p.articleId as any)._id.toString());
      items.push({
        reader: p.userId,
        article: p.articleId,
        progress: p.progress,
        lastReadAt: p.lastReadAt,
      });
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    const list = items.slice(start, start + pageSize);

    return { list, total, page, pageSize };
  },

  async getDrafts(userId: string, page: number, pageSize: number) {
    return paginate(
      Article,
      { author: userId, status: 'draft' },
      { page, pageSize, sort: { updatedAt: -1 } },
    );
  },

  async saveDraft(userId: string, data: Record<string, any>) {
    let categoryId = data.category;
    if (!categoryId) {
      const defaultCat = await Category.findOne({ status: 'active' }).sort({ sort: 1 });
      if (!defaultCat) {
        throw new AppError(40001, '分类不存在', 400);
      }
      categoryId = defaultCat._id;
    }

    const wordCount = calcWordCount(data.content || '');
    const readTime = calcReadTime(wordCount);

    const draft = await Article.create({
      author: userId,
      title: data.title || '无标题',
      content: data.content || '',
      summary: data.summary || '',
      cover: data.cover || '',
      category: categoryId,
      tags: data.tags || [],
      status: 'draft',
      wordCount,
      readTime,
    });

    return draft;
  },

  async updateDraft(userId: string, draftId: string, data: Record<string, any>) {
    const draft = await Article.findOne({ _id: draftId, author: userId, status: 'draft' });
    if (!draft) {
      throw new AppError(40004, '草稿不存在', 404);
    }

    const allowed = ['title', 'content', 'summary', 'cover', 'category', 'tags'];
    for (const key of allowed) {
      if (data[key] !== undefined) (draft as any)[key] = data[key];
    }

    if (data.content !== undefined) {
      draft.wordCount = calcWordCount(data.content);
      draft.readTime = calcReadTime(draft.wordCount);
    }

    await draft.save();
    return draft;
  },

  async deleteDraft(userId: string, draftId: string) {
    const result = await Article.findOneAndDelete({ _id: draftId, author: userId, status: 'draft' });
    if (!result) {
      throw new AppError(40004, '草稿不存在', 404);
    }
  },

  async updateReadingProgress(
    userId: string,
    articleId: string,
    progress: number,
    readDuration: number,
  ) {
    const article = await Article.findById(articleId);
    if (!article || article.status !== 'published') {
      throw new AppError(40002, '文章不存在', 404);
    }

    const clampedProgress = Math.min(100, Math.max(0, progress));

    const record = await ReadingProgress.findOneAndUpdate(
      { userId, articleId },
      {
        progress: clampedProgress,
        $inc: { readDuration: readDuration || 0 },
        lastReadAt: new Date(),
      },
      { upsert: true, new: true },
    );

    return record;
  },

  async dislike(userId: string, articleId: string) {
    const article = await Article.findById(articleId);
    if (!article) {
      throw new AppError(40002, '文章不存在', 404);
    }

    await getRedis().sadd(cacheKeys.dislikedArticles(userId), articleId);
    return { disliked: true };
  },
};
