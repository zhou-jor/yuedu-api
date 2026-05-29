import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { commentService } from '../services/commentService';

export const commentController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { articleId, content, mentions } = req.body;
      const data = await commentService.create(
        req.user!.userId,
        articleId,
        content,
        mentions,
      );
      return success(res, data, '评论成功');
    } catch (error) {
      next(error);
    }
  },

  async getList(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { articleId, parentId, sort, page, pageSize } = req.query as any;
      const result = await commentService.getList({
        articleId,
        parentId,
        sort,
        page,
        pageSize,
      });
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async reply(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { content, mentions } = req.body;
      const data = await commentService.reply(
        req.user!.userId,
        req.params.id as string,
        content,
        mentions,
      );
      return success(res, data, '回复成功');
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await commentService.delete(req.user!.userId, req.params.id as string);
      return success(res, null, '删除成功');
    } catch (error) {
      next(error);
    }
  },

  async like(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await commentService.like(req.user!.userId, req.params.id as string);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },
};
