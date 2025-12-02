import { useEffect, useState, useCallback } from "react";
import { useRoute } from "wouter";
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatINR } from "@/lib/utils";
import { Loader2, Smartphone, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import logo from "@assets/generated_images/minimalist_fintech_logo_for_chargepay.png";
import { api } from "@/lib/api";

interface OrderData {
  order_id: string;
  merchant_id: string;
  customer_name: string;
  customer_mobile: string;
  amount: number;
  receiver_upi_id: string;
  status: string;
  internal_status: string;
  qr_path?: string;
  created_at: string;
  pending_at?: string;
  completed_at?: string;
  expired_at?: string;
}

export default function PaymentPage() {
  const [, params] = useRoute("/pay/:orderId");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const orderId = params?.orderId;

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    
    const { data, error: fetchError } = await api.getOrder(orderId);
    
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }
    
    setOrder(data);
    setLoading(false);
    
    if (data.status === 'CREATED') {
      await api.uploadQR(orderId);
      const { data: updatedData } = await api.getOrder(orderId);
      if (updatedData) {
        setOrder(updatedData);
      }
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    
    const pollInterval = setInterval(() => {
      if (order?.status === 'PENDING') {
        fetchOrder();
      }
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, [fetchOrder, order?.status]);

  useEffect(() => {
    if (order?.status === 'PENDING' && order?.pending_at) {
      const updateTimer = () => {
        const pendingAt = new Date(order.pending_at!).getTime();
        const now = Date.now();
        const elapsed = (now - pendingAt) / 1000;
        const remaining = Math.max(0, 120 - elapsed);
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          fetchOrder();
        }
      };
      
      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
      
      return () => clearInterval(timerInterval);
    }
  }, [order?.status, order?.pending_at, fetchOrder]);

  const simulatePayment = async () => {
    if (!orderId) return;
    
    const notification = {
      'android.title': `Test User paid you ₹${order?.amount || 1}.00`,
      'android.text': orderId,
      'android.bigText': orderId,
    };
    
    await api.sendNotification(notification);
    await fetchOrder();
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md text-center p-6">
          <div className="flex justify-center mb-4 text-red-500">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-bold mb-2">Invalid Order</h2>
          <p className="text-muted-foreground">{error || "This payment link is invalid or does not exist."}</p>
        </Card>
      </div>
    );
  }

  const upiIntentUrl = `upi://pay?pa=${order.receiver_upi_id}&pn=Merchant&am=${order.amount}&tr=${order.order_id}&tn=${order.order_id}&cu=INR`;
  const isTerminalState = order.status === 'COMPLETED' || order.internal_status === 'EXPIRED' || order.status === 'FAILED';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="mb-8 flex items-center gap-2">
        <img src={logo} alt="ChargePay" className="h-8 w-8 rounded-md" />
        <span className="font-bold text-xl tracking-tight text-gray-900">ChargePay</span>
      </div>

      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center border-b bg-gray-50/50 pb-6">
          <div className="flex flex-col gap-1 mb-2">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Payment Request</span>
            <CardTitle className="text-3xl font-bold text-primary">{formatINR(order.amount)}</CardTitle>
          </div>
          <CardDescription>
            To: <span className="font-medium text-foreground">{order.customer_name}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8 flex flex-col items-center">
          
          {order.status === 'PENDING' && (
            <div className="space-y-6 w-full flex flex-col items-center">
              <div className="relative group p-4 bg-white rounded-xl border shadow-sm">
                <QRCode 
                  value={upiIntentUrl} 
                  size={200} 
                  className="h-auto max-w-full"
                  viewBox={`0 0 256 256`}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/90 transition-opacity">
                  <img src={logo} className="h-12 w-12" />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Scan with any UPI App</p>
                <div className="flex justify-center gap-3 grayscale opacity-70">
                  <div className="h-6 w-6 bg-blue-500 rounded-full" title="GPay"></div>
                  <div className="h-6 w-6 bg-purple-600 rounded-full" title="PhonePe"></div>
                  <div className="h-6 w-6 bg-cyan-400 rounded-full" title="Paytm"></div>
                  <div className="h-6 w-6 bg-orange-500 rounded-full" title="BHIM"></div>
                </div>
              </div>

              {timeRemaining !== null && (
                <div className={`w-full rounded-md p-3 text-center text-xs ${timeRemaining < 30 ? 'bg-red-50 border border-red-100 text-red-800' : 'bg-yellow-50 border border-yellow-100 text-yellow-800'}`}>
                  Time remaining: <span className="font-mono font-bold">{formatTimeRemaining(timeRemaining)}</span>
                </div>
              )}
              
              <a href={upiIntentUrl} className="md:hidden w-full">
                <Button className="w-full" size="lg">
                  Pay via UPI App
                </Button>
              </a>
            </div>
          )}

          {order.status === 'COMPLETED' && (
            <div className="py-8 text-center space-y-4 animate-in zoom-in duration-300">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-700">Payment Successful</h3>
                <p className="text-muted-foreground text-sm mt-1">Order ID: {order.order_id}</p>
              </div>
            </div>
          )}

          {(order.internal_status === 'EXPIRED' || order.status === 'FAILED') && (
            <div className="py-8 text-center space-y-4 animate-in zoom-in duration-300">
              <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertCircle className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-700">Payment Expired</h3>
                <p className="text-muted-foreground text-sm mt-1">Please create a new order.</p>
              </div>
            </div>
          )}

        </CardContent>
        
        <CardFooter className="bg-gray-50 border-t p-4 text-xs text-center text-muted-foreground flex flex-col gap-4">
          <p>
            Secured by ChargePay. <br/>
            Reference ID: {order.order_id}
          </p>

          {!isTerminalState && (
            <div className="w-full pt-4 border-t border-dashed">
              <p className="mb-2 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Test Controls</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={simulatePayment}>
                  Simulate Success
                </Button>
                <Button variant="outline" size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50" onClick={fetchOrder}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
