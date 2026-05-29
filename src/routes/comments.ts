import { Router } from 'express';
import Joi from 'joi';
import { auth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { commentController } from '../controllers/commentController';

const router = Router();

const createCommentSchema = Joi.object({
  articleId: schemas.objectId.required(),
  content: Joi.string().min(1).max(2000).required(),
  mentions: Joi.array().items(schemas.objectId).default([]),
});

const replySchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
  mentions: Joi.array().items(schemas.objectId).default([]),
});

const listQuerySchema = schemas.pagination.keys({
  articleId: schemas.objectId,
  parentId: schemas.objectId,
  sort: Joi.string().valid('hot', 'new').default('new'),
}).or('articleId', 'parentId');

router.post('/', auth, validate(createCommentSchema), commentController.create);
router.get('/', validate(listQuerySchema, 'query'), commentController.getList);
router.post('/:id/reply', auth, validate(replySchema), commentController.reply);
router.delete('/:id', auth, commentController.delete);
router.post('/:id/like', auth, commentController.like);

export default router;
