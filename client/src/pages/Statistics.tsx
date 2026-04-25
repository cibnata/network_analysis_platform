import { useNetwork } from "@/contexts/NetworkContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useMemo } from "react";
import { computeCentralities } from "@/lib/centralityMetrics";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Download,
  Hash,
  Info,
  Network,
  TrendingUp,
  Users,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function downloadCSV(data: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(data[0] || {});
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function descStats(values: number[]) {
  if (values.length === 0) return { min: 0, max: 0, mean: 0, median: 0, sd: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { min: sorted[0], max: sorted[n - 1], mean, median, sd };
}

function fmt(v: number, decimals = 4) {
  return isNaN(v) ? "—" : v.toFixed(decimals);
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────
function StatRow({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${highlight ? "bg-primary/5" : "hover:bg-muted/30"}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-mono font-semibold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

// ─── Network Overview ─────────────────────────────────────────────────────────
function NetworkOverview() {
  const { state } = useNetwork();
  const { edges, nodes, graphDirected, graphWeighted } = state;

  const stats = useMemo(() => {
    const n = nodes.length;
    const m = edges.length;
    if (n === 0) return null;

    // Density
    const maxEdges = graphDirected ? n * (n - 1) : (n * (n - 1)) / 2;
    const density = maxEdges > 0 ? m / maxEdges : 0;

    // Degree sequence
    const degreeMap = new Map<string, number>();
    nodes.forEach((nd) => degreeMap.set(nd.id, 0));
    edges.forEach((e) => {
      degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
      if (!graphDirected) {
        degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
      } else {
        degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
      }
    });
    const degrees = Array.from(degreeMap.values());
    const degStats = descStats(degrees);

    // Isolated nodes
    const isolatedCount = degrees.filter((d) => d === 0).length;

    // Weight stats (if weighted)
    let weightStats = null;
    if (graphWeighted) {
      const weights = edges.map((e) => e.weight ?? 1);
      weightStats = descStats(weights);
    }

    // Self-loops
    const selfLoops = edges.filter((e) => e.source === e.target).length;

    // Multi-edges
    const edgeSet = new Set<string>();
    let multiEdges = 0;
    edges.forEach((e) => {
      const key = graphDirected ? `${e.source}→${e.target}` : [e.source, e.target].sort().join("—");
      if (edgeSet.has(key)) multiEdges++;
      else edgeSet.add(key);
    });

    return { n, m, density, degStats, isolatedCount, weightStats, selfLoops, multiEdges };
  }, [nodes, edges, graphDirected, graphWeighted]);

  if (nodes.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "節點數", value: stats?.n ?? 0, icon: <Users size={16} />, color: "text-primary" },
          { label: "邊數", value: stats?.m ?? 0, icon: <Network size={16} />, color: "text-accent-foreground" },
          { label: "密度", value: fmt(stats?.density ?? 0, 4), icon: <Activity size={16} />, color: "text-foreground" },
          { label: "孤立節點", value: stats?.isolatedCount ?? 0, icon: <Hash size={16} />, color: "text-muted-foreground" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${item.color} opacity-70`}>{item.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              圖形屬性
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <StatRow label="方向性" value={graphDirected ? "有向圖" : "無向圖"} />
            <StatRow label="權重" value={graphWeighted ? `有權重（${state.weightColumn}）` : "無權重"} />
            <StatRow label="自環（Self-loop）" value={stats?.selfLoops ?? 0} />
            <StatRow label="重複邊（Multi-edge）" value={stats?.multiEdges ?? 0} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              度數分佈統計
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <StatRow label="平均度數" value={fmt(stats?.degStats.mean ?? 0, 2)} highlight />
            <StatRow label="中位數" value={fmt(stats?.degStats.median ?? 0, 2)} />
            <StatRow label="標準差" value={fmt(stats?.degStats.sd ?? 0, 2)} />
            <StatRow label="最小 / 最大" value={`${stats?.degStats.min ?? 0} / ${stats?.degStats.max ?? 0}`} />
          </CardContent>
        </Card>
      </div>

      {stats?.weightStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              權重分佈統計
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: "最小值", value: fmt(stats.weightStats.min, 2) },
              { label: "最大值", value: fmt(stats.weightStats.max, 2) },
              { label: "平均值", value: fmt(stats.weightStats.mean, 2) },
              { label: "中位數", value: fmt(stats.weightStats.median, 2) },
              { label: "標準差", value: fmt(stats.weightStats.sd, 2) },
            ].map((item) => (
              <div key={item.label} className="text-center p-2 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Attribute Stats ──────────────────────────────────────────────────────────
function AttributeStats() {
  const { state } = useNetwork();
  const { nodeCSV, nodeCSVHeaders, nodeIdColumn } = state;

  const attrHeaders = nodeCSVHeaders.filter((h) => h !== nodeIdColumn);

  const attrStats = useMemo(() => {
    return attrHeaders.map((attr) => {
      const values = nodeCSV.map((n) => n[attr]);
      const numericValues = values
        .map((v) => parseFloat(String(v ?? "")))
        .filter((v) => !isNaN(v));
      const isNumeric = numericValues.length > values.length * 0.5;

      if (isNumeric && numericValues.length > 0) {
        const stats = descStats(numericValues);
        return { attr, type: "numeric" as const, stats, count: numericValues.length };
      } else {
        // Categorical
        const freq = new Map<string, number>();
        values.forEach((v) => {
          const key = String(v ?? "（空值）");
          freq.set(key, (freq.get(key) ?? 0) + 1);
        });
        const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
        return { attr, type: "categorical" as const, freq: sorted, uniqueCount: freq.size, total: values.length };
      }
    });
  }, [nodeCSV, attrHeaders, nodeIdColumn]);

  if (nodeCSV.length === 0) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center">
          <Info size={20} className="text-primary mx-auto mb-2" />
          <p className="text-sm text-foreground/70">尚未匯入節點屬性資料。</p>
          <p className="text-xs text-muted-foreground mt-1">請先在「資料匯入」頁面的「Node 屬性」頁籤上傳屬性檔案。</p>
        </CardContent>
      </Card>
    );
  }

  if (attrHeaders.length === 0) {
    return (
      <Card className="border-border bg-muted/20">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">節點屬性檔案中無額外屬性欄位（僅含識別碼）。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">共 {nodeCSV.length} 筆節點 · {attrHeaders.length} 個屬性欄位</p>
        <Button size="sm" variant="outline" onClick={() => {
          const rows = nodeCSV.map((n) => {
            const row: Record<string, unknown> = { id: n.id };
            attrHeaders.forEach((h) => { row[h] = n[h] ?? ""; });
            return row;
          });
          downloadCSV(rows, "node_attributes.csv");
        }}>
          <Download size={13} className="mr-1.5" />
          下載屬性 CSV
        </Button>
      </div>
      {attrStats.map((stat) => (
        <Card key={stat.attr}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono">{stat.attr}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {stat.type === "numeric" ? "數值型" : "類別型"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {stat.type === "numeric" ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: "有效值", value: stat.count },
                  { label: "最小值", value: fmt(stat.stats.min, 2) },
                  { label: "最大值", value: fmt(stat.stats.max, 2) },
                  { label: "平均值", value: fmt(stat.stats.mean, 2) },
                  { label: "標準差", value: fmt(stat.stats.sd, 2) },
                ].map((item) => (
                  <div key={item.label} className="text-center p-2 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground mb-2">
                  共 {stat.uniqueCount} 個類別 · {stat.total} 筆資料
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {stat.freq.slice(0, 15).map(([val, count]) => (
                    <div key={val} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-foreground/80 truncate max-w-[200px]">{val}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full"
                            style={{ width: `${(count / stat.total) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-12 text-right flex-shrink-0">
                        {count} ({((count / stat.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                  {stat.freq.length > 15 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">... 共 {stat.freq.length} 個類別</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Centrality Stats ─────────────────────────────────────────────────────────
function CentralityStats() {
  const { state } = useNetwork();
  const { nodes, edges, graphDirected, graphWeighted } = state;

  const centralityData = useMemo(() => {
    if (nodes.length === 0) return [];
    const nodeIds = nodes.map((n) => n.id);
    const result = computeCentralities(nodeIds, edges, graphDirected, graphWeighted);
    return Array.from(result.values()).sort((a, b) => b.degreeRaw - a.degreeRaw);
  }, [nodes, edges, graphDirected, graphWeighted]);

  const summaryStats = useMemo(() => {
    if (centralityData.length === 0) return null;
    return {
      degree: descStats(centralityData.map((d) => d.degreeRaw)),
      betweenness: descStats(centralityData.map((d) => d.betweennessRaw)),
      closeness: descStats(centralityData.map((d) => d.closenessRaw)),
      pagerank: descStats(centralityData.map((d) => d.pagerankRaw)),
    };
  }, [centralityData]);

  if (nodes.length === 0) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center">
          <Info size={20} className="text-primary mx-auto mb-2" />
          <p className="text-sm text-foreground/70">尚未載入網絡資料。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">共 {nodes.length} 個節點</p>
        <Button size="sm" variant="outline" onClick={() => {
          const rows = centralityData.map((d) => ({
            nodeId: d.nodeId,
            degree: d.degreeRaw,
            betweenness: d.betweennessRaw.toFixed(4),
            closeness: d.closenessRaw.toFixed(4),
            pagerank: d.pagerankRaw.toFixed(6),
          }));
          downloadCSV(rows, "centrality_statistics.csv");
        }}>
          <Download size={13} className="mr-1.5" />
          下載中心性 CSV
        </Button>
      </div>

      {/* Summary stats */}
      {summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["degree", "betweenness", "closeness", "pagerank"] as const).map((metric) => {
            const labels: Record<string, string> = {
              degree: "度數中心性（Degree）",
              betweenness: "中介中心性（Betweenness）",
              closeness: "接近中心性（Closeness）",
              pagerank: "PageRank",
            };
            const s = summaryStats[metric];
            return (
              <Card key={metric}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{labels[metric]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <StatRow label="平均值" value={fmt(s.mean, 4)} highlight />
                  <StatRow label="中位數" value={fmt(s.median, 4)} />
                  <StatRow label="標準差" value={fmt(s.sd, 4)} />
                  <StatRow label="最小 / 最大" value={`${fmt(s.min, 2)} / ${fmt(s.max, 2)}`} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Top 10 table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" />
            節點中心性排名（前 20）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 px-2 text-muted-foreground font-semibold">排名</th>
                  <th className="text-left py-1.5 px-2 text-muted-foreground font-semibold">節點</th>
                  <th className="text-right py-1.5 px-2 text-muted-foreground font-semibold">Degree</th>
                  <th className="text-right py-1.5 px-2 text-muted-foreground font-semibold">Betweenness</th>
                  <th className="text-right py-1.5 px-2 text-muted-foreground font-semibold">Closeness</th>
                  <th className="text-right py-1.5 px-2 text-muted-foreground font-semibold">PageRank</th>
                </tr>
              </thead>
              <tbody>
                {centralityData.slice(0, 20).map((d, i) => (
                  <tr key={d.nodeId} className={`border-b border-border/50 hover:bg-muted/20 ${i < 3 ? "bg-primary/3" : ""}`}>
                    <td className="py-1.5 px-2 text-muted-foreground font-mono">
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-foreground font-medium">{d.nodeId}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-foreground/80">{d.degreeRaw}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-foreground/80">{fmt(d.betweennessRaw, 4)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-foreground/80">{fmt(d.closenessRaw, 4)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-foreground/80">{fmt(d.pagerankRaw, 6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {centralityData.length > 20 && (
              <p className="text-xs text-muted-foreground text-center pt-2">... 共 {centralityData.length} 個節點</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Community Stats ──────────────────────────────────────────────────────────
function CommunityStats() {
  const { state } = useNetwork();
  const { communityResults, communityAlgorithm, nodes, edges } = state;

  const communityData = useMemo(() => {
    if (communityResults.length === 0) return null;

    // Group nodes by community
    const groups = new Map<number, string[]>();
    communityResults.forEach(({ nodeId, communityId }) => {
      if (!groups.has(communityId)) groups.set(communityId, []);
      groups.get(communityId)!.push(nodeId);
    });

    const sorted = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);

    // Internal edges per community
    const nodeComm = new Map<string, number>();
    communityResults.forEach(({ nodeId, communityId }) => nodeComm.set(nodeId, communityId));

    const internalEdges = new Map<number, number>();
    const externalEdges = new Map<number, number>();
    sorted.forEach(([cid]) => { internalEdges.set(cid, 0); externalEdges.set(cid, 0); });

    edges.forEach((e) => {
      const sc = nodeComm.get(e.source);
      const tc = nodeComm.get(e.target);
      if (sc === undefined || tc === undefined) return;
      if (sc === tc) {
        internalEdges.set(sc, (internalEdges.get(sc) ?? 0) + 1);
      } else {
        externalEdges.set(sc, (externalEdges.get(sc) ?? 0) + 1);
        externalEdges.set(tc, (externalEdges.get(tc) ?? 0) + 1);
      }
    });

    // Modularity (simplified Q)
    const m = edges.length;
    const degreeMap = new Map<string, number>();
    nodes.forEach((n) => degreeMap.set(n.id, 0));
    edges.forEach((e) => {
      degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
      degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
    });
    let Q = 0;
    if (m > 0) {
      edges.forEach((e) => {
        if (nodeComm.get(e.source) === nodeComm.get(e.target)) {
          const ki = degreeMap.get(e.source) ?? 0;
          const kj = degreeMap.get(e.target) ?? 0;
          Q += 1 - (ki * kj) / (2 * m);
        }
      });
      Q /= 2 * m;
    }

    return { sorted, internalEdges, externalEdges, Q, numCommunities: groups.size };
  }, [communityResults, nodes, edges]);

  if (communityResults.length === 0) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center">
          <Info size={20} className="text-primary mx-auto mb-2" />
          <p className="text-sm text-foreground/70">尚未執行社群偵測。</p>
          <p className="text-xs text-muted-foreground mt-1">請先在「網絡繪製」頁面執行社群偵測演算法。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">演算法：{communityAlgorithm || "未知"}</Badge>
          <Badge variant="secondary" className="text-xs">{communityData?.numCommunities} 個社群</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => {
          const rows = communityResults.map((r) => ({
            nodeId: r.nodeId,
            communityId: r.communityId,
          }));
          downloadCSV(rows, "community_membership.csv");
        }}>
          <Download size={13} className="mr-1.5" />
          下載社群歸屬 CSV
        </Button>
      </div>

      {communityData && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">社群數量</p>
                <p className="text-2xl font-bold font-mono text-primary mt-1">{communityData.numCommunities}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">模組化指數 (Q)</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">{fmt(communityData.Q, 4)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">平均社群大小</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {fmt(communityResults.length / communityData.numCommunities, 1)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users size={14} className="text-primary" />
                各社群統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 px-2 text-muted-foreground font-semibold">社群</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-semibold">節點數</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-semibold">內部邊</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-semibold">外部邊</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-semibold">內部比例</th>
                      <th className="text-left py-1.5 px-2 text-muted-foreground font-semibold">成員（前 5）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communityData.sorted.map(([cid, members]) => {
                      const internal = communityData.internalEdges.get(cid) ?? 0;
                      const external = communityData.externalEdges.get(cid) ?? 0;
                      const total = internal + external;
                      const ratio = total > 0 ? internal / total : 0;
                      return (
                        <tr key={cid} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-1.5 px-2">
                            <Badge variant="outline" className="text-xs font-mono">社群 {cid + 1}</Badge>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-foreground">{members.length}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-foreground/80">{internal}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-foreground/80">{external}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-foreground/80">
                            {(ratio * 100).toFixed(1)}%
                          </td>
                          <td className="py-1.5 px-2 text-foreground/70 max-w-[200px] truncate">
                            {members.slice(0, 5).join(", ")}
                            {members.length > 5 && ` +${members.length - 5}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Statistics() {
  const { state } = useNetwork();
  const [, navigate] = useLocation();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">統計分析</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          檢視網絡結構、節點屬性、中心性指標與社群偵測的統計摘要。
        </p>
      </div>

      {/* No data warning */}
      {state.nodes.length === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Info size={16} className="text-primary flex-shrink-0" />
            <p className="text-sm text-foreground/70">尚未載入任何網絡資料，請先完成資料匯入步驟。</p>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => navigate("/import")}>
              前往匯入
              <ArrowRight size={13} className="ml-1.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Network size={13} />
            網絡概覽
          </TabsTrigger>
          <TabsTrigger value="attribute" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 size={13} />
            節點屬性
            {state.nodeCSV.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{state.nodeCSVHeaders.filter((h) => h !== state.nodeIdColumn).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="centrality" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <TrendingUp size={13} />
            中心性
          </TabsTrigger>
          <TabsTrigger value="community" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Users size={13} />
            社群
            {state.communityResults.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {new Set(state.communityResults.map((r) => r.communityId)).size}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          {state.nodes.length === 0 ? (
            <Card className="border-border bg-muted/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">尚無網絡資料。</p>
              </CardContent>
            </Card>
          ) : (
            <NetworkOverview />
          )}
        </TabsContent>
        <TabsContent value="attribute" className="mt-6">
          <AttributeStats />
        </TabsContent>
        <TabsContent value="centrality" className="mt-6">
          <CentralityStats />
        </TabsContent>
        <TabsContent value="community" className="mt-6">
          <CommunityStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
