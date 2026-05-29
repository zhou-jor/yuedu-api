import { Router } from 'express';
import Joi from 'joi';
import { auth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { notificationController } from '../controllers/notificationController';

const router = Router();

const listQuerySchema = schemas.pagination.keys({
  type: Joi.string().valid('interaction', 'follow', 'system'),
});

const readAllSchema = Joi.object({
  type: Joi.string().valid('interaction', 'follow', 'system'),
});

router.get('/', auth, validate(listQuerySchema, 'query'), notificationController.getList);
router.put('/read-all', auth, validate(readAllSchema), notificationController.readAll);
router.put('/:id/read', auth, notificationController.readOne);
router.get('/unread-count', auth, notificationController.getUnreadCount);

export default router;
