import { Router } from 'express';
import Joi from 'joi';
import { auth, optionalAuth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { userController } from '../controllers/userController';

const router = Router();

const updateProfileSchema = Joi.object({
  nickname: Joi.string().min(1).max(20),
  bio: Joi.string().max(100).allow(''),
  gender: Joi.string().valid('male', 'female', 'unknown'),
  birthday: Joi.date().iso(),
  region: Joi.string().max(50).allow(''),
  settings: Joi.object({
    darkMode: Joi.boolean(),
    fontSize: Joi.string().valid('small', 'medium', 'large'),
    pushNotification: Joi.boolean(),
    commentNotification: Joi.boolean(),
    followerNotification: Joi.boolean(),
    systemNotification: Joi.boolean(),
  }),
}).min(1);

const interestsSchema = Joi.object({
  interests: Joi.array().items(Joi.string().max(20)).min(1).max(20).required(),
});

const deleteAccountSchema = Joi.object({
  confirm: Joi.string().valid('DELETE').required(),
});

const activitiesQuerySchema = schemas.pagination;

router.get('/me', auth, userController.getMe);
router.put('/me', auth, validate(updateProfileSchema), userController.updateProfile);
router.put('/me/avatar', auth, userController.updateAvatar);
router.put('/me/interests', auth, validate(interestsSchema), userController.updateInterests);
router.get('/me/reading-stats', auth, userController.getReadingStats);
router.get('/me/activities', auth, validate(activitiesQuerySchema, 'query'), userController.getActivities);
router.get('/recommended', auth, userController.getRecommended);
router.get('/blocked', auth, userController.getBlocked);
router.delete('/me', auth, validate(deleteAccountSchema), userController.deleteAccount);

router.get('/:id/followers', validate(schemas.pagination, 'query'), userController.getFollowers);
router.get('/:id/following', validate(schemas.pagination, 'query'), userController.getFollowing);

router.get('/:id', optionalAuth, userController.getUserById);
router.post('/:id/follow', auth, userController.follow);
router.delete('/:id/follow', auth, userController.unfollow);
router.post('/:id/block', auth, userController.block);
router.delete('/:id/block', auth, userController.unblock);

export default router;
