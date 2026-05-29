import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { notificationService } from '../services/notificationService';

export const notificationController = {
  async getList(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, page, pageSize } = req.query as any;
      const result = await notificationService.getList(
        req.user!.userId,
        type,
        page,
        pageSize,
      );
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async readAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type } = req.body;
      await notificationService.readAll(req.user!.userId, type);
      return success(res, null, '已全部标记已读');
    } catch (error) {
      next(error);
    }
  },

  async readOne(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.readOne(req.user!.userId, req.params.id as string);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.getUnreadCount(req.user!.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },
};
