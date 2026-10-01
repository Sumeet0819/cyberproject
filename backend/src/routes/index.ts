import { Router } from 'express';
import authRoutes from './auth.routes';
import websiteRoutes from './website.routes';
import badgeRoutes from './badge.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/websites', websiteRoutes);
router.use('/badges', badgeRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

export default router;
