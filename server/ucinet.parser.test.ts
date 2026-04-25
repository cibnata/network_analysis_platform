/**
 * Vitest tests for UCINET / DL / Pajek parser
 * Tests run in Node.js (server context) using the same logic as the client-side parser.
 * We duplicate the parser logic inline to avoid browser-only imports.
 */
import { describe, it, expect } from "vitest";

// ─── Inline minimal re-implementation for server-side testing ────────────────
// (mirrors client/src/lib/ucinetParser.ts logic)

interface ParsedEdge { source: string; target: string; weight?: number; }
interface ParsedNode { id: string; }
interface UCINETParseResult { edges: ParsedEdge[]; nodes: ParsedNode[]; format: string; warnings: string[]; }

function normalizeLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("!") && !l.startsWith("%"));
}

function uniqueNodes(edges: ParsedEdge[]): ParsedNode[] {
  const seen = new Set<string>();
  edges.forEach((e) => { seen.add(e.source); seen.add(e.target); });
  return Array.from(seen).map((id) => ({ id }));
}

function parseDL(text: string): UCINETParseResult {
  const warnings: string[] = [];
  const upper = text.toUpperCase();
  const nMatch = upper.match(/\bN\s*=\s*(\d+)/);
  const n = nMatch ? parseInt(nMatch[1]) : 0;
  let formatType = "fullmatrix";
  if (upper.includes("FORMAT") && upper.includes("EDGELIST")) formatType = "edgelist1";
  else if (upper.includes("FORMAT") && upper.includes("NODELIST")) formatType = "nodelist1";
  const dataIdx = upper.indexOf("DATA:");
  const headerText = dataIdx >= 0 ? text.slice(0, dataIdx) : "";
  const dataText = dataIdx >= 0 ? text.slice(dataIdx + 5) : text;
  const labelsEmbedded = upper.includes("LABELS EMBEDDED");
  let headerLabels: string[] = [];
  const labelsMatch = headerText.match(/labels\s*:\s*([\s\S]*?)(?=\bdata\b|\bformat\b|\bn\s*=|\blabels\s+embedded\b|$)/i);
  if (labelsMatch && !labelsEmbedded) {
    const raw = labelsMatch[1].replace(/\n/g, " ").replace(/,/g, " ");
    headerLabels = raw.trim().split(/\s+/).filter(Boolean);
  }
  const getLabel = (idx: number) => headerLabels.length > idx ? headerLabels[idx] : String(idx + 1);
  const edges: ParsedEdge[] = [];

  if (formatType === "fullmatrix") {
    if (labelsEmbedded) {
      const tokens = dataText.trim().split(/\s+/).filter(Boolean);
      const embeddedLabels: string[] = [];
      let ti = 0;
      while (embeddedLabels.length < n && ti < tokens.length) embeddedLabels.push(tokens[ti++]);
      for (let r = 0; r < n; r++) {
        const rowLabel = tokens[ti++] ?? String(r + 1);
        embeddedLabels[r] = embeddedLabels[r] ?? rowLabel;
        for (let c = 0; c < n; c++) {
          const val = parseFloat(tokens[ti++] ?? "0");
          if (val !== 0) edges.push({ source: embeddedLabels[r], target: embeddedLabels[c], weight: val });
        }
      }
    } else {
      const tokens = dataText.trim().split(/\s+/).filter(Boolean);
      let ti = 0;
      const size = n || Math.round(Math.sqrt(tokens.length));
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) {
          const val = parseFloat(tokens[ti++] ?? "0");
          if (val !== 0) edges.push({ source: getLabel(r), target: getLabel(c), weight: val });
        }
    }
  } else if (formatType === "edgelist1") {
    const lines = dataText.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);
    const nodeOrder: string[] = [...headerLabels];
    const resolveNode = (token: string) => {
      const num = parseInt(token);
      if (!isNaN(num) && !labelsEmbedded) return getLabel(num - 1);
      if (!nodeOrder.includes(token)) nodeOrder.push(token);
      return token;
    };
    for (const line of lines) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const w = parts[2] ? parseFloat(parts[2]) : undefined;
        edges.push({ source: resolveNode(parts[0]), target: resolveNode(parts[1]), weight: w });
      }
    }
  } else if (formatType === "nodelist1") {
    const lines = dataText.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);
    const nodeOrder: string[] = [...headerLabels];
    const resolveNode = (token: string) => {
      const num = parseInt(token);
      if (!isNaN(num) && !labelsEmbedded) return getLabel(num - 1);
      if (!nodeOrder.includes(token)) nodeOrder.push(token);
      return token;
    };
    for (const line of lines) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const src = resolveNode(parts[0]);
        for (let i = 1; i < parts.length; i++) edges.push({ source: src, target: resolveNode(parts[i]) });
      }
    }
  }
  return { edges, nodes: uniqueNodes(edges), format: `DL (${formatType})`, warnings };
}

