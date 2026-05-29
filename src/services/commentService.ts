import { Types, SortOrder } from 'mongoose';
import { Comment, Article, User } from '../models';
import { getRedis } from '../config/database';
import { paginate } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notificationService';

const commentLikeKey = (userId: string, commentId: string) =>
  `comment:like:${userId}:${commentId}`;

const populateUser = { path: 'userId', select: 'nickname avatar' };

export const commentService = {
  async create(userId: string, articleId: string, content: string, mentions: string[] = []) {
    const article = await Article.findById(articleId);
    if (!article || article.status !== 'published') {
      throw new AppError(40401, '文章不存在', 404);
    }

    const comment = await Comment.create({
      articleId: new Types.ObjectId(articleId),
      userId: new Types.ObjectId(userId),
      content,
      mentions: mentions.map((id) => new Types.ObjectId(id)),
    });

    await Article.updateOne({ _id: articleId }, { $inc: { 'stats.comments': 1 } });

    if (article.author.toString() !== userId) {
      await notificationService.createNotification({
        userId: article.author.toString(),
        fromUserId: userId,
        type: 'comment',
        targetType: 'article',
        targetId: articleId,
        content: '评论了你的文章',
      });
    }

    for (const mentionId of mentions) {
      if (mentionId !== userId) {
        await notificationService.createNotification({
          userId: mentionId,
          fromUserId: userId,
          type: 'comment',
          targetType: 'comment',
          targetId: comment._id.toString(),
          content: '在评论中提到了你',
        });
      }
    }

    return Comment.findById(comment._id).populate(populateUser).lean();
  },

  async getList(filter: {
    articleId?: string;
    parentId?: string;
    sort?: 'hot' | 'new';
    page?: number;
    pageSize?: number;
  }) {
    const { articleId, parentId, sort = 'new', page = 1, pageSize = 20 } = filter;

    if (!articleId && !parentId) {
      throw new AppError(10004, 'articleId 或 parentId 至少传一个', 400);
    }

    const query: Record<string, unknown> = { status: 'active' };
    if (parentId) {
      query.parentId = new Types.ObjectId(parentId);
    } else if (articleId) {
      query.articleId = new Types.ObjectId(articleId);
      query.parentId = null;
    }

    const sortOption: Record<string, SortOrder> =
      sort === 'hot' ? { likes: -1, createdAt: -1 } : { createdAt: -1 };

    const result = await paginate(Comment, query, {
      page,
      pageSize,
      sort: sortOption,
      populate: populateUser as any,
    });

    if (parentId || !result.list.length) {
      return result;
    }

    const parentIds = result.list.map((c: any) => c._id);
    const hotReplies = await Comment.find({
      parentId: { $in: parentIds },
      status: 'active',
    })
      .sort({ likes: -1, createdAt: -1 })
      .populate(populateUser)
      .lean();

    const repliesMap = new Map<string, any[]>();
    for (const reply of hotReplies) {
      const pid = reply.parentId!.toString();
      if (!repliesMap.has(pid)) repliesMap.set(pid, []);
      const arr = repliesMap.get(pid)!;
      if (arr.length < 3) arr.push(reply);
    }

    result.list = result.list.map((comment: any) => ({
      ...comment,
      hotReplies: repliesMap.get(comment._id.toString()) || [],
    }));

    return result;
  },

  async reply(userId: string, commentId: string, content: string, mentions: string[] = []) {
    const parent = await Comment.findOne({ _id: commentId, status: 'active' });
    if (!parent) {
      throw new AppError(40401, '评论不存在', 404);
    }

    const comment = await Comment.create({
      articleId: parent.articleId,
      userId: new Types.ObjectId(userId),
      parentId: parent._id,
      replyTo: parent.userId,
      content,
      mentions: mentions.map((id) => new Types.ObjectId(id)),
    });

    await Article.updateOne({ _id: parent.articleId }, { $inc: { 'stats.comments': 1 } });

    if (parent.userId.toString() !== userId) {
      await notificationService.createNotification({
        userId: parent.userId.toString(),
        fromUserId: userId,
        type: 'comment',
        targetType: 'comment',
        targetId: comment._id.toString(),
        content: '回复了你的评论',
      });
    }

    for (const mentionId of mentions) {
      if (mentionId !== userId) {
        await notificationService.createNotification({
          userId: mentionId,
          fromUserId: userId,
          type: 'comment',
          targetType: 'comment',
          targetId: comment._id.toString(),
          content: '在评论中提到了你',
        });
      }
    }

    return Comment.findById(comment._id).populate(populateUser).lean();
  },

  async delete(userId: string, commentId: string) {
    const comment = await Comment.findById(commentId);
    if (!comment || comment.status === 'deleted') {
      throw new AppError(40401, '评论不存在', 404);
    }

    const user = await User.findById(userId).select('role');
    const isOwner = comment.userId.toString() === userId;
    const isAdmin = user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError(20008, '无权删除该评论', 403);
    }

    comment.status = 'deleted';
    await comment.save();
    await Article.updateOne({ _id: comment.articleId }, { $inc: { 'stats.comments': -1 } });

    return { success: true };
  },

  async like(userId: string, commentId: string) {
    const comment = await Comment.findOne({ _id: commentId, status: 'active' });
    if (!comment) {
      throw new AppError(40401, '评论不存在', 404);
    }

    const redis = getRedis();
    const key = commentLikeKey(userId, commentId);
    const exists = await redis.get(key);

    if (exists) {
      await redis.del(key);
      await Comment.updateOne({ _id: commentId }, { $inc: { likes: -1 } });
      return { liked: false, likes: Math.max(0, comment.likes - 1) };
    }

    await redis.set(key, '1');
    await Comment.updateOne({ _id: commentId }, { $inc: { likes: 1 } });
    return { liked: true, likes: comment.likes + 1 };
  },
};
