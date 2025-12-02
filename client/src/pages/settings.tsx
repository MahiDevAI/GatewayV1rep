import { DashboardLayout } from "@/components/layout";
import { useMockData } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, ShieldCheck, Upload, Plus, X, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SettingsPage() {
  const { merchant, addDomain, removeDomain } = useMockData();
  const { toast } = useToast();
  const [newDomain, setNewDomain] = useState("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Key copied to clipboard." });
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    addDomain(newDomain);
    setNewDomain("");
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-heading font-bold tracking-tight mb-6">Settings</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
            <CardDescription>
              Use these keys to authenticate your API requests. Keep them secret.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input value={merchant?.api_key} readOnly className="font-mono bg-muted" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(merchant?.api_key || "")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
             <div className="space-y-2">
              <Label>API Secret</Label>
              <div className="flex gap-2">
                <Input value={merchant?.api_secret} type="password" readOnly className="font-mono bg-muted" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(merchant?.api_secret || "")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="outline" className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Keys
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domain Whitelisting</CardTitle>
            <CardDescription>
              Only requests from these domains will be allowed to create orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAddDomain} className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="example.com" 
                  className="pl-9"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={!newDomain}>
                <Plus className="h-4 w-4 mr-2" /> Add Domain
              </Button>
            </form>

            <div className="space-y-2">
              {merchant?.domains.map((domain) => (
                <div key={domain} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-medium text-sm">{domain}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeDomain(domain)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {merchant?.domains.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-md">
                  No domains whitelisted yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KYC Verification</CardTitle>
            <CardDescription>
              Upload your business documents for verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-4 mb-6 p-4 bg-green-50 border border-green-100 rounded-lg text-green-800">
                <ShieldCheck className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium">Account Verified</p>
                  <p className="text-sm text-green-700">Your PAN and Aadhaar have been verified.</p>
                </div>
             </div>
             
             <div className="grid md:grid-cols-2 gap-4">
               <div className="border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2 opacity-50 cursor-not-allowed">
                  <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium">PAN Card</p>
                  <p className="text-xs text-muted-foreground">Uploaded on Dec 1, 2025</p>
               </div>
               <div className="border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2 opacity-50 cursor-not-allowed">
                  <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Aadhaar Card</p>
                  <p className="text-xs text-muted-foreground">Uploaded on Dec 1, 2025</p>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
