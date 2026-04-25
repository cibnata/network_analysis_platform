import { useNetwork } from "@/contexts/NetworkContext";
import { AlgorithmInfoPanel } from "@/components/AlgorithmInfoPanel";
import { LAYOUT_INFO } from "@/lib/algorithmInfo";
import {
  computeCentralities,
  centralityToColor,
  centralityToSize,
  weightToColor,
  getTypeColorMap,
  TYPE_COLORS,
  type CentralityType,
} from "@/lib/centralityMetrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Info,
  Layers,
  Maximize2,
  Network,
  Palette,
  RefreshCw,
  Search,
  Tag,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useLocation } from "wouter";
import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import dagre from "cytoscape-dagre";
import fcose from "cytoscape-fcose";
import euler from "cytoscape-euler";

cytoscape.use(cola);
cytoscape.use(dagre);
cytoscape.use(fcose);
cytoscape.use(euler);

const COMMUNITY_COLORS = TYPE_COLORS;
const LAYOUTS = LAYOUT_INFO.map((l) => ({ id: l.id, label: l.label, sublabel: l.sublabel }));

// Preset color swatches for manual color selection
const COLOR_SWATCHES = [
  "#EDAFB8", // Cherry Blossom
  "#F7E1D7", // Powder Petal
  "#DEDBD2", // Dust Grey
  "#B0C4B1", // Ash Grey
  "#4A5759", // Iron Grey
  "#d4849a", // Cherry Blossom dark
  "#e8c9b8", // Powder Petal warm
  "#6b7e80", // Iron Grey light
  "#8aaa8b", // Ash Grey dark
  "#5b8fa8", // Steel Blue
  "#c9a96e", // Warm Gold
  "#7c6b8a", // Muted Purple
];

type NodeColorMode = "community" | "type" | "centrality" | "custom";
type EdgeColorMode = "default" | "weight" | "custom";

