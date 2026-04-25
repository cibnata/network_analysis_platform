import { useNetwork } from "@/contexts/NetworkContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Table2,
  Upload,
  ArrowLeftRight,
  ArrowRight as ArrowRightIcon,
  Weight,
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useLocation } from "wouter";
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
              <p className="text-muted-foreground">適用於小型網絡，完整輸入鄰接矩陣。</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground">DL Edgelist1 格式</p>
              <pre className="text-xs font-mono text-primary/80 bg-primary/5 p-2 rounded overflow-x-auto">{`dl n=5 format=edgelist1
labels embedded:
data:
Alice Bob 3
Bob Carol 4
Bob Dan 5
Carol Dan 7`}</pre>
              <p className="text-muted-foreground">適用於稀疏網絡，只輸入存在的連結。可附加權重。</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground">DL Nodelist1 格式</p>
              <pre className="text-xs font-mono text-primary/80 bg-primary/5 p-2 rounded overflow-x-auto">{`dl n=4 format=nodelist1
labels embedded:
data:
Alice Bob Carol
Bob Alice
Carol Alice Dan
Dan Carol`}</pre>
              <p className="text-muted-foreground">每行第一個節點與後續節點相連。</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground">Pajek .net 格式</p>
              <pre className="text-xs font-mono text-primary/80 bg-primary/5 p-2 rounded overflow-x-auto">{`*Vertices 4
1 "Alice"
2 "Bob"
3 "Carol"
4 "Dan"
*Edges
1 2 3
2 3 4
3 4 7`}</pre>
              <p className="text-muted-foreground">Pajek 軟體標準格式，支援 *Edges（無向）與 *Arcs（有向）。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Graph Type Toggle ────────────────────────────────────────────────────────
