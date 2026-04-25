import { useNetwork } from "@/contexts/NetworkContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  ArrowRight as ArrowRightIcon,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Key,
  RefreshCw,
  Table2,
  Tag,
  Upload,
  Weight,
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { parseUCINET, isUCINETFile } from "@/lib/ucinetParser";

type ParsedRow = Record<string, unknown>;

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

// ─── UCINET Format Info Panel ────────────────────────────────────────────────
function UCINETFormatInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-accent-foreground flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">UCINET / DL / Pajek 格式說明</span>
          <Badge variant="secondary" className="text-xs">DL 、NET 、DAT</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "收起" : "展開查看格式說明"}</span>
      </button>
      {open && (
        <div className="border-t border-border p-4 space-y-4 text-xs">
          <p className="text-foreground/70 leading-relaxed">
            UCINET 是社會網絡分析的主流軟體，其資料格式分為三種：
            <strong>文字 DL 格式</strong>（可直接上傳）、
            <strong>Pajek .net 格式</strong>（可直接上傳）、
            以及 <strong>二進位 ##h/##d 格式</strong>（需先在 UCINET 軟體內匯出為 DL 文字格式）。
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground">DL Fullmatrix 格式</p>
              <pre className="text-xs font-mono text-primary/80 bg-primary/5 p-2 rounded overflow-x-auto">{`dl n=4 format=fullmatrix
labels: Alice,Bob,Carol,Dan
data:
0 1 1 0
1 0 1 0
1 1 0 1
0 0 1 0`}</pre>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground">DL Edgelist1 格式</p>
              <pre className="text-xs font-mono text-primary/80 bg-primary/5 p-2 rounded overflow-x-auto">{`dl n=5 format=edgelist1
labels embedded:
data:
Alice Bob 3
Bob Carol 4`}</pre>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground">Pajek .net 格式</p>
              <pre className="text-xs font-mono text-primary/80 bg-primary/5 p-2 rounded overflow-x-auto">{`*Vertices 4
1 "Alice"
2 "Bob"
*Edges
1 2 3
2 3 4`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Node Format Info Panel ──────────────────────────────────────────────────
function NodeFormatInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info size={14} className="text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">支援格式與欄位說明</span>
          <div className="flex gap-1 flex-wrap">
            {["XLSX", "CSV", "TXT", "PDF", "DL", "NET"].map((f) => (
              <Badge key={f} variant="secondary" className="text-xs font-mono">{f}</Badge>
            ))}
          </div>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{open ? "收起" : "展開說明"}</span>
      </button>
      {open && (
        <div className="border-t border-border p-4 space-y-4 text-xs">
          <p className="text-foreground/70 leading-relaxed">
            Node 屬性檔案上傳後，系統將自動抓取所有欄位名稱，讓您自行選擇哪個欄位作為
            <strong>節點識別碼（Node Name）</strong>與<strong>節點顯示標籤（Node Label）</strong>，其餘欄位均視為屬性。
          </p>
          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
            <p className="font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet size={13} className="text-accent-foreground" />
              Excel / CSV / TXT 格式
            </p>
            <pre className="text-xs font-mono text-primary/80 bg-primary/5 p-2 rounded overflow-x-auto">{`id,name,type,organization,region
A001,張三,嫌疑人,幫派甲,北區
A002,李四,關係人,幫派甲,南區`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Graph Type Toggle ────────────────────────────────────────────────────────
function GraphTypeToggle({ directed, onChange }: { directed: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => onChange(false)}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
          !directed ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <ArrowLeftRight size={14} />
        無向圖
      </button>
      <button
        onClick={() => onChange(true)}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
          directed ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <ArrowRightIcon size={14} />
        有向圖
      </button>
    </div>
  );
}

// ─── Edge Import Tab ─────────────────────────────────────────────────────────
function EdgeImportTab() {
  const { state, setRawData, setEdges } = useNetwork();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceCol, setSourceCol] = useState<string>("");
  const [targetCol, setTargetCol] = useState<string>("");
  const [weightCol, setWeightCol] = useState<string>("");
  const [directed, setDirected] = useState<boolean>(false);
  const [weighted, setWeighted] = useState<boolean>(false);
  const [previewEdges, setPreviewEdges] = useState<{ source: string; target: string; weight?: number }[]>([]);

  const parseFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        let rows: ParsedRow[] = [];
        let headers: string[] = [];

        if (ext === "csv" || ext === "txt") {
          const text = await file.text();
          if (ext === "txt" && isUCINETFile(file.name, text.slice(0, 300))) {
            const uciResult = parseUCINET(text, file.name);
            if (uciResult.warnings.length > 0) uciResult.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));
            if (uciResult.edges.length > 0) {
              const hasWeight = uciResult.edges.some((e) => e.weight !== undefined);
              const parsedEdges = uciResult.edges.map((e) => ({
                source: e.source,
                target: e.target,
                ...(hasWeight ? { weight: e.weight ?? 1 } : {}),
              }));
              setEdges(parsedEdges, "source", "target", directed, hasWeight, hasWeight ? "weight" : "");
              setPreviewEdges(parsedEdges.slice(0, 8));
              const rawRows = parsedEdges as ParsedRow[];
              setRawData(rawRows, Object.keys(rawRows[0] ?? {}), file.name);
              if (hasWeight) setWeighted(true);
              toast.success(`成功載入 ${uciResult.format} 格式，${uciResult.edges.length} 條邊，${uciResult.nodes.length} 個節點`);
              setIsLoading(false);
              return;
            }
          }
          const result = Papa.parse<ParsedRow>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
          rows = result.data;
          headers = result.meta.fields || [];
        } else if (ext === "xlsx" || ext === "xls") {
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: "" });
          headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        } else if (ext === "pdf") {
          const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
          GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
          const buf = await file.arrayBuffer();
          const pdf = await getDocument({ data: buf }).promise;
          let allText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            allText += content.items.map((item: unknown) => (item as { str: string }).str).join(" ") + "\n";
          }
          const lines = allText.split("\n").filter((l) => l.trim());
          if (lines.length > 1) {
            const sep = lines[0].includes(",") ? "," : lines[0].includes("\t") ? "\t" : " ";
            headers = lines[0].split(sep).map((h) => h.trim());
            rows = lines.slice(1).map((line) => {
              const vals = line.split(sep).map((v) => v.trim());
              const row: ParsedRow = {};
              headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
              return row;
            });
          } else {
            toast.error("無法從 PDF 中解析出表格資料");
            setIsLoading(false);
            return;
          }
        } else if (ext === "dl" || ext === "net" || ext === "dat") {
          const text = await file.text();
          const result = parseUCINET(text, file.name);
          if (result.warnings.length > 0) result.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));
          if (result.edges.length === 0) { setIsLoading(false); return; }
          const hasWeight = result.edges.some((e) => e.weight !== undefined);
          const parsedEdges = result.edges.map((e) => ({
            source: e.source,
            target: e.target,
            ...(hasWeight ? { weight: e.weight ?? 1 } : {}),
          }));
          setEdges(parsedEdges, "source", "target", directed, hasWeight, hasWeight ? "weight" : "");
          setPreviewEdges(parsedEdges.slice(0, 8));
          const rawRows = parsedEdges as ParsedRow[];
          setRawData(rawRows, Object.keys(rawRows[0] ?? {}), file.name);
          if (hasWeight) setWeighted(true);
          toast.success(`成功載入 ${result.format} 格式，${result.edges.length} 條邊，${result.nodes.length} 個節點`);
          setIsLoading(false);
          return;
        } else {
          toast.error("不支援的檔案格式");
          setIsLoading(false);
          return;
        }

        if (rows.length === 0 || headers.length === 0) {
          toast.error("檔案內容為空或無法解析");
          setIsLoading(false);
          return;
        }

        setRawData(rows, headers, file.name);
        const autoSource = headers[0] ?? "";
        const autoTarget = headers[1] ?? "";
        const autoWeight = headers[2] ?? "";
        setSourceCol(autoSource);
        setTargetCol(autoTarget);
        setWeightCol(autoWeight);
        setPreviewEdges([]);
        toast.success(`成功載入 ${rows.length} 筆資料，共 ${headers.length} 個欄位`);
      } catch (err) {
        console.error(err);
        toast.error("檔案解析失敗，請確認格式是否正確");
      } finally {
        setIsLoading(false);
      }
    },
    [setRawData, setEdges, directed]
  );

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

  const handleGenerateEdges = useCallback(() => {
    if (!sourceCol || !targetCol) { toast.error("請選擇來源節點與目標節點欄位"); return; }
    if (sourceCol === targetCol) { toast.error("來源欄位與目標欄位不能相同"); return; }
    if (weighted && !weightCol) { toast.error("已選擇有權重，請選擇權重欄位"); return; }
    const edges = state.rawData
      .filter((row) => row[sourceCol] && row[targetCol])
      .map((row) => ({
        source: String(row[sourceCol]),
        target: String(row[targetCol]),
        ...(weighted && weightCol ? { weight: parseFloat(String(row[weightCol] ?? "1")) || 1 } : {}),
      }));
    if (edges.length === 0) { toast.error("無法生成有效的 Edge 資料，請確認欄位值不為空"); return; }
    setEdges(edges, sourceCol, targetCol, directed, weighted, weighted ? weightCol : "");
    setPreviewEdges(edges.slice(0, 8));
    const nodeCount = new Set([...edges.map((e) => e.source), ...edges.map((e) => e.target)]).size;
    toast.success(`已生成 ${edges.length} 條${directed ? "有向" : "無向"}${weighted ? "加權" : ""}邊，${nodeCount} 個節點`);
  }, [sourceCol, targetCol, weightCol, directed, weighted, state.rawData, setEdges]);

  const handleDownloadNodes = useCallback(() => {
    if (state.nodes.length === 0) { toast.error("尚未生成節點資料"); return; }
    downloadCSV(state.nodes, "node_data.csv");
    toast.success("節點資料已下載");
  }, [state.nodes]);

  const handleDownloadEdges = useCallback(() => {
    if (state.edges.length === 0) { toast.error("尚未生成 Edge 資料"); return; }
    downloadCSV(state.edges as unknown as Record<string, unknown>[], "edge_data.csv");
    toast.success("Edge 資料已下載");
  }, [state.edges]);

  const ext = state.fileName.split(".").pop()?.toLowerCase() || "";
  const fileTypeIcons: Record<string, React.ReactNode> = {
    xlsx: <FileSpreadsheet size={16} className="text-accent-foreground" />,
    xls: <FileSpreadsheet size={16} className="text-accent-foreground" />,
    csv: <Table2 size={16} className="text-primary" />,
    txt: <FileText size={16} className="text-muted-foreground" />,
    pdf: <FileText size={16} className="text-primary" />,
    dl: <FileText size={16} className="text-accent-foreground" />,
    net: <FileText size={16} className="text-accent-foreground" />,
    dat: <FileText size={16} className="text-accent-foreground" />,
  };

  return (
    <div className="space-y-6">
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
            <input type="file" accept=".xlsx,.xls,.csv,.txt,.pdf,.dl,.net,.dat" className="hidden" onChange={handleFileInput} />
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              isDragging ? "bg-primary/15 scale-110" : "bg-muted"
            }`}>
              <Upload size={28} className={isDragging ? "text-primary" : "text-muted-foreground"} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">
                {isLoading ? "解析中..." : "拖曳檔案至此，或點擊上傳"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                支援 Excel (.xlsx/.xls)、CSV、TXT、PDF、UCINET DL (.dl/.dat)、Pajek (.net)
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {["XLSX", "XLS", "CSV", "TXT", "PDF", "DL", "NET", "DAT"].map((fmt) => (
                <Badge key={fmt} variant="secondary" className="text-xs font-mono">{fmt}</Badge>
              ))}
            </div>
          </label>
        </CardContent>
      </Card>

      <UCINETFormatInfo />

      {/* Loaded file info */}
      {state.fileName && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {fileTypeIcons[ext] || <FileText size={16} className="text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{state.fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {state.rawData.length} 筆資料 · {state.rawHeaders.length} 個欄位
                </p>
              </div>
              <Badge variant="outline" className="text-xs">已載入</Badge>
            </div>
            {state.rawHeaders.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">欄位預覽</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.rawHeaders.map((h) => (
                    <Badge key={h} variant="secondary" className="text-xs font-mono">{h}</Badge>
                  ))}
                </div>
              </div>
            )}
            {state.rawData.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border overflow-x-auto custom-scroll">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">資料預覽（前 5 筆）</p>
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {state.rawHeaders.slice(0, 6).map((h) => (
                        <th key={h} className="text-left py-1.5 px-2 text-muted-foreground font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.rawData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        {state.rawHeaders.slice(0, 6).map((h) => (
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

      {/* Column Selection + Graph Type */}
      {state.rawHeaders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Table2 size={16} className="text-primary" />
              欄位轉置設定
            </CardTitle>
            <p className="text-xs text-muted-foreground">選擇代表來源節點與目標節點的欄位，並設定圖形類型與是否含有權重。</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <ArrowLeftRight size={14} className="text-primary" />
                圖形方向性
              </label>
              <GraphTypeToggle directed={directed} onChange={setDirected} />
              <p className="text-xs text-muted-foreground">
                {directed ? "有向圖：連結具有方向性（A→B 與 B→A 視為不同邊）。" : "無向圖：連結不具方向性（A—B 與 B—A 視為同一條邊）。"}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Weight size={14} className="text-primary" />
                是否含有權重
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button onClick={() => { setWeighted(false); setWeightCol(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    !weighted ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted/50"
                  }`}>
                  無權重
                </button>
                <button onClick={() => setWeighted(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    weighted ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted/50"
                  }`}>
                  有權重
                </button>
              </div>
            </div>
            <div className={`grid gap-4 ${weighted ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">來源節點欄位 (Source)</label>
                <Select value={sourceCol} onValueChange={setSourceCol}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="選擇欄位..." /></SelectTrigger>
                  <SelectContent>
                    {state.rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">目標節點欄位 (Target)</label>
                <Select value={targetCol} onValueChange={setTargetCol}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="選擇欄位..." /></SelectTrigger>
                  <SelectContent>
                    {state.rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {weighted && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">權重欄位 (Weight)</label>
                  <Select value={weightCol} onValueChange={setWeightCol}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="選擇欄位..." /></SelectTrigger>
                    <SelectContent>
                      {state.rawHeaders.filter((h) => h !== sourceCol && h !== targetCol).map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button onClick={handleGenerateEdges} disabled={!sourceCol || !targetCol || (weighted && !weightCol)} className="w-full">
              <ArrowRight size={15} className="mr-2" />
              轉置為 Edge 格式
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edge Preview + Node Download */}
      {state.edges.length > 0 && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">目前圖形設定：</span>
            <Badge variant="secondary" className={`text-xs ${state.graphDirected ? "bg-primary/15 text-primary border-primary/30" : ""}`}>
              {state.graphDirected ? "有向圖" : "無向圖"}
            </Badge>
            <Badge variant="secondary" className={`text-xs ${state.graphWeighted ? "bg-accent/30 text-accent-foreground" : ""}`}>
              {state.graphWeighted ? `有權重（${state.weightColumn}）` : "無權重"}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {state.edges.length} 條邊 · {state.nodes.length} 個節點
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-accent-foreground" />
                    Edge 資料預覽
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={handleDownloadEdges}>
                    <Download size={13} className="mr-1.5" />
                    下載 CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scroll">
                  <div className={`grid gap-2 text-xs font-semibold text-muted-foreground pb-1.5 border-b border-border ${state.graphWeighted ? "grid-cols-3" : "grid-cols-2"}`}>
                    <span>Source</span><span>Target</span>
                    {state.graphWeighted && <span>Weight</span>}
                  </div>
                  {(previewEdges.length > 0 ? previewEdges : state.edges.slice(0, 8)).map((e, i) => (
                    <div key={i} className={`grid gap-2 text-xs py-1 hover:bg-muted/30 rounded px-1 ${state.graphWeighted ? "grid-cols-3" : "grid-cols-2"}`}>
                      <span className="font-mono text-primary truncate">{e.source}</span>
                      <span className="font-mono text-foreground/70 truncate">{e.target}</span>
                      {state.graphWeighted && <span className="font-mono text-accent-foreground/80">{(e as { weight?: number }).weight ?? "—"}</span>}
                    </div>
                  ))}
                  {state.edges.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">... 共 {state.edges.length} 條邊</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-accent-foreground" />
                  Node 資料
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{state.nodes.length} 個節點</p>
                    <p className="text-xs text-muted-foreground mt-0.5">自動從 Edge 資料生成</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleDownloadNodes}>
                    <Download size={13} className="mr-1.5" />
                    下載 CSV
                  </Button>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto custom-scroll">
                  {state.nodes.slice(0, 10).map((n) => (
                    <div key={n.id} className="flex items-center gap-2 text-xs py-1 px-2 hover:bg-muted/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-primary/60 flex-shrink-0" />
                      <span className="font-mono text-foreground/80">{n.id}</span>
                    </div>
                  ))}
                  {state.nodes.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center">... 共 {state.nodes.length} 個節點</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Node Attributes Tab ──────────────────────────────────────────────────────
function NodeAttributesTab() {
  const { state, setNodeCSV, setSelectedAttribute, setNodeLabelColumn } = useNetwork();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFormat, setLoadedFormat] = useState<string>("");
  const [pendingRows, setPendingRows] = useState<ParsedRow[]>([]);
  const [pendingHeaders, setPendingHeaders] = useState<string[]>([]);
  const [pendingIdCol, setPendingIdCol] = useState<string>("");
  const [pendingLabelCol, setPendingLabelCol] = useState<string>("");
  const hasPending = pendingHeaders.length > 0;

  const stageParsed = useCallback((rows: ParsedRow[], headers: string[], format: string) => {
    if (rows.length === 0 || headers.length === 0) { toast.error("檔案內容為空或無法解析"); return; }
    const guessId = headers.find((h) =>
      ["id", "node", "ID", "Node", "NODE", "name", "Name", "NAME", "actor", "Actor"].includes(h)
    ) ?? headers[0];
    setPendingRows(rows);
    setPendingHeaders(headers);
    setPendingIdCol(guessId);
    setPendingLabelCol("");
    setLoadedFormat(format);
  }, []);

  const commitImport = useCallback(() => {
    if (!pendingIdCol) { toast.error("請選擇節點識別碼欄位"); return; }
    const nodes = pendingRows.map((row) => ({ ...row, id: String(row[pendingIdCol] ?? "") }));
    const attrCount = pendingHeaders.filter((h) => h !== pendingIdCol).length;
    setNodeCSV(nodes, pendingHeaders, pendingIdCol);
    if (pendingLabelCol && pendingLabelCol !== pendingIdCol) {
      setNodeLabelColumn(pendingLabelCol);
    } else {
      setNodeLabelColumn("");
    }
    toast.success(`成功匯入 ${nodes.length} 筆節點資料，共 ${attrCount} 個屬性欄位`);
    setPendingRows([]); setPendingHeaders([]); setPendingIdCol(""); setPendingLabelCol("");
  }, [pendingRows, pendingHeaders, pendingIdCol, pendingLabelCol, setNodeCSV, setNodeLabelColumn]);

  const parseNodeFile = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (ext === "csv" || ext === "txt") {
        const text = await file.text();
        if (ext === "txt" && isUCINETFile(file.name, text.slice(0, 300))) {
          const uciResult = parseUCINET(text, file.name);
          if (uciResult.warnings.length > 0) uciResult.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));
          if (uciResult.nodes.length > 0) {
            const rows: ParsedRow[] = uciResult.nodes.map((n) => ({ id: n.id }));
            stageParsed(rows, ["id"], uciResult.format);
            toast.info(`已從 ${uciResult.format} 格式提取 ${uciResult.nodes.length} 個節點。`, { duration: 6000 });
            setIsLoading(false);
            return;
          }
        }
        const result = Papa.parse<ParsedRow>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
        stageParsed(result.data, result.meta.fields || [], ext.toUpperCase());
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: "" });
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        stageParsed(rows, headers, ext.toUpperCase());
      } else if (ext === "pdf") {
        const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
        const buf = await file.arrayBuffer();
        const pdf = await getDocument({ data: buf }).promise;
        let allText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          allText += content.items.map((item: unknown) => (item as { str: string }).str).join(" ") + "\n";
        }
        const lines = allText.split("\n").filter((l) => l.trim());
        if (lines.length < 2) { toast.error("無法從 PDF 中解析出表格資料"); setIsLoading(false); return; }
        const sep = lines[0].includes(",") ? "," : lines[0].includes("\t") ? "\t" : " ";
        const headers = lines[0].split(sep).map((h) => h.trim());
        const rows = lines.slice(1).map((line) => {
          const vals = line.split(sep).map((v) => v.trim());
          const row: ParsedRow = {};
          headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
          return row;
        });
        stageParsed(rows, headers, "PDF");
      } else if (ext === "dl" || ext === "net" || ext === "dat") {
        const text = await file.text();
        const uciResult = parseUCINET(text, file.name);
        if (uciResult.warnings.length > 0) uciResult.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));
        if (uciResult.nodes.length === 0) { toast.error("無法從此 UCINET 檔案中解析出節點清單"); setIsLoading(false); return; }
        const rows: ParsedRow[] = uciResult.nodes.map((n) => ({ id: n.id }));
        stageParsed(rows, ["id"], uciResult.format);
        toast.info(`已從 ${uciResult.format} 格式提取 ${uciResult.nodes.length} 個節點。`, { duration: 6000 });
      } else {
        toast.error("不支援的檔案格式");
      }
    } catch (err) {
      console.error(err);
      toast.error("檔案解析失敗，請確認格式是否正確");
    } finally {
      setIsLoading(false);
    }
  }, [stageParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseNodeFile(file);
  }, [parseNodeFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseNodeFile(file);
    e.target.value = "";
  }, [parseNodeFile]);

  const attrHeaders = state.nodeCSVHeaders.filter((h) => h !== state.nodeIdColumn);
  const attrColors = [
    "bg-primary/10 text-primary border-primary/20",
    "bg-accent/70 text-accent-foreground border-accent",
    "bg-secondary text-secondary-foreground border-border",
    "bg-primary/15 text-primary border-primary/25",
    "bg-accent/50 text-accent-foreground border-accent/70",
    "bg-muted text-muted-foreground border-border",
  ];
  const fileTypeIcons: Record<string, React.ReactNode> = {
    XLSX: <FileSpreadsheet size={16} className="text-accent-foreground" />,
    XLS: <FileSpreadsheet size={16} className="text-accent-foreground" />,
    CSV: <Table2 size={16} className="text-primary" />,
    TXT: <FileText size={16} className="text-muted-foreground" />,
    PDF: <FileText size={16} className="text-primary" />,
    "DL (fullmatrix)": <FileText size={16} className="text-accent-foreground" />,
    "DL (edgelist1)": <FileText size={16} className="text-accent-foreground" />,
    "DL (nodelist1)": <FileText size={16} className="text-accent-foreground" />,
    "Pajek (.net)": <FileText size={16} className="text-accent-foreground" />,
  };

  return (
    <div className="space-y-6">
      {/* No edges warning */}
      {state.edges.length === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Info size={16} className="text-primary flex-shrink-0" />
            <p className="text-sm text-foreground/70">請先完成「Edge 匯入」頁籤，生成 Edge 資料後再匯入節點屬性。</p>
          </CardContent>
        </Card>
      )}

      <NodeFormatInfo />

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
            <input type="file" accept=".xlsx,.xls,.csv,.txt,.pdf,.dl,.net,.dat" className="hidden" onChange={handleFileInput} />
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              isDragging ? "bg-primary/15 scale-110" : "bg-muted"
            }`}>
              <Upload size={24} className={isDragging ? "text-primary" : "text-muted-foreground"} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">{isLoading ? "解析中..." : "拖曳檔案至此，或點擊上傳"}</p>
              <p className="text-sm text-muted-foreground mt-1">支援 Excel、CSV、TXT、PDF、UCINET DL、Pajek .net 格式</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {["XLSX", "XLS", "CSV", "TXT", "PDF", "DL", "NET", "DAT"].map((fmt) => (
                <Badge key={fmt} variant="secondary" className="text-xs font-mono">{fmt}</Badge>
              ))}
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Pending: Column Selection */}
      {hasPending && (
        <Card className="border-primary/40 bg-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database size={16} className="text-primary" />
              欄位設定
              <Badge className="text-xs bg-primary/20 text-primary border-primary/30 ml-1">
                {pendingRows.length} 筆資料 · {pendingHeaders.length} 個欄位
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">偵測到的欄位</p>
              <div className="flex flex-wrap gap-1.5">
                {pendingHeaders.map((h) => (
                  <Badge key={h} variant={h === pendingIdCol ? "default" : "secondary"}
                    className={cn(
                      "text-xs font-mono cursor-pointer transition-all",
                      h === pendingIdCol && "bg-primary/20 text-primary border-primary/30",
                      h === pendingLabelCol && h !== pendingIdCol && "bg-accent/60 text-accent-foreground border-accent"
                    )}>
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-primary" />
                  <p className="text-sm font-semibold text-foreground">節點識別碼（Node Name）</p>
                </div>
                <p className="text-xs text-muted-foreground">用於與 Edge 資料比對的唯一識別欄位。</p>
                <Select value={pendingIdCol} onValueChange={setPendingIdCol}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="選擇識別碼欄位..." /></SelectTrigger>
                  <SelectContent>
                    {pendingHeaders.map((h) => (
                      <SelectItem key={h} value={h}>
                        <span className="font-mono">{h}</span>
                        <span className="text-muted-foreground ml-2 text-xs">— 範例：{String(pendingRows[0]?.[h] ?? "")}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-primary" />
                  <p className="text-sm font-semibold text-foreground">節點顯示標籤（Node Label）</p>
                </div>
                <p className="text-xs text-muted-foreground">網絡圖上節點旁顯示的文字。</p>
                <Select value={pendingLabelCol || "__same_as_id__"}
                  onValueChange={(v) => setPendingLabelCol(v === "__same_as_id__" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="選擇標籤欄位..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__same_as_id__">（預設）與識別碼相同</SelectItem>
                    {pendingHeaders.map((h) => (
                      <SelectItem key={h} value={h}>
                        <span className="font-mono">{h}</span>
                        <span className="text-muted-foreground ml-2 text-xs">— 範例：{String(pendingRows[0]?.[h] ?? "")}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <p className="text-xs text-muted-foreground">確認後，其餘欄位將作為屬性供視覺化選擇。</p>
              <Button onClick={commitImport} disabled={!pendingIdCol} className="gap-2">
                <CheckCircle2 size={15} />
                確認匯入
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Imported: Summary + Attribute Selection */}
      {state.nodeCSVHeaders.length > 0 && !hasPending && (
        <>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {fileTypeIcons[loadedFormat] ?? <BarChart3 size={16} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">節點屬性資料已載入</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {state.nodeCSV.length} 筆節點 · {attrHeaders.length} 個屬性欄位
                    {loadedFormat && ` · ${loadedFormat} 格式`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">已載入</Badge>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => {
                      setPendingRows(state.nodeCSV);
                      setPendingHeaders(state.nodeCSVHeaders);
                      setPendingIdCol(state.nodeIdColumn);
                      setPendingLabelCol(state.nodeLabelColumn);
                    }}>
                    <RefreshCw size={12} />
                    重新設定欄位
                  </Button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Key size={11} /> 節點識別碼
                  </p>
                  <Badge className="text-xs font-mono bg-primary/15 text-primary border-primary/30">{state.nodeIdColumn}</Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Tag size={11} /> 節點標籤
                  </p>
                  <Badge className="text-xs font-mono bg-accent/60 text-accent-foreground border-accent">
                    {state.nodeLabelColumn || `（預設）${state.nodeIdColumn}`}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">屬性欄位</p>
                <div className="flex flex-wrap gap-1.5">
                  {attrHeaders.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">無額外屬性欄位</p>
                  ) : (
                    attrHeaders.map((h) => (
                      <Badge key={h} variant="secondary" className="text-xs font-mono">{h}</Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-accent-foreground" />
                  選擇視覺化屬性
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Database size={13} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {state.nodeCSV.length} 筆節點資料 · {attrHeaders.length} 個屬性
                  </span>
                </div>
                {attrHeaders.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-2">此檔案僅包含節點識別碼，無額外屬性欄位。</p>
                ) : (
                  <div className="space-y-1.5">
                    {attrHeaders.map((attr, i) => (
                      <button key={attr} onClick={() => setSelectedAttribute(attr)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150",
                          state.selectedAttribute === attr
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        )}>
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                          state.selectedAttribute === attr ? "bg-primary" : "bg-muted-foreground/30")} />
                        <span className="text-sm font-medium text-foreground flex-1">{attr}</span>
                        {state.selectedAttribute === attr && (
                          <Badge className={cn("text-xs border", attrColors[i % attrColors.length])}>套用中</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Table2 size={16} className="text-muted-foreground" />
                  節點資料預覽
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 px-2 text-muted-foreground font-semibold">{state.nodeIdColumn}</th>
                        {state.nodeLabelColumn && state.nodeLabelColumn !== state.nodeIdColumn && (
                          <th className="text-left py-1.5 px-2 text-muted-foreground font-semibold">{state.nodeLabelColumn}</th>
                        )}
                        {attrHeaders.slice(0, 3).map((h) => (
                          <th key={h} className={cn("text-left py-1.5 px-2 font-semibold",
                            state.selectedAttribute === h ? "text-primary" : "text-muted-foreground")}>
                            {h}{state.selectedAttribute === h ? " ★" : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.nodeCSV.slice(0, 8).map((node, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-1.5 px-2 font-mono text-foreground">{String(node[state.nodeIdColumn] ?? node.id ?? "")}</td>
                          {state.nodeLabelColumn && state.nodeLabelColumn !== state.nodeIdColumn && (
                            <td className="py-1.5 px-2 text-foreground">{String(node[state.nodeLabelColumn] ?? "")}</td>
                          )}
                          {attrHeaders.slice(0, 3).map((h) => (
                            <td key={h} className="py-1.5 px-2 text-foreground/80">{String(node[h] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {state.nodeCSV.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">... 共 {state.nodeCSV.length} 筆</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DataImport() {
  const { state } = useNetwork();
  const [, navigate] = useLocation();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">資料匯入</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          上傳 Edge 資料建立網絡，並可選擇性匯入節點屬性檔案以豐富分析內容。
        </p>
      </div>

      <Tabs defaultValue="edge" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edge" className="flex items-center gap-2">
            <Table2 size={14} />
            Edge 匯入
            {state.edges.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{state.edges.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="node" className="flex items-center gap-2">
            <Database size={14} />
            Node 屬性
            {state.nodeCSVHeaders.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{state.nodeCSV.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="edge" className="mt-6">
          <EdgeImportTab />
        </TabsContent>
        <TabsContent value="node" className="mt-6">
          <NodeAttributesTab />
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      {state.edges.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {state.nodeCSVHeaders.length === 0
              ? "可直接前往網絡繪製，或先在「Node 屬性」頁籤匯入屬性"
              : state.nodeLabelColumn
              ? `識別碼：${state.nodeIdColumn}・標籤：${state.nodeLabelColumn}${state.selectedAttribute ? `・屬性：${state.selectedAttribute}` : ""}`
              : state.selectedAttribute
              ? `識別碼：${state.nodeIdColumn}・屬性：${state.selectedAttribute}`
              : `已載入 ${state.edges.length} 條邊，${state.nodes.length} 個節點`}
          </p>
          <Button onClick={() => navigate("/visualize")} className="gap-2">
            {state.nodeCSVHeaders.length === 0 ? "前往網絡繪製" : "下一步：網絡繪製"}
            <ArrowRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
