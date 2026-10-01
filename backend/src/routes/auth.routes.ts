import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authenticateUser, authController.logout);
router.get('/me', authenticateUser, authController.getMe);
router.get('/ws-token', authenticateUser, authController.getWsToken);

export default router;

