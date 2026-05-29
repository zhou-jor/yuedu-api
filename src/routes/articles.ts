import { Router } from 'express';
import Joi from 'joi';
import { auth, optionalAuth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { articleController } from '../controllers/articleController';

const router = Router();

const articleBodySchema = {
  title: Joi.string().min(1).max(100).required(),
  content: Joi.string().required(),
  summary: Joi.string().max(200).allow(''),
  cover: Joi.string().uri().allow(''),
  category: schemas.objectId.required(),
  tags: Joi.array().items(Joi.string().max(20)).max(10).default([]),
};

const createArticleSchema = Joi.object(articleBodySchema);

const updateArticleSchema = Joi.object({
  title: Joi.string().min(1).max(100),
  content: Joi.string(),
  summary: Joi.string().max(200).allow(''),
  cover: Joi.string().uri().allow(''),
  category: schemas.objectId,
  tags: Joi.array().items(Joi.string().max(20)).max(10),
}).min(1);

const draftSchema = Joi.object({
  title: Joi.string().max(100).allow(''),
  content: Joi.string().allow(''),
  summary: Joi.string().max(200).allow(''),
  cover: Joi.string().uri().allow(''),
  category: schemas.objectId,
  tags: Joi.array().items(Joi.string().max(20)).max(10).default([]),
});

const listQuerySchema = schemas.pagination.keys({
  authorId: schemas.objectId,
  categoryId: schemas.objectId,
  sort: Joi.string().valid('latest', 'popular', 'likes').default('latest'),
});

const trendingQuerySchema = Joi.object({
  type: Joi.string().valid('hot', 'rising', 'collected').default('hot'),
  period: Joi.string().valid('day', 'week', 'month').default('day'),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const readingProgressSchema = Joi.object({
  progress: Joi.number().min(0).max(100).required(),
  readDuration: Joi.number().integer().min(0).default(0),
});

router.post('/', auth, validate(createArticleSchema), articleController.create);
router.get('/feed', auth, validate(schemas.cursorPagination, 'query'), articleController.getFeed);
router.get('/trending', validate(trendingQuerySchema, 'query'), articleController.getTrending);
router.get('/friends-reading', auth, validate(schemas.pagination, 'query'), articleController.getFriendsReading);
router.get('/drafts', auth, validate(schemas.pagination, 'query'), articleController.getDrafts);
router.post('/drafts', auth, validate(draftSchema), articleController.saveDraft);
router.put('/drafts/:id', auth, validate(draftSchema), articleController.updateDraft);
router.delete('/drafts/:id', auth, articleController.deleteDraft);
router.get('/', validate(listQuerySchema, 'query'), articleController.list);

router.get('/:id', optionalAuth, articleController.getById);
router.put('/:id', auth, validate(updateArticleSchema), articleController.update);
router.delete('/:id', auth, articleController.remove);
router.put('/:id/reading-progress', auth, validate(readingProgressSchema), articleController.updateReadingProgress);
router.post('/:id/dislike', auth, articleController.dislike);

export default router;
