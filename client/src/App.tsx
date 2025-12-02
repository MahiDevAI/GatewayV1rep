import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { MockDataProvider, useMockData } from "@/lib/mock-data";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import OrdersPage from "@/pages/orders";
import PaymentPage from "@/pages/payment";
import SettingsPage from "@/pages/settings";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { merchant } = useMockData();
  // In a real app, we'd check auth token. Here we check mock state.
  // For mockup ease, if no merchant, redirect to login.
  
  if (!merchant) {
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
      <Route path="/settings">
         <PrivateRoute component={SettingsPage} />
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
