import { Types } from 'mongoose';
import {
  Interaction,
  Article,
  CollectionFolder,
  ReadingProgress,
} from '../models';
import { paginate } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notificationService';

const DEFAULT_FOLDER_NAME = '默认收藏夹';

const ensureDefaultFolder = async (userId: string) => {
  let folder = await CollectionFolder.findOne({
    userId: new Types.ObjectId(userId),
    isDefault: true,
  });
  if (!folder) {
    folder = await CollectionFolder.create({
      userId: new Types.ObjectId(userId),
      name: DEFAULT_FOLDER_NAME,
      isDefault: true,
    });
  }
  return folder;
};

export const interactionService = {
  async like(userId: string, articleId: string) {
    const existing = await Interaction.findOne({
      userId: new Types.ObjectId(userId),
      articleId: new Types.ObjectId(articleId),
      type: 'like',
    });

    if (existing) {
      return { liked: true };
    }

    const article = await Article.findById(articleId);
    if (!article || article.status !== 'published') {
      throw new AppError(40401, '文章不存在', 404);
    }

    await Interaction.create({
      userId: new Types.ObjectId(userId),
      articleId: new Types.ObjectId(articleId),
      type: 'like',
    });
    await Article.updateOne({ _id: articleId }, { $inc: { 'stats.likes': 1 } });

    if (article.author.toString() !== userId) {
      await notificationService.createNotification({
        userId: article.author.toString(),
        fromUserId: userId,
        type: 'like',
        targetType: 'article',
        targetId: articleId,
        content: '赞了你的文章',
      });
    }

    return { liked: true };
  },

  async unlike(userId: string, articleId: string) {
    const existing = await Interaction.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      articleId: new Types.ObjectId(articleId),
      type: 'like',
    });

    if (!existing) {
      return { liked: false };
    }

    await Article.updateOne({ _id: articleId }, { $inc: { 'stats.likes': -1 } });
    return { liked: false };
  },

  async collect(userId: string, articleId: string, folderId?: string) {
    const existing = await Interaction.findOne({
      userId: new Types.ObjectId(userId),
      articleId: new Types.ObjectId(articleId),
      type: 'collect',
    });

    if (existing) {
      return { collected: true, folderId: existing.folderId?.toString() || null };
    }

    const article = await Article.findById(articleId);
    if (!article || article.status !== 'published') {
      throw new AppError(40401, '文章不存在', 404);
    }

    let targetFolderId: Types.ObjectId;
    if (folderId) {
      const folder = await CollectionFolder.findOne({
        _id: folderId,
        userId: new Types.ObjectId(userId),
      });
      if (!folder) {
        throw new AppError(40401, '收藏夹不存在', 404);
      }
      targetFolderId = folder._id;
    } else {
      const defaultFolder = await ensureDefaultFolder(userId);
      targetFolderId = defaultFolder._id;
    }

    await Interaction.create({
      userId: new Types.ObjectId(userId),
      articleId: new Types.ObjectId(articleId),
      type: 'collect',
      folderId: targetFolderId,
    });
    await Article.updateOne({ _id: articleId }, { $inc: { 'stats.collects': 1 } });
    await CollectionFolder.updateOne({ _id: targetFolderId }, { $inc: { articleCount: 1 } });

    return { collected: true, folderId: targetFolderId.toString() };
  },

  async uncollect(userId: string, articleId: string) {
    const existing = await Interaction.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      articleId: new Types.ObjectId(articleId),
      type: 'collect',
    });

    if (!existing) {
      return { collected: false };
    }

    await Article.updateOne({ _id: articleId }, { $inc: { 'stats.collects': -1 } });
    if (existing.folderId) {
      await CollectionFolder.updateOne(
        { _id: existing.folderId },
        { $inc: { articleCount: -1 } },
      );
    }

    return { collected: false };
  },

  async rate(userId: string, articleId: string, rating: number) {
    const article = await Article.findById(articleId);
    if (!article || article.status !== 'published') {
      throw new AppError(40401, '文章不存在', 404);
    }

    const interaction = await Interaction.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        articleId: new Types.ObjectId(articleId),
        type: 'rate',
      },
      { $set: { rating } },
      { upsert: true, new: true },
    );

    return { rating: interaction.rating };
  },

  async share(userId: string, articleId: string, platform?: string) {
    const article = await Article.findById(articleId);
    if (!article || article.status !== 'published') {
      throw new AppError(40401, '文章不存在', 404);
    }

    await Interaction.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        articleId: new Types.ObjectId(articleId),
        type: 'share',
      },
      { $setOnInsert: { userId: new Types.ObjectId(userId), articleId: new Types.ObjectId(articleId), type: 'share' } },
      { upsert: true },
    );

    await Article.updateOne({ _id: articleId }, { $inc: { 'stats.shares': 1 } });
    return { shared: true, platform: platform || null };
  },

  async getCollections(
    userId: string,
    page: number,
    pageSize: number,
    folderId?: string,
    type?: string,
  ) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      type: type || 'collect',
    };

    if (folderId) {
      filter.folderId = new Types.ObjectId(folderId);
    }

    const result = await paginate(Interaction, filter, {
      page,
      pageSize,
      sort: { createdAt: -1 },
      populate: {
        path: 'articleId',
        select: 'title summary cover author stats readTime publishedAt',
        populate: { path: 'author', select: 'nickname avatar' },
      } as any,
    });

    return result;
  },

  async getFolders(userId: string) {
    await ensureDefaultFolder(userId);
    return CollectionFolder.find({ userId: new Types.ObjectId(userId) })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
  },

  async createFolder(userId: string, name: string) {
    const folder = await CollectionFolder.create({
      userId: new Types.ObjectId(userId),
      name,
    });
    return folder;
  },

  async updateFolder(userId: string, folderId: string, name: string) {
    const folder = await CollectionFolder.findOneAndUpdate(
      { _id: folderId, userId: new Types.ObjectId(userId), isDefault: false },
      { $set: { name } },
      { new: true },
    );

    if (!folder) {
      throw new AppError(40401, '收藏夹不存在或不可修改', 404);
    }

    return folder;
  },

  async deleteFolder(userId: string, folderId: string) {
    const folder = await CollectionFolder.findOne({
      _id: folderId,
      userId: new Types.ObjectId(userId),
      isDefault: false,
    });

    if (!folder) {
      throw new AppError(40401, '收藏夹不存在或不可删除', 404);
    }

    const defaultFolder = await ensureDefaultFolder(userId);

    await Interaction.updateMany(
      { userId: new Types.ObjectId(userId), type: 'collect', folderId: folder._id },
      { $set: { folderId: defaultFolder._id } },
    );

    await CollectionFolder.updateOne(
      { _id: defaultFolder._id },
      { $inc: { articleCount: folder.articleCount } },
    );

    await folder.deleteOne();
    return { success: true };
  },

  async getReadingHistory(userId: string, page: number, pageSize: number) {
    return paginate(ReadingProgress, { userId: new Types.ObjectId(userId) }, {
      page,
      pageSize,
      sort: { lastReadAt: -1 },
      populate: {
        path: 'articleId',
        select: 'title summary cover author stats readTime publishedAt',
        populate: { path: 'author', select: 'nickname avatar' },
      } as any,
    });
  },

  async clearReadingHistory(userId: string) {
    await ReadingProgress.deleteMany({ userId: new Types.ObjectId(userId) });
    return { success: true };
  },

  async deleteReadingHistoryItem(userId: string, id: string) {
    const result = await ReadingProgress.findOneAndDelete({
      _id: id,
      userId: new Types.ObjectId(userId),
    });

    if (!result) {
      throw new AppError(40401, '阅读记录不存在', 404);
    }

    return { success: true };
  },
};
