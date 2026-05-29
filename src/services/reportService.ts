import mongoose from 'mongoose';
import { Feedback } from '../models';
import { AppError } from '../middleware/errorHandler';

export const reportService = {
  async create(
    userId: string,
    targetType: 'article' | 'comment' | 'user',
    targetId: string,
    reason: string,
    description?: string,
  ) {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw new AppError(10004, '无效的目标ID', 400);
    }

    const reportContent = JSON.stringify({
      report: true,
      targetType,
      targetId,
      reason,
      description: description || '',
    });

    const report = await Feedback.create({
      userId,
      type: 'complaint',
      content: reportContent,
      images: [],
      contact: undefined,
    });

    const obj = report.toObject() as { createdAt?: Date };
    return {
      id: report._id,
      targetType,
      targetId,
      reason,
      status: report.status,
      createdAt: obj.createdAt,
    };
  },
};
