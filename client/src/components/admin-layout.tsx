import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMockData } from "@/lib/mock-data";
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck,
  LogOut,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import logo from "@assets/generated_images/minimalist_fintech_logo_for_chargepay.png";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout, merchant } = useMockData(); // reusing merchant context for admin
  const [open, setOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Merchants', href: '/admin/merchants', icon: Users },
    { name: 'KYC Approvals', href: '/admin/kyc', icon: ShieldCheck },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-white border-r border-slate-800">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800 h-16">
        <img src={logo} alt="ChargePay" className="h-8 w-8 rounded-md object-contain bg-white/10 p-1" />
        <span className="font-heading font-bold text-xl tracking-tight">Admin Panel</span>
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
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              )}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </a>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-8 w-8 rounded-md border border-slate-700">
            <AvatarFallback className="rounded-md bg-slate-800 text-slate-200">AD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-200">Administrator</p>
            <p className="text-xs text-slate-500 truncate">admin@chargepay.in</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30" onClick={logout}>
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
