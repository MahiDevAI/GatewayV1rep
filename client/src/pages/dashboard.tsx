import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { useMockData } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatINR, formatDate } from "@/lib/utils";
import { ArrowUpRight, CreditCard, Users, Activity, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface DashboardData {
  stats: {
    total_volume: number;
    success_rate: string;
    pending_orders: number;
    total_customers: number;
  };
  recent_orders: any[];
}

export default function DashboardPage() {
  const { merchant } = useMockData();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const { data, error } = await api.getDashboard();
      if (!error && data) {
        setDashboardData(data);
      }
      setLoading(false);
    };
    
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    { title: "Total Volume", value: formatINR(dashboardData?.stats.total_volume || 0), icon: CreditCard, change: "" },
    { title: "Success Rate", value: `${dashboardData?.stats.success_rate || 0}%`, icon: Activity, change: "" },
    { title: "Pending Orders", value: dashboardData?.stats.pending_orders || 0, icon: ArrowUpRight, change: "" },
    { title: "Total Customers", value: dashboardData?.stats.total_customers || 0, icon: Users, change: "" },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {merchant?.name}</p>
        </div>
        <Link href="/orders">
          <Button>View All Orders</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {(dashboardData?.recent_orders || []).map((order: any) => (
                <div key={order.order_id} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {order.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.customer_mobile} • {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="ml-auto font-medium flex items-center gap-4">
                    {formatINR(order.amount)}
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
              {(!dashboardData?.recent_orders || dashboardData.recent_orders.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet. Create your first order to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <span className="text-sm font-medium">UPI Listener</span>
                <span className="flex items-center text-sm text-green-600">
                  <span className="block w-2 h-2 rounded-full bg-green-600 mr-2 animate-pulse" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <span className="text-sm font-medium">API Status</span>
                <span className="flex items-center text-sm text-green-600">
                  <span className="block w-2 h-2 rounded-full bg-green-600 mr-2" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <span className="text-sm font-medium">Order Expiry</span>
                <span className="text-sm text-muted-foreground">2 minutes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
