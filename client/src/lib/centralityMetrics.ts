/**
 * Centrality Metrics Calculator
 * Computes Degree, Betweenness, Closeness, and PageRank (Eigenvector approximation)
 * for network analysis.
 */

export interface CentralityResult {
  nodeId: string;
  degree: number;          // normalized 0-1
  betweenness: number;     // normalized 0-1
  closeness: number;       // normalized 0-1
  pagerank: number;        // normalized 0-1
  degreeRaw: number;       // raw degree count
  betweennessRaw: number;  // raw betweenness
  closenessRaw: number;    // raw closeness
  pagerankRaw: number;     // raw pagerank score
}

export type CentralityType = "degree" | "betweenness" | "closeness" | "pagerank";

interface Edge {
  source: string;
  target: string;
  weight?: number;
}

/**
 * Compute all four centrality metrics for the given nodes and edges.
 */
export function computeCentralities(
  nodeIds: string[],
  edges: Edge[],
  directed: boolean = false,
  weighted: boolean = false
): Map<string, CentralityResult> {
  const n = nodeIds.length;
  const nodeIndex = new Map<string, number>();
  nodeIds.forEach((id, i) => nodeIndex.set(id, i));

  // Build adjacency list
  const adj = new Map<string, Map<string, number>>();
  nodeIds.forEach((id) => adj.set(id, new Map()));

  edges.forEach((e) => {
    const w = weighted && typeof e.weight === "number" ? e.weight : 1;
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.set(e.target, w);
      if (!directed) {
        adj.get(e.target)!.set(e.source, w);
      }
    }
  });

  // --- Degree Centrality ---
  const degreeRaw = new Map<string, number>();
  nodeIds.forEach((id) => {
    const outDeg = adj.get(id)?.size ?? 0;
    if (directed) {
      // In-degree
      let inDeg = 0;
      nodeIds.forEach((other) => {
        if (adj.get(other)?.has(id)) inDeg++;
      });
      degreeRaw.set(id, outDeg + inDeg);
    } else {
      degreeRaw.set(id, outDeg);
    }
  });
  const maxDeg = Math.max(...Array.from(degreeRaw.values()), 1);
  const normDivisor = n > 1 ? n - 1 : 1;

  // --- BFS/Dijkstra for Betweenness & Closeness ---
  // Using Brandes algorithm for betweenness
  const betweennessRaw = new Map<string, number>();
  nodeIds.forEach((id) => betweennessRaw.set(id, 0));

  const closenessRaw = new Map<string, number>();

  for (const s of nodeIds) {
    // BFS (unweighted) or Dijkstra (weighted)
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    nodeIds.forEach((id) => pred.set(id, []));
    const sigma = new Map<string, number>();
    nodeIds.forEach((id) => sigma.set(id, 0));
    sigma.set(s, 1);
    const dist = new Map<string, number>();
    nodeIds.forEach((id) => dist.set(id, -1));
    dist.set(s, 0);

    if (!weighted) {
      // BFS
      const queue: string[] = [s];
      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);
        for (const [w] of Array.from(adj.get(v) ?? new Map())) {
          if (dist.get(w) === -1) {
            queue.push(w);
            dist.set(w, dist.get(v)! + 1);
          }
          if (dist.get(w) === dist.get(v)! + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            pred.get(w)!.push(v);
          }
        }
      }
    } else {
      // Dijkstra
      const visited = new Set<string>();
      const pq: Array<[number, string]> = [[0, s]];
      dist.set(s, 0);
      while (pq.length > 0) {
        pq.sort((a, b) => a[0] - b[0]);
        const [d, v] = pq.shift()!;
        if (visited.has(v)) continue;
        visited.add(v);
        stack.push(v);
        for (const [w, wt] of Array.from(adj.get(v) ?? new Map())) {
          const nd = d + wt;
          if (dist.get(w) === -1 || nd < dist.get(w)!) {
            dist.set(w, nd);
            sigma.set(w, sigma.get(v)!);
            pred.set(w, [v]);
            pq.push([nd, w]);
          } else if (nd === dist.get(w)) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            pred.get(w)!.push(v);
          }
        }
      }
    }

    // Closeness: sum of distances from s to all reachable nodes
    let totalDist = 0;
    let reachable = 0;
    nodeIds.forEach((id) => {
      if (id !== s && dist.get(id)! > 0) {
        totalDist += dist.get(id)!;
        reachable++;
      }
    });
    // Wasserman-Faust closeness (handles disconnected graphs)
    if (reachable > 0 && totalDist > 0) {
      const cc = (reachable / normDivisor) * (reachable / totalDist);
      closenessRaw.set(s, cc);
    } else {
      closenessRaw.set(s, 0);
    }

    // Betweenness accumulation (Brandes)
    const delta = new Map<string, number>();
    nodeIds.forEach((id) => delta.set(id, 0));
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w) ?? []) {
        const c = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + c);
      }
      if (w !== s) {
        betweennessRaw.set(w, betweennessRaw.get(w)! + delta.get(w)!);
      }
    }
  }

  // Normalize betweenness
  const betweennessNormFactor = directed
    ? (n - 1) * (n - 2)
    : ((n - 1) * (n - 2)) / 2;
  const maxBetweenness = Math.max(...Array.from(betweennessRaw.values()), 1);

  // --- PageRank ---
  const dampingFactor = 0.85;
  const maxIter = 100;
  const tol = 1e-6;
  const pr = new Map<string, number>();
  nodeIds.forEach((id) => pr.set(id, 1 / n));

  for (let iter = 0; iter < maxIter; iter++) {
    const newPr = new Map<string, number>();
    let diff = 0;
    nodeIds.forEach((id) => {
      let rank = (1 - dampingFactor) / n;
      nodeIds.forEach((other) => {
        if (adj.get(other)?.has(id)) {
          const outDeg = adj.get(other)!.size;
          if (outDeg > 0) {
            rank += dampingFactor * (pr.get(other)! / outDeg);
          }
        }
      });
      newPr.set(id, rank);
      diff += Math.abs(rank - pr.get(id)!);
    });
    newPr.forEach((v, k) => pr.set(k, v));
    if (diff < tol) break;
  }
  const maxPR = Math.max(...Array.from(pr.values()), 1e-10);
  const maxCloseness = Math.max(...Array.from(closenessRaw.values()), 1e-10);

  // Assemble results
  const results = new Map<string, CentralityResult>();
  nodeIds.forEach((id) => {
    const dRaw = degreeRaw.get(id) ?? 0;
    const bRaw = betweennessRaw.get(id) ?? 0;
    const cRaw = closenessRaw.get(id) ?? 0;
    const pRaw = pr.get(id) ?? 0;
    results.set(id, {
      nodeId: id,
      degreeRaw: dRaw,
      betweennessRaw: bRaw,
      closenessRaw: cRaw,
      pagerankRaw: pRaw,
      degree: maxDeg > 0 ? dRaw / maxDeg : 0,
      betweenness: betweennessNormFactor > 0 ? bRaw / betweennessNormFactor : (maxBetweenness > 0 ? bRaw / maxBetweenness : 0),
      closeness: cRaw / maxCloseness,
      pagerank: pRaw / maxPR,
    });
  });

  return results;
}

