import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileText,
  GitMerge,
  Table2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

type ParsedRow = Record<string, unknown>;

interface OneModeEdge {
  source: string;
  target: string;
  weight: number;
}

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
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

/** One-mode projection: actor × event → actor × actor
 *  weight = number of shared events between two actors */
function computeOneModeEdges(
  rows: ParsedRow[],
  actorCol: string,
  eventCol: string
): { edges: OneModeEdge[]; nodes: { id: string }[] } {
  // Build event → actors map
  const eventActors = new Map<string, Set<string>>();
  for (const row of rows) {
    const actor = String(row[actorCol] ?? "").trim();
    const event = String(row[eventCol] ?? "").trim();
    if (!actor || !event) continue;
    if (!eventActors.has(event)) eventActors.set(event, new Set());
    eventActors.get(event)!.add(actor);
  }

  // Count shared events between actor pairs
  const pairWeight = new Map<string, number>();
  Array.from(eventActors.values()).forEach((actors) => {
    const arr = Array.from(actors);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i] as string;
        const b = arr[j] as string;
        const key = a < b ? `${a}|||${b}` : `${b}|||${a}`;
        pairWeight.set(key, (pairWeight.get(key) ?? 0) + 1);
      }
    }
  });

  const edges: OneModeEdge[] = [];
  Array.from(pairWeight.entries()).forEach(([key, weight]) => {
    const [source, target] = key.split("|||");
    edges.push({ source, target, weight });
  });
  edges.sort((a, b) => b.weight - a.weight);

  // Unique actors
  const actorSet = new Set<string>();
  for (const row of rows) {
    const actor = String(row[actorCol] ?? "").trim();
    if (actor) actorSet.add(actor);
  }
  const nodes = Array.from(actorSet).map((id) => ({ id }));

  return { edges, nodes };
}

