import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useMockData } from "@/lib/mock-data";
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatINR } from "@/lib/utils";
import { Loader2, Smartphone, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import logo from "@assets/generated_images/minimalist_fintech_logo_for_chargepay.png";

export default function PaymentPage() {
  const [, params] = useRoute("/pay/:orderId");
  const { getOrder, uploadQR, simulatePayment, simulateExpiry } = useMockData();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const orderId = params?.orderId;
  const order = orderId ? getOrder(orderId) : undefined;

  useEffect(() => {
    if (order && order.status === 'CREATED') {
      // Simulate the "upload QR" step happening automatically when user lands here
      // In real life, this might happen on the backend before serving the page, 
      // or via an API call from the frontend.
      uploadQR(order.order_id);
    }
  }, [order, uploadQR]);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md text-center p-6">
          <div className="flex justify-center mb-4 text-red-500">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-bold mb-2">Invalid Order</h2>
          <p className="text-muted-foreground">This payment link is invalid or does not exist.</p>
        </Card>
      </div>
    );
  }

  const upiIntentUrl = `upi://pay?pa=${order.receiver_upi_id}&pn=${order.merchant_id}&am=${order.amount}&tr=${order.order_id}&tn=${order.order_id}`;

  const isTerminalState = order.status === 'COMPLETED' || order.status === 'EXPIRED' || order.status === 'FAILED';

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
            Paying to <span className="font-medium text-foreground">{order.merchant_id === 'm_123456' ? 'ChargePay Demo Merchant' : order.merchant_id}</span>
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
                  {/* Simple icons to represent GPay, PhonePe, Paytm */}
                  <div className="h-6 w-6 bg-blue-500 rounded-full" title="GPay"></div>
                  <div className="h-6 w-6 bg-purple-600 rounded-full" title="PhonePe"></div>
                  <div className="h-6 w-6 bg-cyan-400 rounded-full" title="Paytm"></div>
                  <div className="h-6 w-6 bg-orange-500 rounded-full" title="BHIM"></div>
                </div>
              </div>

              <div className="w-full bg-yellow-50 border border-yellow-100 rounded-md p-3 text-center text-xs text-yellow-800">
                 Time remaining: <span className="font-mono font-bold">01:59</span>
              </div>
              
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

          {order.status === 'EXPIRED' && (
            <div className="py-8 text-center space-y-4 animate-in zoom-in duration-300">
               <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertCircle className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-700">Payment Expired</h3>
                <p className="text-muted-foreground text-sm mt-1">Please recreate the order.</p>
              </div>
            </div>
          )}

        </CardContent>
        
        <CardFooter className="bg-gray-50 border-t p-4 text-xs text-center text-muted-foreground flex flex-col gap-4">
          <p>
            Secured by ChargePay. <br/>
            Reference ID: {order.order_id}
          </p>

          {/* DEBUG CONTROLS - HIDDEN IN PROD usually, but needed for Mockup */}
          {!isTerminalState && (
            <div className="w-full pt-4 border-t border-dashed">
              <p className="mb-2 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Mockup Controls</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => simulatePayment(order.order_id)}>
                  Simulate Success
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => simulateExpiry(order.order_id)}>
                  Simulate Expiry
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
