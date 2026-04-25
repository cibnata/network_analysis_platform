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
import NetworkVisualize from "./pages/NetworkVisualize";
import CommunityDetection from "./pages/CommunityDetection";
import NetworkPrediction from "./pages/NetworkPrediction";
import DataTransform from "./pages/DataTransform";
import Statistics from "./pages/Statistics";

function DashboardRoutes() {
  return (
    <NetworkDashboardLayout>
      <Switch>
        <Route path="/import" component={DataImport} />
        <Route path="/transform" component={DataTransform} />
        <Route path="/attributes" component={NodeAttributes} />
        <Route path="/visualize" component={NetworkVisualize} />
        <Route path="/community" component={CommunityDetection} />
        <Route path="/prediction" component={NetworkPrediction} />
        <Route path="/statistics" component={Statistics} />
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
      <Route path="/visualize" component={DashboardRoutes} />
      <Route path="/community" component={DashboardRoutes} />
      <Route path="/prediction" component={DashboardRoutes} />
      <Route path="/transform" component={DashboardRoutes} />
      <Route path="/statistics" component={DashboardRoutes} />
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
