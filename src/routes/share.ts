import { Router } from 'express';
import { shareController } from '../controllers/shareController';

const router = Router();

router.get('/poster/:articleId', shareController.getPosterData);
router.get('/landing/:articleId', shareController.getLandingData);

export default router;
