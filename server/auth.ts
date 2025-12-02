import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { Merchant } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      merchant?: Merchant;
      session?: {
        merchantId?: string;
        role?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export function generateToken(merchantId: string, role: string): string {
  const payload = {
    merchantId,
    role,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): { merchantId: string; role: string } | null {
  try {
    const [data, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(data, 'base64').toString());
    
    if (payload.exp < Date.now()) {
      return null;
    }
    
    return { merchantId: payload.merchantId, role: payload.role };
  } catch {
    return null;
  }
}

export function generateHmacSignature(apiSecret: string, body: string): string {
  return crypto.createHmac('sha256', apiSecret).update(body).digest('hex');
}

export function verifyHmacSignature(apiSecretHash: string, body: string, providedSignature: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', apiSecretHash).update(body).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  
  const merchant = await storage.getMerchant(decoded.merchantId);
  if (!merchant) {
    return res.status(401).json({ message: 'Merchant not found' });
  }
  
  req.merchant = merchant;
  req.session = { merchantId: decoded.merchantId, role: decoded.role };
  next();
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.merchant || req.merchant.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

export async function apiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  const signature = req.headers['x-signature'] as string;
  const origin = req.headers.origin || req.headers.referer || '';
  
  if (!apiKey) {
    return res.status(401).json({ message: 'API key required' });
  }
  
  if (!signature) {
    return res.status(401).json({ message: 'Signature required' });
  }
  
  const merchant = await storage.getMerchantByApiKey(apiKey);
  if (!merchant) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  
  let domain = '';
  try {
    if (origin) {
      const url = new URL(origin);
      domain = url.hostname;
    }
  } catch {
    domain = origin.replace(/^https?:\/\//, '').split('/')[0];
  }
  
  if (domain && domain !== 'localhost' && !domain.includes('replit')) {
    const isWhitelisted = await storage.isDomainWhitelisted(merchant.id, domain);
    if (!isWhitelisted) {
      return res.status(403).json({ message: 'Domain not allowed' });
    }
  }
  
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  
  try {
    const isValid = verifyHmacSignature(merchant.api_secret_hash!, rawBody, signature);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid signature' });
    }
  } catch {
    return res.status(401).json({ message: 'Invalid signature format' });
  }
  
  req.merchant = merchant;
  next();
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return timestamp + random;
}

export function generateUpiIntentUrl(
  upiId: string,
  merchantName: string,
  amount: number,
  orderId: string
): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: merchantName,
    am: amount.toFixed(2),
    tr: orderId,
    tn: orderId,
    cu: 'INR',
  });
  return `upi://pay?${params.toString()}`;
}

export function extractOrderIdFromNotification(notification: {
  'android.title'?: string;
  'android.text'?: string;
  'android.bigText'?: string;
}): { orderId: string | null; payerName: string | null } {
  let payerName: string | null = null;
  let orderId: string | null = null;
  
  if (notification['android.title']) {
    const titleMatch = notification['android.title'].match(/^(.+?)\s+paid you/i);
    if (titleMatch) {
      payerName = titleMatch[1].trim();
    }
  }
  
  const textSource = notification['android.bigText'] || notification['android.text'] || '';
  const orderIdMatch = textSource.match(/\b(\d{10})\b/);
  if (orderIdMatch) {
    orderId = orderIdMatch[1];
  }
  
  return { orderId, payerName };
}

export async function logAudit(
  actor: string,
  actorId: string | null,
  action: string,
  details: object,
  ipAddress?: string
) {
  try {
    await storage.createAuditLog({
      actor,
      actor_id: actorId,
      action,
      details_json: details,
      ip_address: ipAddress || null,
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

export function regenerateApiKeys(): { apiKey: string; apiSecret: string; apiSecretHash: string } {
  const apiKey = `cp_live_${crypto.randomBytes(16).toString('hex')}`;
  const apiSecret = crypto.randomBytes(32).toString('hex');
  const apiSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');
  return { apiKey, apiSecret, apiSecretHash };
}
