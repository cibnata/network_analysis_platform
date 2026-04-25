/**
 * UCINET / DL Format Parser
 *
 * Supports:
 *  1. DL format – fullmatrix, edgelist1, nodelist1 (with or without labels)
 *  2. Pajek .net format – *Vertices / *Edges / *Arcs sections
 *  3. UCINET ##h/##d binary header detection (graceful error)
 *  4. Plain adjacency matrix (no DL header)
 *
 * Returns edges as { source, target, weight? }[]
 * and nodes as { id: string }[]
 */

export interface ParsedEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface ParsedNode {
  id: string;
}

export interface UCINETParseResult {
  edges: ParsedEdge[];
  nodes: ParsedNode[];
  format: string;
  warnings: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("!") && !l.startsWith("%"));
}

function uniqueNodes(edges: ParsedEdge[]): ParsedNode[] {
  const seen = new Set<string>();
  edges.forEach((e) => {
    seen.add(e.source);
    seen.add(e.target);
  });
  return Array.from(seen).map((id) => ({ id }));
}

// ─── DL Format Parser ────────────────────────────────────────────────────────

function parseDL(text: string): UCINETParseResult {
  const warnings: string[] = [];
  const upper = text.toUpperCase();

  // Extract N
  const nMatch = upper.match(/\bN\s*=\s*(\d+)/);
  const n = nMatch ? parseInt(nMatch[1]) : 0;

  // Detect format keyword
  let formatType = "fullmatrix";
  if (upper.includes("FORMAT") && upper.includes("EDGELIST")) formatType = "edgelist1";
  else if (upper.includes("FORMAT") && upper.includes("NODELIST")) formatType = "nodelist1";
  else if (upper.includes("FORMAT") && upper.includes("FULLMATRIX")) formatType = "fullmatrix";

  // Extract labels from header (before DATA:)
  const dataIdx = upper.indexOf("DATA:");
  const headerText = dataIdx >= 0 ? text.slice(0, dataIdx) : "";
  const dataText = dataIdx >= 0 ? text.slice(dataIdx + 5) : text;

  // Check for LABELS EMBEDDED
  const labelsEmbedded = upper.includes("LABELS EMBEDDED");

  // Parse explicit labels from header: labels: a,b,c or labels:\n a\n b
  let headerLabels: string[] = [];
  const labelsMatch = headerText.match(/labels\s*:\s*([\s\S]*?)(?=\bdata\b|\bformat\b|\bn\s*=|\blabels\s+embedded\b|$)/i);
  if (labelsMatch && !labelsEmbedded) {
    const raw = labelsMatch[1].replace(/\n/g, " ").replace(/,/g, " ");
    headerLabels = raw.trim().split(/\s+/).filter(Boolean);
  }

  const getLabel = (idx: number): string => {
    if (headerLabels.length > idx) return headerLabels[idx];
    return String(idx + 1);
  };

  const edges: ParsedEdge[] = [];

  if (formatType === "fullmatrix") {
    // Parse data tokens
    const tokens = dataText.trim().split(/\s+/).filter(Boolean);
    let row = 0;
    let col = 0;
    let labelRow = -1;

    if (labelsEmbedded) {
      // First n tokens are row labels, then each row starts with a label
      const embeddedLabels: string[] = [];
      let ti = 0;
      // Read n column labels
      while (embeddedLabels.length < n && ti < tokens.length) {
        embeddedLabels.push(tokens[ti++]);
      }
      // Read rows: label + n values
      for (let r = 0; r < n; r++) {
        const rowLabel = tokens[ti++] ?? String(r + 1);
        embeddedLabels[r] = embeddedLabels[r] ?? rowLabel;
        for (let c = 0; c < n; c++) {
          const val = parseFloat(tokens[ti++] ?? "0");
          if (val !== 0) {
            edges.push({ source: embeddedLabels[r], target: embeddedLabels[c], weight: val });
          }
        }
      }
    } else {
      const matrixTokens = tokens;
      let ti = 0;
      for (let r = 0; r < (n || Math.sqrt(tokens.length)); r++) {
        for (let c = 0; c < (n || Math.sqrt(tokens.length)); c++) {
          const val = parseFloat(matrixTokens[ti++] ?? "0");
          if (val !== 0) {
            edges.push({ source: getLabel(r), target: getLabel(c), weight: val });
          }
        }
      }
    }
  } else if (formatType === "edgelist1") {
    const lines = dataText.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);
    const nodeOrder: string[] = [...headerLabels];

    const resolveNode = (token: string): string => {
      // If numeric and no embedded labels, map to label
      const num = parseInt(token);
      if (!isNaN(num) && !labelsEmbedded) return getLabel(num - 1);
      // Track order for embedded
      if (!nodeOrder.includes(token)) nodeOrder.push(token);
      return token;
    };

    for (const line of lines) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const src = resolveNode(parts[0]);
        const tgt = resolveNode(parts[1]);
        const w = parts[2] ? parseFloat(parts[2]) : undefined;
        edges.push({ source: src, target: tgt, weight: w });
      }
    }
  } else if (formatType === "nodelist1") {
    const lines = dataText.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);
    const nodeOrder: string[] = [...headerLabels];

    const resolveNode = (token: string): string => {
      const num = parseInt(token);
      if (!isNaN(num) && !labelsEmbedded) return getLabel(num - 1);
      if (!nodeOrder.includes(token)) nodeOrder.push(token);
      return token;
    };

    for (const line of lines) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const src = resolveNode(parts[0]);
        for (let i = 1; i < parts.length; i++) {
          edges.push({ source: src, target: resolveNode(parts[i]) });
        }
      }
    }
  }

  if (edges.length === 0) {
    warnings.push("未偵測到有效的邊資料，請確認 DL 格式是否正確。");
  }

  return {
    edges,
    nodes: uniqueNodes(edges),
    format: `DL (${formatType})`,
    warnings,
  };
}

