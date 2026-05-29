import { Router } from 'express';
import { configController } from '../controllers/configController';

const router = Router();

router.get('/client', configController.getClientConfig);
router.get('/banners', configController.getBanners);
router.get('/columns', configController.getColumns);
router.get('/interest-tags', configController.getInterestTags);

export default router;
