import { useNetwork } from "@/contexts/NetworkContext";
import { AlgorithmInfoPanel } from "@/components/AlgorithmInfoPanel";
import { LAYOUT_INFO } from "@/lib/algorithmInfo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Edit3,
  Info,
  Layers,
  Maximize2,
  Network,
  RefreshCw,
  Tag,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useLocation } from "wouter";
import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import dagre from "cytoscape-dagre";

// Register layouts
cytoscape.use(cola);
cytoscape.use(dagre);

// Cherry Blossom, Iron Grey, Ash Grey, Dust Grey, Powder Petal + tints
const COMMUNITY_COLORS = [
  "#EDAFB8", // Cherry Blossom
  "#4A5759", // Iron Grey
  "#B0C4B1", // Ash Grey
  "#DEDBD2", // Dust Grey
  "#F7E1D7", // Powder Petal
  "#d4849a", // Cherry Blossom dark
  "#6b7e80", // Iron Grey light
  "#8aaa8b", // Ash Grey dark
  "#c4c1b8", // Dust Grey dark
  "#e8c9b8", // Powder Petal dark
];

const LAYOUTS = LAYOUT_INFO.map((l) => ({ id: l.id, label: l.label, sublabel: l.sublabel }));

export default function NetworkVisualize() {
  const { state, setCustomLabel, setSelectedAttribute } = useNetwork();
  const [, navigate] = useLocation();
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);

  const [selectedLayout, setSelectedLayout] = useState("cola");
  const [iterations, setIterations] = useState(100);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [zoom, setZoom] = useState(1);

  // Build cytoscape elements
  const buildElements = useCallback(() => {
    const communityMap = new Map<string, number>();
    state.communityResults.forEach((r) => communityMap.set(r.nodeId, r.communityId));

    const nodes = state.nodes.map((n) => {
      const label =
        state.customLabels[n.id] ||
        (state.selectedAttribute && n[state.selectedAttribute]
          ? String(n[state.selectedAttribute])
          : n.id);
      const communityId = communityMap.get(n.id);
      const color = communityId !== undefined ? COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length] : "#EDAFB8";
      return {
        data: { id: n.id, label, color, communityId },
      };
    });

    const addPredictions = state.predictionResults.filter((p) => p.type === "add");
    const removePredictions = state.predictionResults.filter((p) => p.type === "remove");

    // Compute weight range for normalization
    const weights = state.edges.map((e) => (typeof e.weight === "number" ? e.weight : 1));
    const maxW = Math.max(...weights, 1);
    const minW = Math.min(...weights, 1);
    const wRange = maxW - minW || 1;

    const edges = state.edges.map((e, i) => {
      const isRemove = removePredictions.some(
        (p) => (p.source === e.source && p.target === e.target) || (p.source === e.target && p.target === e.source)
      );
      const rawWeight = typeof e.weight === "number" ? e.weight : 1;
      // Normalize weight to 1.5–6 range for edge width
      const normWidth = state.graphWeighted ? 1.5 + ((rawWeight - minW) / wRange) * 4.5 : 1.5;
      return {
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          edgeType: isRemove ? "remove" : "normal",
          weight: rawWeight,
          edgeWidth: normWidth,
        },
      };
    });

    const predEdges = addPredictions.map((p, i) => ({
      data: {
        id: `pred_add_${i}`,
        source: p.source,
        target: p.target,
        edgeType: "add",
      },
    }));

    return [...nodes, ...edges, ...predEdges];
  }, [state.nodes, state.edges, state.communityResults, state.predictionResults, state.customLabels, state.selectedAttribute, state.graphWeighted]);

  const applyLayout = useCallback(
    (cy: cytoscape.Core, layoutId: string) => {
      let layoutConfig: cytoscape.LayoutOptions;
      if (layoutId === "cola") {
        layoutConfig = {
          name: "cola",
          animate: true,
          maxSimulationTime: iterations * 10,
          nodeSpacing: 40,
          edgeLengthVal: 120,
        } as cytoscape.LayoutOptions;
      } else if (layoutId === "dagre") {
        layoutConfig = {
          name: "dagre",
          rankDir: "TB",
          nodeSep: 60,
          rankSep: 80,
          animate: true,
        } as cytoscape.LayoutOptions;
      } else {
        layoutConfig = {
          name: layoutId,
          animate: true,
          animationDuration: 600,
          padding: 40,
        } as cytoscape.LayoutOptions;
      }
      cy.layout(layoutConfig).run();
    },
    [iterations]
  );

  const initCytoscape = useCallback(() => {
    if (!cyRef.current || state.nodes.length === 0) return;

    if (cyInstance.current) {
      cyInstance.current.destroy();
    }

    const elements = buildElements();

    const cy = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            "label": "data(label)",
            "color": "#3d3030",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "11px",
            "font-family": "Inter, sans-serif",
            "font-weight": 600,
            "width": 42,
            "height": 42,
            "border-width": 2,
            "border-color": "#F7E1D7",
            "border-opacity": 0.9,
            "text-outline-width": 2,
            "text-outline-color": "data(color)",
            "text-max-width": "80px",
            "text-wrap": "ellipsis",
            "shadow-blur": 8,
            "shadow-color": "data(color)",
            "shadow-opacity": 0.3,
            "shadow-offset-x": 0,
            "shadow-offset-y": 2,
            "transition-property": "background-color, border-color, width, height",
            "transition-duration": 200,
          } as cytoscape.Css.Node,
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 3,
            "border-color": "#4A5759",
            "width": 52,
            "height": 52,
            "shadow-opacity": 0.6,
          } as cytoscape.Css.Node,
        },
        {
          selector: "edge[edgeType='normal']",
          style: {
            "width": state.graphWeighted ? "data(edgeWidth)" : 1.5,
            "line-color": "#DEDBD2",
            "target-arrow-color": "#DEDBD2",
            "target-arrow-shape": state.graphDirected ? "triangle" : "none",
            "curve-style": "bezier",
            "opacity": 0.7,
            "arrow-scale": 0.8,
          } as cytoscape.Css.Edge,
        },
        {
          selector: "edge[edgeType='add']",
          style: {
            "width": 2,
            "line-color": "#B0C4B1",
            "target-arrow-color": "#B0C4B1",
            "target-arrow-shape": state.graphDirected ? "triangle" : "none",
            "curve-style": "bezier",
            "line-style": "dashed",
            "line-dash-pattern": [8, 4],
            "opacity": 0.85,
          } as cytoscape.Css.Edge,
        },
        {
          selector: "edge[edgeType='remove']",
          style: {
            "width": 2,
            "line-color": "#d4849a",
            "target-arrow-color": "#d4849a",
            "target-arrow-shape": state.graphDirected ? "triangle" : "none",
            "curve-style": "bezier",
            "line-style": "dashed",
            "line-dash-pattern": [6, 3],
            "opacity": 0.85,
          } as cytoscape.Css.Edge,
        },
        {
          selector: "node:active",
          style: { "overlay-opacity": 0.1 } as cytoscape.Css.Node,
        },
      ],
      layout: { name: "preset" },
      wheelSensitivity: 0.3,
      minZoom: 0.1,
      maxZoom: 5,
    });

    // Enable drag
    cy.nodes().grabify();

    // Click node to edit label
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      setEditingNode(node.id());
      setEditLabel(node.data("label") || node.id());
    });

    // Zoom listener
    cy.on("zoom", () => {
      setZoom(Math.round(cy.zoom() * 100) / 100);
    });

    cyInstance.current = cy;
    applyLayout(cy, selectedLayout);
  }, [buildElements, applyLayout, selectedLayout, state.nodes.length, state.graphDirected, state.graphWeighted]);

  useEffect(() => {
    initCytoscape();
    return () => {
      cyInstance.current?.destroy();
      cyInstance.current = null;
    };
  }, [state.edges, state.nodes, state.communityResults, state.predictionResults]);

  const handleRelayout = useCallback(() => {
    if (cyInstance.current) {
      applyLayout(cyInstance.current, selectedLayout);
    }
  }, [applyLayout, selectedLayout]);

  const handleApplyLabel = useCallback(() => {
    if (!editingNode) return;
    setCustomLabel(editingNode, editLabel);
    if (cyInstance.current) {
      cyInstance.current.getElementById(editingNode).data("label", editLabel);
    }
    toast.success(`節點 ${editingNode} 標籤已更新`);
    setEditingNode(null);
  }, [editingNode, editLabel, setCustomLabel]);

  const handleApplyAttributeLabel = useCallback(() => {
    if (!state.selectedAttribute) {
      toast.error("請先在屬性管理中選擇屬性");
      return;
    }
    if (cyInstance.current) {
      state.nodes.forEach((n) => {
        const label = n[state.selectedAttribute] ? String(n[state.selectedAttribute]) : n.id;
        cyInstance.current!.getElementById(n.id).data("label", label);
      });
    }
    toast.success(`已套用屬性「${state.selectedAttribute}」作為節點標籤`);
  }, [state.selectedAttribute, state.nodes]);

  const handleFitView = useCallback(() => {
    cyInstance.current?.fit(undefined, 40);
  }, []);

  if (state.edges.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <Info size={32} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground">尚未匯入資料</p>
              <p className="text-sm text-muted-foreground mt-1">請先完成資料匯入步驟</p>
            </div>
            <Button onClick={() => navigate("/import")}>前往資料匯入</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0">
      {/* Left panel: controls */}
      <div className="w-72 flex-shrink-0 border-r border-border bg-card overflow-y-auto custom-scroll p-4 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers size={14} className="text-primary" />
            佈局設定
          </h2>
        </div>

        {/* Layout selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">佈局演算法</Label>
          <div className="space-y-1.5">
            {LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => setSelectedLayout(layout.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all duration-150 ${
                  selectedLayout === layout.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{layout.label}</div>
                  <div className="text-xs text-muted-foreground">{layout.sublabel}</div>
                </div>
                {selectedLayout === layout.id && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Iterations */}
        {(selectedLayout === "cola") && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              迭代次數：{iterations}
            </Label>
            <Slider
              value={[iterations]}
              onValueChange={([v]) => setIterations(v)}
              min={10}
              max={500}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10</span>
              <span>500</span>
            </div>
          </div>
        )}

        <Button onClick={handleRelayout} className="w-full" size="sm">
          <RefreshCw size={13} className="mr-2" />
          重新佈局
        </Button>

        {/* Node label */}
        <div className="pt-2 border-t border-border space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Tag size={14} className="text-primary" />
            節點標籤
          </h3>

          {state.selectedAttribute && (
            <Button variant="outline" size="sm" className="w-full" onClick={handleApplyAttributeLabel}>
              <Tag size={12} className="mr-2" />
              套用屬性「{state.selectedAttribute}」
            </Button>
          )}

          {editingNode && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2 border border-border">
              <p className="text-xs font-semibold text-muted-foreground">
                編輯節點：<span className="text-primary font-mono">{editingNode}</span>
              </p>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="h-8 text-sm"
                placeholder="輸入新標籤..."
                onKeyDown={(e) => e.key === "Enter" && handleApplyLabel()}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleApplyLabel}>
                  <Edit3 size={11} className="mr-1" />
                  套用
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setEditingNode(null)}
                >
                  取消
                </Button>
              </div>
            </div>
          )}
          {!editingNode && (
            <p className="text-xs text-muted-foreground">點擊圖中節點可手動編輯標籤</p>
          )}
        </div>

        {/* Legend */}
        {(state.communityResults.length > 0 || state.predictionResults.length > 0) && (
          <div className="pt-2 border-t border-border space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">圖例</h3>
            {state.communityResults.length > 0 && (
              <div className="space-y-1.5">
                {Array.from(new Set(state.communityResults.map((r) => r.communityId)))
                  .sort((a, b) => a - b)
                  .map((cid) => (
                    <div key={cid} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COMMUNITY_COLORS[cid % COMMUNITY_COLORS.length] }}
                      />
                      <span className="text-foreground/70">社群 {cid + 1}</span>
                    </div>
                  ))}
              </div>
            )}
            {state.predictionResults.some((p) => p.type === "add") && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-0.5 border-dashed border-t-2" style={{ borderColor: '#B0C4B1' }} />
                <span className="text-foreground/70">預測新增連結</span>
              </div>
            )}
            {state.predictionResults.some((p) => p.type === "remove") && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-0.5 border-dashed border-t-2" style={{ borderColor: '#d4849a' }} />
                <span className="text-foreground/70">預測斷開連結</span>
              </div>
            )}
          </div>
        )}

        {/* Algorithm info */}
        <div className="pt-2 border-t border-border">
          {LAYOUT_INFO.filter((l) => l.id === selectedLayout).map((info) => (
            <AlgorithmInfoPanel
              key={info.id}
              title={info.label}
              principle={info.principle}
              howItWorks={info.howItWorks}
              parameters={info.parameters}
              useCases={info.useCases}
              pros={info.pros}
              cons={info.cons}
              reference={info.reference}
              defaultOpen={false}
            />
          ))}
        </div>

        {/* Next step */}
        <div className="pt-2 border-t border-border">
          <Button
            className="w-full gap-2"
            size="sm"
            onClick={() => navigate("/community")}
          >
            社群偵測
            <ArrowRight size={13} />
          </Button>
        </div>
      </div>

      {/* Right: Canvas */}
      <div className="flex-1 relative network-canvas">
        {/* Zoom controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
          <Button
            size="icon"
            variant="secondary"
            className="w-8 h-8 shadow-sm"
            onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() * 1.2)}
          >
            <ZoomIn size={14} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="w-8 h-8 shadow-sm"
            onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() / 1.2)}
          >
            <ZoomOut size={14} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="w-8 h-8 shadow-sm"
            onClick={handleFitView}
          >
            <Maximize2 size={14} />
          </Button>
        </div>

        {/* Stats overlay */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs shadow-sm">
            <Network size={11} className="mr-1" />
            {state.nodes.length} 節點
          </Badge>
          <Badge variant="secondary" className="text-xs shadow-sm">
            {state.edges.length} 邊
          </Badge>
          <Badge
            variant="secondary"
            className={`text-xs shadow-sm ${
              state.graphDirected ? "bg-primary/15 text-primary border-primary/30" : ""
            }`}
          >
            {state.graphDirected ? "有向圖" : "無向圖"}
          </Badge>
          {state.graphWeighted && (
            <Badge variant="secondary" className="text-xs shadow-sm bg-accent/30 text-accent-foreground">
              加權
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs shadow-sm">
            {Math.round(zoom * 100)}%
          </Badge>
        </div>

        {/* Cytoscape container */}
        <div ref={cyRef} className="w-full h-full" />

        {/* Empty state */}
        {state.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Network size={48} className="opacity-20" />
            <p className="text-sm">尚無網絡資料</p>
          </div>
        )}
      </div>
    </div>
  );
}
