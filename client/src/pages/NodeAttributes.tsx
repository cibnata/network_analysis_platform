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
  ChevronDown,
  Database,
  FileSpreadsheet,
  FileText,
  Info,
  Key,
  Table2,
  Upload,
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { parseUCINET, isUCINETFile } from "@/lib/ucinetParser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ParsedRow = Record<string, unknown>;

// ─── Candidate ID column names (auto-detect priority) ─────────────────────────
const ID_CANDIDATES = ["id", "ID", "node", "Node", "NODE", "name", "Name", "NAME", "節點", "節點名稱", "姓名", "actor", "Actor"];

function guessIdColumn(headers: string[]): string | undefined {
  return headers.find((h) => ID_CANDIDATES.includes(h)) ?? headers[0];
}

// ─── Format Info Panel ────────────────────────────────────────────────────────
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
            上傳後系統會自動偵測所有欄位名稱，並讓您選擇哪個欄位作為<strong>節點識別碼（Node Name）</strong>，其餘欄位均視為屬性。
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground flex items-center gap-2">
                <FileSpreadsheet size={13} className="text-accent-foreground" />
                Excel / CSV / TXT 格式
              </p>
              <pre className="text-xs font-mono text-primary/80 bg-primary/5 p-2 rounded overflow-x-auto">{`person_id,姓名,類型,組織,地區
A001,張三,嫌疑人,幫派甲,北區
A002,李四,關係人,幫派甲,南區
A003,王五,目擊者,無,東區`}</pre>
              <p className="text-muted-foreground">第一列為欄位名稱，上傳後可自由選擇任意欄位作為節點識別碼。</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground flex items-center gap-2">
                <FileText size={13} className="text-accent-foreground" />
                UCINET DL / Pajek .net 格式
              </p>
              <p className="text-muted-foreground leading-relaxed">
                UCINET 與 Pajek 格式本身不含屬性欄位，上傳後系統將自動解析節點清單，
                以節點名稱填入 <code className="bg-muted px-1 rounded font-mono">id</code> 欄位。
                如需加入屬性，請另外準備 CSV 檔案。
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground flex items-center gap-2">
                <FileText size={13} className="text-muted-foreground" />
                PDF 格式
              </p>
              <p className="text-muted-foreground leading-relaxed">
                系統將嘗試從 PDF 中提取表格文字，並以第一列作為欄位名稱解析。
                建議 PDF 內容為純文字表格，掃描版 PDF 可能無法正確解析。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NodeAttributes() {
  const { state, setNodeCSV, setSelectedAttribute } = useNetwork();
  const [, navigate] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFormat, setLoadedFormat] = useState<string>("");

  // Staging state: raw parsed rows + headers before user confirms ID column
  const [stagingRows, setStagingRows] = useState<ParsedRow[] | null>(null);
  const [stagingHeaders, setStagingHeaders] = useState<string[]>([]);
  const [stagingFormat, setStagingFormat] = useState<string>("");
  const [selectedIdCol, setSelectedIdCol] = useState<string>("");

  // ── Commit: apply selected ID column and finalize import ──────────────────
  const commitImport = useCallback(() => {
    if (!stagingRows || !selectedIdCol) return;
    if (stagingRows.length === 0) {
      toast.error("檔案內容為空");
      return;
    }
    const nodes = stagingRows.map((row) => ({
      ...row,
      id: String(row[selectedIdCol] ?? ""),
    }));
    setNodeCSV(nodes, stagingHeaders, selectedIdCol);
    setLoadedFormat(stagingFormat);
    const attrCount = stagingHeaders.filter((h) => h !== selectedIdCol).length;
    toast.success(`成功匯入 ${nodes.length} 筆節點資料，節點識別碼：${selectedIdCol}，共 ${attrCount} 個屬性欄位`);
    // Clear staging
    setStagingRows(null);
    setStagingHeaders([]);
    setStagingFormat("");
  }, [stagingRows, stagingHeaders, stagingFormat, selectedIdCol, setNodeCSV]);

  // ── Stage raw rows (before user picks ID column) ──────────────────────────
  const stageRows = useCallback((rows: ParsedRow[], headers: string[], fmt: string) => {
    if (rows.length === 0 || headers.length === 0) {
      toast.error("檔案內容為空或無法解析");
      return;
    }
    setStagingRows(rows);
    setStagingHeaders(headers);
    setStagingFormat(fmt);
    // Auto-guess ID column
    const guess = guessIdColumn(headers);
    setSelectedIdCol(guess ?? headers[0]);
  }, []);

  // ── Parse file ────────────────────────────────────────────────────────────
  const parseNodeFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      // Reset previous staging
      setStagingRows(null);
      setStagingHeaders([]);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

        // ── CSV / TXT ────────────────────────────────────────────────────────
        if (ext === "csv" || ext === "txt") {
          const text = await file.text();
          if (ext === "txt" && isUCINETFile(file.name, text.slice(0, 300))) {
            const uciResult = parseUCINET(text, file.name);
            if (uciResult.warnings.length > 0)
              uciResult.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));
            if (uciResult.nodes.length > 0) {
              const rows: ParsedRow[] = uciResult.nodes.map((n) => ({ id: n.id }));
              stageRows(rows, ["id"], uciResult.format);
              toast.info(`已從 ${uciResult.format} 格式提取 ${uciResult.nodes.length} 個節點。`, { duration: 5000 });
              setIsLoading(false);
              return;
            }
          }
          const result = Papa.parse<ParsedRow>(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
          });
          stageRows(result.data, result.meta.fields || [], ext.toUpperCase());
        }

        // ── Excel ────────────────────────────────────────────────────────────
        else if (ext === "xlsx" || ext === "xls") {
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: "" });
          const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
          stageRows(rows, headers, ext.toUpperCase());
        }

        // ── PDF ──────────────────────────────────────────────────────────────
        else if (ext === "pdf") {
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
          if (lines.length < 2) {
            toast.error("無法從 PDF 中解析出表格資料，請確認 PDF 包含結構化文字。");
            setIsLoading(false);
            return;
          }
          const sep = lines[0].includes(",") ? "," : lines[0].includes("\t") ? "\t" : " ";
          const headers = lines[0].split(sep).map((h) => h.trim());
          const rows = lines.slice(1).map((line) => {
            const vals = line.split(sep).map((v) => v.trim());
            const row: ParsedRow = {};
            headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
            return row;
          });
          stageRows(rows, headers, "PDF");
        }

        // ── UCINET DL / Pajek .net / .dat ────────────────────────────────────
        else if (ext === "dl" || ext === "net" || ext === "dat") {
          const text = await file.text();
          const uciResult = parseUCINET(text, file.name);
          if (uciResult.warnings.length > 0)
            uciResult.warnings.forEach((w) => toast.warning(w, { duration: 8000 }));
          if (uciResult.nodes.length === 0) {
            toast.error("無法從此 UCINET 檔案中解析出節點清單");
            setIsLoading(false);
            return;
          }
          const rows: ParsedRow[] = uciResult.nodes.map((n) => ({ id: n.id }));
          stageRows(rows, ["id"], uciResult.format);
          toast.info(`已從 ${uciResult.format} 格式提取 ${uciResult.nodes.length} 個節點。如需加入屬性，請另外準備 CSV 檔案。`, { duration: 6000 });
        }

        // ── 不支援的格式 ──────────────────────────────────────────────────────
        else {
          toast.error("不支援的檔案格式，請使用 Excel、CSV、TXT、PDF、DL 或 NET 格式");
        }
      } catch (err) {
        console.error(err);
        toast.error("檔案解析失敗，請確認格式是否正確");
      } finally {
        setIsLoading(false);
      }
    },
    [stageRows]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) parseNodeFile(file);
    },
    [parseNodeFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseNodeFile(file);
      e.target.value = "";
    },
    [parseNodeFile]
  );

  // Use the explicitly stored nodeIdColumn from context
  const committedIdCol = state.nodeIdColumn || state.nodeCSVHeaders[0] || "id";
  const attrHeaders = state.nodeCSVHeaders.filter((h) => h !== committedIdCol && h !== "id");

  // Color palette for attribute badges
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

  // Preview: use staging rows if available, else committed
  const previewRows = stagingRows ?? state.nodeCSV;
  const previewHeaders = stagingRows ? stagingHeaders : state.nodeCSVHeaders;
  const previewIdCol = stagingRows ? selectedIdCol : (committedIdCol || "id");
  const previewAttrHeaders = previewHeaders.filter((h) => h !== previewIdCol && h !== "id");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Node 屬性管理</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          匯入節點屬性檔案，選擇節點識別碼欄位，並設定要套用於視覺化的屬性。
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

      {/* Format Info */}
      <NodeFormatInfo />

      {/* Upload Zone */}
      <Card
        className="border-2 border-dashed transition-all duration-200 hover:border-primary/40"
        style={{ borderColor: isDragging ? "var(--primary)" : undefined }}
      >
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
              accept=".xlsx,.xls,.csv,.txt,.pdf,.dl,.net,.dat"
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
                {isLoading ? "解析中..." : "拖曳檔案至此，或點擊上傳"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                支援 Excel、CSV、TXT、PDF、UCINET DL、Pajek .net 格式
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

      {/* ── STAGING: ID Column Selector ─────────────────────────────────────── */}
      {stagingRows && (
        <Card className="border-primary/30 bg-primary/3 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key size={16} className="text-primary" />
              設定節點識別碼欄位（Node Name）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground/70">
              已偵測到 <strong>{stagingHeaders.length}</strong> 個欄位，共 <strong>{stagingRows.length}</strong> 筆資料。
              請選擇哪個欄位作為節點識別碼（Node Name），其餘欄位將作為屬性。
            </p>

            {/* Column selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-foreground whitespace-nowrap">節點識別碼欄位：</label>
              <Select value={selectedIdCol} onValueChange={setSelectedIdCol}>
                <SelectTrigger className="w-56 bg-background">
                  <SelectValue placeholder="選擇欄位" />
                  <ChevronDown size={14} className="text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  {stagingHeaders.map((h) => (
                    <SelectItem key={h} value={h}>
                      <span className="font-mono">{h}</span>
                      {ID_CANDIDATES.includes(h) && (
                        <span className="ml-2 text-xs text-primary">（建議）</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview of selected ID column values */}
            {selectedIdCol && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  欄位 <code className="font-mono bg-muted px-1 rounded">{selectedIdCol}</code> 的前 5 筆值：
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {stagingRows.slice(0, 5).map((row, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono">
                      {String(row[selectedIdCol] ?? "(空)")}
                    </Badge>
                  ))}
                  {stagingRows.length > 5 && (
                    <Badge variant="secondary" className="text-xs">+{stagingRows.length - 5} 筆</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Remaining attributes preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">其餘欄位（將作為屬性）：</p>
              <div className="flex flex-wrap gap-1.5">
                {stagingHeaders
                  .filter((h) => h !== selectedIdCol)
                  .map((h, i) => (
                    <Badge key={h} className={cn("text-xs font-mono border", attrColors[i % attrColors.length])}>
                      {h}
                    </Badge>
                  ))}
                {stagingHeaders.filter((h) => h !== selectedIdCol).length === 0 && (
                  <span className="text-xs text-muted-foreground italic">無其他屬性欄位</span>
                )}
              </div>
            </div>

            {/* Confirm button */}
            <div className="flex gap-2 pt-1">
              <Button onClick={commitImport} disabled={!selectedIdCol} className="gap-2">
                <CheckCircle2 size={15} />
                確認匯入
              </Button>
              <Button
                variant="outline"
                onClick={() => { setStagingRows(null); setStagingHeaders([]); setStagingFormat(""); }}
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── COMMITTED: Imported attributes ──────────────────────────────────── */}
      {!stagingRows && state.nodeCSVHeaders.length > 0 && (
        <>
          {/* Loaded file summary */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {fileTypeIcons[loadedFormat] ?? <BarChart3 size={16} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">節點屬性資料已載入</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {state.nodeCSV.length} 筆節點 · 識別碼欄位：
                    <code className="font-mono bg-muted px-1 rounded mx-1">{committedIdCol || "id"}</code>
                    · {attrHeaders.length} 個屬性欄位
                    {loadedFormat && ` · ${loadedFormat} 格式`}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">已載入</Badge>
              </div>
              {/* All headers preview */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">欄位預覽</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.nodeCSVHeaders.map((h, i) => {
                    const isId = h === committedIdCol || h === "id";
                    return (
                      <Badge
                        key={h}
                        variant={isId ? "default" : "secondary"}
                        className={cn("text-xs font-mono", isId && "bg-primary/20 text-primary border-primary/30")}
                      >
                        {isId ? "🔑 " : ""}{h}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* Attribute selection */}
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
                  <p className="text-xs text-muted-foreground italic p-2">
                    此檔案僅包含節點識別碼，無額外屬性欄位。如需屬性，請重新上傳含屬性欄位的 CSV 檔案。
                  </p>
                ) : (
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
                )}
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
                        <th className="text-left py-1.5 px-2 text-primary font-semibold">
                          🔑 {committedIdCol || "id"}
                        </th>
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
        </>
      )}

      {/* ── Staging preview (while user picks ID column) ─────────────────────── */}
      {stagingRows && previewRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Table2 size={16} className="text-primary" />
              資料預覽（尚未確認匯入）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto custom-scroll">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-border">
                    {previewHeaders.slice(0, 6).map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "text-left py-1.5 px-2 font-semibold",
                          h === selectedIdCol ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {h === selectedIdCol ? "🔑 " : ""}{h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 6).map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      {previewHeaders.slice(0, 6).map((h) => (
                        <td
                          key={h}
                          className={cn(
                            "py-1.5 px-2 truncate max-w-[100px]",
                            h === selectedIdCol ? "font-mono text-primary/80 font-medium" : "text-foreground/70"
                          )}
                        >
                          {String(row[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 6 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  ... 共 {previewRows.length} 筆
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {state.edges.length > 0 && !stagingRows && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {state.nodeCSVHeaders.length === 0
              ? "可跳過此步驟，直接進行網絡繪製"
              : state.selectedAttribute
              ? `已選擇屬性：${state.selectedAttribute}`
              : "請選擇要套用的屬性，或直接前往繪製"}
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
