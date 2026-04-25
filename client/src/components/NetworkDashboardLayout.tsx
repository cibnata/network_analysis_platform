import { useNetwork } from "@/contexts/NetworkContext";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  GitBranch,
  Network,
  PieChart,
  Share2,
  Shuffle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const steps = [
  {
    id: 1,
    path: "/import",
    icon: Database,
    label: "資料匯入",
    sublabel: "Import Data",
    description: "上傳 Edge / Node 資料",
  },
  {
    id: 2,
    path: "/transform",
    icon: Shuffle,
    label: "資料處理",
    sublabel: "Data Transform",
    description: "One-mode 轉置與下載",
  },
  {
    id: 3,
    path: "/visualize",
    icon: Network,
    label: "網絡繪製",
    sublabel: "Visualization",
    description: "互動式網絡圖分析",
  },
  {
    id: 4,
    path: "/community",
    icon: Share2,
    label: "社群偵測",
    sublabel: "Community Detection",
    description: "演算法社群分析",
  },
  {
    id: 5,
    path: "/prediction",
    icon: TrendingUp,
    label: "網絡預測",
    sublabel: "Link Prediction",
    description: "連結生成與斷鏈預測",
  },
  {
    id: 6,
    path: "/statistics",
    icon: PieChart,
    label: "統計分析",
    sublabel: "Statistics",
    description: "屬性、中心性與社群統計",
  },
];

function StepIndicator({
  step,
  isActive,
  isComplete,
  collapsed,
  onClick,
}: {
  step: (typeof steps)[0];
  isActive: boolean;
  isComplete: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = step.icon;
  return (
    <button
      onClick={onClick}
      title={collapsed ? `${step.label} — ${step.sublabel}` : undefined}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-left group",
        collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-3",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
          : isComplete
          ? "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          : "text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground/70"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/30"
            : isComplete
            ? "bg-sidebar-primary/20 text-sidebar-primary"
            : "bg-sidebar-border/50 text-sidebar-foreground/40"
        )}
      >
        <Icon size={15} />
      </div>
      {!collapsed && (
        <>
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "text-sm font-semibold leading-tight",
                isActive ? "text-sidebar-accent-foreground" : ""
              )}
            >
              {step.label}
            </div>
            <div className="text-xs text-sidebar-foreground/40 mt-0.5 truncate">{step.sublabel}</div>
          </div>
          {isActive && <ChevronRight size={14} className="text-sidebar-primary flex-shrink-0" />}
          {isComplete && !isActive && (
            <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary/60 flex-shrink-0" />
          )}
        </>
      )}
    </button>
  );
}

export default function NetworkDashboardLayout({ children }: { children: React.ReactNode }) {
  const { state, setCurrentStep } = useNetwork();
  const [location, navigate] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const currentStepObj = steps.find((s) => location.startsWith(s.path)) || steps[0];

  const handleStepClick = (step: (typeof steps)[0]) => {
    setCurrentStep(step.id);
    navigate(step.path);
  };

  const hasEdges = state.edges.length > 0;
  const hasNodes = state.nodes.length > 0;
  const hasCommunity = state.communityResults.length > 0;

  const isStepComplete = (stepId: number) => {
    if (stepId === 1) return hasEdges;
    if (stepId === 2) return false; // Data Transform: always available
    if (stepId === 3) return state.nodeCSVHeaders.length > 0;
    if (stepId === 4) return hasNodes && hasEdges;
    if (stepId === 5) return hasCommunity;
    if (stepId === 6) return state.predictionResults.length > 0;
    if (stepId === 7) return hasNodes;
    return false;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 bg-sidebar flex flex-col h-full border-r border-sidebar-border transition-all duration-300 relative",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Collapse toggle button */}
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="absolute -right-3 top-16 z-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
          title={sidebarCollapsed ? "展開側邊欄" : "收合側邊欄"}
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Logo */}
        <div
          className={cn(
            "border-b border-sidebar-border transition-all duration-300",
            sidebarCollapsed ? "px-2 pt-5 pb-4" : "px-5 pt-6 pb-5"
          )}
        >
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
              <Activity size={18} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="text-sm font-bold text-sidebar-foreground leading-tight">
                  網絡分析平台
                </div>
                <div className="text-xs text-sidebar-foreground/40 mt-0.5">Network Analysis</div>
              </div>
            )}
          </div>
        </div>

        {/* Workflow Steps */}
        <div className={cn("flex-1 overflow-y-auto py-4 custom-scroll", sidebarCollapsed ? "px-1.5" : "px-3")}>
          {!sidebarCollapsed && (
            <div className="mb-3 px-2">
              <span className="text-xs font-semibold text-sidebar-foreground/30 uppercase tracking-widest">
                分析流程
              </span>
            </div>
          )}
          <nav className="space-y-1">
            {steps.map((step) => (
              <StepIndicator
                key={step.id}
                step={step}
                isActive={location.startsWith(step.path)}
                isComplete={isStepComplete(step.id)}
                collapsed={sidebarCollapsed}
                onClick={() => handleStepClick(step)}
              />
            ))}
          </nav>

          {/* Progress indicator */}
          {!sidebarCollapsed && (
            <div className="mt-6 px-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-sidebar-foreground/40">分析進度</span>
                <span className="text-xs font-medium text-sidebar-primary">
                  {steps.filter((s) => isStepComplete(s.id)).length} / {steps.length}
                </span>
              </div>
              <div className="h-1 bg-sidebar-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sidebar-primary to-sidebar-primary/70 rounded-full transition-all duration-500"
                  style={{
                    width: `${(steps.filter((s) => isStepComplete(s.id)).length / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Data summary */}
          {hasEdges && !sidebarCollapsed && (
            <div className="mt-5 mx-1 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-sidebar-primary" />
                <span className="text-xs font-semibold text-sidebar-foreground/60">資料摘要</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-sidebar-foreground/40">節點數</span>
                  <span className="text-xs font-semibold text-sidebar-foreground/80">
                    {state.nodes.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-sidebar-foreground/40">邊數</span>
                  <span className="text-xs font-semibold text-sidebar-foreground/80">
                    {state.edges.length}
                  </span>
                </div>
                {hasCommunity && (
                  <div className="flex justify-between">
                    <span className="text-xs text-sidebar-foreground/40">社群數</span>
                    <span className="text-xs font-semibold text-sidebar-foreground/80">
                      {new Set(state.communityResults.map((r) => r.communityId)).size}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collapsed: data dot indicator */}
          {hasEdges && sidebarCollapsed && (
            <div className="mt-4 flex justify-center">
              <div className="w-2 h-2 rounded-full bg-sidebar-primary/70" title={`${state.nodes.length} 節點 · ${state.edges.length} 邊`} />
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className={cn("py-4 border-t border-sidebar-border", sidebarCollapsed ? "px-1.5" : "px-3")}>
          <Link href="/">
            <button
              className={cn(
                "w-full flex items-center gap-3 rounded-xl text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/30 transition-all duration-200",
                sidebarCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5"
              )}
              title={sidebarCollapsed ? "首頁" : undefined}
            >
              <GitBranch size={15} />
              {!sidebarCollapsed && <span className="text-sm">首頁</span>}
            </button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-6 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{currentStepObj?.label}</span>
            <ChevronRight size={14} />
            <span>{currentStepObj?.description}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {hasEdges && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>
                  {state.nodes.length} 節點 · {state.edges.length} 邊
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto custom-scroll min-h-0">{children}</div>
      </main>
    </div>
  );
}