export default function DataTransform() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rawData, setRawData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [actorCol, setActorCol] = useState("");
  const [eventCol, setEventCol] = useState("");
  const [result, setResult] = useState<{ edges: OneModeEdge[]; nodes: { id: string }[] } | null>(null);

  const parseFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setResult(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      let rows: ParsedRow[] = [];
      let hdrs: string[] = [];

      if (ext === "csv" || ext === "txt") {
        const text = await file.text();
        const parsed = Papa.parse<ParsedRow>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
        rows = parsed.data;
        hdrs = parsed.meta.fields ?? [];
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: "" });
        hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
      } else {
        toast.error("不支援的格式，請上傳 CSV、Excel 或 TXT 檔案");
        setIsLoading(false);
        return;
      }

      if (rows.length === 0 || hdrs.length === 0) {
        toast.error("檔案內容為空或無法解析");
        setIsLoading(false);
        return;
      }

      setFileName(file.name);
      setRawData(rows);
      setHeaders(hdrs);
      // Auto-preselect: col[0]=actor, col[1]=event
      setActorCol(hdrs[0] ?? "");
      setEventCol(hdrs[1] ?? "");
      toast.success(`成功載入 ${rows.length} 筆資料，共 ${hdrs.length} 個欄位`);
    } catch (err) {
      console.error(err);
      toast.error("檔案解析失敗，請確認格式是否正確");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = "";
  }, [parseFile]);

  const handleTransform = useCallback(() => {
    if (!actorCol || !eventCol) {
      toast.error("請選擇行動者欄位與事件欄位");
      return;
    }
    if (actorCol === eventCol) {
      toast.error("行動者欄位與事件欄位不能相同");
      return;
    }
    const res = computeOneModeEdges(rawData, actorCol, eventCol);
    if (res.edges.length === 0) {
      toast.warning("未找到任何共同事件連結，請確認欄位選擇是否正確");
      return;
    }
    setResult(res);
    toast.success(`轉置完成：${res.nodes.length} 個行動者，${res.edges.length} 條邊`);
  }, [actorCol, eventCol, rawData]);

  const handleDownloadEdges = useCallback(() => {
    if (!result) return;
    downloadCSV(result.edges as unknown as Record<string, unknown>[], "one_mode_edges.csv");
    toast.success("Edge 資料已下載");
  }, [result]);

  const handleDownloadNodes = useCallback(() => {
    if (!result) return;
    downloadCSV(result.nodes as unknown as Record<string, unknown>[], "one_mode_nodes.csv");
    toast.success("Node 資料已下載");
  }, [result]);

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const fileTypeIcons: Record<string, React.ReactNode> = {
    xlsx: <FileSpreadsheet size={16} className="text-accent-foreground" />,
    xls: <FileSpreadsheet size={16} className="text-accent-foreground" />,
    csv: <Table2 size={16} className="text-primary" />,
    txt: <FileText size={16} className="text-muted-foreground" />,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">資料處理</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          上傳二部圖（Bipartite）原始資料，選擇行動者欄位與事件欄位，自動轉置為 One-Mode 關係網絡，並計算共同事件數作為 Weight。
        </p>
      </div>

      {/* How it works */}
      <Card className="border-primary/20 bg-primary/3">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <GitMerge size={18} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">One-Mode 轉置原理</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                若原始資料為「人 × 活動」格式（每列記錄一個人參加一個活動），系統會找出所有參加過相同活動的人，並在他們之間建立連結。
                <strong className="text-foreground"> Weight = 兩人共同參加的活動數</strong>。
                例如 Alice 與 Bob 都參加了 3 個相同活動，則邊的 weight = 3。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card className="border-2 border-dashed transition-all duration-200 hover:border-primary/40"
        style={{ borderColor: isDragging ? "var(--primary)" : undefined }}>
        <CardContent className="p-0">
          <label
            className={`flex flex-col items-center justify-center gap-4 p-12 cursor-pointer rounded-xl transition-all duration-200 ${
              isDragging ? "bg-primary/5" : "hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={handleFileInput} />
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              isDragging ? "bg-primary/15 scale-110" : "bg-muted"
            }`}>
              <Upload size={28} className={isDragging ? "text-primary" : "text-muted-foreground"} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">
                {isLoading ? "解析中..." : "拖曳檔案至此，或點擊上傳"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">支援 Excel (.xlsx/.xls)、CSV、TXT</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {["XLSX", "XLS", "CSV", "TXT"].map((fmt) => (
                <Badge key={fmt} variant="secondary" className="text-xs font-mono">{fmt}</Badge>
              ))}
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Loaded file info */}
      {fileName && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {fileTypeIcons[ext] || <FileText size={16} className="text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rawData.length} 筆資料 · {headers.length} 個欄位
                </p>
              </div>
              <Badge variant="outline" className="text-xs">已載入</Badge>
            </div>
            {headers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">欄位預覽</p>
                <div className="flex flex-wrap gap-1.5">
                  {headers.map((h) => (
                    <Badge key={h} variant="secondary" className="text-xs font-mono">{h}</Badge>
                  ))}
                </div>
              </div>
            )}
            {rawData.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border overflow-x-auto custom-scroll">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">資料預覽（前 5 筆）</p>
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {headers.slice(0, 6).map((h) => (
                        <th key={h} className="text-left py-1.5 px-2 text-muted-foreground font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        {headers.slice(0, 6).map((h) => (
                          <td key={h} className="py-1.5 px-2 text-foreground/80 truncate max-w-[120px]">
                            {String(row[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Selection */}
      {headers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitMerge size={16} className="text-primary" />
              欄位設定
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              選擇代表行動者（Actor）與事件（Event）的欄位，系統將計算行動者之間的共同事件數。
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">行動者欄位（Actor）</label>
                <Select value={actorCol} onValueChange={setActorCol}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="選擇欄位..." />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">例如：人名、組織、國家</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">事件欄位（Event）</label>
                <Select value={eventCol} onValueChange={setEventCol}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="選擇欄位..." />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">例如：活動、會議、組織</p>
              </div>
            </div>
            <Button
              onClick={handleTransform}
              disabled={!actorCol || !eventCol || actorCol === eventCol}
              className="w-full"
            >
              <GitMerge size={15} className="mr-2" />
              執行 One-Mode 轉置
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">轉置結果：</span>
            <Badge variant="secondary" className="text-xs bg-primary/15 text-primary border-primary/30">
              {result.nodes.length} 個行動者
            </Badge>
            <Badge variant="secondary" className="text-xs bg-accent/30 text-accent-foreground">
              {result.edges.length} 條邊
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Weight = 共同事件數
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Edge results */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Table2 size={16} className="text-primary" />
                    Edge 資料
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={handleDownloadEdges}>
                    <Download size={13} className="mr-1.5" />
                    下載 CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scroll">
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground pb-1.5 border-b border-border">
                    <span>Source</span>
                    <span>Target</span>
                    <span>Weight</span>
                  </div>
                  {result.edges.slice(0, 50).map((e, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 text-xs py-1 hover:bg-muted/30 rounded px-1">
                      <span className="font-mono text-primary truncate">{e.source}</span>
                      <span className="font-mono text-foreground/70 truncate">{e.target}</span>
                      <span className="font-mono text-accent-foreground/80">{e.weight}</span>
                    </div>
                  ))}
                  {result.edges.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      ... 共 {result.edges.length} 條邊（下載 CSV 查看完整資料）
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Node results */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Table2 size={16} className="text-muted-foreground" />
                    Node 資料
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={handleDownloadNodes}>
                    <Download size={13} className="mr-1.5" />
                    下載 CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scroll">
                  <div className="text-xs font-semibold text-muted-foreground pb-1.5 border-b border-border">
                    ID（行動者）
                  </div>
                  {result.nodes.slice(0, 50).map((n) => (
                    <div key={n.id} className="flex items-center gap-2 text-xs py-1 px-2 hover:bg-muted/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-primary/60 flex-shrink-0" />
                      <span className="font-mono text-foreground/80">{n.id}</span>
                    </div>
                  ))}
                  {result.nodes.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center">... 共 {result.nodes.length} 個節點</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tip */}
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ArrowRight size={16} className="text-accent-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  下載 Edge CSV 後，可至<strong className="text-foreground">「資料匯入」</strong>頁面上傳，
                  系統會自動預選 source / target / weight 欄位，直接進行網絡視覺化與分析。
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