function parsePajek(text: string): UCINETParseResult {
  const warnings: string[] = [];
  const lines = normalizeLines(text);
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  let section: "none" | "vertices" | "edges" | "arcs" = "none";
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("*vertices")) { section = "vertices"; continue; }
    if (lower.startsWith("*edges") || lower.startsWith("*arcs")) { section = lower.startsWith("*edges") ? "edges" : "arcs"; continue; }
    if (section === "vertices") {
      const m = line.match(/^(\d+)\s+"?([^"]+)"?/);
      if (m) nodes.push({ id: m[2].trim() });
      else { const p = line.split(/\s+/); if (p[0] && !isNaN(parseInt(p[0]))) nodes.push({ id: p[1] ?? p[0] }); }
    } else if (section === "edges" || section === "arcs") {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const si = parseInt(parts[0]) - 1, ti = parseInt(parts[1]) - 1;
        const w = parts[2] ? parseFloat(parts[2]) : undefined;
        edges.push({ source: nodes[si]?.id ?? String(si + 1), target: nodes[ti]?.id ?? String(ti + 1), weight: w });
      }
    }
  }
  return { edges, nodes: nodes.length > 0 ? nodes : uniqueNodes(edges), format: "Pajek (.net)", warnings };
}

function parseUCINET(text: string, filename?: string): UCINETParseResult {
  const ext = filename?.split(".").pop()?.toLowerCase() ?? "";
  const trimmed = text.trim().toUpperCase();
  if (ext === "net" || trimmed.startsWith("*VERTICES")) return parsePajek(text);
  if (trimmed.startsWith("DL") || trimmed.includes("\nDL ")) return parseDL(text);
  // plain adjacency matrix fallback
  const lines = normalizeLines(text);
  const edges: ParsedEdge[] = [];
  const firstLine = lines[0]?.split(/[\s,\t]+/).filter(Boolean) ?? [];
  const hasColLabels = firstLine.some((t) => isNaN(parseFloat(t)));
  const colLabels = hasColLabels ? firstLine : [];
  const dataLines = hasColLabels ? lines.slice(1) : lines;
  dataLines.forEach((line, rowIdx) => {
    const parts = line.split(/[\s,\t]+/).filter(Boolean);
    let startCol = 0;
    let rowLabel = hasColLabels ? (colLabels[rowIdx] ?? String(rowIdx + 1)) : String(rowIdx + 1);
    if (parts.length > 0 && isNaN(parseFloat(parts[0]))) { rowLabel = parts[0]; startCol = 1; }
    for (let c = startCol; c < parts.length; c++) {
      const val = parseFloat(parts[c]);
      if (!isNaN(val) && val !== 0) {
        const ci = c - startCol;
        edges.push({ source: rowLabel, target: colLabels[ci] ?? String(ci + 1), weight: val });
      }
    }
  });
  return { edges, nodes: uniqueNodes(edges), format: "Adjacency Matrix", warnings: [] };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("UCINET DL Parser – fullmatrix", () => {
  it("parses fullmatrix with header labels", () => {
    const dl = `dl n=4 format=fullmatrix
labels: Alice,Bob,Carol,Dan
data:
0 1 1 0
1 0 1 0
1 1 0 1
0 0 1 0`;
    const result = parseUCINET(dl, "test.dl");
    expect(result.format).toBe("DL (fullmatrix)");
    expect(result.edges.length).toBeGreaterThan(0);
    const edge = result.edges.find((e) => e.source === "Alice" && e.target === "Bob");
    expect(edge).toBeDefined();
  });

  it("parses fullmatrix with embedded labels", () => {
    const dl = `dl n=3 format=fullmatrix labels embedded
data:
A B C
A 0 1 1
B 1 0 0
C 1 0 0`;
    const result = parseUCINET(dl, "test.dl");
    expect(result.edges.some((e) => e.source === "A" && e.target === "B")).toBe(true);
  });

  it("parses fullmatrix without labels (numeric nodes)", () => {
    const dl = `DL N=3
data:
0 1 0
1 0 1
0 1 0`;
    const result = parseUCINET(dl);
    expect(result.edges.length).toBe(4);
    expect(result.nodes.map((n) => n.id)).toContain("1");
    expect(result.nodes.map((n) => n.id)).toContain("2");
  });
});

describe("UCINET DL Parser – edgelist1", () => {
  it("parses edgelist1 with embedded labels and weights", () => {
    const dl = `dl n=4 format=edgelist1
labels embedded:
data:
Alice Bob 3
Bob Carol 4
Carol Dan 7`;
    const result = parseUCINET(dl, "test.dl");
    expect(result.format).toBe("DL (edgelist1)");
    expect(result.edges.length).toBe(3);
    const e = result.edges.find((e) => e.source === "Alice" && e.target === "Bob");
    expect(e?.weight).toBe(3);
  });

  it("parses edgelist1 with numeric indices and header labels", () => {
    const dl = `DL n=3 format=edgelist1
labels: george,sally,jim
data:
1 2
1 3
2 3`;
    const result = parseUCINET(dl, "test.dl");
    expect(result.edges.some((e) => e.source === "george" && e.target === "sally")).toBe(true);
    expect(result.edges.some((e) => e.source === "george" && e.target === "jim")).toBe(true);
  });
});

describe("UCINET DL Parser – nodelist1", () => {
  it("parses nodelist1 with embedded labels", () => {
    const dl = `dl n=3 format=nodelist1
labels embedded:
data:
Alice Bob Carol
Bob Carol
Carol Alice`;
    const result = parseUCINET(dl, "test.dl");
    expect(result.format).toBe("DL (nodelist1)");
    expect(result.edges.some((e) => e.source === "Alice" && e.target === "Bob")).toBe(true);
    expect(result.edges.some((e) => e.source === "Alice" && e.target === "Carol")).toBe(true);
  });
});

describe("Pajek .net Parser", () => {
  it("parses Pajek *Vertices and *Edges sections", () => {
    const net = `*Vertices 4
1 "Alice"
2 "Bob"
3 "Carol"
4 "Dan"
*Edges
1 2 1
2 3 1
3 4 1`;
    const result = parseUCINET(net, "test.net");
    expect(result.format).toBe("Pajek (.net)");
    expect(result.nodes.map((n) => n.id)).toContain("Alice");
    expect(result.edges.length).toBe(3);
    expect(result.edges[0]).toMatchObject({ source: "Alice", target: "Bob", weight: 1 });
  });

  it("parses Pajek *Arcs (directed) section", () => {
    const net = `*Vertices 3
1 "X"
2 "Y"
3 "Z"
*Arcs
1 2
2 3`;
    const result = parseUCINET(net, "test.net");
    expect(result.edges.length).toBe(2);
    expect(result.edges[0]).toMatchObject({ source: "X", target: "Y" });
  });

  it("auto-detects Pajek format from content without .net extension", () => {
    const net = `*Vertices 2
1 "A"
2 "B"
*Edges
1 2`;
    const result = parseUCINET(net);
    expect(result.format).toBe("Pajek (.net)");
  });
});

describe("Plain Adjacency Matrix Parser", () => {
  it("parses plain matrix with row/col labels", () => {
    const matrix = `  A B C
A 0 1 1
B 1 0 0
C 1 0 0`;
    const result = parseUCINET(matrix, "matrix.txt");
    expect(result.format).toBe("Adjacency Matrix");
    expect(result.edges.some((e) => e.source === "A" && e.target === "B")).toBe(true);
  });

  it("parses plain numeric matrix without labels", () => {
    const matrix = `0 1 0
1 0 1
0 1 0`;
    const result = parseUCINET(matrix, "matrix.txt");
    expect(result.edges.length).toBe(4);
  });
});

describe("Node uniqueness", () => {
  it("returns unique node list from parsed edges", () => {
    const dl = `dl n=3 format=edgelist1
labels embedded:
data:
A B
B C
A C`;
    const result = parseUCINET(dl, "test.dl");
    const ids = result.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("A");
    expect(ids).toContain("B");
    expect(ids).toContain("C");
  });
});
