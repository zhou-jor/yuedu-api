import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, paginated, cursorPaginated } from '../utils/response';
import { articleService } from '../services/articleService';

export const articleController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await articleService.create(req.user!.userId, req.body);
      return success(res, data, '发布成功');
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await articleService.update(req.user!.userId, req.params.id as string, req.body);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await articleService.delete(req.user!.userId, req.params.id as string);
      return success(res, null, '删除成功');
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await articleService.getById(req.params.id as string, req.user?.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getFeed(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { cursor, limit, direction } = req.query as any;
      const result = await articleService.getFeed(
        req.user!.userId,
        cursor ?? null,
        limit,
        direction,
      );
      return cursorPaginated(res, result.list, result.nextCursor, result.hasMore);
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { authorId, categoryId, sort, page, pageSize } = req.query as any;
      const result = await articleService.list({ authorId, categoryId, sort, page, pageSize });
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async getTrending(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, period, limit } = req.query as any;
      const data = await articleService.getTrending(type, period, limit);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getFriendsReading(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await articleService.getFriendsReading(req.user!.userId, page, pageSize);
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async getDrafts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await articleService.getDrafts(req.user!.userId, page, pageSize);
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async saveDraft(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await articleService.saveDraft(req.user!.userId, req.body);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async updateDraft(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await articleService.updateDraft(req.user!.userId, req.params.id as string, req.body);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async deleteDraft(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await articleService.deleteDraft(req.user!.userId, req.params.id as string);
      return success(res, null, '草稿已删除');
    } catch (error) {
      next(error);
    }
  },

  async updateReadingProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { progress, readDuration } = req.body;
      const data = await articleService.updateReadingProgress(
        req.user!.userId,
        req.params.id as string,
        progress,
        readDuration,
      );
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async dislike(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await articleService.dislike(req.user!.userId, req.params.id as string);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },
};
