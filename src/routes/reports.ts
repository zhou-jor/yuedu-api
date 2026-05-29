import { Router } from 'express';
import Joi from 'joi';
import { auth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { reportController } from '../controllers/reportController';

const router = Router();

export const reportSchema = Joi.object({
  targetType: Joi.string().valid('article', 'comment', 'user').required(),
  targetId: schemas.objectId.required(),
  reason: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow('', null),
});

router.post('/', auth, validate(reportSchema), reportController.create);

export default router;
