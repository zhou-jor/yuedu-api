import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { checkinService } from '../services/checkinService';

export const checkinController = {
  async checkin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await checkinService.checkin(req.user!.userId);
      const message = data.alreadyCheckedIn ? '今日已签到' : '签到成功';
      return success(res, data, message);
    } catch (error) {
      next(error);
    }
  },

  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await checkinService.getStatus(req.user!.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await checkinService.getTasks(req.user!.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async claimReward(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await checkinService.claimReward(req.user!.userId, String(req.params.id));
      return success(res, data, '奖励领取成功');
    } catch (error) {
      next(error);
    }
  },

  async getPoints(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await checkinService.getPoints(req.user!.userId, page, pageSize);
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },
};
