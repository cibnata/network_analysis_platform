import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Database,
  Network,
  Share2,
  Shuffle,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";

const features = [
  {
    icon: Database,
    title: "資料匯入",
    description: "支援 Excel、CSV、TXT、PDF 多格式上傳，自動偵測欄位，Edge 與 Node 屬性管理整合於同一頁面。",
    color: "text-primary",
    bg: "bg-primary/10",
    step: "01",
  },
  {
    icon: Shuffle,
    title: "資料處理",
    description: "上傳 raw data，選任兩個欄位執行 one-mode 投影轉置，自動計算 weight（共同事件數），產生 edge 與 node 資料供下載。",
    color: "text-primary",
    bg: "bg-primary/10",
    step: "02",
  },
  {
    icon: Network,
    title: "網絡繪製",
    description: "Cytoscape.js 互動式網絡圖，6 種佈局演算法，支援節點搜尋高亮、顏色自訂、hover tooltip 與 PNG 匯出。",
    color: "text-primary",
    bg: "bg-primary/10",
    step: "03",
  },
  {
    icon: Share2,
    title: "社群偵測",
    description: "6 種演算法（Louvain、Label Propagation、Girvan-Newman、Leiden、Walktrap、Greedy Modularity），結果可下載 CSV。",
    color: "text-primary",
    bg: "bg-primary/10",
    step: "04",
  },
  {
    icon: TrendingUp,
    title: "網絡預測",
    description: "Link Prediction 與 Link Dissolution 預測，Common Neighbors、Jaccard、Adamic-Adar 三種指標，結果直接標示於網絡圖上。",
    color: "text-primary",
    bg: "bg-primary/10",
    step: "05",
  },
  {
    icon: BarChart3,
    title: "統計分析",
    description: "網絡概覽、節點屬性描述統計、四種中心性排名、社群模組化指數，支援 CSV 下載。",
    color: "text-primary",
    bg: "bg-primary/10",
    step: "06",
  },
];

const algorithms = [
  // 社群偵測
  { name: "Louvain", type: "社群偵測" },
  { name: "Label Propagation", type: "社群偵測" },
  { name: "Girvan-Newman", type: "社群偵測" },
  { name: "Leiden", type: "社群偵測" },
  { name: "Walktrap", type: "社群偵測" },
  { name: "Greedy Modularity", type: "社群偵測" },
  // 連結預測
  { name: "Common Neighbors", type: "連結預測" },
  { name: "Jaccard Coefficient", type: "連結預測" },
  { name: "Adamic-Adar Index", type: "連結預測" },
  // 佈局
  { name: "fCoSE", type: "佈局" },
  { name: "Force-directed", type: "佈局" },
  { name: "Hierarchical", type: "佈局" },
  { name: "Breadthfirst", type: "佈局" },
  { name: "Euler", type: "佈局" },
  { name: "Random", type: "佈局" },
];

const TYPE_COLOR: Record<string, string> = {
  "社群偵測": "bg-primary/10 text-primary border-primary/20",
  "連結預測": "bg-[#B0C4B1]/30 text-[#4A5759] border-[#B0C4B1]/50",
  "佈局": "bg-muted text-muted-foreground border-border",
};

export default function Home() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#EDAFB8]/10 via-background to-[#B0C4B1]/10 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <Badge className="px-4 py-1.5 text-sm bg-primary/10 text-primary border-primary/20 border">
              <Zap size={12} className="mr-1.5" />
              犯罪情資分析課程 · 網絡分析練習平台
            </Badge>
          </div>
          {/* Title */}
          <h1 className="text-5xl font-bold text-foreground leading-tight mb-4">
            網絡分析
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#d4849a] via-[#EDAFB8] to-[#4A5759] mt-1">
              互動式練習平台
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            從資料匯入、one-mode 轉置、網絡視覺化、社群偵測到連結預測，提供完整的網絡分析工作流程，
            協助您深入理解複雜網絡的結構與動態。
          </p>
          {/* CTA */}
          <div className="flex gap-3 justify-center">
            <Button
              size="lg"
              className="gap-2 px-8 h-12 text-base shadow-lg shadow-primary/20"
              onClick={() => navigate("/import")}
            >
              開始分析
              <ArrowRight size={16} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-8 h-12 text-base"
              onClick={() => navigate("/visualize")}
            >
              <Network size={16} />
              查看示範
            </Button>
          </div>
          {/* Stats */}
          <div className="flex gap-8 justify-center mt-12 pt-8 border-t border-border">
            {[
              { value: "6", label: "佈局演算法" },
              { value: "6", label: "社群偵測演算法" },
              { value: "3", label: "連結預測指標" },
              { value: "6", label: "支援格式" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground">六大分析模組</h2>
          <p className="text-muted-foreground mt-2 text-sm">循序漸進的工作流程，引導您完成完整的網絡分析</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group hover:shadow-md transition-all duration-200 hover:border-primary/20 cursor-pointer"
                onClick={() => navigate("/import")}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className={feature.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-foreground">{feature.title}</h3>
                        <span className="text-xs font-mono text-muted-foreground/50 ml-auto">{feature.step}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Algorithms */}
      <section className="bg-muted/30 border-y border-border py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-foreground">內建演算法</h2>
            <p className="text-muted-foreground mt-1 text-sm">涵蓋社群偵測、連結預測與視覺化佈局</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {algorithms.map((algo) => (
              <Badge
                key={algo.name}
                className={`px-3 py-1.5 text-xs border ${TYPE_COLOR[algo.type]}`}
              >
                <span className="opacity-60 mr-1.5">{algo.type}</span>
                {algo.name}
              </Badge>
            ))}
          </div>
          {/* Legend */}
          <div className="flex gap-4 justify-center mt-5">
            {Object.entries(TYPE_COLOR).map(([type, cls]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`inline-block w-2.5 h-2.5 rounded-full border ${cls}`} />
                <span className="text-xs text-muted-foreground">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Activity size={28} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">準備好開始分析了嗎？</h2>
        <p className="text-muted-foreground mb-6 text-sm max-w-md mx-auto">
          上傳您的資料，跟著引導步驟，完成完整的網絡分析流程。
        </p>
        <Button
          size="lg"
          className="gap-2 px-10 h-12 text-base shadow-lg shadow-primary/20"
          onClick={() => navigate("/import")}
        >
          立即開始
          <ArrowRight size={16} />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">
          網絡分析練習平台 · 犯罪情資分析課程教材
        </p>
      </footer>
    </div>
  );
}
