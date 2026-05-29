import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { fail } from '../utils/response';

export interface AuthRequest extends Request {
  user?: { userId: string };
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 20007, '未登录', 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return fail(res, 20003, 'Token 已过期', 401);
    }
    return fail(res, 20004, 'Token 无效', 401);
  }
};

// Optional auth - doesn't fail if no token, but sets user if present
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(authHeader.substring(7));
      req.user = { userId: payload.userId };
    } catch {}
  }
  next();
};
