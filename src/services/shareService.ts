import mongoose from 'mongoose';
import { Article } from '../models';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

export const shareService = {
  async getArticleOrThrow(articleId: string) {
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      throw new AppError(10004, '无效的文章ID', 400);
    }

    const article = await Article.findOne({
      _id: articleId,
      status: 'published',
    })
      .populate('author', 'nickname avatar bio')
      .select('title summary cover tags stats publishedAt author')
      .lean();

    if (!article) {
      throw new AppError(20002, '文章不存在', 404);
    }

    return article;
  },

  buildLandingUrl(articleId: string) {
    const prefix = config.app.apiPrefix.replace(/\/$/, '');
    return `${prefix}/share/landing/${articleId}`;
  },

  async getPosterData(articleId: string) {
    const article = await this.getArticleOrThrow(articleId);
    const author = article.author as any;

    return {
      article: {
        id: article._id,
        title: article.title,
        summary: article.summary,
        cover: article.cover,
        tags: article.tags,
        stats: article.stats,
        publishedAt: article.publishedAt,
      },
      author: author
        ? {
            id: author._id,
            nickname: author.nickname,
            avatar: author.avatar,
            bio: author.bio,
          }
        : null,
      qrcodeUrl: this.buildLandingUrl(articleId),
    };
  },

  async getLandingData(articleId: string) {
    const article = await this.getArticleOrThrow(articleId);
    const author = article.author as any;

    return {
      id: article._id,
      title: article.title,
      summary: article.summary,
      cover: article.cover,
      stats: article.stats,
      publishedAt: article.publishedAt,
      author: author
        ? {
            id: author._id,
            nickname: author.nickname,
            avatar: author.avatar,
          }
        : null,
    };
  },
};
