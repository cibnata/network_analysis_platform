import { useNetwork } from "@/contexts/NetworkContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Eye,
  Info,
  Loader2,
  TrendingDown,
  TrendingUp,
  Unlink,
} from "lucide-react";
import { useLocation } from "wouter";
import { predictLinks, predictDissolution } from "@/lib/predictionAlgorithms";
import { cn } from "@/lib/utils";
import type { PredictionResult } from "@/contexts/NetworkContext";

const PREDICTION_MODES = [
  {
    id: "add",
    label: "Link Prediction",
    sublabel: "連結生成預測",
    description: "預測網絡中下一個可能新增的連結，基於共同鄰居、Jaccard 係數與 Adamic-Adar 指數計算。",
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    lineStyle: "虛線（綠色）",
  },
  {
    id: "remove",
    label: "Link Dissolution",
    sublabel: "連結斷開預測",
    description: "預測網絡中可能斷開的弱連結，基於連結強度、共同鄰居與節點度差異計算。",
    icon: TrendingDown,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
    lineStyle: "虛線（紅色）",
  },
];

export default function NetworkPrediction() {
  const { state, setPredictionResults } = useNetwork();
  const [, navigate] = useLocation();
  const [selectedMode, setSelectedMode] = useState<"add" | "remove" | "both">("both");
  const [topK, setTopK] = useState(5);
  const [isRunning, setIsRunning] = useState(false);

  const handlePredict = useCallback(async () => {
    if (state.edges.length === 0) {
      toast.error("請先匯入 Edge 資料");
      return;
    }
    setIsRunning(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      let results: PredictionResult[] = [];
      if (selectedMode === "add" || selectedMode === "both") {
        const addResults = predictLinks(state.nodes, state.edges, topK);
        results = [...results, ...addResults];
      }
      if (selectedMode === "remove" || selectedMode === "both") {
        const removeResults = predictDissolution(state.nodes, state.edges, topK);
        results = [...results, ...removeResults];
      }
      setPredictionResults(results);
      const addCount = results.filter((r) => r.type === "add").length;
      const removeCount = results.filter((r) => r.type === "remove").length;
      toast.success(
        `預測完成！${addCount > 0 ? `新增連結 ${addCount} 條` : ""}${addCount > 0 && removeCount > 0 ? "，" : ""}${removeCount > 0 ? `斷開連結 ${removeCount} 條` : ""}`
      );
    } catch (err) {
      console.error(err);
      toast.error("預測失敗");
    } finally {
      setIsRunning(false);
    }
  }, [selectedMode, topK, state.nodes, state.edges, setPredictionResults]);

  const addResults = state.predictionResults.filter((r) => r.type === "add");
  const removeResults = state.predictionResults.filter((r) => r.type === "remove");

  const getNodeLabel = useCallback(
    (nodeId: string) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      return (
        state.customLabels[nodeId] ||
        (state.selectedAttribute && node?.[state.selectedAttribute]
          ? String(node[state.selectedAttribute])
          : nodeId)
      );
    },
    [state.nodes, state.customLabels, state.selectedAttribute]
  );

  if (state.edges.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <Info size={32} className="text-amber-500" />
            <div>
              <p className="font-semibold text-amber-800">尚未匯入資料</p>
              <p className="text-sm text-amber-600 mt-1">請先完成資料匯入步驟</p>
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
        <h1 className="text-2xl font-bold text-foreground">網絡預測</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          預測網絡中可能新增或斷開的連結，結果將直接標示於網絡圖上。
        </p>
      </div>

      {/* Mode selection */}
      <div className="grid grid-cols-2 gap-4">
        {PREDICTION_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id || selectedMode === "both";
          return (
            <button
              key={mode.id}
              onClick={() =>
                setSelectedMode((prev) => {
                  if (prev === "both") return mode.id as "add" | "remove";
                  if (prev === mode.id) return "both";
                  return "both";
                })
              }
              className={cn(
                "flex flex-col gap-3 p-5 rounded-xl border text-left transition-all duration-200",
                isSelected
                  ? `${mode.borderColor} ${mode.bgColor} shadow-sm ring-1 ring-inset`
                  : "border-border hover:border-primary/30 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isSelected ? mode.bgColor : "bg-muted"
                  )}
                >
                  <Icon size={20} className={isSelected ? mode.color : "text-muted-foreground"} />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{mode.label}</div>
                  <div className="text-xs text-muted-foreground">{mode.sublabel}</div>
                </div>
                {isSelected && (
                  <CheckCircle2 size={16} className={cn("ml-auto", mode.color)} />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{mode.description}</p>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-8 h-0.5 rounded",
                    mode.id === "add" ? "bg-emerald-400 border-dashed" : "bg-rose-400 border-dashed"
                  )}
                  style={{ borderTop: `2px dashed ${mode.id === "add" ? "#10b981" : "#ef4444"}`, background: "none" }}
                />
                <span className="text-xs text-muted-foreground">{mode.lineStyle}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Top K setting */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Label className="text-sm font-medium text-foreground whitespace-nowrap">
            預測結果數量（Top K）
          </Label>
          <Slider
            value={[topK]}
            onValueChange={([v]) => setTopK(v)}
            min={1}
            max={Math.min(20, Math.max(state.edges.length, state.nodes.length))}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-bold text-primary w-6 text-center">{topK}</span>
        </CardContent>
      </Card>

      {/* Run button */}
      <Button onClick={handlePredict} disabled={isRunning} className="w-full h-11 text-base">
        {isRunning ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" />
            預測中...
          </>
        ) : (
          <>
            <ArrowUpRight size={16} className="mr-2" />
            執行網絡預測
          </>
        )}
      </Button>

      {/* Results */}
      {state.predictionResults.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <CheckCircle2 size={20} className="text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">預測完成</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {addResults.length > 0 && `預測新增連結 ${addResults.length} 條`}
                  {addResults.length > 0 && removeResults.length > 0 && "，"}
                  {removeResults.length > 0 && `預測斷開連結 ${removeResults.length} 條`}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate("/visualize")} className="gap-2">
                <Eye size={13} />
                查看圖形
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* Link Prediction results */}
            {addResults.length > 0 && (
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-600" />
                    <span className="text-emerald-700">預測新增連結</span>
                    <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-xs border">
                      {addResults.length} 條
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {addResults.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100"
                    >
                      <span className="text-xs font-mono text-emerald-700 truncate flex-1">
                        {getNodeLabel(r.source)}
                      </span>
                      <div className="flex-shrink-0 w-4 h-0 border-t-2 border-dashed border-emerald-400" />
                      <span className="text-xs font-mono text-emerald-700 truncate flex-1 text-right">
                        {getNodeLabel(r.target)}
                      </span>
                      <Badge variant="outline" className="text-xs ml-1 border-emerald-200 text-emerald-600 flex-shrink-0">
                        {r.score.toFixed(3)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Link Dissolution results */}
            {removeResults.length > 0 && (
              <Card className="border-rose-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Unlink size={14} className="text-rose-600" />
                    <span className="text-rose-700">預測斷開連結</span>
                    <Badge className="ml-auto bg-rose-100 text-rose-700 border-rose-200 text-xs border">
                      {removeResults.length} 條
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {removeResults.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-rose-50/50 border border-rose-100"
                    >
                      <span className="text-xs font-mono text-rose-700 truncate flex-1">
                        {getNodeLabel(r.source)}
                      </span>
                      <div className="flex-shrink-0 w-4 h-0 border-t-2 border-dashed border-rose-400" />
                      <span className="text-xs font-mono text-rose-700 truncate flex-1 text-right">
                        {getNodeLabel(r.target)}
                      </span>
                      <Badge variant="outline" className="text-xs ml-1 border-rose-200 text-rose-600 flex-shrink-0">
                        {r.score.toFixed(3)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Hint */}
          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-center gap-3">
              <Info size={14} className="text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                預測結果已同步至網絡圖。綠色虛線代表預測新增連結，紅色虛線代表預測斷開連結。
                前往「網絡繪製」頁面查看完整視覺化。
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
