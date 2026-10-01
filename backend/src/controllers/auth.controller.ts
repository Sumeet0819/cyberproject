import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { RegisterSchema, LoginSchema } from '../validations/auth.schema';
import { ZodError } from 'zod';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = RegisterSchema.parse(req.body);
      const data = await authService.registerUser(validatedData);
      
      if (data.session) {
        res.cookie('auth_token', data.session.access_token, COOKIE_OPTIONS);
      }

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: data.user?.id,
            email: data.user?.email,
          }
        }
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: error.issues }
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Registration failed', code: 'REGISTRATION_ERROR' }
      });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = LoginSchema.parse(req.body);
      const data = await authService.loginUser(validatedData);

      if (data.session) {
        res.cookie('auth_token', data.session.access_token, COOKIE_OPTIONS);
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
          }
        }
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: error.issues }
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }
      });
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('auth_token');
    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' }
    });
  },

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
         res.status(401).json({
          success: false,
          error: { message: 'Not authenticated', code: 'UNAUTHORIZED' }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get user profile', code: 'INTERNAL_ERROR' }
      });
    }
  },

  async getWsToken(req: Request, res: Response): Promise<void> {
    try {
      let token = req.cookies?.auth_token;
      if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        res.status(401).json({
          success: false,
          error: { message: 'Not authenticated', code: 'UNAUTHORIZED' }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          token
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve ws token', code: 'INTERNAL_ERROR' }
      });
    }
  }
};

