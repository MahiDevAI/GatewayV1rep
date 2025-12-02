import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout";
import { useMockData } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatINR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ExternalLink, Copy, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function OrdersPage() {
  const { orders, createOrder, refreshOrders, isLoading } = useMockData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [upiId, setUpiId] = useState("merchant@okicici");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    refreshOrders();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.order_id.includes(searchTerm) || 
    o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer_mobile.includes(searchTerm)
  );

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await createOrder(parseFloat(amount), name, mobile, upiId);
      toast({ title: "Order Created", description: "New payment order generated successfully." });
      setIsCreateOpen(false);
      setAmount("");
      setName("");
      setMobile("");
    } catch (err) {
      toast({ title: "Error", description: "Failed to create order.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrders();
    setIsRefreshing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Link copied to clipboard." });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and track your payment requests.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Payment Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrder} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Customer Name</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input 
                    id="mobile" 
                    value={mobile} 
                    onChange={e => setMobile(e.target.value)} 
                    placeholder="9876543210" 
                    pattern="\d{10}"
                    maxLength={10}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (INR)</Label>
                  <Input id="amount" type="number" step="0.01" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100.00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upiId">Receiver UPI ID</Label>
                  <Input id="upiId" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="merchant@upi" required />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Order
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by Order ID, Name or Mobile..." 
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.order_id}>
                  <TableCell className="font-mono text-xs font-medium">{order.order_id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{order.customer_name}</span>
                      <span className="text-xs text-muted-foreground">{order.customer_mobile}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatINR(order.amount)}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(order.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Copy Payment Link" onClick={() => copyToClipboard(`${window.location.origin}/pay/${order.order_id}`)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Link href={`/pay/${order.order_id}`}>
                        <Button variant="ghost" size="icon" title="Open Payment Page">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "Loading orders..." : "No orders found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
