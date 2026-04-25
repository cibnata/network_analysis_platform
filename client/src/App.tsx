import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NetworkProvider } from "./contexts/NetworkContext";
import NetworkDashboardLayout from "./components/NetworkDashboardLayout";
import Home from "./pages/Home";
import DataImport from "./pages/DataImport";
import NodeAttributes from "./pages/NodeAttributes";
import NetworkAnalysis from "./pages/NetworkAnalysis";

function DashboardRoutes() {
  return (
    <NetworkDashboardLayout>
      <Switch>
        <Route path="/import" component={DataImport} />
        <Route path="/attributes" component={NodeAttributes} />
        <Route path="/analyze" component={NetworkAnalysis} />
        {/* Legacy redirects — keep old paths working */}
        <Route path="/visualize" component={NetworkAnalysis} />
        <Route path="/community" component={NetworkAnalysis} />
        <Route path="/prediction" component={NetworkAnalysis} />
      </Switch>
    </NetworkDashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/import" component={DashboardRoutes} />
      <Route path="/attributes" component={DashboardRoutes} />
      <Route path="/analyze" component={DashboardRoutes} />
      <Route path="/visualize" component={DashboardRoutes} />
      <Route path="/community" component={DashboardRoutes} />
      <Route path="/prediction" component={DashboardRoutes} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <NetworkProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </TooltipProvider>
        </NetworkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
