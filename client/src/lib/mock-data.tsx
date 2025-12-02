import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';

export type OrderStatus = 'CREATED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
export type UserRole = 'MERCHANT' | 'ADMIN';

export interface Order {
  order_id: string; // 10-digit numeric string
  merchant_id: string;
  customer_name: string;
  customer_mobile: string;
  amount: number;
  receiver_upi_id: string;
  status: OrderStatus;
  created_at: string;
  pending_at?: string;
  completed_at?: string;
  expired_at?: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  business_name: string;
  api_key: string;
  api_secret: string;
  logo_url: string;
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NOT_UPLOADED';
  domains: string[];
  role: UserRole;
}

interface MockDataContextType {
  merchant: Merchant | null;
  orders: Order[];
  allMerchants: Merchant[]; // For Admin
  login: (email: string) => Promise<void>;
  logout: () => void;
  createOrder: (amount: number, name: string, mobile: string) => Promise<Order>;
  uploadQR: (orderId: string) => void;
  simulatePayment: (orderId: string) => void;
  simulateExpiry: (orderId: string) => void;
  getOrder: (orderId: string) => Order | undefined;
  
  // Domain Management
  addDomain: (domain: string) => void;
  removeDomain: (domain: string) => void;

  // Admin Actions
  createMerchant: (data: Partial<Merchant>) => Promise<void>;
  updateKYCStatus: (merchantId: string, status: Merchant['kyc_status']) => void;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

const MOCK_MERCHANT: Merchant = {
  id: 'm_123456',
  name: 'Mahesh Chargnew',
  email: 'demo@chargepay.in',
  business_name: 'ChargePay Demo Merchant',
  api_key: 'cp_live_8374928374',
  api_secret: 'sk_live_998877665544332211',
  logo_url: '',
  kyc_status: 'VERIFIED',
  domains: ['example.com', 'shop.mysite.in'],
  role: 'MERCHANT'
};

const MOCK_ADMIN: Merchant = {
  id: 'admin_001',
  name: 'System Admin',
  email: 'admin@chargepay.in',
  business_name: 'ChargePay Admin',
  api_key: '',
  api_secret: '',
  logo_url: '',
  kyc_status: 'VERIFIED',
  domains: [],
  role: 'ADMIN'
};

const INITIAL_ORDERS: Order[] = [
  {
    order_id: '1000000001',
    merchant_id: 'm_123456',
    customer_name: 'Rahul Kumar',
    customer_mobile: '9876543210',
    amount: 150.00,
    receiver_upi_id: 'merchant@upi',
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    pending_at: new Date(Date.now() - 86390000).toISOString(),
    completed_at: new Date(Date.now() - 86350000).toISOString(),
  },
  {
    order_id: '1000000002',
    merchant_id: 'm_123456',
    customer_name: 'Priya Singh',
    customer_mobile: '9876543211',
    amount: 500.00,
    receiver_upi_id: 'merchant@upi',
    status: 'EXPIRED',
    created_at: new Date(Date.now() - 43200000).toISOString(),
    pending_at: new Date(Date.now() - 43190000).toISOString(),
    expired_at: new Date(Date.now() - 43000000).toISOString(),
  },
   {
    order_id: '1000000003',
    merchant_id: 'm_123456',
    customer_name: 'Amit Sharma',
    customer_mobile: '9988776655',
    amount: 1200.00,
    receiver_upi_id: 'merchant@upi',
    status: 'PENDING',
    created_at: new Date(Date.now() - 60000).toISOString(),
    pending_at: new Date(Date.now() - 30000).toISOString(),
  }
];

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [allMerchants, setAllMerchants] = useState<Merchant[]>([MOCK_MERCHANT]);
  const { toast } = useToast();

  // Simulate login persistence
  useEffect(() => {
    const stored = localStorage.getItem('chargepay_user_role');
    if (stored === 'ADMIN') {
      setMerchant(MOCK_ADMIN);
    } else if (stored === 'MERCHANT') {
      setMerchant(MOCK_MERCHANT);
    }
  }, []);

