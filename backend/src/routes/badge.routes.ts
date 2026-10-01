import { Router } from 'express';
import { badgeController } from '../controllers/badge.controller';

const router = Router();

// Public routes for badge rendering & embed code extraction
router.get('/:websiteId.svg', badgeController.renderBadge);
router.get('/:websiteId/info', badgeController.getBadgeInfo);
router.get('/:websiteId', badgeController.renderBadge);

export default router;
