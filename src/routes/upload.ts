import { Router } from 'express';
import { auth } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';
import { uploadController } from '../controllers/uploadController';

const router = Router();

router.post('/image', auth, uploadLimiter, uploadController.uploadImage);
router.post('/avatar', auth, uploadLimiter, uploadController.uploadAvatar);
router.post('/audio', auth, uploadLimiter, uploadController.uploadAudio);

export default router;
