import { DashboardLayout } from "@/components/layout";
import { useMockData } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatINR, formatDate } from "@/lib/utils";
import { ArrowUpRight, CreditCard, Users, Activity } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { orders, merchant } = useMockData();

  const totalVolume = orders
    .filter(o => o.status === 'COMPLETED')
    .reduce((acc, o) => acc + o.amount, 0);

  const successRate = orders.length > 0 
    ? (orders.filter(o => o.status === 'COMPLETED').length / orders.length) * 100 
    : 0;

  const recentOrders = orders.slice(0, 5);

  const stats = [
    { title: "Total Volume", value: formatINR(totalVolume), icon: CreditCard, change: "+12.5%" },
    { title: "Success Rate", value: `${successRate.toFixed(1)}%`, icon: Activity, change: "+2.1%" },
    { title: "Active Orders", value: orders.filter(o => o.status === 'PENDING').length, icon: ArrowUpRight, change: "+4" },
    { title: "Total Customers", value: new Set(orders.map(o => o.customer_mobile)).size, icon: Users, change: "+12" },
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
              <p className="text-xs text-muted-foreground">
                {stat.change} from last month
              </p>
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
              {recentOrders.map((order) => (
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
              {recentOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet.
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
                <span className="text-sm font-medium">Notification Lag</span>
                <span className="text-sm text-muted-foreground">~120ms</span>
              </div>
               <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <span className="text-sm font-medium">Mapping Accuracy</span>
                <span className="text-sm text-muted-foreground">100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
