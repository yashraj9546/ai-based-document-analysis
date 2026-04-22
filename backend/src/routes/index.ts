import { Router } from 'express';
import authRoutes from './auth.routes';
import documentRoutes from './document.routes';
import queryRoutes from './query.routes';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes (require JWT)
router.use('/documents', authenticate, documentRoutes);
router.use('/', authenticate, queryRoutes);

// Health check (public)
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
