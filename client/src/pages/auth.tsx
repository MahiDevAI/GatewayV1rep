import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMockData } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/layout";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, merchant } = useMockData();
  const [, setLocation] = useLocation();

  if (merchant) {
    if (merchant.role === 'ADMIN') {
      setLocation("/admin/dashboard");
    } else {
      setLocation("/dashboard");
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await login(email, password);
    
    setLoading(false);
    
    if (success) {
      setLocation("/dashboard");
    }
  };

  return (
    <AuthLayout>
      <Card className="border-none shadow-none bg-transparent p-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your merchant dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="name@example.com" 
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="px-0 pt-6 justify-center text-sm text-muted-foreground">
          Don't have an account? <Link href="/register" className="text-primary hover:underline ml-1">Create account</Link>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
