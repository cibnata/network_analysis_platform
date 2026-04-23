import type { EdgeData, NodeData, PredictionResult } from "@/contexts/NetworkContext";

function buildAdjacency(nodes: NodeData[], edges: EdgeData[]) {
  const adj = new Map<string, Set<string>>();
  nodes.forEach((n) => adj.set(n.id, new Set()));
  edges.forEach((e) => {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  });
  return adj;
}

// ─── Common Neighbors score ───────────────────────────────────────────────────
function commonNeighbors(u: string, v: string, adj: Map<string, Set<string>>): number {
  const nu = adj.get(u) || new Set();
  const nv = adj.get(v) || new Set();
  let count = 0;
  nu.forEach((nb) => { if (nv.has(nb)) count++; });
  return count;
}

// ─── Jaccard Coefficient ──────────────────────────────────────────────────────
function jaccardCoeff(u: string, v: string, adj: Map<string, Set<string>>): number {
  const nu = adj.get(u) || new Set();
  const nv = adj.get(v) || new Set();
  let intersection = 0;
  nu.forEach((nb) => { if (nv.has(nb)) intersection++; });
  const allNodes = new Set<string>();
  nu.forEach((nb) => allNodes.add(nb));
  nv.forEach((nb) => allNodes.add(nb));
  const union = allNodes.size;
  return union === 0 ? 0 : intersection / union;
}

// ─── Adamic-Adar Index ────────────────────────────────────────────────────────
function adamicAdar(u: string, v: string, adj: Map<string, Set<string>>): number {
  const nu = adj.get(u) || new Set();
  const nv = adj.get(v) || new Set();
  let score = 0;
  nu.forEach((nb) => {
    if (nv.has(nb)) {
      const deg = adj.get(nb)?.size || 1;
      score += 1 / Math.log(Math.max(deg, 2));
    }
  });
  return score;
}

// ─── Link Prediction ─────────────────────────────────────────────────────────
export function predictLinks(
  nodes: NodeData[],
  edges: EdgeData[],
  topK = 10
): PredictionResult[] {
  const adj = buildAdjacency(nodes, edges);
  const existingEdges = new Set<string>();
  edges.forEach((e) => {
    existingEdges.add([e.source, e.target].sort().join("||"));
  });

  const candidates: PredictionResult[] = [];
  const nodeIds = nodes.map((n) => n.id);

  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const u = nodeIds[i];
      const v = nodeIds[j];
      const key = [u, v].sort().join("||");
      if (existingEdges.has(key)) continue;

      // Combine scores
      const cn = commonNeighbors(u, v, adj);
      if (cn === 0) continue; // Only predict if there's some common structure

      const jc = jaccardCoeff(u, v, adj);
      const aa = adamicAdar(u, v, adj);
      const score = cn * 0.4 + jc * 0.3 + aa * 0.3;

      candidates.push({ source: u, target: v, score, type: "add" });
    }
  }

  // Sort by score descending and take top K
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topK);
}

// ─── Link Dissolution Prediction ─────────────────────────────────────────────
export function predictDissolution(
  nodes: NodeData[],
  edges: EdgeData[],
  topK = 10
): PredictionResult[] {
  const adj = buildAdjacency(nodes, edges);

  // Score each existing edge for likelihood of removal
  // Low common neighbors + low Jaccard = weak tie = likely to dissolve
  const scored: PredictionResult[] = edges.map((e) => {
    const cn = commonNeighbors(e.source, e.target, adj);
    const jc = jaccardCoeff(e.source, e.target, adj);
    const degU = adj.get(e.source)?.size || 1;
    const degV = adj.get(e.target)?.size || 1;

    // Weakness score: high degree difference + low common neighbors = weak bridge
    const degDiff = Math.abs(degU - degV) / Math.max(degU, degV);
    const weaknessScore = (1 - jc) * 0.4 + (1 / (cn + 1)) * 0.4 + degDiff * 0.2;

    return {
      source: e.source,
      target: e.target,
      score: weaknessScore,
      type: "remove" as const,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
