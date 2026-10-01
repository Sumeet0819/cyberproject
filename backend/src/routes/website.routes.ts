import { Router } from 'express';
import { websiteController } from '../controllers/website.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All website routes require authentication
router.use(authenticateUser);

router.post('/', websiteController.createWebsite);
router.get('/', websiteController.getWebsites);
router.get('/:id', websiteController.getWebsiteById);
router.get('/:id/report', websiteController.getLatestReport);
router.get('/:id/report/pdf', websiteController.exportReportPdf);
router.post('/:id/scan', websiteController.scanWebsite);
router.get('/:id/verification', websiteController.getVerificationInfo);
router.post('/:id/verification/verify', websiteController.verifyDomain);
router.get('/:id/history', websiteController.getReportHistory);
router.get('/:id/drift', websiteController.getScanDrift);
router.patch('/:id/monitoring', websiteController.updateMonitoringSettings);
router.post('/:id/monitoring/test', websiteController.testNotification);

export default router;