// Small inline color picker component
function ColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={color}
      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${
        selected ? "border-foreground scale-110 shadow-sm" : "border-transparent"
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

export default function NetworkVisualize() {
  const { state, setCustomLabel, setSelectedAttribute } = useNetwork();
  const [, navigate] = useLocation();
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);

  // Layout
  const [selectedLayout, setSelectedLayout] = useState("cola");
  const [iterations, setIterations] = useState(100);

  // Node label editing
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Zoom
  const [zoom, setZoom] = useState(1);

  // Sidebar collapse
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Centrality
  const [selectedCentrality, setSelectedCentrality] = useState<CentralityType>("degree");
  const [nodeSizeMode, setNodeSizeMode] = useState<"fixed" | "centrality">("fixed");
  const [nodeFixedSize, setNodeFixedSize] = useState(36);
  const [nodeMinSize, setNodeMinSize] = useState(20);
  const [nodeMaxSize, setNodeMaxSize] = useState(60);

  // Node color mode
  const [nodeColorMode, setNodeColorMode] = useState<NodeColorMode>("community");
  const [typeColumn, setTypeColumn] = useState<string>("");
  // Custom node color (single global color)
  const [customNodeColor, setCustomNodeColor] = useState("#EDAFB8");
  // Per-community custom colors
  const [communityCustomColors, setCommunityCustomColors] = useState<Record<number, string>>({});

  // Edge color mode
  const [edgeColorMode, setEdgeColorMode] = useState<EdgeColorMode>("default");
  // Custom edge color
  const [customEdgeColor, setCustomEdgeColor] = useState("#DEDBD2");

  // Label color
  const [labelColor, setLabelColor] = useState("#3d3030");
  // Label font size
  const [labelFontSize, setLabelFontSize] = useState(11);

  // Canvas background color
  const [canvasBg, setCanvasBg] = useState<"#ffffff" | "#f5f3f0" | "#1e1e2e">("#ffffff");

  // Edge width controls
  const [edgeBaseWidth, setEdgeBaseWidth] = useState(1.5);
  const [edgeWeightedMax, setEdgeWeightedMax] = useState(7);

  // Node search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; label: string }[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState<string | null>(null);
  const [searchCursor, setSearchCursor] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);

  // Hover tooltip
  const [hoveredNode, setHoveredNode] = useState<{ id: string; x: number; y: number } | null>(null);

  // Compute centralities (memoized)
  const centralities = useMemo(() => {
    if (state.nodes.length === 0) return new Map<string, ReturnType<typeof computeCentralities> extends Map<string, infer V> ? V : never>();
    return computeCentralities(
      state.nodes.map((n) => n.id),
      state.edges,
      state.graphDirected,
      state.graphWeighted
    );
  }, [state.nodes, state.edges, state.graphDirected, state.graphWeighted]);

  // Type color map (memoized)
  const typeColorMap = useMemo(() => {
    if (!typeColumn || state.nodes.length === 0) return new Map<string, string>();
    const values = state.nodes.map((n) => String(n[typeColumn] ?? "未知"));
    return getTypeColorMap(values);
  }, [typeColumn, state.nodes]);

  // Available attribute columns (from nodeCSVHeaders, excluding nodeIdColumn)
  const attrColumns = useMemo(() => {
    return state.nodeCSVHeaders.filter((h) => h !== state.nodeIdColumn);
  }, [state.nodeCSVHeaders, state.nodeIdColumn]);

  // Unique community IDs
  const communityIds = useMemo(() => {
    return Array.from(new Set(state.communityResults.map((r) => r.communityId))).sort((a, b) => a - b);
  }, [state.communityResults]);

  // Get effective community color (custom override or default)
  const getCommunityColor = useCallback((communityId: number): string => {
    return communityCustomColors[communityId] ?? COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length];
  }, [communityCustomColors]);

  // Build cytoscape elements
  const buildElements = useCallback(() => {
    const communityMap = new Map<string, number>();
    state.communityResults.forEach((r) => communityMap.set(r.nodeId, r.communityId));

    const weights = state.edges.map((e) => (typeof e.weight === "number" ? e.weight : 1));
    const maxW = Math.max(...weights, 1);
    const minW = Math.min(...weights, 1);
    const wRange = maxW - minW || 1;

    const nodes = state.nodes.map((n) => {
      const label =
        state.customLabels[n.id] ||
        (state.nodeLabelColumn && n[state.nodeLabelColumn]
          ? String(n[state.nodeLabelColumn])
          : state.selectedAttribute && n[state.selectedAttribute]
          ? String(n[state.selectedAttribute])
          : n.id);

      const communityId = communityMap.get(n.id);
      const c = centralities.get(n.id);
      const centralityVal = c ? c[selectedCentrality] : 0;

      // Node color
      let color = "#EDAFB8";
      if (nodeColorMode === "custom") {
        color = customNodeColor;
      } else if (nodeColorMode === "community" && communityId !== undefined) {
        color = getCommunityColor(communityId);
      } else if (nodeColorMode === "type" && typeColumn) {
        const typeVal = String(n[typeColumn] ?? "未知");
        color = typeColorMap.get(typeVal) ?? "#EDAFB8";
      } else if (nodeColorMode === "centrality") {
        color = centralityToColor(centralityVal);
      } else if (communityId !== undefined) {
        color = getCommunityColor(communityId);
      }

      // Node size
      const size =
        nodeSizeMode === "centrality"
          ? centralityToSize(centralityVal, nodeMinSize, nodeMaxSize)
          : nodeFixedSize;

      return {
        data: { id: n.id, label, color, communityId, centralityVal, size },
      };
    });

    const addPredictions = state.predictionResults.filter((p) => p.type === "add");
    const removePredictions = state.predictionResults.filter((p) => p.type === "remove");

    const edges = state.edges.map((e, i) => {
      const isRemove = removePredictions.some(
        (p) => (p.source === e.source && p.target === e.target) || (p.source === e.target && p.target === e.source)
      );
      const rawWeight = typeof e.weight === "number" ? e.weight : 1;
      const normWeight = wRange > 0 ? (rawWeight - minW) / wRange : 0;
      const normWidth = state.graphWeighted
        ? edgeBaseWidth + normWeight * (edgeWeightedMax - edgeBaseWidth)
        : edgeBaseWidth;
      let edgeColor = "#DEDBD2";
      if (edgeColorMode === "weight" && state.graphWeighted) {
        edgeColor = weightToColor(normWeight);
      } else if (edgeColorMode === "custom") {
        edgeColor = customEdgeColor;
      }

      return {
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          edgeType: isRemove ? "remove" : "normal",
          weight: rawWeight,
          edgeWidth: normWidth,
          edgeColor,
        },
      };
    });

    const predEdges = addPredictions.map((p, i) => ({
      data: {
        id: `pred_add_${i}`,
        source: p.source,
        target: p.target,
        edgeType: "add",
        edgeWidth: 2,
        edgeColor: "#B0C4B1",
      },
    }));

    return [...nodes, ...edges, ...predEdges];
  }, [
    state.nodes, state.edges, state.communityResults, state.predictionResults,
    state.customLabels, state.selectedAttribute, state.graphWeighted, state.graphDirected,
    state.nodeLabelColumn, centralities, selectedCentrality,
    nodeSizeMode, nodeFixedSize, nodeMinSize, nodeMaxSize, nodeColorMode, typeColumn, typeColorMap,
    edgeColorMode, customNodeColor, customEdgeColor, communityCustomColors, getCommunityColor,
    edgeBaseWidth, edgeWeightedMax,
  ]);

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
      } else if (layoutId === "fcose") {
        layoutConfig = {
          name: "fcose",
          animate: true,
          animationDuration: 800,
          randomize: true,
          padding: 40,
          nodeRepulsion: 4500,
          idealEdgeLength: 100,
          numIter: Math.max(iterations * 10, 2500),
        } as cytoscape.LayoutOptions;
      } else if (layoutId === "concentric") {
        layoutConfig = {
          name: "concentric",
          animate: true,
          animationDuration: 600,
          padding: 40,
          concentric: (node: cytoscape.NodeSingular) => node.degree(false),
          levelWidth: () => 1,
          minNodeSpacing: 30,
        } as cytoscape.LayoutOptions;
      } else if (layoutId === "breadthfirst") {
        layoutConfig = {
          name: "breadthfirst",
          animate: true,
          animationDuration: 600,
          padding: 40,
          directed: state.graphDirected,
          spacingFactor: 1.5,
        } as cytoscape.LayoutOptions;
      } else if (layoutId === "euler") {
        layoutConfig = {
          name: "euler",
          animate: true,
          animationDuration: 800,
          randomize: true,
          padding: 40,
          springLength: () => 120,
          springCoeff: () => 0.0008,
          mass: () => 4,
          gravity: -1.2,
          pull: 0.001,
          theta: 0.666,
          dragCoeff: 0.02,
          movementThreshold: 1,
          timeStep: 20,
          maxIterations: Math.max(iterations * 10, 1000),
          maxSimulationTime: Math.max(iterations * 10, 4000),
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
            "color": labelColor,
            "text-valign": "center",
            "text-halign": "center",
            "font-size": `${labelFontSize}px`,
            "font-family": "Inter, sans-serif",
            "font-weight": 600,
            "width": "data(size)",
            "height": "data(size)",
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
            "shadow-opacity": 0.6,
          } as cytoscape.Css.Node,
        },
        {
          selector: "edge[edgeType='normal']",
          style: {
            "width": "data(edgeWidth)",
            "line-color": "data(edgeColor)",
            "target-arrow-color": "data(edgeColor)",
            "target-arrow-shape": state.graphDirected ? "triangle" : "none",
            "curve-style": "bezier",
            "opacity": 0.75,
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
            "line-dash-pattern": [6, 3],
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
        {
          selector: ".dimmed",
          style: { "opacity": 0.15 } as cytoscape.Css.Node,
        },
        {
          selector: ".highlighted",
          style: {
            "border-width": 4,
            "border-color": "#4A5759",
            "opacity": 1,
          } as cytoscape.Css.Node,
        },
      ],
      layout: { name: "preset" },
      wheelSensitivity: 0.3,
      minZoom: 0.1,
      maxZoom: 5,
    });

    cy.nodes().grabify();
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      setEditingNode(node.id());
      setEditLabel(node.data("label") || node.id());
    });
    cy.on("zoom", () => {
      setZoom(Math.round(cy.zoom() * 100) / 100);
    });
    // Hover: enlarge node + show tooltip
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const origSize = node.data("size") as number || 36;
      node.style({ width: origSize * 1.4, height: origSize * 1.4, "z-index": 9999 });
      const rendPos = node.renderedPosition();
      const container = cyRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setHoveredNode({ id: node.id(), x: rendPos.x, y: rendPos.y });
        void rect; // suppress unused warning
      }
    });
    cy.on("mouseout", "node", (evt) => {
      const node = evt.target;
      const origSize = node.data("size") as number || 36;
      node.style({ width: origSize, height: origSize, "z-index": 0 });
      setHoveredNode(null);
    });
    cy.on("drag", "node", () => {
      setHoveredNode(null);
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

  // Re-apply visual styles when settings change without full reinit
  useEffect(() => {
    if (!cyInstance.current || state.nodes.length === 0) return;
    const elements = buildElements();
    elements.forEach((el) => {
      if (!('source' in el.data)) {
        const node = cyInstance.current!.getElementById(el.data.id);
        if (node.length > 0) {
          node.data("color", el.data.color);
          node.data("size", el.data.size);
          node.data("label", el.data.label);
        }
      } else {
        const edge = cyInstance.current!.getElementById(el.data.id);
        if (edge.length > 0) {
          edge.data("edgeColor", (el.data as { edgeColor: string }).edgeColor);
          edge.data("edgeWidth", (el.data as { edgeWidth: number }).edgeWidth);
        }
      }
    });
    // Update label color and font size globally
    cyInstance.current.style()
      .selector("node")
      .style({ color: labelColor, "font-size": `${labelFontSize}px` })
      .update();
  }, [
    nodeColorMode, typeColumn, typeColorMap, nodeSizeMode, nodeFixedSize, nodeMinSize, nodeMaxSize,
    selectedCentrality, edgeColorMode, centralities, customNodeColor, customEdgeColor,
    communityCustomColors, edgeBaseWidth, edgeWeightedMax, labelColor, labelFontSize,
  ]);

  const handleRelayout = useCallback(() => {
    if (cyInstance.current) applyLayout(cyInstance.current, selectedLayout);
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

  const handleFitView = useCallback(() => {
    cyInstance.current?.fit(undefined, 40);
  }, []);

  const handleExportPng = useCallback(() => {
    const cy = cyInstance.current;
    if (!cy) return;
    const dataUrl = cy.png({ output: "base64uri", bg: canvasBg, full: true, scale: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `network_${Date.now()}.png`;
    a.click();
    toast.success("圖表已匯出為 PNG");
  }, [canvasBg]);

  // Search helpers
  const getNodeLabel = useCallback((nodeId: string): string => {
    const n = state.nodes.find((x) => x.id === nodeId);
    if (!n) return nodeId;
    return (
      state.customLabels[nodeId] ||
      (state.nodeLabelColumn && n[state.nodeLabelColumn] ? String(n[state.nodeLabelColumn]) : "") ||
      (state.selectedAttribute && n[state.selectedAttribute] ? String(n[state.selectedAttribute]) : "") ||
      nodeId
    );
  }, [state.nodes, state.customLabels, state.nodeLabelColumn, state.selectedAttribute]);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    setSearchCursor(-1);
    if (!q.trim()) {
      setSearchResults([]);
      if (searchHighlight) {
        cyInstance.current?.elements().removeClass("dimmed highlighted");
        setSearchHighlight(null);
      }
      return;
    }
    const lower = q.toLowerCase();
    const results = state.nodes
      .map((n) => ({ id: n.id, label: getNodeLabel(n.id) }))
      .filter((n) => n.id.toLowerCase().includes(lower) || n.label.toLowerCase().includes(lower))
      .slice(0, 8);
    setSearchResults(results);
  }, [state.nodes, getNodeLabel, searchHighlight]);

  const handleSelectNode = useCallback((nodeId: string) => {
    setSearchHighlight(nodeId);
    setSearchQuery(getNodeLabel(nodeId));
    setSearchResults([]);
    setSearchFocused(false);
    const cy = cyInstance.current;
    if (!cy) return;
    cy.elements().addClass("dimmed");
    const node = cy.getElementById(nodeId);
    node.removeClass("dimmed").addClass("highlighted");
    node.connectedEdges().removeClass("dimmed");
    node.neighborhood().nodes().removeClass("dimmed");
    cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 1.5) }, { duration: 400 });
  }, [getNodeLabel]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchHighlight(null);
    setSearchFocused(false);
    setSearchCursor(-1);
    cyInstance.current?.elements().removeClass("dimmed highlighted");
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchCursor((c) => Math.min(c + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = searchCursor >= 0 ? searchCursor : 0;
      if (searchResults[idx]) handleSelectNode(searchResults[idx].id);
    } else if (e.key === "Escape") {
      handleClearSearch();
    }
  }, [searchResults, searchCursor, handleSelectNode, handleClearSearch]);

  // Top centrality nodes
  const topNodes = useMemo(() => {
    return Array.from(centralities.entries())
      .sort((a, b) => {
        const bVal = b[1][selectedCentrality] ?? 0;
        const aVal = a[1][selectedCentrality] ?? 0;
        return bVal - aVal;
      })
      .slice(0, 5);
  }, [centralities, selectedCentrality]);

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
    <div className="flex h-full gap-0 relative">
      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-30 w-5 h-12 flex items-center justify-center bg-card border border-border rounded-r-lg shadow-sm hover:bg-muted transition-colors"
        style={{ left: sidebarOpen ? "288px" : "0px" }}
        title={sidebarOpen ? "收合側邊欄" : "展開側邊欄"}
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Left panel: controls */}
      {sidebarOpen && (
        <div className="w-72 flex-shrink-0 border-r border-border bg-card overflow-y-auto custom-scroll p-4 space-y-4">
          {/* Layout */}
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
              <Layers size={14} className="text-primary" />
              佈局設定
            </h2>
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
                  {selectedLayout === layout.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </div>

          {selectedLayout === "cola" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                迭代次數：{iterations}
              </Label>
              <Slider value={[iterations]} onValueChange={([v]) => setIterations(v)} min={10} max={500} step={10} />
              <div className="flex justify-between text-xs text-muted-foreground"><span>10</span><span>500</span></div>
            </div>
          )}

          <Button onClick={handleRelayout} className="w-full" size="sm">
            <RefreshCw size={13} className="mr-2" />
            重新佈局
          </Button>

          {/* Centrality */}
          <div className="pt-2 border-t border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              中心性指標
            </h3>
            <Select value={selectedCentrality} onValueChange={(v) => setSelectedCentrality(v as CentralityType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="degree">Degree（直接連結數）</SelectItem>
                <SelectItem value="betweenness">Betweenness（橋接位置）</SelectItem>
                <SelectItem value="closeness">Closeness（接近速度）</SelectItem>
                <SelectItem value="pagerank">PageRank（影響力）</SelectItem>
              </SelectContent>
            </Select>

            {/* Top 5 nodes */}
            {topNodes.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Top 5 節點</Label>
                {topNodes.map(([id, c], i) => {
                  const val = c[selectedCentrality] ?? 0;
                  return (
                    <div key={id} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-muted-foreground font-mono">{i + 1}.</span>
                      <span className="flex-1 truncate font-medium text-foreground">{id}</span>
                      <span className="text-muted-foreground font-mono">
                        {(val * 100).toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Node size */}
          <div className="pt-2 border-t border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground">節點大小</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setNodeSizeMode("fixed")}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${nodeSizeMode === "fixed" ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                固定大小
              </button>
              <button
                onClick={() => setNodeSizeMode("centrality")}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${nodeSizeMode === "centrality" ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                依中心性
              </button>
            </div>
            {nodeSizeMode === "fixed" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>節點大小</span>
                  <span className="font-mono">{nodeFixedSize}px</span>
                </div>
                <Slider
                  value={[nodeFixedSize]}
                  onValueChange={([v]) => setNodeFixedSize(v)}
                  min={10}
                  max={80}
                  step={2}
                />
              </div>
            )}
            {nodeSizeMode === "centrality" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>最小：{nodeMinSize}px</span>
                  <span>最大：{nodeMaxSize}px</span>
                </div>
                <Slider
                  value={[nodeMinSize, nodeMaxSize]}
                  onValueChange={([mn, mx]) => { setNodeMinSize(mn); setNodeMaxSize(mx); }}
                  min={10}
                  max={80}
                  step={2}
                />
              </div>
            )}
          </div>

          {/* Node color */}
          <div className="pt-2 border-t border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Palette size={14} className="text-primary" />
              節點顏色
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {(["community", "type", "centrality", "custom"] as NodeColorMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setNodeColorMode(mode)}
                  className={`py-1.5 text-xs rounded-lg border transition-all ${nodeColorMode === mode ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/30"}`}
                >
                  {mode === "community" ? "社群" : mode === "type" ? "類別" : mode === "centrality" ? "中心性" : "自訂"}
                </button>
              ))}
            </div>

            {/* Custom node color picker */}
            {nodeColorMode === "custom" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">選擇顏色</Label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_SWATCHES.map((c) => (
                    <ColorSwatch
                      key={c}
                      color={c}
                      selected={customNodeColor === c}
                      onClick={() => setCustomNodeColor(c)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <label className="text-xs text-muted-foreground flex-shrink-0">自訂色：</label>
                  <div className="relative flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0 cursor-pointer overflow-hidden"
                      style={{ backgroundColor: customNodeColor }}
                    >
                      <input
                        type="color"
                        value={customNodeColor}
                        onChange={(e) => setCustomNodeColor(e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{customNodeColor}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Community mode: per-community color customization */}
            {nodeColorMode === "community" && communityIds.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">各社群顏色</Label>
                <div className="space-y-1.5">
                  {communityIds.map((cid) => {
                    const currentColor = getCommunityColor(cid);
                    return (
                      <div key={cid} className="flex items-center gap-2">
                        <div
                          className="relative w-6 h-6 rounded-full border-2 border-border flex-shrink-0 cursor-pointer overflow-hidden shadow-sm"
                          style={{ backgroundColor: currentColor }}
                          title={`社群 ${cid + 1} 顏色`}
                        >
                          <input
                            type="color"
                            value={currentColor}
                            onChange={(e) =>
                              setCommunityCustomColors((prev) => ({ ...prev, [cid]: e.target.value }))
                            }
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                        </div>
                        <span className="text-xs text-foreground/70 flex-1">社群 {cid + 1}</span>
                        {communityCustomColors[cid] && (
                          <button
                            onClick={() =>
                              setCommunityCustomColors((prev) => {
                                const next = { ...prev };
                                delete next[cid];
                                return next;
                              })
                            }
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="重置為預設顏色"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {Object.keys(communityCustomColors).length > 0 && (
                    <button
                      onClick={() => setCommunityCustomColors({})}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 mt-1"
                    >
                      重置所有社群顏色
                    </button>
                  )}
                </div>
              </div>
            )}

            {nodeColorMode === "type" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">選擇類別欄位</Label>
                <Select value={typeColumn} onValueChange={setTypeColumn}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="選擇欄位..." />
                  </SelectTrigger>
                  <SelectContent>
                    {attrColumns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {typeColumn && typeColorMap.size > 0 && (
                  <div className="space-y-1 mt-1">
                    {Array.from(typeColorMap.entries()).map(([val, color]) => (
                      <div key={val} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-foreground/70 truncate">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {nodeColorMode === "centrality" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 h-3 rounded-full" style={{ background: "linear-gradient(to right, #F7E1D7, #EDAFB8, #B0C4B1, #4A5759)" }} />
                <span>低→高</span>
              </div>
            )}
          </div>

          {/* Edge style */}
          <div className="pt-2 border-t border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Palette size={14} className="text-primary" />
              邊的顏色
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setEdgeColorMode("default")}
                className={`py-1.5 text-xs rounded-lg border transition-all ${edgeColorMode === "default" ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                預設
              </button>
              <button
                onClick={() => setEdgeColorMode("weight")}
                disabled={!state.graphWeighted}
                className={`py-1.5 text-xs rounded-lg border transition-all ${edgeColorMode === "weight" ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/30"} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                依權重
              </button>
              <button
                onClick={() => setEdgeColorMode("custom")}
                className={`py-1.5 text-xs rounded-lg border transition-all ${edgeColorMode === "custom" ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                自訂
              </button>
            </div>

            {/* Weight gradient legend */}
            {state.graphWeighted && edgeColorMode === "weight" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 h-2 rounded-full" style={{ background: "linear-gradient(to right, #DEDBD2, #4A5759)" }} />
                <span>低→高</span>
              </div>
            )}

            {/* Custom edge color picker */}
            {edgeColorMode === "custom" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">選擇邊的顏色</Label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_SWATCHES.map((c) => (
                    <ColorSwatch
                      key={c}
                      color={c}
                      selected={customEdgeColor === c}
                      onClick={() => setCustomEdgeColor(c)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <label className="text-xs text-muted-foreground flex-shrink-0">自訂色：</label>
                  <div className="relative flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0 cursor-pointer overflow-hidden"
                      style={{ backgroundColor: customEdgeColor }}
                    >
                      <input
                        type="color"
                        value={customEdgeColor}
                        onChange={(e) => setCustomEdgeColor(e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{customEdgeColor}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Canvas background */}
          <div className="pt-2 border-t border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Palette size={14} className="text-primary" />
              畫布背景
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { value: "#ffffff" as const, label: "白色" },
                { value: "#f5f3f0" as const, label: "淡灰" },
                { value: "#1e1e2e" as const, label: "深色" },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCanvasBg(value)}
                  className={`py-1.5 text-xs rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    canvasBg === value
                      ? "border-primary bg-primary/5 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-border/60 flex-shrink-0"
                    style={{ backgroundColor: value }}
                  />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Edge width */}
          <div className="pt-2 border-t border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              邊的粗細
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>基礎粗細</span>
                <span className="font-mono">{edgeBaseWidth.toFixed(1)}px</span>
              </div>
              <Slider
                value={[edgeBaseWidth]}
                onValueChange={([v]) => {
                  setEdgeBaseWidth(v);
                  if (edgeWeightedMax < v) setEdgeWeightedMax(v);
                }}
                min={0.5}
                max={8}
                step={0.5}
              />
            </div>
            {state.graphWeighted && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>最大粗細（依權重）</span>
                  <span className="font-mono">{edgeWeightedMax.toFixed(1)}px</span>
                </div>
                <Slider
                  value={[edgeWeightedMax]}
                  onValueChange={([v]) => setEdgeWeightedMax(v)}
                  min={edgeBaseWidth}
                  max={20}
                  step={0.5}
                />
                <p className="text-xs text-muted-foreground">
                  最輕邊 = {edgeBaseWidth.toFixed(1)}px，最重邊 = {edgeWeightedMax.toFixed(1)}px
                </p>
              </div>
            )}
          </div>

          {/* Node label */}
          <div className="pt-2 border-t border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Tag size={14} className="text-primary" />
              節點標籤
            </h3>
            {/* Label color picker */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">標籤顏色</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "#3d3030", "#1a1a1a", "#4A5759", "#ffffff",
                  "#EDAFB8", "#d4849a", "#B0C4B1", "#8aaa8b",
                  "#5b8fa8", "#c9a96e", "#7c6b8a", "#6b7e80",
                ].map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    selected={labelColor === c}
                    onClick={() => setLabelColor(c)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <label className="text-xs text-muted-foreground flex-shrink-0">自訂色：</label>
                <div className="relative flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0 cursor-pointer overflow-hidden"
                    style={{ backgroundColor: labelColor }}
                  >
                    <input
                      type="color"
                      value={labelColor}
                      onChange={(e) => setLabelColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{labelColor}</span>
                </div>
              </div>
            </div>
            {/* Label font size slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>字體大小</span>
                <span className="font-mono">{labelFontSize}px</span>
              </div>
              <Slider
                value={[labelFontSize]}
                onValueChange={([v]) => setLabelFontSize(v)}
                min={8}
                max={20}
                step={1}
              />
            </div>
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
                    <Edit3 size={11} className="mr-1" />套用
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNode(null)}>
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
              {state.communityResults.length > 0 && nodeColorMode === "community" && (
                <div className="space-y-1.5">
                  {communityIds.map((cid) => (
                    <div key={cid} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getCommunityColor(cid) }} />
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
            <Button className="w-full gap-2" size="sm" onClick={() => navigate("/community")}>
              社群偵測
              <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      )}

      {/* Right: Canvas */}
      <div className="flex-1 relative" style={{ background: canvasBg, transition: "background 0.3s" }}>
        {/* Zoom controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
          <Button size="icon" variant="secondary" className="w-8 h-8 shadow-sm" onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() * 1.2)}>
            <ZoomIn size={14} />
          </Button>
          <Button size="icon" variant="secondary" className="w-8 h-8 shadow-sm" onClick={() => cyInstance.current?.zoom(cyInstance.current.zoom() / 1.2)}>
            <ZoomOut size={14} />
          </Button>
          <Button size="icon" variant="secondary" className="w-8 h-8 shadow-sm" onClick={handleFitView}>
            <Maximize2 size={14} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="w-8 h-8 shadow-sm"
            onClick={handleExportPng}
            title="匯出 PNG"
            disabled={state.nodes.length === 0}
          >
            <Download size={14} />
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
            className={`text-xs shadow-sm ${state.graphDirected ? "bg-primary/15 text-primary border-primary/30" : ""}`}
          >
            {state.graphDirected ? "有向圖" : "無向圖"}
          </Badge>
          {state.graphWeighted && (
            <Badge variant="secondary" className="text-xs shadow-sm bg-accent/30 text-accent-foreground">加權</Badge>
          )}
          <Badge variant="secondary" className="text-xs shadow-sm">{Math.round(zoom * 100)}%</Badge>
        </div>

        {/* Search box */}
        <div className="absolute z-20" style={{ top: "56px", left: "16px" }}>
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-border rounded-xl shadow-md px-3 py-1.5 w-56">
              <Search size={13} className="text-muted-foreground flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                onKeyDown={handleSearchKeyDown}
                placeholder="搜尋節點..."
                className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground min-w-0"
              />
              {(searchQuery || searchHighlight) && (
                <button onClick={handleClearSearch} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                  <X size={12} />
                </button>
              )}
            </div>
            {/* Dropdown results */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 w-56 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-30">
                {searchResults.map((r, i) => (
                  <button
                    key={r.id}
                    onMouseDown={() => handleSelectNode(r.id)}
                    className={`w-full flex flex-col items-start px-3 py-2 text-left transition-colors ${
                      i === searchCursor ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <span className="text-xs font-medium truncate w-full">{r.label}</span>
                    {r.label !== r.id && (
                      <span className="text-[10px] text-muted-foreground truncate w-full">{r.id}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {/* No results */}
            {searchFocused && searchQuery.trim() && searchResults.length === 0 && (
              <div className="absolute top-full mt-1 left-0 w-56 bg-white border border-border rounded-xl shadow-lg px-3 py-2 text-xs text-muted-foreground z-30">
                找不到符合的節點
              </div>
            )}
          </div>
        </div>

        {/* Cytoscape container */}
        <div ref={cyRef} className="w-full h-full" />

        {/* Hover tooltip */}
        {hoveredNode && (() => {
          const nodeData = state.nodes.find((n) => n.id === hoveredNode.id);
          if (!nodeData) return null;
          const attrs = state.nodeCSVHeaders.filter((h) => h !== state.nodeIdColumn && h !== state.nodeLabelColumn);
          const label =
            state.customLabels[hoveredNode.id] ||
            (state.nodeLabelColumn && nodeData[state.nodeLabelColumn] ? String(nodeData[state.nodeLabelColumn]) : "") ||
            (state.selectedAttribute && nodeData[state.selectedAttribute] ? String(nodeData[state.selectedAttribute]) : "") ||
            hoveredNode.id;
          // Position tooltip: offset above-right of node, clamp to canvas
          const TOOLTIP_W = 200;
          const TOOLTIP_H = 40 + attrs.length * 20;
          const canvasW = cyRef.current?.clientWidth ?? 800;
          const canvasH = cyRef.current?.clientHeight ?? 600;
          const rawX = hoveredNode.x + 16;
          const rawY = hoveredNode.y - 12;
          const clampedX = Math.min(rawX, canvasW - TOOLTIP_W - 8);
          const clampedY = Math.max(rawY - TOOLTIP_H, 8);
          return (
            <div
              key={hoveredNode.id}
              className="absolute z-50 pointer-events-none"
              style={{ left: clampedX, top: clampedY }}
            >
              <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-3 py-2.5 min-w-[160px] max-w-[200px]">
                <p className="text-xs font-semibold text-foreground truncate">{label}</p>
                {label !== hoveredNode.id && (
                  <p className="text-[10px] text-muted-foreground truncate mb-1">ID: {hoveredNode.id}</p>
                )}
                {attrs.length > 0 && (
                  <div className="mt-1.5 space-y-0.5 border-t border-border pt-1.5">
                    {attrs.map((attr) => (
                      <div key={attr} className="flex items-start justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{attr}</span>
                        <span className="text-[10px] text-foreground font-mono text-right truncate max-w-[100px]">
                          {nodeData[attr] !== undefined && nodeData[attr] !== null && nodeData[attr] !== ""
                            ? String(nodeData[attr])
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
