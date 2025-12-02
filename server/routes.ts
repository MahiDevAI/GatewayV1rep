import express, { type Express, type Request, type Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authMiddleware,
  adminMiddleware,
  apiKeyAuthMiddleware,
  generateOrderId,
  generateUpiIntentUrl,
  extractOrderIdFromNotification,
  logAudit,
  regenerateApiKeys,
} from "./auth";
import { insertMerchantSchema, insertDomainSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadsDir = path.join(process.cwd(), 'uploads');
const kycDir = path.join(uploadsDir, 'kyc');
const logosDir = path.join(uploadsDir, 'logos');
const qrDir = path.join(uploadsDir, 'qr');

[uploadsDir, kycDir, logosDir, qrDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const kycStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, kycDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logosDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const qrStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, qrDir),
  filename: (req, file, cb) => {
    const orderId = req.query.order_id || 'unknown';
    cb(null, `${orderId}${path.extname(file.originalname)}`);
  }
});

const uploadKyc = multer({
  storage: kycStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG files are allowed'));
    }
  }
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG files are allowed'));
    }
  }
});

const uploadQR = multer({
  storage: qrStorage,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG files are allowed'));
    }
  }
});

let orderExpiryInterval: NodeJS.Timeout | null = null;

async function processExpiredOrders() {
  try {
    const expiredOrders = await storage.getExpiredPendingOrders();
    for (const order of expiredOrders) {
      await storage.updateOrderStatus(order.order_id, 'EXPIRED');
      await logAudit('SYSTEM', null, 'ORDER_EXPIRED', {
        order_id: order.order_id,
        merchant_id: order.merchant_id,
      });
    }
  } catch (error) {
    console.error('Error processing expired orders:', error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  orderExpiryInterval = setInterval(processExpiredOrders, 30000);
  
  app.use('/uploads', (req, res, next) => {
    res.header('Cache-Control', 'public, max-age=86400');
    next();
  });
  app.use('/uploads/logos', express.static(logosDir));
  app.use('/uploads/qr', express.static(qrDir));

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        business_name: z.string().min(1),
        phone: z.string().optional(),
      });
      
      const data = schema.parse(req.body);
      
      const existing = await storage.getMerchantByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      const hashedPassword = hashPassword(data.password);
      
      const merchant = await storage.createMerchant({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        business_name: data.business_name,
        phone: data.phone || null,
      });
      
      await logAudit(data.email, merchant.id, 'REGISTER', {
        business_name: data.business_name,
      }, req.ip);
      
      const token = generateToken(merchant.id, merchant.role);
      
      res.status(201).json({
        message: 'Registration successful',
        token,
        merchant: {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email,
          business_name: merchant.business_name,
          role: merchant.role,
          api_key: merchant.api_key,
          api_secret: merchant.api_secret,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
      }
      
      const merchant = await storage.getMerchantByEmail(email);
      if (!merchant) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      if (!verifyPassword(password, merchant.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      await logAudit(email, merchant.id, 'LOGIN', {
        success: true,
      }, req.ip);
      
      const token = generateToken(merchant.id, merchant.role);
      
      res.json({
        token,
        merchant: {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email,
          business_name: merchant.business_name,
          role: merchant.role,
          logo_path: merchant.logo_path,
          kyc_status: merchant.kyc_status,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/merchant/profile', authMiddleware, async (req: Request, res: Response) => {
    try {
      const merchant = req.merchant!;
      const domains = await storage.getDomainsByMerchant(merchant.id);
      
      res.json({
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        business_name: merchant.business_name,
        phone: merchant.phone,
        role: merchant.role,
        api_key: merchant.api_key,
        logo_path: merchant.logo_path,
        kyc_status: merchant.kyc_status,
        kyc_pan_path: merchant.kyc_pan_path ? true : false,
        kyc_aadhaar_path: merchant.kyc_aadhaar_path ? true : false,
        domains: domains.map(d => ({ id: d.id, domain: d.domain })),
        created_at: merchant.created_at,
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  app.post('/api/merchant/kyc/pan', authMiddleware, uploadKyc.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      await storage.updateMerchant(req.merchant!.id, {
        kyc_pan_path: req.file.path,
        kyc_status: 'PENDING',
      });
      
      await logAudit(req.merchant!.email, req.merchant!.id, 'KYC_UPLOAD', {
        type: 'PAN',
        filename: req.file.filename,
      }, req.ip);
      
      res.json({ message: 'PAN uploaded successfully' });
    } catch (error) {
      console.error('PAN upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  app.post('/api/merchant/kyc/aadhaar', authMiddleware, uploadKyc.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      await storage.updateMerchant(req.merchant!.id, {
        kyc_aadhaar_path: req.file.path,
        kyc_status: 'PENDING',
      });
      
      await logAudit(req.merchant!.email, req.merchant!.id, 'KYC_UPLOAD', {
        type: 'AADHAAR',
        filename: req.file.filename,
      }, req.ip);
      
      res.json({ message: 'Aadhaar uploaded successfully' });
    } catch (error) {
      console.error('Aadhaar upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  app.post('/api/merchant/logo', authMiddleware, uploadLogo.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      
      await storage.updateMerchant(req.merchant!.id, {
        logo_path: logoUrl,
      });
      
      await logAudit(req.merchant!.email, req.merchant!.id, 'LOGO_UPLOAD', {
        filename: req.file.filename,
      }, req.ip);
      
      res.json({ message: 'Logo uploaded successfully', logo_path: logoUrl });
    } catch (error) {
      console.error('Logo upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  app.get('/api/merchant/domains', authMiddleware, async (req: Request, res: Response) => {
    try {
      const domains = await storage.getDomainsByMerchant(req.merchant!.id);
      res.json(domains);
    } catch (error) {
      console.error('Domains fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch domains' });
    }
  });

  app.post('/api/merchant/domains', authMiddleware, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        domain: z.string().regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i, 'Invalid domain format'),
      });
      
      const { domain } = schema.parse(req.body);
      
      const newDomain = await storage.addDomain(req.merchant!.id, domain);
      
      await logAudit(req.merchant!.email, req.merchant!.id, 'DOMAIN_ADD', {
        domain,
      }, req.ip);
      
      res.status(201).json(newDomain);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid domain format' });
      }
      console.error('Domain add error:', error);
      res.status(500).json({ message: 'Failed to add domain' });
    }
  });

  app.delete('/api/merchant/domains/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.removeDomain(req.params.id);
      
      await logAudit(req.merchant!.email, req.merchant!.id, 'DOMAIN_REMOVE', {
        domain_id: req.params.id,
      }, req.ip);
      
      res.json({ message: 'Domain removed' });
    } catch (error) {
      console.error('Domain remove error:', error);
      res.status(500).json({ message: 'Failed to remove domain' });
    }
  });

  app.post('/api/merchant/regenerate-keys', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { apiKey, apiSecret } = regenerateApiKeys();
      
      await storage.updateMerchant(req.merchant!.id, {
        api_key: apiKey,
        api_secret: apiSecret,
      });
      
      await logAudit(req.merchant!.email, req.merchant!.id, 'API_KEY_REGENERATE', {}, req.ip);
      
      res.json({
        message: 'API keys regenerated successfully',
        api_key: apiKey,
        api_secret: apiSecret,
      });
    } catch (error) {
      console.error('Key regeneration error:', error);
      res.status(500).json({ message: 'Failed to regenerate keys' });
    }
  });

  app.post('/api/v1/orders', apiKeyAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        customer_name: z.string().min(1),
        customer_mobile: z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits'),
        amount: z.number().positive(),
        receiver_upi_id: z.string().min(1),
        metadata: z.any().optional(),
      });
      
      const data = schema.parse(req.body);
      
      const orderId = generateOrderId();
      
      const order = await storage.createOrder({
        order_id: orderId,
        merchant_id: req.merchant!.id,
        customer_name: data.customer_name,
        customer_mobile: data.customer_mobile,
        amount: Math.round(data.amount * 100),
        receiver_upi_id: data.receiver_upi_id,
        status: 'CREATED',
        metadata: data.metadata || null,
      });
      
      const upiIntentUrl = generateUpiIntentUrl(
        data.receiver_upi_id,
        req.merchant!.business_name,
        data.amount,
        orderId
      );
      
      await logAudit(req.merchant!.email, req.merchant!.id, 'CREATE_ORDER', {
        order_id: orderId,
        amount: data.amount,
        customer_mobile: data.customer_mobile,
      }, req.ip);
      
      res.status(201).json({
        order_id: orderId,
        status: order.status,
        amount: data.amount,
        upi_intent_url: upiIntentUrl,
        created_at: order.created_at,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Order creation error:', error);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  app.post('/api/v1/qr/upload', async (req: Request, res: Response) => {
    uploadQR.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      
      try {
        const orderId = req.query.order_id as string;
        
        if (!orderId) {
          return res.status(400).json({ message: 'order_id is required' });
        }
        
        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({ message: 'Order not found' });
        }
        
        if (order.status !== 'CREATED') {
          return res.status(400).json({ message: 'Order is not in CREATED status' });
        }
        
        const qrPath = req.file ? `/uploads/qr/${req.file.filename}` : null;
        
        await storage.updateOrderStatus(orderId, 'PENDING');
        if (qrPath) {
          const updatedOrder = await storage.getOrder(orderId);
          if (updatedOrder) {
            await storage.updateMerchant(order.merchant_id, {});
          }
        }
        
        await logAudit('SYSTEM', order.merchant_id, 'QR_UPLOAD', {
          order_id: orderId,
        });
        
        res.json({
          message: 'QR uploaded and order is now PENDING',
          order_id: orderId,
          status: 'PENDING',
          qr_path: qrPath,
        });
      } catch (error) {
        console.error('QR upload error:', error);
        res.status(500).json({ message: 'Failed to process QR upload' });
      }
    });
  });

  app.get('/api/v1/orders/:orderId', async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      const transaction = await storage.getTransactionByOrderId(order.order_id);
      
      res.json({
        order_id: order.order_id,
        merchant_id: order.merchant_id,
        customer_name: order.customer_name,
        customer_mobile: order.customer_mobile,
        amount: order.amount / 100,
        receiver_upi_id: order.receiver_upi_id,
        status: order.status === 'EXPIRED' ? 'FAILED' : order.status,
        internal_status: order.status,
        qr_path: order.qr_path,
        created_at: order.created_at,
        pending_at: order.pending_at,
        completed_at: order.completed_at,
        expired_at: order.expired_at,
        transaction: transaction ? {
          payer_name: transaction.payer_name,
          is_late_payment: transaction.is_late_payment,
          created_at: transaction.created_at,
        } : null,
      });
    } catch (error) {
      console.error('Order fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch order' });
    }
  });

  app.get('/api/merchant/orders', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { status, start_date, end_date } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (start_date) filters.startDate = new Date(start_date as string);
      if (end_date) filters.endDate = new Date(end_date as string);
      
      const orders = await storage.getOrdersByMerchant(req.merchant!.id, filters);
      
      res.json(orders.map(o => ({
        ...o,
        amount: o.amount / 100,
        status: o.status === 'EXPIRED' ? 'FAILED' : o.status,
        internal_status: o.status,
      })));
    } catch (error) {
      console.error('Orders fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.post('/api/merchant/orders', authMiddleware, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        customer_name: z.string().min(1),
        customer_mobile: z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits'),
        amount: z.number().positive(),
        receiver_upi_id: z.string().min(1),
        metadata: z.any().optional(),
      });
      
      const data = schema.parse(req.body);
      const orderId = generateOrderId();
      
      const order = await storage.createOrder({
        order_id: orderId,
        merchant_id: req.merchant!.id,
        customer_name: data.customer_name,
        customer_mobile: data.customer_mobile,
        amount: Math.round(data.amount * 100),
        receiver_upi_id: data.receiver_upi_id,
        status: 'CREATED',
        metadata: data.metadata || null,
      });
      
      const upiIntentUrl = generateUpiIntentUrl(
        data.receiver_upi_id,
        req.merchant!.business_name,
        data.amount,
        orderId
      );
      
      await logAudit(req.merchant!.email, req.merchant!.id, 'CREATE_ORDER', {
        order_id: orderId,
        amount: data.amount,
      }, req.ip);
      
      res.status(201).json({
        order_id: orderId,
        status: order.status,
        amount: data.amount,
        upi_intent_url: upiIntentUrl,
        customer_name: order.customer_name,
        customer_mobile: order.customer_mobile,
        receiver_upi_id: order.receiver_upi_id,
        created_at: order.created_at,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Order creation error:', error);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  app.post('/api/v1/notifications', async (req: Request, res: Response) => {
    try {
      const notification = req.body;
      
      const { orderId, payerName } = extractOrderIdFromNotification(notification);
      
      if (!orderId) {
        await storage.createUnmappedNotification(notification);
        return res.json({
          status: 'UNMAPPED',
          message: 'No order ID found in notification',
        });
      }
      
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        await storage.createUnmappedNotification(notification);
        return res.json({
          status: 'UNMAPPED',
          message: 'Order not found',
          order_id: orderId,
        });
      }
      
      const existingTransaction = await storage.getTransactionByOrderId(orderId);
      if (existingTransaction) {
        await logAudit('SYSTEM', order.merchant_id, 'DUPLICATE_NOTIFICATION', {
          order_id: orderId,
          notification,
        });
        return res.json({
          status: 'DUPLICATE',
          message: 'Payment already recorded',
          order_id: orderId,
        });
      }
      
      const pendingAt = order.pending_at ? new Date(order.pending_at).getTime() : 0;
      const now = Date.now();
      const isLate = (now - pendingAt) > 2 * 60 * 1000;
      
      await storage.createTransaction({
        order_id: orderId,
        merchant_id: order.merchant_id,
        payer_name: payerName || 'Unknown',
        notification_json: notification,
        is_late_payment: isLate,
      });
      
      if (order.status === 'PENDING' && !isLate) {
        await storage.updateOrderStatus(orderId, 'COMPLETED');
        
        await logAudit('SYSTEM', order.merchant_id, 'PAYMENT_COMPLETED', {
          order_id: orderId,
          payer_name: payerName,
        });
        
        res.json({
          status: 'COMPLETED',
          message: 'Payment recorded successfully',
          order_id: orderId,
        });
      } else {
        await logAudit('SYSTEM', order.merchant_id, 'LATE_PAYMENT', {
          order_id: orderId,
          payer_name: payerName,
          order_status: order.status,
        });
        
        res.json({
          status: 'LATE_PAYMENT',
          message: 'Payment recorded as late',
          order_id: orderId,
          order_status: order.status,
        });
      }
    } catch (error) {
      console.error('Notification processing error:', error);
      res.status(500).json({ message: 'Failed to process notification' });
    }
  });

  app.get('/api/merchant/transactions', authMiddleware, async (req: Request, res: Response) => {
    try {
      const transactions = await storage.getTransactionsByMerchant(req.merchant!.id);
      res.json(transactions);
    } catch (error) {
      console.error('Transactions fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  app.get('/api/merchant/dashboard', authMiddleware, async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrdersByMerchant(req.merchant!.id);
      
      const totalVolume = orders
        .filter(o => o.status === 'COMPLETED')
        .reduce((acc, o) => acc + o.amount, 0) / 100;
      
      const completedCount = orders.filter(o => o.status === 'COMPLETED').length;
      const successRate = orders.length > 0 ? (completedCount / orders.length) * 100 : 0;
      const pendingCount = orders.filter(o => o.status === 'PENDING').length;
      const uniqueCustomers = new Set(orders.map(o => o.customer_mobile)).size;
      
      const recentOrders = orders.slice(0, 5).map(o => ({
        ...o,
        amount: o.amount / 100,
        status: o.status === 'EXPIRED' ? 'FAILED' : o.status,
      }));
      
      res.json({
        stats: {
          total_volume: totalVolume,
          success_rate: successRate.toFixed(1),
          pending_orders: pendingCount,
          total_customers: uniqueCustomers,
        },
        recent_orders: recentOrders,
      });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
  });

  app.get('/api/merchant/reports', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      
      const filters: any = {};
      if (start_date) filters.startDate = new Date(start_date as string);
      if (end_date) filters.endDate = new Date(end_date as string);
      
      const orders = await storage.getOrdersByMerchant(req.merchant!.id, filters);
      
      const dailyData: { [key: string]: { volume: number; count: number; success: number } } = {};
      
      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { volume: 0, count: 0, success: 0 };
        }
        dailyData[date].count++;
        if (order.status === 'COMPLETED') {
          dailyData[date].volume += order.amount / 100;
          dailyData[date].success++;
        }
      });
      
      const chartData = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([date, data]) => ({
          date,
          volume: data.volume,
          count: data.count,
          success_rate: data.count > 0 ? (data.success / data.count) * 100 : 0,
        }));
      
      res.json({
        summary: {
          total_orders: orders.length,
          total_volume: orders.filter(o => o.status === 'COMPLETED').reduce((a, o) => a + o.amount, 0) / 100,
          success_rate: orders.length > 0 
            ? (orders.filter(o => o.status === 'COMPLETED').length / orders.length) * 100 
            : 0,
        },
        chart_data: chartData,
        orders: orders.map(o => ({
          ...o,
          amount: o.amount / 100,
          status: o.status === 'EXPIRED' ? 'FAILED' : o.status,
        })),
      });
    } catch (error) {
      console.error('Reports fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  app.get('/api/admin/merchants', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const allMerchants = await storage.getAllMerchants();
      res.json(allMerchants.filter(m => m.role !== 'ADMIN').map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        business_name: m.business_name,
        kyc_status: m.kyc_status,
        created_at: m.created_at,
      })));
    } catch (error) {
      console.error('Admin merchants fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch merchants' });
    }
  });

  app.patch('/api/admin/merchants/:id/kyc', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      
      if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Invalid KYC status' });
      }
      
      const merchant = await storage.updateMerchant(req.params.id, {
        kyc_status: status,
      });
      
      if (!merchant) {
        return res.status(404).json({ message: 'Merchant not found' });
      }
      
      await logAudit(req.merchant!.email, req.merchant!.id, 'KYC_STATUS_UPDATE', {
        merchant_id: req.params.id,
        new_status: status,
      }, req.ip);
      
      res.json({ message: 'KYC status updated', merchant });
    } catch (error) {
      console.error('KYC update error:', error);
      res.status(500).json({ message: 'Failed to update KYC status' });
    }
  });

  app.get('/api/admin/unmapped-notifications', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getUnmappedNotifications();
      res.json(notifications);
    } catch (error) {
      console.error('Unmapped notifications fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch unmapped notifications' });
    }
  });

  app.get('/api/admin/audit-logs', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { actor, action, limit } = req.query;
      
      const logs = await storage.getAuditLogs({
        actor: actor as string,
        action: action as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(logs);
    } catch (error) {
      console.error('Audit logs fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  app.get('/api/admin/dashboard', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const allMerchants = await storage.getAllMerchants();
      const merchants = allMerchants.filter(m => m.role !== 'ADMIN');
      
      res.json({
        stats: {
          total_merchants: merchants.length,
          pending_kyc: merchants.filter(m => m.kyc_status === 'PENDING').length,
          verified_merchants: merchants.filter(m => m.kyc_status === 'VERIFIED').length,
        },
        merchants: merchants.map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          business_name: m.business_name,
          kyc_status: m.kyc_status,
          created_at: m.created_at,
        })),
      });
    } catch (error) {
      console.error('Admin dashboard fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch admin dashboard' });
    }
  });

  return httpServer;
}
