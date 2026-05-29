import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { searchService } from '../services/searchService';

export const searchController = {
  async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { keyword, type, page, pageSize } = req.query as any;
      const result = await searchService.search(
        keyword,
        type,
        page,
        pageSize,
        req.user?.userId,
      );
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async getHot(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await searchService.getHot();
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await searchService.getHistory(req.user!.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async clearHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await searchService.clearHistory(req.user!.userId);
      return success(res, data, '搜索历史已清空');
    } catch (error) {
      next(error);
    }
  },
};
