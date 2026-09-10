import cacheRoutes from '#cache/cache.routes.js';
import { requireAdmin } from '#middlewares/middlewares.js';
import userAdminRoutes from '#user/user.admin.routes.js';
import express from 'express';

const router = express.Router();

// Applied once for every admin route mounted below.
router.use(requireAdmin);

router.use('/users', userAdminRoutes);
router.use('/cache', cacheRoutes);

export default router;
