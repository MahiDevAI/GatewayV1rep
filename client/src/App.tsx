import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { MockDataProvider, useMockData } from "@/lib/mock-data";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import OrdersPage from "@/pages/orders";
import ReportsPage from "@/pages/reports";
import PaymentPage from "@/pages/payment";
import SettingsPage from "@/pages/settings";
import AdminDashboardPage from "@/pages/admin/dashboard";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { merchant } = useMockData();
  
  if (!merchant) {
    return <Redirect to="/" />;
  }
  
  return <Component {...rest} />;
}

function AdminRoute({ component: Component, ...rest }: any) {
  const { merchant } = useMockData();

  if (!merchant || merchant.role !== 'ADMIN') {
    return <Redirect to="/" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/pay/:orderId" component={PaymentPage} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
         <PrivateRoute component={DashboardPage} />
      </Route>
      <Route path="/orders">
         <PrivateRoute component={OrdersPage} />
      </Route>
      <Route path="/reports">
         <PrivateRoute component={ReportsPage} />
      </Route>
      <Route path="/settings">
         <PrivateRoute component={SettingsPage} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/dashboard">
         <AdminRoute component={AdminDashboardPage} />
      </Route>
      <Route path="/admin/merchants">
         <AdminRoute component={AdminDashboardPage} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MockDataProvider>
        <Router />
        <Toaster />
      </MockDataProvider>
    </QueryClientProvider>
  );
}

export default App;
