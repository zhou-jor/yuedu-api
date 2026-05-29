import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success } from '../utils/response';
import { reportService } from '../services/reportService';

export const reportController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { targetType, targetId, reason, description } = req.body;
      const data = await reportService.create(
        req.user!.userId,
        targetType,
        targetId,
        reason,
        description,
      );
      return success(res, data, '举报提交成功');
    } catch (error) {
      next(error);
    }
  },
};
