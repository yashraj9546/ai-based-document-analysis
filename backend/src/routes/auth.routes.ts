import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', (req, res, next) => {
  authController.register(req, res, next);
});

router.post('/login', (req, res, next) => {
  authController.login(req, res, next);
});

router.post('/refresh', (req, res, next) => {
  authController.refresh(req, res, next);
});

// Protected routes
router.get('/me', authenticate, (req, res, next) => {
  authController.me(req, res, next);
});

export default router;
