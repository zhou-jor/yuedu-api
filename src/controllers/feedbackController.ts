import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success } from '../utils/response';
import { feedbackService } from '../services/feedbackService';

export const feedbackController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, content, images, contact } = req.body;
      const data = await feedbackService.create(
        req.user!.userId,
        type,
        content,
        images,
        contact,
      );
      return success(res, data, '反馈提交成功');
    } catch (error) {
      next(error);
    }
  },

  async getFaq(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await feedbackService.getFaq();
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },
};
