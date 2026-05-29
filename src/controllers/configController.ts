import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success } from '../utils/response';
import { configService } from '../services/configService';

export const configController = {
  async getClientConfig(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await configService.getClientConfig();
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getBanners(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await configService.getBanners();
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getColumns(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await configService.getColumns();
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getInterestTags(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await configService.getInterestTags();
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },
};