/**
 * Get a color for a node based on centrality value (0-1) using the brand palette.
 * Low centrality → Powder Petal (#F7E1D7), High centrality → Iron Grey (#4A5759)
 */
export function centralityToColor(value: number): string {
  // Interpolate from Powder Petal to Cherry Blossom to Iron Grey
  const stops = [
    { t: 0,    r: 247, g: 225, b: 215 }, // #F7E1D7 Powder Petal
    { t: 0.4,  r: 237, g: 175, b: 184 }, // #EDAFB8 Cherry Blossom
    { t: 0.7,  r: 176, g: 196, b: 177 }, // #B0C4B1 Ash Grey
    { t: 1,    r: 74,  g: 87,  b: 89  }, // #4A5759 Iron Grey
  ];
  const v = Math.max(0, Math.min(1, value));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i].t && v <= stops[i + 1].t) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const range = hi.t - lo.t || 1;
  const t = (v - lo.t) / range;
  const r = Math.round(lo.r + t * (hi.r - lo.r));
  const g = Math.round(lo.g + t * (hi.g - lo.g));
  const b = Math.round(lo.b + t * (hi.b - lo.b));
  return `rgb(${r},${g},${b})`;
}

/**
 * Get a color for an edge based on weight (normalized 0-1).
 * Low weight → #DEDBD2 Dust Grey, High weight → #4A5759 Iron Grey
 */
export function weightToColor(normWeight: number): string {
  const v = Math.max(0, Math.min(1, normWeight));
  const lo = { r: 222, g: 219, b: 210 }; // #DEDBD2 Dust Grey
  const hi = { r: 74,  g: 87,  b: 89  }; // #4A5759 Iron Grey
  const r = Math.round(lo.r + v * (hi.r - lo.r));
  const g = Math.round(lo.g + v * (hi.g - lo.g));
  const b = Math.round(lo.b + v * (hi.b - lo.b));
  return `rgb(${r},${g},${b})`;
}

/**
 * Compute node size based on centrality value.
 * Returns a size between minSize and maxSize.
 */
export function centralityToSize(value: number, minSize: number = 20, maxSize: number = 60): number {
  const v = Math.max(0, Math.min(1, value));
  return minSize + v * (maxSize - minSize);
}

/**
 * Get a categorical color for a node based on its type/attribute value.
 * Cycles through the brand palette.
 */
const TYPE_COLORS = [
  "#EDAFB8", // Cherry Blossom
  "#4A5759", // Iron Grey
  "#B0C4B1", // Ash Grey
  "#DEDBD2", // Dust Grey
  "#F7E1D7", // Powder Petal
  "#d4849a", // Cherry Blossom dark
  "#6b7e80", // Iron Grey light
  "#8aaa8b", // Ash Grey dark
  "#c4c1b8", // Dust Grey dark
  "#e8c9b8", // Powder Petal dark
];

export function getTypeColorMap(values: string[]): Map<string, string> {
  const unique = Array.from(new Set(values)).sort();
  const map = new Map<string, string>();
  unique.forEach((v, i) => map.set(v, TYPE_COLORS[i % TYPE_COLORS.length]));
  return map;
}

export { TYPE_COLORS };
