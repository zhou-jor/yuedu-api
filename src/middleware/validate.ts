import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { fail } from '../utils/response';

type ValidationTarget = 'body' | 'query' | 'params';

export const validate = (schema: Joi.ObjectSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return fail(res, 10004, message);
    }

    req[target] = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  objectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(50).default(20),
  }),

  cursorPagination: Joi.object({
    cursor: Joi.string().allow('', null),
    limit: Joi.number().integer().min(1).max(50).default(20),
    direction: Joi.string().valid('newer', 'older').default('older'),
  }),
};
