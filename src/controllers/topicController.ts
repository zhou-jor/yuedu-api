import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success } from '../utils/response';
import { topicService } from '../services/topicService';

export const topicController = {
  async getTrending(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await topicService.getTrending();
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getSuggest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { keyword, limit } = req.query as any;
      const data = await topicService.getSuggest(keyword, limit);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },
};
