# ChargePay - UPI Payment Gateway System

## Overview

ChargePay is a production-ready UPI payment gateway system that allows merchants to:
- Create payment orders with UPI Intent URLs
- Receive and process UPI payment notifications
- Manage merchant accounts with KYC verification
- Track transactions through real-time dashboards
- Access comprehensive audit logs and reporting

## Tech Stack

- **Frontend**: React with TypeScript, Vite, TailwindCSS, Shadcn UI
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens for user auth, HMAC-SHA256 for API security
- **File Storage**: Local filesystem with multer middleware

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components (auth, dashboard, orders, etc.)
│   │   ├── lib/            # Utilities and API client
│   │   └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   ├── auth.ts             # Authentication middleware
│   └── db.ts               # Database connection
├── shared/                 # Shared code
│   └── schema.ts           # Drizzle database schema
└── uploads/                # File uploads (KYC, logos, QR codes)
```

## Key Features

### 1. Merchant Management
- Registration with email/password
- JWT-based authentication
- KYC document upload (PAN, Aadhaar)
- Logo upload for branding
- API key and secret generation with HMAC-SHA256

### 2. Domain Whitelisting
- Merchants can whitelist specific domains
- All order creation requests are validated against whitelisted domains

### 3. Order Lifecycle
- Order states: CREATED → PENDING → COMPLETED/EXPIRED
- 2-minute expiry for PENDING orders
- Automatic expiry via background job (30-second intervals)

### 4. Payment Flow
1. Merchant creates order via API
2. Order returns UPI Intent URL for payment
3. Customer scans QR or opens UPI app
4. System receives payment notification
5. Order marked as COMPLETED

### 5. Notification Processing
- Parses UPI payment notifications
- Extracts order ID from notification text
- Matches notification to pending order
- Updates order status and creates transaction record
- Logs unmapped notifications for manual review

### 6. Admin Controls
- View and manage all merchants
- Approve/reject KYC submissions
- View audit logs
- Monitor unmapped notifications

## Database Schema

### Tables
- `merchants` - Merchant accounts with API credentials
- `orders` - Payment orders with lifecycle tracking
- `transactions` - Completed payment records
- `domains` - Whitelisted domains per merchant
- `audit_logs` - All system actions for compliance
- `unmapped_notifications` - Unmatched payment notifications

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new merchant
- `POST /api/auth/login` - Login and get JWT token

### Merchant Operations
- `GET /api/merchant/profile` - Get merchant profile
- `POST /api/merchant/kyc/pan` - Upload PAN document
- `POST /api/merchant/kyc/aadhaar` - Upload Aadhaar document
- `POST /api/merchant/logo` - Upload merchant logo
- `GET /api/merchant/domains` - List whitelisted domains
- `POST /api/merchant/domains` - Add domain to whitelist
- `DELETE /api/merchant/domains/:id` - Remove domain
- `POST /api/merchant/regenerate-keys` - Generate new API credentials
- `GET /api/merchant/orders` - List orders
- `POST /api/merchant/orders` - Create new order
- `GET /api/merchant/dashboard` - Get dashboard stats
- `GET /api/merchant/reports` - Get transaction reports

### Public/Integration APIs
- `GET /api/v1/orders/:orderId` - Get order details
- `POST /api/v1/qr/upload` - Upload QR and transition to PENDING
- `POST /api/v1/notifications` - Process payment notification

### Admin APIs
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/merchants` - List all merchants
- `PATCH /api/admin/merchants/:id/kyc` - Update KYC status
- `GET /api/admin/audit-logs` - View audit logs
- `GET /api/admin/unmapped-notifications` - View unmatched notifications

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `JWT_SECRET` - Secret for JWT token signing

## Running the Application

The application runs on port 5000 with both frontend and backend served together.

```bash
npm run dev
```

## Testing

### Default Admin Account
- Email: admin@chargepay.com
- Password: admin123

### Creating Test Orders
1. Login as merchant
2. Navigate to Orders
3. Click "Create Order"
4. Fill in customer details and amount
5. Open the payment page link
6. Use "Simulate Success" to test payment flow

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- HMAC-SHA256 API request signing
- Domain whitelisting
- File type validation for uploads
- SQL injection protection via ORM
- Audit logging for compliance

## Recent Updates

- Full production-ready backend implementation
- Real API integration replacing mock data
- PostgreSQL database with complete schema
- File upload handling for KYC and logos
- Order expiry system with background job
- Admin dashboard with KYC management
