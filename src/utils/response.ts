import { Response } from 'express';

export const success = (res: Response, data: any = null, message = 'success') => {
  return res.json({ code: 0, message, data });
};

export const paginated = (
  res: Response,
  list: any[],
  total: number,
  page: number,
  pageSize: number,
) => {
  const totalPages = Math.ceil(total / pageSize);
  return res.json({
    code: 0,
    message: 'success',
    data: {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    },
  });
};

export const cursorPaginated = (
  res: Response,
  list: any[],
  nextCursor: string | null,
  hasMore: boolean,
) => {
  return res.json({
    code: 0,
    message: 'success',
    data: { list, nextCursor, hasMore },
  });
};

export const fail = (res: Response, code: number, message: string, statusCode = 400) => {
  return res.status(statusCode).json({ code, message, data: null });
};
