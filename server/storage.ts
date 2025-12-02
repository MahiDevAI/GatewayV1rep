import { db } from "./db";
import { eq, and, desc, gte, lte, sql, or, like } from "drizzle-orm";
import {
  merchants,
  merchant_domains,
  orders,
  transactions,
  unmapped_notifications,
  audit_logs,
  type Merchant,
  type MerchantDomain,
  type Order,
  type Transaction,
  type AuditLog,
  type UnmappedNotification,
  type InsertMerchant,
  type InsertMerchantDomain,
  type InsertOrder,
  type InsertTransaction,
  type InsertAuditLog,
} from "@shared/schema";
import crypto from "crypto";

export interface IStorage {
  getMerchant(id: string): Promise<Merchant | undefined>;
  getMerchantByEmail(email: string): Promise<Merchant | undefined>;
  getMerchantByApiKey(apiKey: string): Promise<Merchant | undefined>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined>;
  getAllMerchants(): Promise<Merchant[]>;
  
  getDomainsByMerchant(merchantId: string): Promise<MerchantDomain[]>;
  addDomain(merchantId: string, domain: string): Promise<MerchantDomain>;
  removeDomain(domainId: string): Promise<void>;
  isDomainWhitelisted(merchantId: string, domain: string): Promise<boolean>;
  
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(orderId: string): Promise<Order | undefined>;
  getOrdersByMerchant(merchantId: string, filters?: { status?: string; startDate?: Date; endDate?: Date }): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: string, timestamp?: Date): Promise<Order | undefined>;
  getExpiredPendingOrders(): Promise<Order[]>;
  
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByMerchant(merchantId: string): Promise<Transaction[]>;
  getTransactionByOrderId(orderId: string): Promise<Transaction | undefined>;
  
  createUnmappedNotification(notificationJson: object): Promise<UnmappedNotification>;
  getUnmappedNotifications(): Promise<UnmappedNotification[]>;
  
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { actor?: string; action?: string; limit?: number }): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getMerchant(id: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    return merchant;
  }

  async getMerchantByEmail(email: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.email, email.toLowerCase()));
    return merchant;
  }

  async getMerchantByApiKey(apiKey: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.api_key, apiKey));
    return merchant;
  }

  async createMerchant(merchantData: InsertMerchant): Promise<Merchant> {
    const apiKey = `cp_live_${crypto.randomBytes(16).toString('hex')}`;
    const apiSecret = crypto.randomBytes(32).toString('hex');
    
    const [merchant] = await db.insert(merchants).values({
      ...merchantData,
      email: merchantData.email.toLowerCase(),
      api_key: apiKey,
      api_secret: apiSecret,
    }).returning();
    
    return merchant;
  }

  async updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined> {
    const [merchant] = await db.update(merchants)
      .set({ ...data, updated_at: new Date() })
      .where(eq(merchants.id, id))
      .returning();
    return merchant;
  }

  async getAllMerchants(): Promise<Merchant[]> {
    return db.select().from(merchants).orderBy(desc(merchants.created_at));
  }

  async getDomainsByMerchant(merchantId: string): Promise<MerchantDomain[]> {
    return db.select().from(merchant_domains).where(eq(merchant_domains.merchant_id, merchantId));
  }

  async addDomain(merchantId: string, domain: string): Promise<MerchantDomain> {
    const [newDomain] = await db.insert(merchant_domains).values({
      merchant_id: merchantId,
      domain: domain.toLowerCase(),
    }).returning();
    return newDomain;
  }

  async removeDomain(domainId: string): Promise<void> {
    await db.delete(merchant_domains).where(eq(merchant_domains.id, domainId));
  }

  async isDomainWhitelisted(merchantId: string, domain: string): Promise<boolean> {
    const [result] = await db.select()
      .from(merchant_domains)
      .where(and(
        eq(merchant_domains.merchant_id, merchantId),
        eq(merchant_domains.domain, domain.toLowerCase())
      ));
    return !!result;
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  async getOrder(orderId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.order_id, orderId));
    return order;
  }

  async getOrdersByMerchant(
    merchantId: string,
    filters?: { status?: string; startDate?: Date; endDate?: Date }
  ): Promise<Order[]> {
    let query = db.select().from(orders).where(eq(orders.merchant_id, merchantId));
    
    const conditions = [eq(orders.merchant_id, merchantId)];
    
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }
    if (filters?.startDate) {
      conditions.push(gte(orders.created_at, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(orders.created_at, filters.endDate));
    }
    
    return db.select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.created_at));
  }

  async updateOrderStatus(orderId: string, status: string, timestamp?: Date): Promise<Order | undefined> {
    const updateData: any = { status };
    const now = timestamp || new Date();
    
    switch (status) {
      case 'PENDING':
        updateData.pending_at = now;
        break;
      case 'COMPLETED':
        updateData.completed_at = now;
        break;
      case 'EXPIRED':
        updateData.expired_at = now;
        break;
      case 'FAILED':
        updateData.failed_at = now;
        break;
    }
    
    const [order] = await db.update(orders)
      .set(updateData)
      .where(eq(orders.order_id, orderId))
      .returning();
    return order;
  }

  async getExpiredPendingOrders(): Promise<Order[]> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    return db.select()
      .from(orders)
      .where(and(
        eq(orders.status, 'PENDING'),
        lte(orders.pending_at, twoMinutesAgo)
      ));
  }

  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(transactionData).returning();
    return transaction;
  }

  async getTransactionsByMerchant(merchantId: string): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(eq(transactions.merchant_id, merchantId))
      .orderBy(desc(transactions.created_at));
  }

  async getTransactionByOrderId(orderId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select()
      .from(transactions)
      .where(eq(transactions.order_id, orderId));
    return transaction;
  }

  async createUnmappedNotification(notificationJson: object): Promise<UnmappedNotification> {
    const [notification] = await db.insert(unmapped_notifications)
      .values({ notification_json: notificationJson })
      .returning();
    return notification;
  }

  async getUnmappedNotifications(): Promise<UnmappedNotification[]> {
    return db.select()
      .from(unmapped_notifications)
      .orderBy(desc(unmapped_notifications.received_at));
  }

  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(audit_logs).values(logData).returning();
    return log;
  }

  async getAuditLogs(filters?: { actor?: string; action?: string; limit?: number }): Promise<AuditLog[]> {
    const conditions = [];
    
    if (filters?.actor) {
      conditions.push(like(audit_logs.actor, `%${filters.actor}%`));
    }
    if (filters?.action) {
      conditions.push(eq(audit_logs.action, filters.action));
    }
    
    let query = db.select().from(audit_logs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query
      .orderBy(desc(audit_logs.created_at))
      .limit(filters?.limit || 100);
  }
}

export const storage = new DatabaseStorage();