function GraphTypeToggle({
  directed,
  onChange,
}: {
  directed: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => onChange(false)}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
          !directed
            ? "bg-primary text-primary-foreground"
            : "bg-card text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <ArrowLeftRight size={14} />
        無向圖
      </button>
      <button
        onClick={() => onChange(true)}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
          directed
            ? "bg-primary text-primary-foreground"
            : "bg-card text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <ArrowRightIcon size={14} />
        有向圖
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DataImport() {
  const { state, setRawData, setEdges } = useNetwork();
  const [, navigate] = useLocation();
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
            if (uciResult.warnings.length > 0) {
              uciResult.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));
            }
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
          const result = Papa.parse<ParsedRow>(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
          });
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
            toast.error("無法從 PDF 中解析出表格資料，請確認 PDF 包含結構化文字。");
            setIsLoading(false);
            return;
          }
        } else if (ext === "dl" || ext === "net" || ext === "dat") {
          const text = await file.text();
          const result = parseUCINET(text, file.name);
          if (result.warnings.length > 0) {
            result.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));
          }
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
          const text = await file.text();
          if (isUCINETFile(file.name, text.slice(0, 200))) {
            const result = parseUCINET(text, file.name);
            if (result.warnings.length > 0) {
              result.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));
            }
            if (result.edges.length > 0) {
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
            }
          }
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
        setSourceCol("");
        setTargetCol("");
        setWeightCol("");
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
      e.target.value = "";
    },
    [parseFile]
  );

  const handleGenerateEdges = useCallback(() => {
    if (!sourceCol || !targetCol) {
      toast.error("請選擇來源節點與目標節點欄位");
      return;
    }
    if (sourceCol === targetCol) {
      toast.error("來源欄位與目標欄位不能相同");
      return;
    }
    if (weighted && !weightCol) {
      toast.error("已選擇有權重，請選擇權重欄位");
      return;
    }
    const edges = state.rawData
      .filter((row) => row[sourceCol] && row[targetCol])
      .map((row) => ({
        source: String(row[sourceCol]),
        target: String(row[targetCol]),
        ...(weighted && weightCol
          ? { weight: parseFloat(String(row[weightCol] ?? "1")) || 1 }
          : {}),
      }));
    if (edges.length === 0) {
      toast.error("無法生成有效的 Edge 資料，請確認欄位值不為空");
      return;
    }
    setEdges(edges, sourceCol, targetCol, directed, weighted, weighted ? weightCol : "");
    setPreviewEdges(edges.slice(0, 8));
    const nodeCount = new Set([...edges.map((e) => e.source), ...edges.map((e) => e.target)]).size;
    toast.success(
      `已生成 ${edges.length} 條${directed ? "有向" : "無向"}${weighted ? "加權" : ""}邊，${nodeCount} 個節點`
    );
  }, [sourceCol, targetCol, weightCol, directed, weighted, state.rawData, setEdges]);

  const handleDownloadNodes = useCallback(() => {
    if (state.nodes.length === 0) {
      toast.error("尚未生成節點資料");
      return;
    }
    downloadCSV(state.nodes, "node_data.csv");
    toast.success("節點資料已下載");
  }, [state.nodes]);

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

  const ext = state.fileName.split(".").pop()?.toLowerCase() || "";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">資料匯入</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          上傳您的資料檔案，選擇欄位轉置為網絡 Edge 格式，並自動生成節點清單。
        </p>
      </div>

      {/* Upload Zone */}
      <Card
        className="border-2 border-dashed transition-all duration-200 hover:border-primary/40"
        style={{ borderColor: isDragging ? "var(--primary)" : undefined }}
      >
        <CardContent className="p-0">
          <label
            className={`flex flex-col items-center justify-center gap-4 p-12 cursor-pointer rounded-xl transition-all duration-200 ${
              isDragging ? "bg-primary/5" : "hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt,.pdf,.dl,.net,.dat"
              className="hidden"
              onChange={handleFileInput}
            />
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

      {/* UCINET Format Info */}
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
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  資料預覽（前 5 筆）
                </p>
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
            <p className="text-xs text-muted-foreground">
              選擇代表來源節點與目標節點的欄位，並設定圖形類型與是否含有權重。
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Graph type: directed / undirected */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <ArrowLeftRight size={14} className="text-primary" />
                圖形方向性
              </label>
              <GraphTypeToggle directed={directed} onChange={setDirected} />
              <p className="text-xs text-muted-foreground">
                {directed
                  ? "有向圖：連結具有方向性（A→B 與 B→A 視為不同邊），圖上顯示箭頭。"
                  : "無向圖：連結不具方向性（A—B 與 B—A 視為同一條邊）。"}
              </p>
            </div>

            {/* Weighted toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Weight size={14} className="text-primary" />
                是否含有權重
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => { setWeighted(false); setWeightCol(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    !weighted
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  無權重
                </button>
                <button
                  onClick={() => setWeighted(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    weighted
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  有權重
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {weighted
                  ? "有權重：邊具有數值強度，視覺化時邊的粗細將依權重縮放。"
                  : "無權重：所有邊視為等強度。"}
              </p>
            </div>

            {/* Source / Target / Weight columns */}
            <div className={`grid gap-4 ${weighted ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">來源節點欄位 (Source)</label>
                <Select value={sourceCol} onValueChange={setSourceCol}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="選擇欄位..." />
                  </SelectTrigger>
                  <SelectContent>
                    {state.rawHeaders.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">目標節點欄位 (Target)</label>
                <Select value={targetCol} onValueChange={setTargetCol}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="選擇欄位..." />
                  </SelectTrigger>
                  <SelectContent>
                    {state.rawHeaders.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {weighted && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">權重欄位 (Weight)</label>
                  <Select value={weightCol} onValueChange={setWeightCol}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="選擇欄位..." />
                    </SelectTrigger>
                    <SelectContent>
                      {state.rawHeaders
                        .filter((h) => h !== sourceCol && h !== targetCol)
                        .map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerateEdges}
              disabled={!sourceCol || !targetCol || (weighted && !weightCol)}
              className="w-full"
            >
              <ArrowRight size={15} className="mr-2" />
              轉置為 Edge 格式
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edge Preview + Node Download */}
      {state.edges.length > 0 && (
        <>
          {/* Graph properties badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">目前圖形設定：</span>
            <Badge
              variant="secondary"
              className={`text-xs ${state.graphDirected ? "bg-primary/15 text-primary border-primary/30" : ""}`}
            >
              {state.graphDirected ? "有向圖" : "無向圖"}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-xs ${state.graphWeighted ? "bg-accent/30 text-accent-foreground" : ""}`}
            >
              {state.graphWeighted ? `有權重（${state.weightColumn}）` : "無權重"}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {state.edges.length} 條邊 · {state.nodes.length} 個節點
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Edge preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-accent-foreground" />
                  Edge 資料預覽
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scroll">
                  <div className={`grid gap-2 text-xs font-semibold text-muted-foreground pb-1.5 border-b border-border ${state.graphWeighted ? "grid-cols-3" : "grid-cols-2"}`}>
                    <span>Source</span>
                    <span>Target</span>
                    {state.graphWeighted && <span>Weight</span>}
                  </div>
                  {(previewEdges.length > 0 ? previewEdges : state.edges.slice(0, 8)).map((e, i) => (
                    <div key={i} className={`grid gap-2 text-xs py-1 hover:bg-muted/30 rounded px-1 ${state.graphWeighted ? "grid-cols-3" : "grid-cols-2"}`}>
                      <span className="font-mono text-primary truncate">{e.source}</span>
                      <span className="font-mono text-foreground/70 truncate">{e.target}</span>
                      {state.graphWeighted && (
                        <span className="font-mono text-accent-foreground/80">{(e as { weight?: number }).weight ?? "—"}</span>
                      )}
                    </div>
                  ))}
                  {state.edges.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      ... 共 {state.edges.length} 條邊
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Node data */}
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

      {/* Next Step */}
      {state.edges.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => navigate("/attributes")} className="gap-2">
            下一步：屬性管理
            <ArrowRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
