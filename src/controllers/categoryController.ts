import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { categoryService } from '../services/categoryService';

export const categoryController = {
  async getAll(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await categoryService.getAll();
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getArticles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await categoryService.getArticles(req.params.id as string, page, pageSize);
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },
};
