import { Router } from 'express';
import Joi from 'joi';
import { auth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { interactionController } from '../controllers/interactionController';

const router = Router();

const articleIdSchema = Joi.object({
  articleId: schemas.objectId.required(),
});

const collectSchema = Joi.object({
  articleId: schemas.objectId.required(),
  folderId: schemas.objectId,
});

const rateSchema = Joi.object({
  articleId: schemas.objectId.required(),
  rating: Joi.number().integer().min(1).max(5).required(),
});

const shareSchema = Joi.object({
  articleId: schemas.objectId.required(),
  platform: Joi.string().max(50),
});

const collectionsQuerySchema = schemas.pagination.keys({
  folderId: schemas.objectId,
  type: Joi.string().valid('like', 'collect', 'rate', 'share'),
});

const folderNameSchema = Joi.object({
  name: Joi.string().min(1).max(30).required(),
});

router.post('/like', auth, validate(articleIdSchema), interactionController.like);
router.delete('/like', auth, validate(articleIdSchema), interactionController.unlike);
router.post('/collect', auth, validate(collectSchema), interactionController.collect);
router.delete('/collect', auth, validate(articleIdSchema), interactionController.uncollect);
router.post('/rate', auth, validate(rateSchema), interactionController.rate);
router.post('/share', auth, validate(shareSchema), interactionController.share);

router.get('/collections', auth, validate(collectionsQuerySchema, 'query'), interactionController.getCollections);
router.get('/collections/folders', auth, interactionController.getFolders);
router.post('/collections/folders', auth, validate(folderNameSchema), interactionController.createFolder);
router.put('/collections/folders/:id', auth, validate(folderNameSchema), interactionController.updateFolder);
router.delete('/collections/folders/:id', auth, interactionController.deleteFolder);

router.get('/reading-history', auth, validate(schemas.pagination, 'query'), interactionController.getReadingHistory);
router.delete('/reading-history', auth, interactionController.clearReadingHistory);
router.delete('/reading-history/:id', auth, interactionController.deleteReadingHistoryItem);

export default router;
