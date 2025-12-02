import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";

const MOCK_LOGS = [
  { id: 'log_1', action: 'LOGIN', actor: 'Mahesh Chargnew', ip: '192.168.1.1', timestamp: new Date(Date.now() - 300000).toISOString(), details: 'Successful login' },
  { id: 'log_2', action: 'CREATE_ORDER', actor: 'Mahesh Chargnew', ip: '192.168.1.1', timestamp: new Date(Date.now() - 120000).toISOString(), details: 'Created Order #1000000003' },
  { id: 'log_3', action: 'KYC_UPLOAD', actor: 'New Merchant', ip: '10.0.0.5', timestamp: new Date(Date.now() - 86400000).toISOString(), details: 'Uploaded PAN Card' },
  { id: 'log_4', action: 'API_KEY_GEN', actor: 'System Admin', ip: '127.0.0.1', timestamp: new Date(Date.now() - 172800000).toISOString(), details: 'Regenerated API Secret for m_123456' },
  { id: 'log_5', action: 'DOMAIN_ADD', actor: 'Mahesh Chargnew', ip: '192.168.1.1', timestamp: new Date(Date.now() - 200000).toISOString(), details: 'Whitelisted domain: shop.mysite.in' },
];

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = MOCK_LOGS.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <h1 className="text-3xl font-heading font-bold tracking-tight mb-6">Audit Logs</h1>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search logs..." 
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
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 font-mono">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{log.actor}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{log.ip}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
