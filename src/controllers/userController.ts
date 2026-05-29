import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, paginated } from '../utils/response';
import { userService } from '../services/userService';

export const userController = {
  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.getMe(req.user!.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.updateProfile(req.user!.userId, req.body);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async updateAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.updateAvatar(req.user!.userId, req.body.avatar);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async updateInterests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.updateInterests(req.user!.userId, req.body.interests);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getReadingStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.getReadingStats(req.user!.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getActivities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await userService.getActivities(req.user!.userId, page, pageSize);
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async getRecommended(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const data = await userService.getRecommended(req.user!.userId, Math.min(limit, 50));
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getBlocked(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.getBlockedUsers(req.user!.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getUserById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.getUserById(req.params.id as string, req.user?.userId);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async follow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.follow(req.user!.userId, req.params.id as string);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async unfollow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.unfollow(req.user!.userId, req.params.id as string);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async block(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.blockUser(req.user!.userId, req.params.id as string);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async unblock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await userService.unblockUser(req.user!.userId, req.params.id as string);
      return success(res, data);
    } catch (error) {
      next(error);
    }
  },

  async getFollowers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await userService.getFollowers(req.params.id as string, page, pageSize);
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async getFollowing(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = req.query as any;
      const result = await userService.getFollowing(req.params.id as string, page, pageSize);
      return paginated(res, result.list, result.total, result.page, result.pageSize);
    } catch (error) {
      next(error);
    }
  },

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.deleteAccount(req.user!.userId);
      return success(res, null, '账号已注销');
    } catch (error) {
      next(error);
    }
  },
};
