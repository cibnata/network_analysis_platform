import type { EdgeData, NodeData, CommunityResult } from "@/contexts/NetworkContext";

// Build adjacency structures
function buildGraph(nodes: NodeData[], edges: EdgeData[]) {
  const nodeIds = nodes.map((n) => n.id);
  const adj = new Map<string, Set<string>>();
  nodeIds.forEach((id) => adj.set(id, new Set()));
  edges.forEach((e) => {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  });
  return { nodeIds, adj };
}

// ─── Louvain Algorithm (simplified) ─────────────────────────────────────────
export function louvain(nodes: NodeData[], edges: EdgeData[]): CommunityResult[] {
  const { nodeIds, adj } = buildGraph(nodes, edges);
  const m = edges.length;
  if (m === 0) return nodeIds.map((id, i) => ({ nodeId: id, communityId: i }));

  // Initialize: each node in its own community
  const community = new Map<string, number>();
  nodeIds.forEach((id, i) => community.set(id, i));

  const degree = new Map<string, number>();
  nodeIds.forEach((id) => degree.set(id, adj.get(id)?.size || 0));

  let improved = true;
  let iterations = 0;
  const maxIter = 50;

  while (improved && iterations < maxIter) {
    improved = false;
    iterations++;

    for (const nodeId of nodeIds) {
      const currentComm = community.get(nodeId)!;
      const neighbors = adj.get(nodeId) || new Set();

      // Count connections to each neighboring community
      const commWeights = new Map<number, number>();
      neighbors.forEach((nb) => {
        const nbComm = community.get(nb)!;
        commWeights.set(nbComm, (commWeights.get(nbComm) || 0) + 1);
      });

      // Find best community (maximize modularity gain)
      let bestComm = currentComm;
      let bestGain = 0;

      commWeights.forEach((weight, comm) => {
        if (comm === currentComm) return;
        const gain = weight - (degree.get(nodeId)! * weight) / (2 * m);
        if (gain > bestGain) {
          bestGain = gain;
          bestComm = comm;
        }
      });

      if (bestComm !== currentComm) {
        community.set(nodeId, bestComm);
        improved = true;
      }
    }
  }

  // Remap community IDs to 0-based sequential
  const commMap = new Map<number, number>();
  let nextId = 0;
  const results: CommunityResult[] = nodeIds.map((id) => {
    const orig = community.get(id)!;
    if (!commMap.has(orig)) commMap.set(orig, nextId++);
    return { nodeId: id, communityId: commMap.get(orig)! };
  });

  return results;
}

// ─── Label Propagation ────────────────────────────────────────────────────────
export function labelPropagation(nodes: NodeData[], edges: EdgeData[]): CommunityResult[] {
  const { nodeIds, adj } = buildGraph(nodes, edges);
  if (edges.length === 0) return nodeIds.map((id, i) => ({ nodeId: id, communityId: i }));

  const labels = new Map<string, number>();
  nodeIds.forEach((id, i) => labels.set(id, i));

  const shuffled = [...nodeIds];
  let changed = true;
  let iter = 0;

  while (changed && iter < 100) {
    changed = false;
    iter++;

    // Shuffle for random order
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (const nodeId of shuffled) {
      const neighbors = adj.get(nodeId) || new Set();
      if (neighbors.size === 0) continue;

      // Count neighbor labels
      const labelCount = new Map<number, number>();
      neighbors.forEach((nb) => {
        const lbl = labels.get(nb)!;
        labelCount.set(lbl, (labelCount.get(lbl) || 0) + 1);
      });

      // Find most frequent label (break ties randomly)
      let maxCount = 0;
      let bestLabels: number[] = [];
      labelCount.forEach((count, lbl) => {
        if (count > maxCount) {
          maxCount = count;
          bestLabels = [lbl];
        } else if (count === maxCount) {
          bestLabels.push(lbl);
        }
      });

      const newLabel = bestLabels[Math.floor(Math.random() * bestLabels.length)];
      if (newLabel !== labels.get(nodeId)) {
        labels.set(nodeId, newLabel);
        changed = true;
      }
    }
  }

  // Remap
  const commMap = new Map<number, number>();
  let nextId = 0;
  return nodeIds.map((id) => {
    const orig = labels.get(id)!;
    if (!commMap.has(orig)) commMap.set(orig, nextId++);
    return { nodeId: id, communityId: commMap.get(orig)! };
  });
}

