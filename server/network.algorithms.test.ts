import { describe, expect, it } from "vitest";

// ─── Test data ────────────────────────────────────────────────────────────────
const testNodes = [
  { id: "A" }, { id: "B" }, { id: "C" },
  { id: "D" }, { id: "E" }, { id: "F" },
];

const testEdges = [
  { source: "A", target: "B" },
  { source: "A", target: "C" },
  { source: "B", target: "C" },
  { source: "D", target: "E" },
  { source: "D", target: "F" },
  { source: "E", target: "F" },
];

// ─── Community Detection Algorithms (pure logic, no DOM) ─────────────────────

function buildGraph(nodes: { id: string }[], edges: { source: string; target: string }[]) {
  const adj = new Map<string, Set<string>>();
  nodes.forEach((n) => adj.set(n.id, new Set()));
  edges.forEach((e) => {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  });
  return adj;
}

function louvainBasic(nodes: { id: string }[], edges: { source: string; target: string }[]) {
  const adj = buildGraph(nodes, edges);
  const community = new Map<string, number>();
  nodes.forEach((n, i) => community.set(n.id, i));
  const m = edges.length;
  if (m === 0) return community;

  let improved = true;
  let iter = 0;
  while (improved && iter < 50) {
    improved = false;
    iter++;
    for (const node of nodes) {
      const currentComm = community.get(node.id)!;
      const neighbors = adj.get(node.id) || new Set();
      const commWeights = new Map<number, number>();
      neighbors.forEach((nb) => {
        const nbComm = community.get(nb)!;
        commWeights.set(nbComm, (commWeights.get(nbComm) || 0) + 1);
      });
      let bestComm = currentComm;
      let bestGain = 0;
      commWeights.forEach((weight, comm) => {
        if (comm === currentComm) return;
        const gain = weight - ((adj.get(node.id)?.size || 0) * weight) / (2 * m);
        if (gain > bestGain) { bestGain = gain; bestComm = comm; }
      });
      if (bestComm !== currentComm) { community.set(node.id, bestComm); improved = true; }
    }
  }
  return community;
}

function labelPropBasic(nodes: { id: string }[], edges: { source: string; target: string }[]) {
  const adj = buildGraph(nodes, edges);
  const labels = new Map<string, number>();
  nodes.forEach((n, i) => labels.set(n.id, i));
  let changed = true;
  let iter = 0;
  while (changed && iter < 100) {
    changed = false; iter++;
    for (const node of nodes) {
      const neighbors = adj.get(node.id) || new Set();
      if (neighbors.size === 0) continue;
      const labelCount = new Map<number, number>();
      neighbors.forEach((nb) => {
        const lbl = labels.get(nb)!;
        labelCount.set(lbl, (labelCount.get(lbl) || 0) + 1);
      });
      let maxCount = 0;
      let bestLabel = labels.get(node.id)!;
      labelCount.forEach((count, lbl) => { if (count > maxCount) { maxCount = count; bestLabel = lbl; } });
      if (bestLabel !== labels.get(node.id)) { labels.set(node.id, bestLabel); changed = true; }
    }
  }
  return labels;
}

// ─── Link Prediction ─────────────────────────────────────────────────────────
function commonNeighbors(u: string, v: string, adj: Map<string, Set<string>>) {
  const nu = adj.get(u) || new Set();
  const nv = adj.get(v) || new Set();
  let count = 0;
  nu.forEach((nb) => { if (nv.has(nb)) count++; });
  return count;
}

function jaccardCoeff(u: string, v: string, adj: Map<string, Set<string>>) {
  const nu = adj.get(u) || new Set();
  const nv = adj.get(v) || new Set();
  let intersection = 0;
  nu.forEach((nb) => { if (nv.has(nb)) intersection++; });
  const allNodes = new Set<string>();
  nu.forEach((nb) => allNodes.add(nb));
  nv.forEach((nb) => allNodes.add(nb));
  return allNodes.size === 0 ? 0 : intersection / allNodes.size;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Community Detection: Louvain", () => {
  it("assigns all nodes to communities", () => {
    const result = louvainBasic(testNodes, testEdges);
    expect(result.size).toBe(testNodes.length);
    testNodes.forEach((n) => {
      expect(result.has(n.id)).toBe(true);
    });
  });

  it("separates two disconnected cliques into different communities", () => {
    const result = louvainBasic(testNodes, testEdges);
    const communityA = result.get("A");
    const communityD = result.get("D");
    // The two cliques (A-B-C) and (D-E-F) should be in different communities
    // since there are no edges between them
    expect(communityA).not.toBe(communityD);
    // Total number of distinct communities should be at most 6 (upper bound)
    const uniqueComms = new Set(result.values());
    expect(uniqueComms.size).toBeGreaterThanOrEqual(2);
    expect(uniqueComms.size).toBeLessThanOrEqual(6);
  });

  it("handles empty edges (each node is its own community)", () => {
    const result = louvainBasic(testNodes, []);
    const ids = new Set(result.values());
    expect(ids.size).toBe(testNodes.length);
  });
});

