import { DashboardLayout } from "@/components/layout";
import { useMockData } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, ShieldCheck, ShieldAlert, Upload, Plus, X, Globe, Image as ImageIcon, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";

export default function SettingsPage() {
  const { merchant, addDomain, removeDomain, regenerateKeys, uploadLogo, uploadKycPan, uploadKycAadhaar } = useMockData();
  const { toast } = useToast();
  const [newDomain, setNewDomain] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);
  const aadhaarInputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    setIsAddingDomain(true);
    await addDomain(newDomain);
    setNewDomain("");
    setIsAddingDomain(false);
  };

  const handleRegenerateKeys = async () => {
    setIsRegenerating(true);
    const result = await regenerateKeys();
    if (result) {
      setNewSecret(result.api_secret);
      setShowSecret(true);
    }
    setIsRegenerating(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadLogo(file);
    }
  };

  const handlePanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadKycPan(file);
    }
  };

  const handleAadhaarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadKycAadhaar(file);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-heading font-bold tracking-tight mb-6">Settings</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>
              Manage your business identity and logo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
                {merchant?.logo_url ? (
                  <img src={merchant.logo_url} alt="Logo" className="h-full w-full object-contain p-2" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Merchant Logo</Label>
                <p className="text-xs text-muted-foreground">
                  Upload a square logo (PNG/JPG) to be displayed on payment pages and QR codes.
                </p>
                <input
                  type="file"
                  ref={logoInputRef}
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoUpload}
                />
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Upload Logo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <Input value={merchant?.api_key || ''} readOnly className="font-mono bg-muted" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(merchant?.api_key || "", "API Key")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {(newSecret || merchant?.api_secret) && (
              <div className="space-y-2">
                <Label>API Secret {newSecret && <span className="text-green-600">(New - Save this!)</span>}</Label>
                <div className="flex gap-2">
                  <Input 
                    value={newSecret || merchant?.api_secret || '••••••••••••••••'} 
                    type={showSecret ? "text" : "password"} 
                    readOnly 
                    className="font-mono bg-muted" 
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(newSecret || merchant?.api_secret || "", "API Secret")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {newSecret && (
                  <p className="text-xs text-yellow-600">
                    This secret will only be shown once. Please save it securely.
                  </p>
                )}
              </div>
            )}
            <Button variant="outline" className="mt-2" onClick={handleRegenerateKeys} disabled={isRegenerating}>
              {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Regenerate Keys
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
              <Button type="submit" disabled={!newDomain || isAddingDomain}>
                {isAddingDomain ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Domain
              </Button>
            </form>

            <div className="space-y-2">
              {merchant?.domains.map((domain) => (
                <div key={domain.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-medium text-sm">{domain.domain}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeDomain(domain.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!merchant?.domains || merchant.domains.length === 0) && (
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
            {merchant?.kyc_status === 'VERIFIED' && (
              <div className="flex items-center gap-4 mb-6 p-4 bg-green-50 border border-green-100 rounded-lg text-green-800">
                <ShieldCheck className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium">Account Verified</p>
                  <p className="text-sm text-green-700">Your PAN and Aadhaar have been verified.</p>
                </div>
              </div>
            )}
            
            {merchant?.kyc_status === 'PENDING' && (
              <div className="flex items-center gap-4 mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800">
                <ShieldAlert className="h-6 w-6 text-yellow-600" />
                <div>
                  <p className="font-medium">Verification Pending</p>
                  <p className="text-sm text-yellow-700">Your documents are under review.</p>
                </div>
              </div>
            )}
            
            {merchant?.kyc_status === 'REJECTED' && (
              <div className="flex items-center gap-4 mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-800">
                <ShieldAlert className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-medium">Verification Rejected</p>
                  <p className="text-sm text-red-700">Please re-upload your documents.</p>
                </div>
              </div>
            )}
             
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="file"
                ref={panInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePanUpload}
              />
              <div 
                className={`border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-muted/20 transition-colors ${merchant?.kyc_pan_path ? 'opacity-50' : ''}`}
                onClick={() => !merchant?.kyc_pan_path && panInputRef.current?.click()}
              >
                <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium">PAN Card</p>
                <p className="text-xs text-muted-foreground">
                  {merchant?.kyc_pan_path ? 'Uploaded' : 'Click to upload'}
                </p>
              </div>
              
              <input
                type="file"
                ref={aadhaarInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleAadhaarUpload}
              />
              <div 
                className={`border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-muted/20 transition-colors ${merchant?.kyc_aadhaar_path ? 'opacity-50' : ''}`}
                onClick={() => !merchant?.kyc_aadhaar_path && aadhaarInputRef.current?.click()}
              >
                <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium">Aadhaar Card</p>
                <p className="text-xs text-muted-foreground">
                  {merchant?.kyc_aadhaar_path ? 'Uploaded' : 'Click to upload'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