  const login = async (email: string) => {
    // Simple mock login logic
    if (email.includes('admin')) {
      setMerchant(MOCK_ADMIN);
      localStorage.setItem('chargepay_user_role', 'ADMIN');
      toast({ title: "Admin Access", description: "Logged in as Administrator." });
    } else {
      setMerchant(MOCK_MERCHANT);
      localStorage.setItem('chargepay_user_role', 'MERCHANT');
      toast({ title: "Welcome back", description: "Logged in successfully." });
    }
  };

  const logout = () => {
    setMerchant(null);
    localStorage.removeItem('chargepay_user_role');
    toast({ title: "Logged out", description: "See you soon." });
  };

  const createOrder = async (amount: number, name: string, mobile: string): Promise<Order> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const newOrder: Order = {
      order_id: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      merchant_id: merchant?.id || 'm_guest',
      customer_name: name,
      customer_mobile: mobile,
      amount: amount,
      receiver_upi_id: 'merchant@okicici',
      status: 'CREATED',
      created_at: new Date().toISOString(),
    };

    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  const uploadQR = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.order_id === orderId && o.status === 'CREATED') {
        return { ...o, status: 'PENDING', pending_at: new Date().toISOString() };
      }
      return o;
    }));
  };

  const simulatePayment = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.order_id === orderId) {
         toast({ title: "Payment Received", description: `Order #${orderId} marked as COMPLETED.` });
        return { ...o, status: 'COMPLETED', completed_at: new Date().toISOString() };
      }
      return o;
    }));
  };

  const simulateExpiry = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.order_id === orderId && o.status === 'PENDING') {
        return { ...o, status: 'EXPIRED', expired_at: new Date().toISOString() };
      }
      return o;
    }));
  };

  const getOrder = (orderId: string) => orders.find(o => o.order_id === orderId);

  const addDomain = (domain: string) => {
    if (merchant) {
      const updatedMerchant = { ...merchant, domains: [...merchant.domains, domain] };
      setMerchant(updatedMerchant);
      // Also update in allMerchants list if it exists there
      setAllMerchants(prev => prev.map(m => m.id === merchant.id ? updatedMerchant : m));
      toast({ title: "Domain Added", description: `${domain} has been whitelisted.` });
    }
  };

  const removeDomain = (domain: string) => {
    if (merchant) {
      const updatedMerchant = { ...merchant, domains: merchant.domains.filter(d => d !== domain) };
      setMerchant(updatedMerchant);
      setAllMerchants(prev => prev.map(m => m.id === merchant.id ? updatedMerchant : m));
      toast({ title: "Domain Removed", description: `${domain} has been removed.` });
    }
  };

  const createMerchant = async (data: Partial<Merchant>) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newMerchant: Merchant = {
      id: `m_${nanoid(6)}`,
      name: data.name || 'New Merchant',
      email: data.email || 'new@example.com',
      business_name: data.business_name || 'New Business',
      api_key: `cp_live_${nanoid(10)}`,
      api_secret: `sk_live_${nanoid(20)}`,
      logo_url: '',
      kyc_status: 'PENDING',
      domains: [],
      role: 'MERCHANT'
    };
    setAllMerchants(prev => [...prev, newMerchant]);
    toast({ title: "Merchant Created", description: "New merchant account added successfully." });
  };

  const updateKYCStatus = (merchantId: string, status: Merchant['kyc_status']) => {
    setAllMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, kyc_status: status } : m));
    toast({ title: "Status Updated", description: `Merchant KYC status updated to ${status}` });
  };

  return (
    <MockDataContext.Provider value={{ 
      merchant, 
      orders, 
      allMerchants,
      login, 
      logout, 
      createOrder, 
      uploadQR,
      simulatePayment,
      simulateExpiry,
      getOrder,
      addDomain,
      removeDomain,
      createMerchant,
      updateKYCStatus
    }}>
      {children}
    </MockDataContext.Provider>
  );
}

export const useMockData = () => {
  const context = useContext(MockDataContext);
  if (!context) throw new Error("useMockData must be used within MockDataProvider");
  return context;
};
