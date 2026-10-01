import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const verifyHmacSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-scanner-signature'] as string;
  const timestamp = req.headers['x-scanner-timestamp'] as string;

  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing authentication headers' });
  }

  // Check timestamp to prevent replay attacks (e.g., 60 seconds tolerance)
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  if (Math.abs(currentTime - requestTime) > 60000) {
    return res.status(401).json({ error: 'Request timestamp expired' });
  }

  const secret = process.env.INTERNAL_SECRET;
  if (!secret) {
    console.error('INTERNAL_SECRET is not configured');
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Recreate the signature
  const payload = `${timestamp}.${JSON.stringify(req.body)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Time-safe comparison
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};
