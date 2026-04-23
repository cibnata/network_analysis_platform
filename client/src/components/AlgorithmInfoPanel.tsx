import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, Zap, CheckCircle2, XCircle, FlaskConical, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricItem {
  name: string;
  formula: string;
  explanation: string;
  range: string;
}

interface ParameterItem {
  name: string;
  description: string;
}

export interface AlgorithmInfoProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  principle: string;
  howItWorks: string;
  metrics?: MetricItem[];
  parameters?: ParameterItem[];
  useCases: string[];
  pros: string[];
  cons: string[];
  interpretation?: string;
  reference?: string;
  defaultOpen?: boolean;
  className?: string;
}

export function AlgorithmInfoPanel({
  title,
  badge,
  badgeColor,
  principle,
  howItWorks,
  metrics,
  parameters,
  useCases,
  pros,
  cons,
  interpretation,
  reference,
  defaultOpen = false,
  className,
}: AlgorithmInfoProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<"principle" | "howItWorks" | "metrics" | "useCases" | "proscons">("principle");

  const tabs = [
    { id: "principle" as const, label: "原理" },
    { id: "howItWorks" as const, label: "運作方式" },
    ...(metrics && metrics.length > 0 ? [{ id: "metrics" as const, label: "計算指標" }] : []),
    ...(parameters && parameters.length > 0 ? [{ id: "metrics" as const, label: "參數說明" }] : []),
    { id: "useCases" as const, label: "適用情境" },
    { id: "proscons" as const, label: "優缺點" },
  ];

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">演算法說明：{title}</span>
          {badge && (
            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", badgeColor || "bg-primary/10 text-primary border-primary/20")}>
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Content */}
      {open && (
        <div className="border-t border-border">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-border overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id + tab.label}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3 text-sm">
            {/* 原理 */}
            {activeTab === "principle" && (
              <div className="space-y-2">
                <p className="text-foreground/80 leading-relaxed">{principle}</p>
              </div>
            )}

            {/* 運作方式 */}
            {activeTab === "howItWorks" && (
              <div className="space-y-2">
                <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{howItWorks}</p>
                {parameters && parameters.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">參數說明</p>
                    {parameters.map((p) => (
                      <div key={p.name} className="p-3 rounded-lg bg-muted/40 border border-border">
                        <p className="text-xs font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 計算指標 */}
            {activeTab === "metrics" && metrics && (
              <div className="space-y-3">
                {metrics.map((m) => (
                  <div key={m.name} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FlaskConical size={12} className="text-primary flex-shrink-0" />
                      <p className="text-xs font-bold text-foreground">{m.name}</p>
                    </div>
                    <code className="block text-xs font-mono text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10">
                      {m.formula}
                    </code>
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.explanation}</p>
                    <p className="text-xs text-muted-foreground/70 italic">範圍：{m.range}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 適用情境 */}
            {activeTab === "useCases" && (
              <div className="space-y-2">
                {useCases.map((u, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-foreground/80 leading-relaxed">{u}</p>
                  </div>
                ))}
                {interpretation && (
                  <div className="mt-3 p-3 rounded-lg bg-accent/30 border border-accent/50">
                    <p className="text-xs font-semibold text-foreground mb-1">結果解讀</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{interpretation}</p>
                  </div>
                )}
              </div>
            )}

            {/* 優缺點 */}
            {activeTab === "proscons" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 size={13} className="text-accent-foreground" />
                    <p className="text-xs font-semibold text-foreground">優點</p>
                  </div>
                  {pros.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 pl-1">
                      <div className="w-1 h-1 rounded-full bg-accent-foreground mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-foreground/80 leading-relaxed">{p}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    <XCircle size={13} className="text-primary" />
                    <p className="text-xs font-semibold text-foreground">限制</p>
                  </div>
                  {cons.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 pl-1">
                      <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-foreground/80 leading-relaxed">{c}</p>
                    </div>
                  ))}
                </div>
                {reference && (
                  <div className="pt-2 border-t border-border flex items-start gap-2">
                    <ExternalLink size={11} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground italic leading-relaxed">{reference}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compact inline variant for sidebar use ──────────────────────────────────

export interface AlgorithmSidebarInfoProps {
  principle: string;
  complexity?: string;
  tip?: string;
  className?: string;
}

export function AlgorithmSidebarInfo({ principle, complexity, tip, className }: AlgorithmSidebarInfoProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-lg border border-border/60 overflow-hidden", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <BookOpen size={12} className="text-primary" />
          <span className="text-xs font-medium text-muted-foreground">演算法說明</span>
        </div>
        {open ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border/60 px-3 py-2.5 space-y-2 bg-muted/20">
          <p className="text-xs text-foreground/75 leading-relaxed">{principle}</p>
          {complexity && (
            <div className="flex items-center gap-1.5">
              <Zap size={10} className="text-muted-foreground" />
              <code className="text-xs font-mono text-muted-foreground">{complexity}</code>
            </div>
          )}
          {tip && (
            <p className="text-xs text-primary/80 italic border-l-2 border-primary/30 pl-2">{tip}</p>
          )}
        </div>
      )}
    </div>
  );
}
