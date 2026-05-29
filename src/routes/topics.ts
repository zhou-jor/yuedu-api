import { Router } from 'express';
import Joi from 'joi';
import { validate, schemas } from '../middleware/validate';
import { topicController } from '../controllers/topicController';

const router = Router();

const suggestQuerySchema = Joi.object({
  keyword: Joi.string().min(1).max(50).required(),
  limit: Joi.number().integer().min(1).max(20).default(10),
});

router.get('/trending', topicController.getTrending);
router.get('/suggest', validate(suggestQuerySchema, 'query'), topicController.getSuggest);

export default router;
