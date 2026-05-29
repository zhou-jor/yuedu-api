import { Router } from 'express';
import { validate, schemas } from '../middleware/validate';
import { categoryController } from '../controllers/categoryController';

const router = Router();

router.get('/', categoryController.getAll);
router.get('/:id/articles', validate(schemas.pagination, 'query'), categoryController.getArticles);

export default router;
