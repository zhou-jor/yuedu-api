import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { interactionService } from '../services/interactionService';

export const interactionController = {
  async like(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await interactionService.like(req.user!.userId, req.body.articleId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async unlike(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await interactionService.unlike(req.user!.userId, req.body.articleId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async collect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { articleId, folderId } = req.body;
      const data = await interactionService.collect(req.user!.userId, articleId, folderId);
      return success(res, data, '收藏成功');
    } catch (error) {
      next(error);
    }
  },

  async uncollect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await interactionService.uncollect(req.user!.userId, req.body.articleId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async rate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { articleId, rating } = req.body;
      const data = await interactionService.rate(req.user!.userId, articleId, rating);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async share(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { articleId, platform } = req.body;
      const data = await interactionService.share(req.user!.userId, articleId, platform);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getCollections(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize, folderId, type } = req.query as any;
      const result = await interactionService.getCollections(
        req.user!.userId,
        page,
        pageSize,
        folderId,
        type,
      );
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async getFolders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await interactionService.getFolders(req.user!.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async createFolder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await interactionService.createFolder(req.user!.userId, req.body.name);
      return success(res, data, '创建成功');
    } catch (error) {
      next(error);
    }
  },

  async updateFolder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await interactionService.updateFolder(
        req.user!.userId,
        req.params.id as string,
        req.body.name,
      );
      return success(res, data, '更新成功');
    } catch (error) {
      next(error);
    }
  },

  async deleteFolder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await interactionService.deleteFolder(req.user!.userId, req.params.id as string);
      return success(res, null, '删除成功');
    } catch (error) {
      next(error);
    }
  },

  async getReadingHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await interactionService.getReadingHistory(
        req.user!.userId,
        page,
        pageSize,
      );
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async clearReadingHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await interactionService.clearReadingHistory(req.user!.userId);
      return success(res, null, '已清空阅读历史');
    } catch (error) {
      next(error);
    }
  },

  async deleteReadingHistoryItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await interactionService.deleteReadingHistoryItem(req.user!.userId, req.params.id as string);
      return success(res, null, '删除成功');
    } catch (error) {
      next(error);
    }
  },
};