// ─── Pajek .net Format Parser ────────────────────────────────────────────────

function parsePajek(text: string): UCINETParseResult {
  const warnings: string[] = [];
  const lines = normalizeLines(text);
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];

  let section: "none" | "vertices" | "edges" | "arcs" = "none";

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("*vertices")) {
      section = "vertices";
      continue;
    }
    if (lower.startsWith("*edges") || lower.startsWith("*arcs")) {
      section = lower.startsWith("*edges") ? "edges" : "arcs";
      continue;
    }

    if (section === "vertices") {
      // Format: <id> "<label>" [x y z]
      const m = line.match(/^(\d+)\s+"?([^"]+)"?/);
      if (m) {
        nodes.push({ id: m[2].trim() });
      } else {
        const parts = line.split(/\s+/);
        if (parts[0] && !isNaN(parseInt(parts[0]))) {
          nodes.push({ id: parts[1] ?? parts[0] });
        }
      }
    } else if (section === "edges" || section === "arcs") {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const srcIdx = parseInt(parts[0]) - 1;
        const tgtIdx = parseInt(parts[1]) - 1;
        const w = parts[2] ? parseFloat(parts[2]) : undefined;
        const src = nodes[srcIdx]?.id ?? String(srcIdx + 1);
        const tgt = nodes[tgtIdx]?.id ?? String(tgtIdx + 1);
        edges.push({ source: src, target: tgt, weight: w });
      }
    }
  }

  if (edges.length === 0) {
    warnings.push("未偵測到有效的邊資料，請確認 Pajek .net 格式是否正確。");
  }

  return {
    edges,
    nodes: nodes.length > 0 ? nodes : uniqueNodes(edges),
    format: "Pajek (.net)",
    warnings,
  };
}

// ─── Plain Adjacency Matrix Parser ──────────────────────────────────────────

function parsePlainMatrix(text: string): UCINETParseResult {
  const warnings: string[] = [];
  const lines = normalizeLines(text);
  const edges: ParsedEdge[] = [];

  // Check if first row/col looks like labels (non-numeric)
  const firstLine = lines[0]?.split(/[\s,\t]+/).filter(Boolean) ?? [];
  const hasColLabels = firstLine.some((t) => isNaN(parseFloat(t)));
  const colLabels: string[] = hasColLabels ? firstLine : [];
  const dataLines = hasColLabels ? lines.slice(1) : lines;

  dataLines.forEach((line, rowIdx) => {
    const parts = line.split(/[\s,\t]+/).filter(Boolean);
    let startCol = 0;
    let rowLabel = hasColLabels ? (colLabels[rowIdx] ?? String(rowIdx + 1)) : String(rowIdx + 1);

    // If first token is non-numeric, treat as row label
    if (parts.length > 0 && isNaN(parseFloat(parts[0]))) {
      rowLabel = parts[0];
      startCol = 1;
    }

    for (let c = startCol; c < parts.length; c++) {
      const val = parseFloat(parts[c]);
      if (!isNaN(val) && val !== 0) {
        const colIdx = c - startCol;
        const colLabel = colLabels[colIdx] ?? String(colIdx + 1);
        edges.push({ source: rowLabel, target: colLabel, weight: val });
      }
    }
  });

  if (edges.length === 0) {
    warnings.push("未偵測到有效的邊資料，請確認矩陣格式是否正確。");
  }

  return {
    edges,
    nodes: uniqueNodes(edges),
    format: "Adjacency Matrix",
    warnings,
  };
}

// ─── Binary ##h/##d Detection ────────────────────────────────────────────────

function isBinaryUCINET(text: string): boolean {
  // ##h files start with a Pascal-style binary header; they contain non-printable chars
  return /[\x00-\x08\x0e-\x1f]/.test(text.slice(0, 200));
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Auto-detect and parse UCINET/DL/Pajek format from raw text content.
 */
export function parseUCINET(text: string, filename?: string): UCINETParseResult {
  const ext = filename?.split(".").pop()?.toLowerCase() ?? "";

  // Binary ##h / ##d — cannot parse in browser
  if (isBinaryUCINET(text)) {
    return {
      edges: [],
      nodes: [],
      format: "UCINET Binary (##h/##d)",
      warnings: [
        "偵測到 UCINET 二進位格式（##h/##d）。請在 UCINET 軟體中先將資料匯出為 DL 文字格式（File → Export → DL），再上傳至本平台。",
      ],
    };
  }

  const trimmed = text.trim().toUpperCase();

  // Pajek .net
  if (ext === "net" || trimmed.startsWith("*VERTICES") || trimmed.startsWith("*NETWORK")) {
    return parsePajek(text);
  }

  // DL format
  if (trimmed.startsWith("DL") || trimmed.includes("\nDL ") || trimmed.includes("\nDL\n")) {
    return parseDL(text);
  }

  // Fallback: plain adjacency matrix
  return parsePlainMatrix(text);
}

/**
 * Detect whether a file is likely a UCINET/DL/Pajek format
 * based on extension or content sniff.
 */
export function isUCINETFile(filename: string, contentSnippet?: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["dl", "net", "##h", "##d", "dat"].includes(ext)) return true;
  if (contentSnippet) {
    const upper = contentSnippet.trim().toUpperCase();
    if (upper.startsWith("DL ") || upper.startsWith("DL\n") || upper.startsWith("*VERTICES")) return true;
  }
  return false;
}
