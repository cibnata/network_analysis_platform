import { useNetwork } from "@/contexts/NetworkContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Info,
  Loader2,
  Share2,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { louvain, labelPropagation, girvanNewman } from "@/lib/communityAlgorithms";
import { cn } from "@/lib/utils";

const COMMUNITY_COLORS = [
  "bg-primary",
  "bg-accent-foreground",
  "bg-secondary-foreground",
  "bg-muted-foreground",
  "bg-primary/70",
  "bg-accent-foreground/80",
  "bg-secondary-foreground/70",
  "bg-primary/50",
  "bg-accent-foreground/60",
  "bg-muted-foreground/80",
];

// Cherry Blossom, Iron Grey, Ash Grey, Dust Grey, Powder Petal + tints
const COMMUNITY_HEX = [
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

const ALGORITHMS = [
  {
    id: "louvain",
    label: "Louvain",
    description: "模組度最大化演算法，適合大型網絡，社群劃分精確",
    complexity: "O(n log n)",
    badge: "推薦",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
  },
  {
    id: "label-propagation",
    label: "Label Propagation",
    description: "標籤傳播演算法，速度快，適合近似社群偵測",
    complexity: "O(n + m)",
    badge: "快速",
    badgeColor: "bg-accent/70 text-accent-foreground border-accent",
  },
  {
    id: "girvan-newman",
    label: "Girvan-Newman",
    description: "邊介數移除演算法，層次化社群結構清晰",
    complexity: "O(n · m²)",
    badge: "精確",
    badgeColor: "bg-secondary text-secondary-foreground border-border",
  },
];

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
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CommunityDetection() {
  const { state, setCommunityResults } = useNetwork();
  const [, navigate] = useLocation();
  const [selectedAlgo, setSelectedAlgo] = useState("louvain");
  const [numCommunities, setNumCommunities] = useState(4);
  const [isRunning, setIsRunning] = useState(false);

  const handleDetect = useCallback(async () => {
    if (state.edges.length === 0) {
      toast.error("請先匯入 Edge 資料");
      return;
    }
    setIsRunning(true);
    try {
      await new Promise((r) => setTimeout(r, 300)); // UI feedback delay
      let results;
      if (selectedAlgo === "louvain") {
        results = louvain(state.nodes, state.edges);
      } else if (selectedAlgo === "label-propagation") {
        results = labelPropagation(state.nodes, state.edges);
      } else {
        results = girvanNewman(state.nodes, state.edges, numCommunities);
      }
      setCommunityResults(results, selectedAlgo);
      const numComm = new Set(results.map((r) => r.communityId)).size;
      toast.success(`偵測完成！共發現 ${numComm} 個社群`);
    } catch (err) {
      console.error(err);
      toast.error("社群偵測失敗");
    } finally {
      setIsRunning(false);
    }
  }, [selectedAlgo, numCommunities, state.nodes, state.edges, setCommunityResults]);

  const handleDownload = useCallback(() => {
    if (state.communityResults.length === 0) {
      toast.error("尚無偵測結果");
      return;
    }
    const data = state.communityResults.map((r) => {
      const node = state.nodes.find((n) => n.id === r.nodeId);
      const label = state.customLabels[r.nodeId] ||
        (state.selectedAttribute && node?.[state.selectedAttribute]
          ? String(node[state.selectedAttribute])
          : r.nodeId);
      return {
        節點ID: r.nodeId,
        節點名稱: label,
        社群編號: r.communityId + 1,
        演算法: ALGORITHMS.find((a) => a.id === state.communityAlgorithm)?.label || state.communityAlgorithm,
      };
    });
    downloadCSV(data, `community_detection_${state.communityAlgorithm}.csv`);
    toast.success("社群偵測結果已下載");
  }, [state.communityResults, state.nodes, state.customLabels, state.selectedAttribute, state.communityAlgorithm]);

  // Group results by community
  const communityGroups = new Map<number, string[]>();
  state.communityResults.forEach((r) => {
    if (!communityGroups.has(r.communityId)) communityGroups.set(r.communityId, []);
    communityGroups.get(r.communityId)!.push(r.nodeId);
  });
  const sortedCommunities = Array.from(communityGroups.entries()).sort((a, b) => a[0] - b[0]);

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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">社群偵測</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          選擇演算法對網絡進行社群劃分，偵測結果將同步顯示於網絡圖中。
        </p>
      </div>

      {/* Algorithm selection */}
      <div className="grid grid-cols-3 gap-4">
        {ALGORITHMS.map((algo) => (
          <button
            key={algo.id}
            onClick={() => setSelectedAlgo(algo.id)}
            className={cn(
              "flex flex-col gap-2 p-4 rounded-xl border text-left transition-all duration-200",
              selectedAlgo === algo.id
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                : "border-border hover:border-primary/30 hover:bg-muted/30"
            )}
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
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold">已選擇</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Girvan-Newman community count */}
      {selectedAlgo === "girvan-newman" && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              目標社群數量
            </label>
            <input
              type="range"
              min={2}
              max={Math.min(10, state.nodes.length)}
              value={numCommunities}
              onChange={(e) => setNumCommunities(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-sm font-bold text-primary w-6 text-center">{numCommunities}</span>
          </CardContent>
        </Card>
      )}

      {/* Run button */}
      <Button onClick={handleDetect} disabled={isRunning} className="w-full h-11 text-base">
        {isRunning ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" />
            偵測中...
          </>
        ) : (
          <>
            <Share2 size={16} className="mr-2" />
            執行{ALGORITHMS.find((a) => a.id === selectedAlgo)?.label}社群偵測
          </>
        )}
      </Button>

      {/* Results */}
      {state.communityResults.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="border-accent bg-accent/30">
            <CardContent className="p-4 flex items-center gap-4">
              <CheckCircle2 size={20} className="text-accent-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  偵測完成 — 使用{" "}
                  {ALGORITHMS.find((a) => a.id === state.communityAlgorithm)?.label} 演算法
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  共 {state.nodes.length} 個節點，劃分為 {sortedCommunities.length} 個社群
                </p>
              </div>
              <Button size="sm" onClick={handleDownload} className="gap-2">
                <Download size={13} />
                下載 CSV
              </Button>
            </CardContent>
          </Card>

          {/* Community breakdown */}
          <div className="grid grid-cols-2 gap-4">
            {sortedCommunities.map(([commId, nodeIds]) => (
              <Card key={commId} className="overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div
                      className={cn("w-3 h-3 rounded-full flex-shrink-0", COMMUNITY_COLORS[commId % COMMUNITY_COLORS.length])}
                    />
                    <span>社群 {commId + 1}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {nodeIds.length} 個節點
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scroll">
                    {nodeIds.map((nodeId) => {
                      const node = state.nodes.find((n) => n.id === nodeId);
                      const label = state.customLabels[nodeId] ||
                        (state.selectedAttribute && node?.[state.selectedAttribute]
                          ? String(node[state.selectedAttribute])
                          : nodeId);
                      return (
                        <span
                          key={nodeId}
                          className="text-xs px-2 py-0.5 rounded-full border font-mono"
                          style={{
                            backgroundColor: COMMUNITY_HEX[commId % COMMUNITY_HEX.length] + "18",
                            borderColor: COMMUNITY_HEX[commId % COMMUNITY_HEX.length] + "40",
                            color: COMMUNITY_HEX[commId % COMMUNITY_HEX.length],
                          }}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Hint to view in graph */}
          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <Info size={14} className="text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                社群偵測結果已同步至網絡圖，節點顏色代表不同社群。前往「網絡繪製」頁面查看視覺化結果。
              </p>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => navigate("/visualize")}>
                查看圖形
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Next step */}
      {state.communityResults.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => navigate("/prediction")} className="gap-2">
            下一步：網絡預測
            <ArrowRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
