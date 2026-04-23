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
  TrendingUp,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";

const features = [
  {
    icon: Database,
    title: "資料匯入",
    description: "支援 Excel、CSV、TXT、PDF 多格式上傳，自動轉置為 Edge 格式並生成節點清單。",
    color: "text-violet-600",
    bg: "bg-violet-50",
    step: "01",
  },
  {
    icon: BarChart3,
    title: "屬性管理",
    description: "匯入節點屬性 CSV，支援多個 attribute 欄位，可選擇套用於視覺化。",
    color: "text-blue-600",
    bg: "bg-blue-50",
    step: "02",
  },
  {
    icon: Network,
    title: "網絡繪製",
    description: "Cytoscape.js 互動式網絡圖，5 種佈局演算法，支援手動拖拉與節點標籤編輯。",
    color: "text-teal-600",
    bg: "bg-teal-50",
    step: "03",
  },
  {
    icon: Share2,
    title: "社群偵測",
    description: "Louvain、Label Propagation、Girvan-Newman 三種演算法，結果可下載 CSV。",
    color: "text-amber-600",
    bg: "bg-amber-50",
    step: "04",
  },
  {
    icon: TrendingUp,
    title: "網絡預測",
    description: "Link Prediction 與 Link Dissolution 預測，結果直接標示於網絡圖上。",
    color: "text-rose-600",
    bg: "bg-rose-50",
    step: "05",
  },
];

const algorithms = [
  { name: "Louvain", type: "社群偵測", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { name: "Label Propagation", type: "社群偵測", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { name: "Girvan-Newman", type: "社群偵測", color: "bg-teal-100 text-teal-700 border-teal-200" },
  { name: "Common Neighbors", type: "連結預測", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { name: "Jaccard Coefficient", type: "連結預測", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { name: "Adamic-Adar Index", type: "連結預測", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { name: "Force-directed", type: "佈局", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { name: "Hierarchical", type: "佈局", color: "bg-pink-100 text-pink-700 border-pink-200" },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10 pointer-events-none" />
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
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-accent-foreground mt-1">
              互動式練習平台
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            從資料匯入、網絡視覺化、社群偵測到連結預測，提供完整的網絡分析工作流程，
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
              { value: "5", label: "佈局演算法" },
              { value: "3", label: "社群偵測演算法" },
              { value: "3", label: "連結預測指標" },
              { value: "5", label: "支援格式" },
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
          <h2 className="text-2xl font-bold text-foreground">四大分析模組</h2>
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
                className={`px-3 py-1.5 text-xs border ${algo.color}`}
              >
                <span className="opacity-60 mr-1.5">{algo.type}</span>
                {algo.name}
              </Badge>
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
