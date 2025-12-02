import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from './api';

export type OrderStatus = 'CREATED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
export type UserRole = 'MERCHANT' | 'ADMIN';

export interface Order {
  order_id: string;
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
  upi_intent_url?: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  business_name: string;
  api_key: string;
  api_secret?: string;
  logo_url: string;
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NOT_UPLOADED';
  kyc_pan_path?: boolean;
  kyc_aadhaar_path?: boolean;
  domains: { id: string; domain: string }[];
  role: UserRole;
}

interface MockDataContextType {
  merchant: Merchant | null;
  orders: Order[];
  allMerchants: Merchant[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string; business_name: string }) => Promise<boolean>;
  logout: () => void;
  createOrder: (amount: number, name: string, mobile: string, upiId?: string) => Promise<Order>;
  uploadQR: (orderId: string) => void;
  simulatePayment: (orderId: string) => void;
  simulateExpiry: (orderId: string) => void;
  getOrder: (orderId: string) => Order | undefined;
  refreshOrders: () => Promise<void>;
  addDomain: (domain: string) => Promise<void>;
  removeDomain: (domainId: string) => Promise<void>;
  regenerateKeys: () => Promise<{ api_key: string; api_secret: string } | null>;
  uploadLogo: (file: File) => Promise<void>;
  uploadKycPan: (file: File) => Promise<void>;
  uploadKycAadhaar: (file: File) => Promise<void>;
  createMerchant: (data: Partial<Merchant>) => Promise<void>;
  updateKYCStatus: (merchantId: string, status: Merchant['kyc_status']) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshAdminData: () => Promise<void>;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allMerchants, setAllMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshProfile = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setMerchant(null);
      setIsLoading(false);
      return;
    }

    const { data, error } = await api.getProfile();
    if (error) {
      api.setToken(null);
      setMerchant(null);
    } else {
      setMerchant({
        id: data.id,
        name: data.name,
        email: data.email,
        business_name: data.business_name,
        api_key: data.api_key,
        logo_url: data.logo_path || '',
        kyc_status: data.kyc_status,
        kyc_pan_path: data.kyc_pan_path,
        kyc_aadhaar_path: data.kyc_aadhaar_path,
        domains: data.domains || [],
        role: data.role,
      });
    }
    setIsLoading(false);
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!merchant) return;
    
    const { data, error } = await api.getOrders();
    if (!error && data) {
      setOrders(data.map((o: any) => ({
        ...o,
        status: o.status === 'EXPIRED' ? 'FAILED' : o.status,
      })));
    }
  }, [merchant]);

  const refreshAdminData = useCallback(async () => {
    if (!merchant || merchant.role !== 'ADMIN') return;
    
    const { data, error } = await api.getAdminMerchants();
    if (!error && data) {
      setAllMerchants(data.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        business_name: m.business_name,
        api_key: '',
        logo_url: '',
        kyc_status: m.kyc_status,
        domains: [],
        role: 'MERCHANT' as const,
      })));
    }
  }, [merchant]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (merchant) {
      refreshOrders();
      if (merchant.role === 'ADMIN') {
        refreshAdminData();
      }
    }
  }, [merchant, refreshOrders, refreshAdminData]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await api.login(email, password);
    
    if (error) {
      toast({ title: "Login Failed", description: error, variant: "destructive" });
      return false;
    }
    
    if (data) {
      api.setToken(data.token);
      setMerchant({
        id: data.merchant.id,
        name: data.merchant.name,
        email: data.merchant.email,
        business_name: data.merchant.business_name,
        api_key: '',
        logo_url: data.merchant.logo_path || '',
        kyc_status: data.merchant.kyc_status,
        domains: [],
        role: data.merchant.role,
      });
      toast({ title: "Welcome back", description: "Logged in successfully." });
      return true;
    }
    
    return false;
  };

  const register = async (data: { name: string; email: string; password: string; business_name: string }): Promise<boolean> => {
    const { data: result, error } = await api.register(data);
    
    if (error) {
      toast({ title: "Registration Failed", description: error, variant: "destructive" });
      return false;
    }
    
    if (result) {
      api.setToken(result.token);
      setMerchant({
        id: result.merchant.id,
        name: result.merchant.name,
        email: result.merchant.email,
        business_name: result.merchant.business_name,
        api_key: result.merchant.api_key,
        api_secret: result.merchant.api_secret,
        logo_url: '',
        kyc_status: 'NOT_UPLOADED',
        domains: [],
        role: result.merchant.role,
      });
      toast({ title: "Account Created", description: "Welcome to ChargePay!" });
      return true;
    }
    
    return false;
  };

  const logout = () => {
    api.setToken(null);
    setMerchant(null);
    setOrders([]);
    setAllMerchants([]);
    toast({ title: "Logged out", description: "See you soon." });
  };

  const createOrder = async (amount: number, name: string, mobile: string, upiId: string = 'merchant@okicici'): Promise<Order> => {
    const { data, error } = await api.createOrder({
      customer_name: name,
      customer_mobile: mobile,
      amount,
      receiver_upi_id: upiId,
    });
    
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      throw new Error(error);
    }
    
    const newOrder: Order = {
      order_id: data!.order_id,
      merchant_id: merchant?.id || '',
      customer_name: name,
      customer_mobile: mobile,
      amount,
      receiver_upi_id: upiId,
      status: data!.status as OrderStatus,
      created_at: data!.created_at,
      upi_intent_url: data!.upi_intent_url,
    };
    
    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  const uploadQR = async (orderId: string) => {
    const { error } = await api.uploadQR(orderId);
    
    if (!error) {
      setOrders(prev => prev.map(o => {
        if (o.order_id === orderId && o.status === 'CREATED') {
          return { ...o, status: 'PENDING' as OrderStatus, pending_at: new Date().toISOString() };
        }
        return o;
      }));
    }
  };

  const simulatePayment = async (orderId: string) => {
    const notification = {
      'android.title': `Test User paid you ₹1.00`,
      'android.text': orderId,
      'android.bigText': orderId,
    };
    
    const { data, error } = await api.sendNotification(notification);
    
    if (!error && data) {
      if (data.status === 'COMPLETED') {
        setOrders(prev => prev.map(o => {
          if (o.order_id === orderId) {
            toast({ title: "Payment Received", description: `Order #${orderId} marked as COMPLETED.` });
            return { ...o, status: 'COMPLETED' as OrderStatus, completed_at: new Date().toISOString() };
          }
          return o;
        }));
      } else {
        toast({ title: "Payment Status", description: data.message });
      }
    }
  };

  const simulateExpiry = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.order_id === orderId && o.status === 'PENDING') {
        return { ...o, status: 'FAILED' as OrderStatus, expired_at: new Date().toISOString() };
      }
      return o;
    }));
  };

  const getOrder = (orderId: string) => orders.find(o => o.order_id === orderId);

  const addDomain = async (domain: string) => {
    const { data, error } = await api.addDomain(domain);
    
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    
    if (merchant) {
      setMerchant({
        ...merchant,
        domains: [...merchant.domains, { id: data.id, domain: data.domain }],
      });
      toast({ title: "Domain Added", description: `${domain} has been whitelisted.` });
    }
  };

  const removeDomain = async (domainId: string) => {
    const { error } = await api.removeDomain(domainId);
    
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    
    if (merchant) {
      setMerchant({
        ...merchant,
        domains: merchant.domains.filter(d => d.id !== domainId),
      });
      toast({ title: "Domain Removed", description: "Domain has been removed." });
    }
  };

  const regenerateKeys = async () => {
    const { data, error } = await api.regenerateKeys();
    
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return null;
    }
    
    if (data && merchant) {
      setMerchant({
        ...merchant,
        api_key: data.api_key,
        api_secret: data.api_secret,
      });
      toast({ title: "Keys Regenerated", description: "Your API keys have been regenerated. Save the new secret!" });
      return data;
    }
    
    return null;
  };

  const uploadLogo = async (file: File) => {
    const { data, error } = await api.uploadLogo(file);
    
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    
    if (merchant && data) {
      setMerchant({ ...merchant, logo_url: data.logo_path });
      toast({ title: "Logo Uploaded", description: "Your merchant logo has been updated." });
    }
  };

  const uploadKycPan = async (file: File) => {
    const { error } = await api.uploadKycPan(file);
    
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    
    if (merchant) {
      setMerchant({ ...merchant, kyc_pan_path: true, kyc_status: 'PENDING' });
      toast({ title: "PAN Uploaded", description: "Your PAN card has been submitted for verification." });
    }
  };

  const uploadKycAadhaar = async (file: File) => {
    const { error } = await api.uploadKycAadhaar(file);
    
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    
    if (merchant) {
      setMerchant({ ...merchant, kyc_aadhaar_path: true, kyc_status: 'PENDING' });
      toast({ title: "Aadhaar Uploaded", description: "Your Aadhaar card has been submitted for verification." });
    }
  };

  const createMerchant = async (data: Partial<Merchant>) => {
    toast({ title: "Info", description: "Admin merchant creation via API is available." });
  };

  const updateKYCStatus = async (merchantId: string, status: Merchant['kyc_status']) => {
    const { error } = await api.updateKycStatus(merchantId, status);
    
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    
    setAllMerchants(prev => prev.map(m => 
      m.id === merchantId ? { ...m, kyc_status: status } : m
    ));
    toast({ title: "Status Updated", description: `Merchant KYC status updated to ${status}` });
  };

  return (
    <MockDataContext.Provider value={{ 
      merchant, 
      orders, 
      allMerchants,
      isLoading,
      login, 
      register,
      logout, 
      createOrder, 
      uploadQR,
      simulatePayment,
      simulateExpiry,
      getOrder,
      refreshOrders,
      addDomain,
      removeDomain,
      regenerateKeys,
      uploadLogo,
      uploadKycPan,
      uploadKycAadhaar,
      createMerchant,
      updateKYCStatus,
      refreshProfile,
      refreshAdminData,
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