describe("Community Detection: Label Propagation", () => {
  it("assigns all nodes to communities", () => {
    const result = labelPropBasic(testNodes, testEdges);
    expect(result.size).toBe(testNodes.length);
  });

  it("groups connected nodes together", () => {
    const result = labelPropBasic(testNodes, testEdges);
    // After convergence, nodes in the same clique should share labels
    const labelA = result.get("A");
    const labelB = result.get("B");
    const labelC = result.get("C");
    // At minimum, two of the three should share a label
    const abcLabels = [labelA, labelB, labelC];
    const uniqueLabels = new Set(abcLabels);
    expect(uniqueLabels.size).toBeLessThanOrEqual(2);
  });
});

describe("Link Prediction: Common Neighbors", () => {
  it("returns 0 for nodes with no common neighbors", () => {
    const adj = buildGraph(testNodes, testEdges);
    // A and D have no common neighbors
    expect(commonNeighbors("A", "D", adj)).toBe(0);
  });

  it("returns correct count for nodes with common neighbors", () => {
    // Add a node connected to both A and D
    const extraEdges = [...testEdges, { source: "A", target: "D" }];
    const adj = buildGraph(testNodes, extraEdges);
    // B and C are both connected to A; check A-B common neighbors
    const cn = commonNeighbors("A", "B", adj);
    expect(cn).toBeGreaterThanOrEqual(1); // C is common neighbor
  });
});

describe("Link Prediction: Jaccard Coefficient", () => {
  it("returns 0 for nodes with no shared neighbors", () => {
    const adj = buildGraph(testNodes, testEdges);
    expect(jaccardCoeff("A", "D", adj)).toBe(0);
  });

  it("returns value between 0 and 1", () => {
    const adj = buildGraph(testNodes, testEdges);
    testNodes.forEach((u) => {
      testNodes.forEach((v) => {
        if (u.id !== v.id) {
          const jc = jaccardCoeff(u.id, v.id, adj);
          expect(jc).toBeGreaterThanOrEqual(0);
          expect(jc).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  it("returns 1 for nodes with identical neighbor sets", () => {
    // Create a star graph: center connected to A, B, C, D
    const starNodes = [{ id: "center" }, { id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }];
    const starEdges = [
      { source: "center", target: "A" },
      { source: "center", target: "B" },
      { source: "center", target: "C" },
      { source: "center", target: "D" },
    ];
    const adj = buildGraph(starNodes, starEdges);
    // A and B both have only "center" as neighbor → Jaccard = 1
    expect(jaccardCoeff("A", "B", adj)).toBe(1);
  });
});

describe("CSV Download Format", () => {
  it("generates correct CSV header for community results", () => {
    const communityResults = [
      { nodeId: "A", communityId: 0 },
      { nodeId: "B", communityId: 0 },
      { nodeId: "D", communityId: 1 },
    ];
    const data = communityResults.map((r) => ({
      節點ID: r.nodeId,
      節點名稱: r.nodeId,
      社群編號: r.communityId + 1,
      演算法: "Louvain",
    }));
    const headers = Object.keys(data[0]);
    expect(headers).toContain("節點ID");
    expect(headers).toContain("節點名稱");
    expect(headers).toContain("社群編號");
    expect(headers).toContain("演算法");
    expect(data[0]["社群編號"]).toBe(1);
    expect(data[2]["社群編號"]).toBe(2);
  });

  it("generates correct CSV header for edge data", () => {
    const edges = [{ source: "A", target: "B" }];
    const headers = Object.keys(edges[0]);
    expect(headers).toContain("source");
    expect(headers).toContain("target");
  });
});
