import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback_secret_key';

export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token = req.cookies?.auth_token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' }
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string, email: string };
    
    req.user = {
      id: decoded.sub,
      email: decoded.email
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED' }
    });
    return;
  }
};