// ─── Girvan-Newman (simplified edge betweenness) ──────────────────────────────
export function girvanNewman(nodes: NodeData[], edges: EdgeData[], numCommunities = 4): CommunityResult[] {
  const { nodeIds, adj } = buildGraph(nodes, edges);
  if (edges.length === 0) return nodeIds.map((id, i) => ({ nodeId: id, communityId: i }));

  // Work on a mutable adjacency copy
  const mutableAdj = new Map<string, Set<string>>();
  nodeIds.forEach((id) => mutableAdj.set(id, new Set(adj.get(id))));

  // BFS-based edge betweenness
  function edgeBetweenness(): Map<string, number> {
    const betweenness = new Map<string, number>();

    nodeIds.forEach((src) => {
      // BFS from src
      const dist = new Map<string, number>();
      const sigma = new Map<string, number>();
      const pred = new Map<string, string[]>();
      const queue: string[] = [src];
      const stack: string[] = [];

      nodeIds.forEach((id) => {
        dist.set(id, -1);
        sigma.set(id, 0);
        pred.set(id, []);
      });
      dist.set(src, 0);
      sigma.set(src, 1);

      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);
        const neighbors = mutableAdj.get(v) || new Set();
        neighbors.forEach((w) => {
          if (dist.get(w) === -1) {
            dist.set(w, dist.get(v)! + 1);
            queue.push(w);
          }
          if (dist.get(w) === dist.get(v)! + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            pred.get(w)!.push(v);
          }
        });
      }

      const delta = new Map<string, number>();
      nodeIds.forEach((id) => delta.set(id, 0));

      while (stack.length > 0) {
        const w = stack.pop()!;
        pred.get(w)!.forEach((v) => {
          const c = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
          const edgeKey = [v, w].sort().join("--");
          betweenness.set(edgeKey, (betweenness.get(edgeKey) || 0) + c);
          delta.set(v, delta.get(v)! + c);
        });
      }
    });

    return betweenness;
  }

  function getComponents(): Map<string, number> {
    const visited = new Map<string, number>();
    let compId = 0;
    nodeIds.forEach((id) => {
      if (!visited.has(id)) {
        const queue = [id];
        while (queue.length > 0) {
          const v = queue.shift()!;
          if (visited.has(v)) continue;
          visited.set(v, compId);
          (mutableAdj.get(v) || new Set()).forEach((nb) => {
            if (!visited.has(nb)) queue.push(nb);
          });
        }
        compId++;
      }
    });
    return visited;
  }

  // Iteratively remove highest-betweenness edges
  let components = getComponents();
  const maxIter = Math.min(edges.length, 30);
  let iter = 0;

  while (new Set(components.values()).size < numCommunities && iter < maxIter) {
    iter++;
    const betweenness = edgeBetweenness();
    if (betweenness.size === 0) break;

    // Find edge with max betweenness
    let maxBet = -1;
    let maxEdge = "";
    betweenness.forEach((val, key) => {
      if (val > maxBet) {
        maxBet = val;
        maxEdge = key;
      }
    });

    if (!maxEdge) break;
    const [u, v] = maxEdge.split("--");
    mutableAdj.get(u)?.delete(v);
    mutableAdj.get(v)?.delete(u);

    components = getComponents();
  }

  // Remap
  const commMap = new Map<number, number>();
  let nextId = 0;
  return nodeIds.map((id) => {
    const orig = components.get(id) ?? 0;
    if (!commMap.has(orig)) commMap.set(orig, nextId++);
    return { nodeId: id, communityId: commMap.get(orig)! };
  });
}
