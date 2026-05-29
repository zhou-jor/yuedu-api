import { Category } from '../models/Category';
import { Article } from '../models/Article';
import { cache, cacheKeys } from '../utils/redis';
import { paginate } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

const CACHE_TTL = 3600;

export const categoryService = {
  async getAll() {
    const cached = await cache.get(cacheKeys.categories());
    if (cached) return cached;

    const categories = await Category.find({ status: 'active' })
      .sort({ sort: 1 })
      .lean();

    await cache.set(cacheKeys.categories(), categories, CACHE_TTL);
    return categories;
  },

  async getArticles(categoryId: string, page: number, pageSize: number) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new AppError(10004, '无效的分类ID', 400);
    }

    const category = await Category.findById(categoryId);
    if (!category || category.status !== 'active') {
      throw new AppError(40001, '分类不存在', 404);
    }

    const { list, total, page: p, pageSize: ps } = await paginate(
      Article,
      { category: categoryId, status: 'published' },
      {
        page,
        pageSize,
        sort: { publishedAt: -1 },
        populate: [
          { path: 'author', select: 'nickname avatar' },
          { path: 'category', select: 'name icon color' },
        ],
      },
    );

    return { list, total, page: p, pageSize: ps, category };
  },
};
