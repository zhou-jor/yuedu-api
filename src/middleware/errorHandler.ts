import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  code: number;
  statusCode: number;

  constructor(code: number, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      data: null,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      code: 10004,
      message: '参数格式错误',
      data: null,
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      code: 10004,
      message: '无效的ID格式',
      data: null,
    });
  }

  return res.status(500).json({
    code: 10001,
    message: '服务器内部错误',
    data: null,
  });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    code: 40401,
    message: '接口不存在',
    data: null,
  });
};
