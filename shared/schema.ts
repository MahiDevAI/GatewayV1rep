import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const kycStatusEnum = pgEnum('kyc_status', ['PENDING', 'VERIFIED', 'REJECTED', 'NOT_UPLOADED']);
export const orderStatusEnum = pgEnum('order_status', ['CREATED', 'PENDING', 'COMPLETED', 'FAILED', 'EXPIRED']);
export const userRoleEnum = pgEnum('user_role', ['MERCHANT', 'ADMIN']);

// Merchants Table
export const merchants = pgTable("merchants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Hashed
  business_name: text("business_name").notNull(),
  phone: text("phone"),
  api_key: text("api_key").unique(),
  api_secret: text("api_secret"), // HMAC secret (stored for signature verification)
  logo_path: text("logo_path"),
  kyc_pan_path: text("kyc_pan_path"),
  kyc_aadhaar_path: text("kyc_aadhaar_path"),
  kyc_status: kycStatusEnum("kyc_status").default('NOT_UPLOADED').notNull(),
  role: userRoleEnum("role").default('MERCHANT').notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Merchant Domains Table (for whitelisting)
export const merchant_domains = pgTable("merchant_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchant_id: varchar("merchant_id").references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  domain: text("domain").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Orders Table
export const orders = pgTable("orders", {
  order_id: varchar("order_id", { length: 10 }).primaryKey(), // 10-digit numeric string
  merchant_id: varchar("merchant_id").references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  customer_name: text("customer_name").notNull(),
  customer_mobile: text("customer_mobile").notNull(),
  amount: integer("amount").notNull(), // Store in paise/cents (₹1.00 = 100)
  receiver_upi_id: text("receiver_upi_id").notNull(),
  status: orderStatusEnum("status").default('CREATED').notNull(),
  metadata: json("metadata"), // Optional JSON metadata
  qr_path: text("qr_path"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  pending_at: timestamp("pending_at"),
  completed_at: timestamp("completed_at"),
  expired_at: timestamp("expired_at"),
  failed_at: timestamp("failed_at"),
});

// Transactions Table (successful payments)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  order_id: varchar("order_id", { length: 10 }).references(() => orders.order_id, { onDelete: 'cascade' }).notNull(),
  merchant_id: varchar("merchant_id").references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  payer_name: text("payer_name").notNull(), // Extracted from notification
  notification_json: json("notification_json").notNull(), // Full notification payload
  is_late_payment: boolean("is_late_payment").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Unmapped Notifications Table
export const unmapped_notifications = pgTable("unmapped_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notification_json: json("notification_json").notNull(),
  received_at: timestamp("received_at").defaultNow().notNull(),
});

// Audit Logs Table
export const audit_logs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actor: text("actor").notNull(), // Email or "System"
  actor_id: varchar("actor_id"), // merchant_id if applicable
  action: text("action").notNull(), // LOGIN, CREATE_ORDER, etc.
  details_json: json("details_json"),
  ip_address: text("ip_address"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertMerchantSchema = createInsertSchema(merchants, {
  email: z.string().email(),
  password: z.string().min(8),
  business_name: z.string().min(1),
}).omit({
  id: true,
  created_at: true,
  updated_at: true,
  api_key: true,
  api_secret: true,
});

export const insertDomainSchema = createInsertSchema(merchant_domains, {
  domain: z.string().regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i, "Invalid domain format"),
}).omit({
  id: true,
  created_at: true,
});

export const insertOrderSchema = createInsertSchema(orders, {
  order_id: z.string().length(10).regex(/^\d{10}$/, "Order ID must be 10 digits"),
  customer_mobile: z.string().regex(/^\d{10}$/, "Mobile must be 10 digits"),
  amount: z.number().positive(),
}).omit({
  created_at: true,
  pending_at: true,
  completed_at: true,
  expired_at: true,
  failed_at: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  created_at: true,
});

export const insertAuditLogSchema = createInsertSchema(audit_logs).omit({
  id: true,
  created_at: true,
});

// Select Types
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;

export type MerchantDomain = typeof merchant_domains.$inferSelect;
export type InsertMerchantDomain = z.infer<typeof insertDomainSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type AuditLog = typeof audit_logs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type UnmappedNotification = typeof unmapped_notifications.$inferSelect;
