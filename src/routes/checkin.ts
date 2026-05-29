import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { checkinController } from '../controllers/checkinController';

const router = Router();

router.post('/', auth, checkinController.checkin);
router.get('/status', auth, checkinController.getStatus);
router.get('/tasks', auth, checkinController.getTasks);
router.post('/tasks/:id/claim', auth, checkinController.claimReward);
router.get('/points', auth, validate(schemas.pagination, 'query'), checkinController.getPoints);

export default router;
