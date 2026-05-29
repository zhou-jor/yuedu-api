import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success } from '../utils/response';
import { shareService } from '../services/shareService';

export const shareController = {
  async getPosterData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await shareService.getPosterData(String(req.params.articleId));
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getLandingData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await shareService.getLandingData(String(req.params.articleId));
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },
};
