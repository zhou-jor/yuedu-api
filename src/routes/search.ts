import { Router } from 'express';
import Joi from 'joi';
import { auth, optionalAuth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { searchController } from '../controllers/searchController';

const router = Router();

const searchQuerySchema = schemas.pagination.keys({
  keyword: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('article', 'user', 'topic').default('article'),
});

router.get('/', optionalAuth, validate(searchQuerySchema, 'query'), searchController.search);
router.get('/hot', searchController.getHot);
router.get('/history', auth, searchController.getHistory);
router.delete('/history', auth, searchController.clearHistory);

export default router;
