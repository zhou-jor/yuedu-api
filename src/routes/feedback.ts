import { Router } from 'express';
import Joi from 'joi';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { feedbackController } from '../controllers/feedbackController';

const router = Router();

export const feedbackSchema = Joi.object({
  type: Joi.string().valid('feature', 'bug', 'complaint', 'other').required(),
  content: Joi.string().min(5).max(2000).required(),
  images: Joi.array().items(Joi.string().uri()).max(9).default([]),
  contact: Joi.string().max(100).allow('', null),
});

router.post('/', auth, validate(feedbackSchema), feedbackController.create);
router.get('/faq', feedbackController.getFaq);

export default router;
