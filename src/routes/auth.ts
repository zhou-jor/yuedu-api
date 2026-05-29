import { Router } from 'express';
import Joi from 'joi';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import { authController } from '../controllers/authController';

const router = Router();

const phoneSchema = Joi.string().pattern(/^1[3-9]\d{9}$/).required();

const sendCodeSchema = Joi.object({
  phone: phoneSchema,
});

const loginSchema = Joi.object({
  phone: phoneSchema,
  code: Joi.string().length(6).required(),
});

const thirdPartySchema = Joi.object({
  provider: Joi.string().valid('wechat', 'qq', 'apple', 'weibo').required(),
  code: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const passwordSchema = Joi.object({
  oldPassword: Joi.string().allow('').default(''),
  newPassword: Joi.string().min(6).max(32).required(),
});

const phoneChangeSchema = Joi.object({
  newPhone: phoneSchema,
  code: Joi.string().length(6).required(),
});

const bindSchema = Joi.object({
  code: Joi.string().required(),
});

router.post('/send-code', authLimiter, validate(sendCodeSchema), authController.sendCode);
router.post('/login', validate(loginSchema), authController.login);
router.post('/login/third-party', validate(thirdPartySchema), authController.loginThirdParty);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', auth, authController.logout);
router.post('/bind/:provider', auth, validate(bindSchema), authController.bindProvider);
router.delete('/bind/:provider', auth, authController.unbindProvider);
router.put('/password', auth, validate(passwordSchema), authController.changePassword);
router.put('/phone', auth, validate(phoneChangeSchema), authController.changePhone);

export default router;
