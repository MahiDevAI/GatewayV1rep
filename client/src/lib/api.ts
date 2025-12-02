const API_BASE = '/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('chargepay_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('chargepay_token', token);
    } else {
      localStorage.removeItem('chargepay_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || 'Request failed' };
      }

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Network error' };
    }
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    business_name: string;
    phone?: string;
  }) {
    return this.request<{
      token: string;
      merchant: any;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    return this.request<{
      token: string;
      merchant: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getProfile() {
    return this.request<any>('/merchant/profile');
  }

  async getDomains() {
    return this.request<any[]>('/merchant/domains');
  }

  async addDomain(domain: string) {
    return this.request<any>('/merchant/domains', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
  }

  async removeDomain(domainId: string) {
    return this.request<any>(`/merchant/domains/${domainId}`, {
      method: 'DELETE',
    });
  }

  async regenerateKeys() {
    return this.request<{
      api_key: string;
      api_secret: string;
    }>('/merchant/regenerate-keys', {
      method: 'POST',
    });
  }

  async uploadKycPan(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/merchant/kyc/pan`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      return { error: data.message };
    }
    return { data };
  }

  async uploadKycAadhaar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/merchant/kyc/aadhaar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      return { error: data.message };
    }
    return { data };
  }

  async uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/merchant/logo`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      return { error: data.message };
    }
    return { data };
  }

  async getOrders(filters?: { status?: string; start_date?: string; end_date?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const queryString = params.toString();
    return this.request<any[]>(`/merchant/orders${queryString ? `?${queryString}` : ''}`);
  }

  async createOrder(data: {
    customer_name: string;
    customer_mobile: string;
    amount: number;
    receiver_upi_id: string;
    metadata?: any;
  }) {
    return this.request<{
      order_id: string;
      status: string;
      amount: number;
      upi_intent_url: string;
      created_at: string;
    }>('/merchant/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrder(orderId: string) {
    return this.request<any>(`/v1/orders/${orderId}`);
  }

  async uploadQR(orderId: string, file?: File) {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/v1/qr/upload?order_id=${orderId}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        return { error: data.message };
      }
      return { data };
    } else {
      const response = await fetch(`${API_BASE}/v1/qr/upload?order_id=${orderId}`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        return { error: data.message };
      }
      return { data };
    }
  }

  async getDashboard() {
    return this.request<{
      stats: {
        total_volume: number;
        success_rate: string;
        pending_orders: number;
        total_customers: number;
      };
      recent_orders: any[];
    }>('/merchant/dashboard');
  }

  async getReports(filters?: { start_date?: string; end_date?: string }) {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const queryString = params.toString();
    return this.request<any>(`/merchant/reports${queryString ? `?${queryString}` : ''}`);
  }

  async getTransactions() {
    return this.request<any[]>('/merchant/transactions');
  }

  async getAdminDashboard() {
    return this.request<{
      stats: {
        total_merchants: number;
        pending_kyc: number;
        verified_merchants: number;
      };
      merchants: any[];
    }>('/admin/dashboard');
  }

  async getAdminMerchants() {
    return this.request<any[]>('/admin/merchants');
  }

  async updateKycStatus(merchantId: string, status: string) {
    return this.request<any>(`/admin/merchants/${merchantId}/kyc`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getUnmappedNotifications() {
    return this.request<any[]>('/admin/unmapped-notifications');
  }

  async getAuditLogs(filters?: { actor?: string; action?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.actor) params.append('actor', filters.actor);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const queryString = params.toString();
    return this.request<any[]>(`/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
  }

  async sendNotification(notification: object) {
    return this.request<any>('/v1/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  }
}

export const api = new ApiClient();
