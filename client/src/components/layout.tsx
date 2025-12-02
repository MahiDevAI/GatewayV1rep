import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMockData } from "@/lib/mock-data";
import { 
  LayoutDashboard, 
  ListOrdered, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Menu,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import logo from "@assets/generated_images/minimalist_fintech_logo_for_chargepay.png";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout, merchant } = useMockData();
  const [open, setOpen] = useState(false);

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', href: '/orders', icon: ListOrdered },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border h-16">
        <img src={logo} alt="ChargePay" className="h-8 w-8 rounded-md object-contain bg-primary/10 p-1" />
        <span className="font-heading font-bold text-xl tracking-tight">ChargePay</span>
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
              )}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </a>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-8 w-8 rounded-md border border-border">
            <AvatarFallback className="rounded-md bg-primary/10 text-primary">MC</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{merchant?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{merchant?.email}</p>
          </div>
          {merchant?.kyc_status === 'VERIFIED' && (
            <ShieldCheck className="h-4 w-4 text-green-500" />
          )}
        </div>
        <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/30" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 h-full shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden absolute top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 border-r border-sidebar-border">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
         <div className="w-full max-w-[400px] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="flex items-center gap-2 mb-8">
             <img src={logo} alt="ChargePay" className="h-10 w-10 rounded-lg bg-primary/10 p-1.5" />
             <span className="font-heading font-bold text-2xl tracking-tight">ChargePay</span>
           </div>
           {children}
         </div>
      </div>
      <div className="hidden md:block md:w-1/2 lg:w-[60%] bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/attached_assets/generated_images/abstract_fintech_background_for_login_page.png')] bg-cover bg-center opacity-80 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-white">
          <blockquote className="space-y-2 max-w-lg">
            <p className="text-lg font-medium leading-relaxed">
              "ChargePay simplified our UPI collections. No complex mapping, just pure order-based tracking. It's exactly what we needed for high-volume small transactions."
            </p>
            <footer className="text-sm text-white/60">
              — Rajesh V., CTO at QuickMart
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
