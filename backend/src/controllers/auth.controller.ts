import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiError } from '../middleware/errorHandler';

/**
 * Auth Controller - handles registration, login, token refresh, and profile
 */
export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ApiError(400, 'Please provide a valid email address');
      }

      const result = await authService.register(email, password, name);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
        message: 'Account created successfully',
      });
    } catch (error: any) {
      if (error.message === 'An account with this email already exists') {
        next(new ApiError(409, error.message));
      } else if (error.message === 'Password must be at least 8 characters long') {
        next(new ApiError(400, error.message));
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
      }

      const result = await authService.login(email, password);

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
        message: 'Logged in successfully',
      });
    } catch (error: any) {
      if (error.message === 'Invalid email or password') {
        next(new ApiError(401, error.message));
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ApiError(400, 'Refresh token is required');
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error: any) {
      if (error.message === 'Invalid or expired refresh token') {
        next(new ApiError(401, error.message));
      } else {
        next(error);
      }
    }
  }

  /**
   * GET /api/auth/me
   * Returns the authenticated user's profile
   */
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const user = await authService.getProfile(req.user.userId);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
