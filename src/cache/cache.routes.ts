import { CacheController } from '#cache/cache.controller.js';
import { requireAdmin } from '#middlewares/middlewares.js';
import express from 'express';

const router = express.Router();
const cacheController = new CacheController();

router.get('/', requireAdmin, cacheController.getOverview);
router.get('/:key', requireAdmin, cacheController.getEntry);
router.get('/:key', requireAdmin, cacheController.getEntry);

export default router;
