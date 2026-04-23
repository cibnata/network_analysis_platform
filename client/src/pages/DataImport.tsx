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
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useLocation } from "wouter";

type ParsedRow = Record<string, unknown>;

function downloadCSV(data: ParsedRow[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataImport() {
  const { state, setRawData, setEdges } = useNetwork();
  const [, navigate] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceCol, setSourceCol] = useState<string>("");
  const [targetCol, setTargetCol] = useState<string>("");
  const [previewEdges, setPreviewEdges] = useState<{ source: string; target: string }[]>([]);

  const parseFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        let rows: ParsedRow[] = [];
        let headers: string[] = [];

        if (ext === "csv" || ext === "txt") {
          const text = await file.text();
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
          // PDF text extraction using pdfjs-dist
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
          // Try to parse as CSV-like text
          const lines = allText.split("\n").filter((l) => l.trim());
          if (lines.length > 1) {
            const sep = lines[0].includes(",") ? "," : lines[0].includes("\t") ? "\t" : " ";
            headers = lines[0].split(sep).map((h) => h.trim());
            rows = lines.slice(1).map((line) => {
              const vals = line.split(sep).map((v) => v.trim());
              const row: ParsedRow = {};
              headers.forEach((h, i) => {
                row[h] = vals[i] ?? "";
              });
              return row;
            });
          } else {
            toast.error("無法從 PDF 中解析出表格資料，請確認 PDF 包含結構化文字。");
            setIsLoading(false);
            return;
          }
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
        setSourceCol("");
        setTargetCol("");
        setPreviewEdges([]);
        toast.success(`成功載入 ${rows.length} 筆資料，共 ${headers.length} 個欄位`);
      } catch (err) {
        console.error(err);
        toast.error("檔案解析失敗，請確認格式是否正確");
      } finally {
        setIsLoading(false);
      }
    },
    [setRawData]
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
    const edges = state.rawData
      .filter((row) => row[sourceCol] && row[targetCol])
      .map((row) => ({
        source: String(row[sourceCol]),
        target: String(row[targetCol]),
      }));
    if (edges.length === 0) {
      toast.error("無法生成有效的 Edge 資料，請確認欄位值不為空");
      return;
    }
    setEdges(edges, sourceCol, targetCol);
    setPreviewEdges(edges.slice(0, 8));
    toast.success(`已生成 ${edges.length} 條邊，${new Set([...edges.map((e) => e.source), ...edges.map((e) => e.target)]).size} 個節點`);
  }, [sourceCol, targetCol, state.rawData, setEdges]);

  const handleDownloadNodes = useCallback(() => {
    if (state.nodes.length === 0) {
      toast.error("尚未生成節點資料");
      return;
    }
    downloadCSV(state.nodes, "node_data.csv");
    toast.success("節點資料已下載");
  }, [state.nodes]);

  const fileTypeIcons: Record<string, React.ReactNode> = {
    xlsx: <FileSpreadsheet size={16} className="text-green-500" />,
    xls: <FileSpreadsheet size={16} className="text-green-500" />,
    csv: <Table2 size={16} className="text-blue-500" />,
    txt: <FileText size={16} className="text-orange-500" />,
    pdf: <FileText size={16} className="text-red-500" />,
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
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt,.pdf"
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
                支援 Excel (.xlsx/.xls)、CSV、TXT、PDF 格式
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {["XLSX", "XLS", "CSV", "TXT", "PDF"].map((fmt) => (
                <Badge key={fmt} variant="secondary" className="text-xs font-mono">
                  {fmt}
                </Badge>
              ))}
            </div>
          </label>
        </CardContent>
      </Card>

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

            {/* Column preview */}
            {state.rawHeaders.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">欄位預覽</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.rawHeaders.map((h) => (
                    <Badge key={h} variant="secondary" className="text-xs font-mono">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Data preview table */}
            {state.rawData.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border overflow-x-auto custom-scroll">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  資料預覽（前 5 筆）
                </p>
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {state.rawHeaders.slice(0, 6).map((h) => (
                        <th key={h} className="text-left py-1.5 px-2 text-muted-foreground font-semibold">
                          {h}
                        </th>
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

      {/* Column Selection */}
      {state.rawHeaders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Table2 size={16} className="text-primary" />
              欄位轉置設定
            </CardTitle>
            <p className="text-xs text-muted-foreground">選擇代表來源節點與目標節點的欄位，系統將自動轉置為 Edge 格式。</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">來源節點欄位 (Source)</label>
                <Select value={sourceCol} onValueChange={setSourceCol}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="選擇欄位..." />
                  </SelectTrigger>
                  <SelectContent>
                    {state.rawHeaders.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
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
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerateEdges}
              disabled={!sourceCol || !targetCol}
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
        <div className="grid grid-cols-2 gap-4">
          {/* Edge preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                Edge 資料預覽
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scroll">
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground pb-1.5 border-b border-border">
                  <span>Source</span>
                  <span>Target</span>
                </div>
                {(previewEdges.length > 0 ? previewEdges : state.edges.slice(0, 8)).map((e, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 text-xs py-1 hover:bg-muted/30 rounded px-1">
                    <span className="font-mono text-primary truncate">{e.source}</span>
                    <span className="font-mono text-foreground/70 truncate">{e.target}</span>
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
                <CheckCircle2 size={16} className="text-green-500" />
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
