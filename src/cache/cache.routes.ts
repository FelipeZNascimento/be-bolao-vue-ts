import { CacheController } from '#cache/cache.controller.js';
import express from 'express';

const router = express.Router();
const cacheController = new CacheController();

router.get('/', cacheController.getOverview);
router.get('/:key', cacheController.getEntry);

export default router;
