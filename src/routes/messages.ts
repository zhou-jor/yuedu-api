import { Router } from 'express';
import Joi from 'joi';
import { auth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { messageController } from '../controllers/messageController';

const router = Router();

const createConversationSchema = Joi.object({
  targetUserId: schemas.objectId.required(),
});

const sendMessageSchema = Joi.object({
  type: Joi.string()
    .valid('text', 'image', 'article_share', 'audio', 'system')
    .default('text'),
  content: Joi.string().max(5000).default(''),
  articleRef: schemas.objectId,
});

const recallSchema = Joi.object({
  messageId: schemas.objectId.required(),
});

const pinSchema = Joi.object({
  isPinned: Joi.boolean().required(),
});

router.get('/conversations', auth, validate(schemas.pagination, 'query'), messageController.getConversations);
router.post('/conversations', auth, validate(createConversationSchema), messageController.createConversation);
router.get('/conversations/:id', auth, validate(schemas.pagination, 'query'), messageController.getMessages);
router.get('/unread-count', auth, messageController.getUnreadCount);
router.post('/conversations/:id/send', auth, validate(sendMessageSchema), messageController.sendMessage);
router.post('/conversations/:id/recall', auth, validate(recallSchema), messageController.recallMessage);
router.put('/conversations/:id/read', auth, messageController.markRead);
router.delete('/conversations/:id', auth, messageController.deleteConversation);
router.put('/conversations/:id/pin', auth, validate(pinSchema), messageController.pinConversation);

export default router;
