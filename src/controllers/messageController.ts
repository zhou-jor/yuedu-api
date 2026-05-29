import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { messageService } from '../services/messageService';

export const messageController = {
  async getConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await messageService.getConversations(req.user!.userId, page, pageSize);
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async createConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await messageService.createConversation(
        req.user!.userId,
        req.body.targetUserId,
      );
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await messageService.getMessages(
        req.user!.userId,
        req.params.id as string,
        page,
        pageSize,
      );
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await messageService.getUnreadCount(req.user!.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, content, articleRef } = req.body;
      const data = await messageService.sendMessage(
        req.user!.userId,
        req.params.id as string,
        type,
        content,
        articleRef,
      );
      return success(res, data, '发送成功');
    } catch (error) {
      next(error);
    }
  },

  async recallMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await messageService.recallMessage(
        req.user!.userId,
        req.params.id as string,
        req.body.messageId,
      );
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await messageService.markRead(req.user!.userId, req.params.id as string);
      return success(res, null, '已标记已读');
    } catch (error) {
      next(error);
    }
  },

  async deleteConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await messageService.deleteConversation(req.user!.userId, req.params.id as string);
      return success(res, null, '删除成功');
    } catch (error) {
      next(error);
    }
  },

  async pinConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await messageService.pinConversation(
        req.user!.userId,
        req.params.id as string,
        req.body.isPinned,
      );
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },
};
