/**
 * NetworkAnalysis.tsx
 * 整合頁面：網絡繪製 / 社群偵測 / 網絡預測 — 以 Tabs 切換
 */
import { useNetwork } from "@/contexts/NetworkContext";
import { AlgorithmInfoPanel } from "@/components/AlgorithmInfoPanel";
import { LAYOUT_INFO, COMMUNITY_ALGORITHM_INFO, PREDICTION_ALGORITHM_INFO } from "@/lib/algorithmInfo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Edit3,
  Info,
  Layers,
  Link2,
  Loader2,
  Maximize2,
  Network,
  RefreshCw,
  Share2,
  Tag,
  TrendingUp,
  Unlink,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useLocation } from "wouter";
import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import dagre from "cytoscape-dagre";
import { louvain, labelPropagation, girvanNewman } from "@/lib/communityAlgorithms";
import { predictLinks, predictDissolution } from "@/lib/predictionAlgorithms";
import { cn } from "@/lib/utils";

// Register Cytoscape layouts (idempotent)
try { cytoscape.use(cola); } catch (_) { /* already registered */ }
try { cytoscape.use(dagre); } catch (_) { /* already registered */ }

// ─── Shared colour palette ────────────────────────────────────────────────────
const COMMUNITY_COLORS = [
  "#EDAFB8", "#4A5759", "#B0C4B1", "#DEDBD2", "#F7E1D7",
  "#d4849a", "#6b7e80", "#8aaa8b", "#c4c1b8", "#e8c9b8",
];
const COMMUNITY_BG_CLASSES = [
  "bg-primary", "bg-accent-foreground", "bg-secondary-foreground",
  "bg-muted-foreground", "bg-primary/70", "bg-accent-foreground/80",
  "bg-secondary-foreground/70", "bg-primary/50", "bg-accent-foreground/60", "bg-muted-foreground/80",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const LAYOUTS = LAYOUT_INFO.map((l) => ({ id: l.id, label: l.label, sublabel: l.sublabel }));
const ALGORITHMS = COMMUNITY_ALGORITHM_INFO.map((a) => ({
  id: a.id, label: a.label,
  description: a.principle.slice(0, 50) + "...",
  complexity: a.complexity, badge: a.badge,
  badgeColor: a.id === "louvain"
    ? "bg-primary/10 text-primary border-primary/20"
    : a.id === "label-propagation"
    ? "bg-accent/70 text-accent-foreground border-accent"
    : "bg-secondary text-secondary-foreground border-border",
}));

type PredictionMode = "add" | "remove" | "both";
const PREDICTION_MODES = [
  {
    id: "add" as const,
    label: "Link Prediction",
    sublabel: "連結生成預測",
    description: "預測網絡中尚未連結但可能在未來形成連結的節點對，適用於社交網絡好友推薦、犯罪關係預測等場景。",
    lineStyle: "Ash Grey 虛線標示",
    color: "text-accent-foreground",
    bgColor: "bg-accent/20",
    borderColor: "border-accent",
    icon: Link2,
  },
  {
    id: "remove" as const,
    label: "Link Dissolution",
    sublabel: "連結斷開預測",
    description: "預測網絡中現有連結在未來可能斷開的節點對，適用於分析組織解散、關係疏遠等動態網絡變化。",
    lineStyle: "Cherry Blossom 虛線標示",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    icon: Unlink,
  },
];

// ─── Empty state card ─────────────────────────────────────────────────────────
function EmptyState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
          <Info size={36} className="text-primary" />
          <div>
            <p className="font-semibold text-foreground text-base">尚未匯入資料</p>
            <p className="text-sm text-muted-foreground mt-1">請先完成資料匯入步驟，再進行網絡分析。</p>
          </div>
          <Button onClick={onNavigate}>前往資料匯入</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab 1: 網絡繪製
// ═════════════════════════════════════════════════════════════════════════════
function VisualizationTab() {
  const { state, setCustomLabel, setSelectedAttribute } = useNetwork();
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);

  const [selectedLayout, setSelectedLayout] = useState("cola");
  const [iterations, setIterations] = useState(100);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [zoom, setZoom] = useState(1);

  const buildElements = useCallback(() => {
    const communityMap = new Map<string, number>();
    state.communityResults.forEach((r) => communityMap.set(r.nodeId, r.communityId));

    const nodes = state.nodes.map((n) => {
      const label = state.customLabels[n.id] ||
        (state.selectedAttribute && n[state.selectedAttribute]
          ? String(n[state.selectedAttribute]) : n.id);
      const communityId = communityMap.get(n.id);
      const color = communityId !== undefined
        ? COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length]
        : "#EDAFB8";
      return { data: { id: n.id, label, color, communityId } };
    });

    const addPredictions = state.predictionResults.filter((p) => p.type === "add");
    const removePredictions = state.predictionResults.filter((p) => p.type === "remove");

    const edges = state.edges.map((e, i) => {
      const isRemove = removePredictions.some(
        (p) => (p.source === e.source && p.target === e.target) ||
                (p.source === e.target && p.target === e.source)
      );
      return { data: { id: `e${i}`, source: e.source, target: e.target, edgeType: isRemove ? "remove" : "normal" } };
    });

    const predEdges = addPredictions.map((p, i) => ({
      data: { id: `pred_add_${i}`, source: p.source, target: p.target, edgeType: "add" },
    }));

    return [...nodes, ...edges, ...predEdges];
  }, [state.nodes, state.edges, state.communityResults, state.predictionResults, state.customLabels, state.selectedAttribute]);

  const applyLayout = useCallback((cy: cytoscape.Core, layoutId: string) => {
    let layoutConfig: cytoscape.LayoutOptions;
    if (layoutId === "cola") {
      layoutConfig = { name: "cola", animate: true, maxSimulationTime: iterations * 10, nodeSpacing: 40, edgeLengthVal: 120 } as cytoscape.LayoutOptions;
    } else if (layoutId === "dagre") {
      layoutConfig = { name: "dagre", rankDir: "TB", nodeSep: 60, rankSep: 80, animate: true } as cytoscape.LayoutOptions;
    } else {
      layoutConfig = { name: layoutId, animate: true, animationDuration: 600, padding: 40 } as cytoscape.LayoutOptions;
    }
    cy.layout(layoutConfig).run();
  }, [iterations]);

  const initCytoscape = useCallback(() => {
    if (!cyRef.current || state.nodes.length === 0) return;
    cyInstance.current?.destroy();
    const elements = buildElements();
    const cy = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        { selector: "node", style: { "background-color": "data(color)", "label": "data(label)", "color": "#3d3030", "text-valign": "center", "text-halign": "center", "font-size": "11px", "font-family": "Inter, sans-serif", "font-weight": 600, "width": 42, "height": 42, "border-width": 2, "border-color": "#F7E1D7", "border-opacity": 0.9, "text-outline-width": 2, "text-outline-color": "data(color)", "text-max-width": "80px", "text-wrap": "ellipsis", "shadow-blur": 8, "shadow-color": "data(color)", "shadow-opacity": 0.3, "shadow-offset-x": 0, "shadow-offset-y": 2, "transition-property": "background-color, border-color, width, height", "transition-duration": 200 } as cytoscape.Css.Node },
        { selector: "node:selected", style: { "border-width": 3, "border-color": "#4A5759", "width": 52, "height": 52, "shadow-opacity": 0.6 } as cytoscape.Css.Node },
        { selector: "edge[edgeType='normal']", style: { "width": 1.5, "line-color": "#DEDBD2", "target-arrow-color": "#DEDBD2", "target-arrow-shape": "triangle", "curve-style": "bezier", "opacity": 0.7, "arrow-scale": 0.8 } as cytoscape.Css.Edge },
        { selector: "edge[edgeType='add']", style: { "width": 2, "line-color": "#B0C4B1", "target-arrow-color": "#B0C4B1", "target-arrow-shape": "triangle", "curve-style": "bezier", "line-style": "dashed", "line-dash-pattern": [8, 4], "opacity": 0.85 } as cytoscape.Css.Edge },
        { selector: "edge[edgeType='remove']", style: { "width": 2, "line-color": "#d4849a", "target-arrow-color": "#d4849a", "target-arrow-shape": "triangle", "curve-style": "bezier", "line-style": "dashed", "line-dash-pattern": [6, 3], "opacity": 0.85 } as cytoscape.Css.Edge },
        { selector: "node:active", style: { "overlay-opacity": 0.1 } as cytoscape.Css.Node },
      ],
      layout: { name: "preset" },
      wheelSensitivity: 0.3, minZoom: 0.1, maxZoom: 5,
    });
    cy.nodes().grabify();
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      setEditingNode(node.id());
      setEditLabel(node.data("label") || node.id());
    });
    cy.on("zoom", () => setZoom(Math.round(cy.zoom() * 100) / 100));
    cyInstance.current = cy;
    applyLayout(cy, selectedLayout);
  }, [buildElements, applyLayout, selectedLayout, state.nodes.length]);

  useEffect(() => {
    initCytoscape();
    return () => { cyInstance.current?.destroy(); cyInstance.current = null; };
  }, [state.edges, state.nodes, state.communityResults, state.predictionResults]);

  const handleRelayout = useCallback(() => {
    if (cyInstance.current) applyLayout(cyInstance.current, selectedLayout);
  }, [applyLayout, selectedLayout]);

  const handleApplyLabel = useCallback(() => {
    if (!editingNode) return;
    setCustomLabel(editingNode, editLabel);
    cyInstance.current?.getElementById(editingNode).data("label", editLabel);
    toast.success(`節點 ${editingNode} 標籤已更新`);
    setEditingNode(null);
  }, [editingNode, editLabel, setCustomLabel]);

  const handleApplyAttributeLabel = useCallback(() => {
    if (!state.selectedAttribute) { toast.error("請先在屬性管理中選擇屬性"); return; }
    if (cyInstance.current) {
      state.nodes.forEach((n) => {
        const label = n[state.selectedAttribute] ? String(n[state.selectedAttribute]) : n.id;
        cyInstance.current!.getElementById(n.id).data("label", label);
      });
    }
    toast.success(`已套用屬性「${state.selectedAttribute}」作為節點標籤`);
  }, [state.selectedAttribute, state.nodes]);

  const handleFitView = useCallback(() => { cyInstance.current?.fit(undefined, 40); }, []);

  return (
    <div className="flex h-full gap-0">
      {/* Left controls */}
      <div className="w-68 flex-shrink-0 border-r border-border bg-card overflow-y-auto custom-scroll p-4 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers size={14} className="text-primary" />佈局設定
          </h2>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">佈局演算法</Label>
          <div className="space-y-1.5">
            {LAYOUTS.map((layout) => (
              <button key={layout.id} onClick={() => setSelectedLayout(layout.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all duration-150 ${selectedLayout === layout.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/50"}`}
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{layout.label}</div>
                  <div className="text-xs text-muted-foreground">{layout.sublabel}</div>
                </div>
                {selectedLayout === layout.id && <div className="w-2 h-2 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>
        {selectedLayout === "cola" && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">迭代次數：{iterations}</Label>
            <Slider value={[iterations]} onValueChange={([v]) => setIterations(v)} min={10} max={500} step={10} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>10</span><span>500</span></div>
          </div>
        )}
        <Button onClick={handleRelayout} className="w-full" size="sm">
          <RefreshCw size={13} className="mr-2" />重新佈局
        </Button>
        <div className="pt-2 border-t border-border space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Tag size={14} className="text-primary" />節點標籤</h3>
          {state.selectedAttribute && (
            <Button variant="outline" size="sm" className="w-full" onClick={handleApplyAttributeLabel}>
              <Tag size={12} className="mr-2" />套用屬性「{state.selectedAttribute}」
            </Button>
          )}
          {editingNode ? (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2 border border-border">
              <p className="text-xs font-semibold text-muted-foreground">編輯節點：<span className="text-primary font-mono">{editingNode}</span></p>
              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-sm" placeholder="輸入新標籤..." onKeyDown={(e) => e.key === "Enter" && handleApplyLabel()} />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleApplyLabel}><Edit3 size={11} className="mr-1" />套用</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNode(null)}>取消</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">點擊圖中節點可手動編輯標籤</p>
          )}
        </div>
        {(state.communityResults.length > 0 || state.predictionResults.length > 0) && (
          <div className="pt-2 border-t border-border space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">圖例</h3>
            {state.communityResults.length > 0 && (
              <div className="space-y-1.5">
                {Array.from(new Set(state.communityResults.map((r) => r.communityId))).sort((a, b) => a - b).map((cid) => (
                  <div key={cid} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COMMUNITY_COLORS[cid % COMMUNITY_COLORS.length] }} />
                    <span className="text-foreground/70">社群 {cid + 1}</span>
                  </div>
                ))}
              </div>
            )}
            {state.predictionResults.some((p) => p.type === "add") && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-0.5 border-dashed border-t-2" style={{ borderColor: "#B0C4B1" }} />
                <span className="text-foreground/70">預測新增連結</span>
              </div>
            )}
            {state.predictionResults.some((p) => p.type === "remove") && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-0.5 border-dashed border-t-2" style={{ borderColor: "#d4849a" }} />
                <span className="text-foreground/70">預測斷開連結</span>
              </div>
            )}
          </div>
        )}
        <div className="pt-2 border-t border-border">
          {LAYOUT_INFO.filter((l) => l.id === selectedLayout).map((info) => (
            <AlgorithmInfoPanel key={info.id} title={info.label} principle={info.principle} howItWorks={info.howItWorks} parameters={info.parameters} useCases={info.useCases} pros={info.pros} cons={info.cons} reference={info.reference} defaultOpen={false} />
          ))}
        </div>
      </div>
      {/* Canvas */}
      <div className="flex-1 relative network-canvas">
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
          <Button size="icon" variant="secondary" className="w-8 h-8 shadow-sm" onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() * 1.2)}><ZoomIn size={14} /></Button>
          <Button size="icon" variant="secondary" className="w-8 h-8 shadow-sm" onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() / 1.2)}><ZoomOut size={14} /></Button>
          <Button size="icon" variant="secondary" className="w-8 h-8 shadow-sm" onClick={handleFitView}><Maximize2 size={14} /></Button>
        </div>
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Badge variant="secondary" className="text-xs shadow-sm"><Network size={11} className="mr-1" />{state.nodes.length} 節點</Badge>
          <Badge variant="secondary" className="text-xs shadow-sm">{state.edges.length} 邊</Badge>
          <Badge variant="secondary" className="text-xs shadow-sm">{Math.round(zoom * 100)}%</Badge>
        </div>
        <div ref={cyRef} className="w-full h-full" />
        {state.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Network size={48} className="opacity-20" /><p className="text-sm">尚無網絡資料</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab 2: 社群偵測
// ═════════════════════════════════════════════════════════════════════════════
function CommunityTab() {
  const { state, setCommunityResults } = useNetwork();
  const [selectedAlgo, setSelectedAlgo] = useState("louvain");
  const [numCommunities, setNumCommunities] = useState(4);
  const [isRunning, setIsRunning] = useState(false);

  const handleDetect = useCallback(async () => {
    if (state.edges.length === 0) { toast.error("請先匯入 Edge 資料"); return; }
    setIsRunning(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      let results;
      if (selectedAlgo === "louvain") results = louvain(state.nodes, state.edges);
      else if (selectedAlgo === "label-propagation") results = labelPropagation(state.nodes, state.edges);
      else results = girvanNewman(state.nodes, state.edges, numCommunities);
      setCommunityResults(results, selectedAlgo);
      const numComm = new Set(results.map((r) => r.communityId)).size;
      toast.success(`偵測完成！共發現 ${numComm} 個社群，結果已同步至網絡圖`);
    } catch (err) {
      console.error(err); toast.error("社群偵測失敗");
    } finally { setIsRunning(false); }
  }, [selectedAlgo, numCommunities, state.nodes, state.edges, setCommunityResults]);

  const handleDownload = useCallback(() => {
    if (state.communityResults.length === 0) { toast.error("尚無偵測結果"); return; }
    const data = state.communityResults.map((r) => {
      const node = state.nodes.find((n) => n.id === r.nodeId);
      const label = state.customLabels[r.nodeId] ||
        (state.selectedAttribute && node?.[state.selectedAttribute] ? String(node[state.selectedAttribute]) : r.nodeId);
      return { 節點ID: r.nodeId, 節點名稱: label, 社群編號: r.communityId + 1, 演算法: ALGORITHMS.find((a) => a.id === state.communityAlgorithm)?.label || state.communityAlgorithm };
    });
    downloadCSV(data, `community_detection_${state.communityAlgorithm}.csv`);
    toast.success("社群偵測結果已下載");
  }, [state.communityResults, state.nodes, state.customLabels, state.selectedAttribute, state.communityAlgorithm]);

  const communityGroups = new Map<number, string[]>();
  state.communityResults.forEach((r) => {
    if (!communityGroups.has(r.communityId)) communityGroups.set(r.communityId, []);
    communityGroups.get(r.communityId)!.push(r.nodeId);
  });
  const sortedCommunities = Array.from(communityGroups.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full custom-scroll">
      <div>
        <h2 className="text-xl font-bold text-foreground">社群偵測</h2>
        <p className="text-muted-foreground mt-1 text-sm">選擇演算法對網絡進行社群劃分，偵測結果將同步顯示於「網絡繪製」頁籤的節點顏色。</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {ALGORITHMS.map((algo) => (
          <button key={algo.id} onClick={() => setSelectedAlgo(algo.id)}
            className={cn("flex flex-col gap-2 p-4 rounded-xl border text-left transition-all duration-200",
              selectedAlgo === algo.id ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "border-border hover:border-primary/30 hover:bg-muted/30")}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">{algo.label}</span>
              <Badge className={cn("text-xs border", algo.badgeColor)}>{algo.badge}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{algo.description}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Zap size={11} className="text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">{algo.complexity}</span>
            </div>
            {selectedAlgo === algo.id && (
              <div className="flex items-center gap-1.5 text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" /><span className="text-xs font-semibold">已選擇</span>
              </div>
            )}
          </button>
        ))}
      </div>
      {selectedAlgo === "girvan-newman" && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">目標社群數量</label>
            <input type="range" min={2} max={Math.min(10, state.nodes.length)} value={numCommunities} onChange={(e) => setNumCommunities(Number(e.target.value))} className="flex-1 accent-primary" />
            <span className="text-sm font-bold text-primary w-6 text-center">{numCommunities}</span>
          </CardContent>
        </Card>
      )}
      <Button onClick={handleDetect} disabled={isRunning} className="w-full h-11 text-base">
        {isRunning ? (<><Loader2 size={16} className="mr-2 animate-spin" />偵測中...</>) : (<><Share2 size={16} className="mr-2" />執行{ALGORITHMS.find((a) => a.id === selectedAlgo)?.label}社群偵測</>)}
      </Button>
      {state.communityResults.length > 0 && (
        <div className="space-y-4">
          <Card className="border-accent bg-accent/30">
            <CardContent className="p-4 flex items-center gap-4">
              <CheckCircle2 size={20} className="text-accent-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">偵測完成 — 使用 {ALGORITHMS.find((a) => a.id === state.communityAlgorithm)?.label} 演算法</p>
                <p className="text-xs text-muted-foreground mt-0.5">共 {state.nodes.length} 個節點，劃分為 {sortedCommunities.length} 個社群</p>
              </div>
              <Button size="sm" onClick={handleDownload} className="gap-2"><Download size={13} />下載 CSV</Button>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            {sortedCommunities.map(([commId, nodeIds]) => (
              <Card key={commId} className="overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full flex-shrink-0", COMMUNITY_BG_CLASSES[commId % COMMUNITY_BG_CLASSES.length])} />
                    <span>社群 {commId + 1}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{nodeIds.length} 個節點</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scroll">
                    {nodeIds.map((nodeId) => {
                      const node = state.nodes.find((n) => n.id === nodeId);
                      const label = state.customLabels[nodeId] || (state.selectedAttribute && node?.[state.selectedAttribute] ? String(node[state.selectedAttribute]) : nodeId);
                      return (
                        <span key={nodeId} className="text-xs px-2 py-0.5 rounded-full border font-mono"
                          style={{ backgroundColor: COMMUNITY_COLORS[commId % COMMUNITY_COLORS.length] + "18", borderColor: COMMUNITY_COLORS[commId % COMMUNITY_COLORS.length] + "40", color: COMMUNITY_COLORS[commId % COMMUNITY_COLORS.length] }}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <Info size={14} className="text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">社群偵測結果已同步至網絡圖，節點顏色代表不同社群。請切換至「網絡繪製」頁籤查看視覺化結果。</p>
            </CardContent>
          </Card>
        </div>
      )}
      {COMMUNITY_ALGORITHM_INFO.filter((a) => a.id === selectedAlgo).map((info) => (
        <AlgorithmInfoPanel key={info.id} title={info.label} badge={info.badge}
          badgeColor={info.id === "louvain" ? "bg-primary/10 text-primary border-primary/20" : info.id === "label-propagation" ? "bg-accent/70 text-accent-foreground border-accent" : "bg-secondary text-secondary-foreground border-border"}
          principle={info.principle} howItWorks={info.howItWorks + (info.modularity ? "\n\n模組度：" + info.modularity : "")} parameters={info.parameters} useCases={info.useCases} pros={info.pros} cons={info.cons} reference={info.reference} defaultOpen={false} />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab 3: 網絡預測
// ═════════════════════════════════════════════════════════════════════════════
function PredictionTab() {
  const { state, setPredictionResults } = useNetwork();
  const [selectedMode, setSelectedMode] = useState<PredictionMode>("add");
  const [topK, setTopK] = useState(5);
  const [isRunning, setIsRunning] = useState(false);

  const handlePredict = useCallback(async () => {
    if (state.edges.length === 0) { toast.error("請先匯入 Edge 資料"); return; }
    setIsRunning(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      let results: ReturnType<typeof predictLinks> = [];
      if (selectedMode === "add" || selectedMode === "both") results = [...results, ...predictLinks(state.nodes, state.edges, topK)];
      if (selectedMode === "remove" || selectedMode === "both") results = [...results, ...predictDissolution(state.nodes, state.edges, topK)];
      setPredictionResults(results);
      const addCount = results.filter((r) => r.type === "add").length;
      const removeCount = results.filter((r) => r.type === "remove").length;
      toast.success(`預測完成！${addCount > 0 ? `新增連結 ${addCount} 條` : ""}${addCount > 0 && removeCount > 0 ? "，" : ""}${removeCount > 0 ? `斷開連結 ${removeCount} 條` : ""}，結果已同步至網絡圖`);
    } catch (err) {
      console.error(err); toast.error("預測失敗");
    } finally { setIsRunning(false); }
  }, [selectedMode, topK, state.nodes, state.edges, setPredictionResults]);

  const addResults = state.predictionResults.filter((r) => r.type === "add");
  const removeResults = state.predictionResults.filter((r) => r.type === "remove");

  const getNodeLabel = useCallback((nodeId: string) => {
    const node = state.nodes.find((n) => n.id === nodeId);
    return state.customLabels[nodeId] || (state.selectedAttribute && node?.[state.selectedAttribute] ? String(node[state.selectedAttribute]) : nodeId);
  }, [state.nodes, state.customLabels, state.selectedAttribute]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full custom-scroll">
      <div>
        <h2 className="text-xl font-bold text-foreground">網絡預測</h2>
        <p className="text-muted-foreground mt-1 text-sm">預測網絡中可能新增或斷開的連結，結果將直接標示於「網絡繪製」頁籤的圖形上。</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {PREDICTION_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id || selectedMode === "both";
          return (
            <button key={mode.id}
              onClick={() => setSelectedMode((prev) => { if (prev === "both") return mode.id as "add" | "remove"; if (prev === mode.id) return "both"; return "both"; })}
              className={cn("flex flex-col gap-3 p-5 rounded-xl border text-left transition-all duration-200", isSelected ? `${mode.borderColor} ${mode.bgColor} shadow-sm ring-1 ring-inset` : "border-border hover:border-primary/30 hover:bg-muted/30")}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isSelected ? mode.bgColor : "bg-muted")}>
                  <Icon size={20} className={isSelected ? mode.color : "text-muted-foreground"} />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{mode.label}</div>
                  <div className="text-xs text-muted-foreground">{mode.sublabel}</div>
                </div>
                {isSelected && <CheckCircle2 size={16} className={cn("ml-auto", mode.color)} />}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{mode.description}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-0" style={{ borderTop: `2px dashed ${mode.id === "add" ? "#B0C4B1" : "#d4849a"}` }} />
                <span className="text-xs text-muted-foreground">{mode.lineStyle}</span>
              </div>
            </button>
          );
        })}
      </div>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Label className="text-sm font-medium text-foreground whitespace-nowrap">預測結果數量（Top K）</Label>
          <Slider value={[topK]} onValueChange={([v]) => setTopK(v)} min={1} max={Math.min(20, Math.max(state.edges.length, state.nodes.length))} step={1} className="flex-1" />
          <span className="text-sm font-bold text-primary w-8 text-center">{topK}</span>
        </CardContent>
      </Card>
      <Button onClick={handlePredict} disabled={isRunning} className="w-full h-11 text-base">
        {isRunning ? (<><Loader2 size={16} className="mr-2 animate-spin" />預測中...</>) : (<><TrendingUp size={16} className="mr-2" />執行網絡預測</>)}
      </Button>
      {(addResults.length > 0 || removeResults.length > 0) && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {addResults.length > 0 && (
              <Card className="border-accent/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Link2 size={14} className="text-accent-foreground" />
                    <span className="text-accent-foreground">預測新增連結</span>
                    <Badge className="ml-auto bg-accent/70 text-accent-foreground border-accent text-xs border">{addResults.length} 條</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {addResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-accent/30 border border-accent/50">
                      <span className="text-xs font-mono text-foreground truncate flex-1">{getNodeLabel(r.source)}</span>
                      <div className="flex-shrink-0 w-4 h-0 border-t-2 border-dashed" style={{ borderColor: "#B0C4B1" }} />
                      <span className="text-xs font-mono text-foreground truncate flex-1 text-right">{getNodeLabel(r.target)}</span>
                      <Badge variant="outline" className="text-xs ml-1 border-accent text-accent-foreground flex-shrink-0">{r.score.toFixed(3)}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {removeResults.length > 0 && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Unlink size={14} className="text-primary" />
                    <span className="text-primary">預測斷開連結</span>
                    <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-xs border">{removeResults.length} 條</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {removeResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
                      <span className="text-xs font-mono text-foreground truncate flex-1">{getNodeLabel(r.source)}</span>
                      <div className="flex-shrink-0 w-4 h-0 border-t-2 border-dashed" style={{ borderColor: "#d4849a" }} />
                      <span className="text-xs font-mono text-foreground truncate flex-1 text-right">{getNodeLabel(r.target)}</span>
                      <Badge variant="outline" className="text-xs ml-1 border-primary/20 text-primary flex-shrink-0">{r.score.toFixed(3)}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <Info size={14} className="text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">預測結果已同步至網絡圖。Ash Grey 虛線代表預測新增連結，Cherry Blossom 虛線代表預測斷開連結。請切換至「網絡繪製」頁籤查看完整視覺化。</p>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="space-y-3">
        {(selectedMode === "add" || selectedMode === "both") && (
          <AlgorithmInfoPanel title="Link Prediction" badge="連結生成" badgeColor="bg-accent/70 text-accent-foreground border-accent"
            principle={PREDICTION_ALGORITHM_INFO[0].principle} howItWorks={PREDICTION_ALGORITHM_INFO[0].howItWorks}
            metrics={PREDICTION_ALGORITHM_INFO[0].metrics} useCases={PREDICTION_ALGORITHM_INFO[0].useCases}
            pros={PREDICTION_ALGORITHM_INFO[0].pros} cons={PREDICTION_ALGORITHM_INFO[0].cons}
            interpretation={PREDICTION_ALGORITHM_INFO[0].interpretation} reference={PREDICTION_ALGORITHM_INFO[0].reference} defaultOpen={false} />
        )}
        {(selectedMode === "remove" || selectedMode === "both") && (
          <AlgorithmInfoPanel title="Link Dissolution" badge="連結斷開" badgeColor="bg-primary/10 text-primary border-primary/20"
            principle={PREDICTION_ALGORITHM_INFO[1].principle} howItWorks={PREDICTION_ALGORITHM_INFO[1].howItWorks}
            metrics={PREDICTION_ALGORITHM_INFO[1].metrics} useCases={PREDICTION_ALGORITHM_INFO[1].useCases}
            pros={PREDICTION_ALGORITHM_INFO[1].pros} cons={PREDICTION_ALGORITHM_INFO[1].cons}
            interpretation={PREDICTION_ALGORITHM_INFO[1].interpretation} reference={PREDICTION_ALGORITHM_INFO[1].reference} defaultOpen={false} />
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main: NetworkAnalysis (整合頁面)
// ═════════════════════════════════════════════════════════════════════════════
export default function NetworkAnalysis() {
  const { state } = useNetwork();
  const [, navigate] = useLocation();

  if (state.edges.length === 0) {
    return <EmptyState onNavigate={() => navigate("/import")} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs header */}
      <Tabs defaultValue="visualize" className="flex flex-col h-full">
        <div className="flex-shrink-0 px-4 pt-3 pb-0 border-b border-border bg-card/50">
          <TabsList className="h-10 gap-1 bg-transparent p-0 border-0">
            <TabsTrigger
              value="visualize"
              className="h-10 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-sm transition-all"
            >
              <Network size={14} className="mr-2" />
              網絡繪製
            </TabsTrigger>
            <TabsTrigger
              value="community"
              className="h-10 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-sm transition-all"
            >
              <Share2 size={14} className="mr-2" />
              社群偵測
              {state.communityResults.length > 0 && (
                <Badge className="ml-2 text-xs bg-primary/15 text-primary border-primary/20 border h-4 px-1.5">
                  {new Set(state.communityResults.map((r) => r.communityId)).size} 群
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="prediction"
              className="h-10 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-sm transition-all"
            >
              <TrendingUp size={14} className="mr-2" />
              網絡預測
              {state.predictionResults.length > 0 && (
                <Badge className="ml-2 text-xs bg-accent/70 text-accent-foreground border-accent border h-4 px-1.5">
                  {state.predictionResults.length} 條
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visualize" className="flex-1 mt-0 overflow-hidden">
          <VisualizationTab />
        </TabsContent>
        <TabsContent value="community" className="flex-1 mt-0 overflow-hidden">
          <CommunityTab />
        </TabsContent>
        <TabsContent value="prediction" className="flex-1 mt-0 overflow-hidden">
          <PredictionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
