import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useMockData } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface AdminDashboardData {
  stats: {
    total_merchants: number;
    pending_kyc: number;
    verified_merchants: number;
  };
  merchants: any[];
}

export default function AdminDashboardPage() {
  const { updateKYCStatus } = useMockData();
  const [searchTerm, setSearchTerm] = useState("");
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchDashboard = async () => {
    const { data, error } = await api.getAdminDashboard();
    if (!error && data) {
      setDashboardData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleUpdateKycStatus = async (merchantId: string, status: 'VERIFIED' | 'REJECTED') => {
    setUpdatingId(merchantId);
    await updateKYCStatus(merchantId, status);
    await fetchDashboard();
    setUpdatingId(null);
  };

  const filteredMerchants = (dashboardData?.merchants || []).filter((m: any) => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.business_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage merchants and KYC approvals.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.stats.total_merchants || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending KYC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dashboardData?.stats.pending_kyc || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData?.stats.verified_merchants || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search merchants..." 
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
                <TableHead>Merchant ID</TableHead>
                <TableHead>Business Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMerchants.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs font-medium">{m.id.slice(0, 12)}...</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{m.business_name}</span>
                      <span className="text-xs text-muted-foreground">{m.name} • {m.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium border",
                      m.kyc_status === 'VERIFIED' ? "bg-green-50 text-green-700 border-green-200" :
                      m.kyc_status === 'PENDING' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                      m.kyc_status === 'NOT_UPLOADED' ? "bg-gray-50 text-gray-700 border-gray-200" :
                      "bg-red-50 text-red-700 border-red-200"
                    )}>
                      {m.kyc_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {m.kyc_status !== 'VERIFIED' && m.kyc_status !== 'NOT_UPLOADED' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 hover:bg-green-50" 
                          onClick={() => handleUpdateKycStatus(m.id, 'VERIFIED')}
                          disabled={updatingId === m.id}
                        >
                          {updatingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                          Approve
                        </Button>
                      )}
                      {m.kyc_status === 'VERIFIED' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:bg-red-50" 
                          onClick={() => handleUpdateKycStatus(m.id, 'REJECTED')}
                          disabled={updatingId === m.id}
                        >
                          {updatingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
                          Revoke
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredMerchants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No merchants found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
