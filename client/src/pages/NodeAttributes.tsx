import { useNetwork } from "@/contexts/NetworkContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Info,
  Table2,
  Upload,
} from "lucide-react";
import Papa from "papaparse";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type ParsedRow = Record<string, unknown>;

export default function NodeAttributes() {
  const { state, setNodeCSV, setSelectedAttribute } = useNetwork();
  const [, navigate] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const parseNodeCSV = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const text = await file.text();
        const result = Papa.parse<ParsedRow>(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
        });
        const rows = result.data;
        const headers = result.meta.fields || [];

        if (rows.length === 0) {
          toast.error("CSV 檔案為空");
          return;
        }

        // Find id column
        const idCol = headers.find((h) =>
          ["id", "node", "ID", "Node", "NODE", "name", "Name"].includes(h)
        );
        if (!idCol) {
          toast.error("找不到節點 ID 欄位，請確認 CSV 包含 'id' 或 'node' 欄位");
          return;
        }

        const nodes = rows.map((row) => ({
          ...row,
          id: String(row[idCol] ?? ""),
        }));

        setNodeCSV(nodes, headers);
        toast.success(`成功匯入 ${rows.length} 筆節點屬性，共 ${headers.length - 1} 個屬性欄位`);
      } catch (err) {
        console.error(err);
        toast.error("CSV 解析失敗");
      } finally {
        setIsLoading(false);
      }
    },
    [setNodeCSV]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) parseNodeCSV(file);
    },
    [parseNodeCSV]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseNodeCSV(file);
      e.target.value = "";
    },
    [parseNodeCSV]
  );

  const attrHeaders = state.nodeCSVHeaders.filter(
    (h) => !["id", "node", "ID", "Node", "NODE", "name", "Name"].includes(h)
  );

  // Color palette for attribute badges
  const attrColors = [
    "bg-primary/10 text-primary border-primary/20",
    "bg-accent/70 text-accent-foreground border-accent",
    "bg-secondary text-secondary-foreground border-border",
    "bg-primary/15 text-primary border-primary/25",
    "bg-accent/50 text-accent-foreground border-accent/70",
    "bg-muted text-muted-foreground border-border",
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Node 屬性管理</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          匯入節點屬性 CSV 檔案，並選擇要套用於視覺化的屬性欄位。
        </p>
      </div>

      {/* No edges warning */}
      {state.edges.length === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Info size={16} className="text-primary flex-shrink-0" />
            <p className="text-sm text-foreground/70">
              請先完成「資料匯入」步驟，生成 Edge 資料後再匯入節點屬性。
            </p>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => navigate("/import")}>
              前往匯入
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CSV format hint */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">CSV 格式說明</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Node CSV 需包含一個 <code className="bg-muted px-1 rounded font-mono">id</code> 或{" "}
                <code className="bg-muted px-1 rounded font-mono">node</code> 欄位作為節點識別碼，
                其餘欄位將作為屬性（如：姓名、類型、組織、地區等）。
              </p>
              <div className="mt-2 p-2 bg-card rounded-lg border border-border font-mono text-xs text-muted-foreground">
                id,name,type,organization<br />
                A001,張三,嫌疑人,幫派甲<br />
                A002,李四,關係人,幫派甲
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card className="border-2 border-dashed transition-all duration-200 hover:border-primary/40"
        style={{ borderColor: isDragging ? "var(--primary)" : undefined }}>
        <CardContent className="p-0">
          <label
            className={`flex flex-col items-center justify-center gap-4 p-10 cursor-pointer rounded-xl transition-all duration-200 ${
              isDragging ? "bg-primary/5" : "hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              isDragging ? "bg-primary/15 scale-110" : "bg-muted"
            }`}>
              <Upload size={24} className={isDragging ? "text-primary" : "text-muted-foreground"} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">
                {isLoading ? "解析中..." : "上傳 Node 屬性 CSV"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">拖曳或點擊上傳 CSV 格式的節點屬性資料</p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Imported attributes */}
      {state.nodeCSVHeaders.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Attribute list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 size={16} className="text-accent-foreground" />
                已匯入屬性欄位
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Database size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {state.nodeCSV.length} 筆節點資料 · {attrHeaders.length} 個屬性
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  選擇視覺化屬性
                </p>
                <div className="space-y-1.5">
                  {attrHeaders.map((attr, i) => (
                    <button
                      key={attr}
                      onClick={() => setSelectedAttribute(attr)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150",
                        state.selectedAttribute === attr
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          state.selectedAttribute === attr ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                      />
                      <span className="text-sm font-medium text-foreground flex-1">{attr}</span>
                      {state.selectedAttribute === attr && (
                        <Badge className={cn("text-xs border", attrColors[i % attrColors.length])}>
                          套用中
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Node preview with attributes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Table2 size={16} className="text-primary" />
                節點屬性預覽
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto custom-scroll">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 px-2 text-muted-foreground font-semibold">ID</th>
                      {attrHeaders.slice(0, 3).map((h) => (
                        <th
                          key={h}
                          className={cn(
                            "text-left py-1.5 px-2 font-semibold",
                            state.selectedAttribute === h ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {h}
                          {state.selectedAttribute === h && (
                            <span className="ml-1 text-primary">★</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.nodeCSV.slice(0, 8).map((node, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-1.5 px-2 font-mono text-primary/80">{String(node.id || "")}</td>
                        {attrHeaders.slice(0, 3).map((h) => (
                          <td
                            key={h}
                            className={cn(
                              "py-1.5 px-2 truncate max-w-[80px]",
                              state.selectedAttribute === h
                                ? "text-foreground font-medium"
                                : "text-foreground/70"
                            )}
                          >
                            {String(node[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {state.nodeCSV.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    ... 共 {state.nodeCSV.length} 筆
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Skip option */}
      {state.edges.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {state.nodeCSVHeaders.length === 0
              ? "可跳過此步驟，直接進行網絡繪製"
              : state.selectedAttribute
              ? `已選擇屬性：${state.selectedAttribute}`
              : "請選擇要套用的屬性"}
          </p>
          <Button onClick={() => navigate("/visualize")} className="gap-2">
            {state.nodeCSVHeaders.length === 0 ? "跳過，前往繪製" : "下一步：網絡繪製"}
            <ArrowRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
