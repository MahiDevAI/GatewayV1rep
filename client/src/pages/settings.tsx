import { DashboardLayout } from "@/components/layout";
import { useMockData } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { merchant } = useMockData();
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Key copied to clipboard." });
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
