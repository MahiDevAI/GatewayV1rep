import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/layout";
import { Loader2 } from "lucide-react";
import { useMockData } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useMockData();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      // In a real app, we'd create the user. 
      // Here we just mock login as a new user (using the default merchant for simplicity of the prototype)
      login(email);
      setLoading(false);
      toast({ title: "Account Created", description: "Welcome to ChargePay!" });
      setLocation("/dashboard");
    }, 1000);
  };

  return (
    <AuthLayout>
      <Card className="border-none shadow-none bg-transparent p-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Start accepting UPI payments with ChargePay today.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="John Doe" 
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business">Business Name</Label>
              <Input 
                id="business" 
                value={businessName} 
                onChange={(e) => setBusinessName(e.target.value)} 
                placeholder="Acme Corp" 
                required
              />
            </div>
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
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="px-0 pt-6 justify-center text-sm text-muted-foreground">
          Already have an account? <Link href="/" className="text-primary hover:underline ml-1">Sign in</Link>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
