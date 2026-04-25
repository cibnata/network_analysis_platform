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

// ─── Leiden Algorithm ─────────────────────────────────────────────────────────
// Improved version of Louvain that guarantees well-connected communities.
// Adds a refinement phase that can split communities found in the local-move phase.
export function leiden(nodes: NodeData[], edges: EdgeData[]): CommunityResult[] {
  const { nodeIds, adj } = buildGraph(nodes, edges);
  const m = edges.length;
  if (m === 0) return nodeIds.map((id, i) => ({ nodeId: id, communityId: i }));

  // Build weighted adjacency (weight = 1 for unweighted)
  const weightedAdj = new Map<string, Map<string, number>>();
  nodeIds.forEach((id) => weightedAdj.set(id, new Map()));
  edges.forEach((e) => {
    const w = typeof e.weight === "number" ? e.weight : 1;
    const wAdj = weightedAdj.get(e.source)!;
    wAdj.set(e.target, (wAdj.get(e.target) || 0) + w);
    const wAdj2 = weightedAdj.get(e.target)!;
    wAdj2.set(e.source, (wAdj2.get(e.source) || 0) + w);
  });

  const totalWeight = edges.reduce((s, e) => s + (typeof e.weight === "number" ? e.weight : 1), 0);
  const degree = new Map<string, number>();
  nodeIds.forEach((id) => {
    let d = 0;
    weightedAdj.get(id)!.forEach((w) => (d += w));
    degree.set(id, d);
  });

  // Phase 1: Local moving (same as Louvain but with weighted modularity)
  const community = new Map<string, number>();
  nodeIds.forEach((id, i) => community.set(id, i));

  let improved = true;
  let iter = 0;
  const maxIter = 100;
  while (improved && iter < maxIter) {
    improved = false;
    iter++;
    // Shuffle node order for randomness
    const shuffled = [...nodeIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (const nodeId of shuffled) {
      const currentComm = community.get(nodeId)!;
      const neighbors = weightedAdj.get(nodeId)!;
      const commWeights = new Map<number, number>();
      neighbors.forEach((w, nb) => {
        const nbComm = community.get(nb)!;
        commWeights.set(nbComm, (commWeights.get(nbComm) || 0) + w);
      });
      let bestComm = currentComm;
      let bestGain = 0;
      const ki = degree.get(nodeId)!;
      commWeights.forEach((kc, comm) => {
        if (comm === currentComm) return;
        const gain = kc / totalWeight - (ki * kc) / (2 * totalWeight * totalWeight);
        if (gain > bestGain) { bestGain = gain; bestComm = comm; }
      });
      if (bestComm !== currentComm) { community.set(nodeId, bestComm); improved = true; }
    }
  }

  // Phase 2: Refinement — try to split each community into sub-communities
  // For each community, run a mini local-move on its subgraph
  const commGroups = new Map<number, string[]>();
  nodeIds.forEach((id) => {
    const c = community.get(id)!;
    if (!commGroups.has(c)) commGroups.set(c, []);
    commGroups.get(c)!.push(id);
  });

  const refined = new Map<string, number>(community);
  let nextCommId = Math.max(...Array.from(community.values())) + 1;

  commGroups.forEach((members) => {
    if (members.length <= 2) return;
    // Build internal adjacency
    const memberSet = new Set(members);
    const subComm = new Map<string, number>();
    members.forEach((id, i) => subComm.set(id, i));
    let subImproved = true;
    let subIter = 0;
    while (subImproved && subIter < 20) {
      subImproved = false;
      subIter++;
      for (const nodeId of members) {
        const currentSub = subComm.get(nodeId)!;
        const neighbors = weightedAdj.get(nodeId)!;
        const subCommWeights = new Map<number, number>();
        neighbors.forEach((w, nb) => {
          if (!memberSet.has(nb)) return;
          const nbSub = subComm.get(nb)!;
          subCommWeights.set(nbSub, (subCommWeights.get(nbSub) || 0) + w);
        });
        let bestSub = currentSub;
        let bestGain = 0;
        subCommWeights.forEach((w, sub) => {
          if (sub === currentSub) return;
          if (w > bestGain) { bestGain = w; bestSub = sub; }
        });
        if (bestSub !== currentSub) { subComm.set(nodeId, bestSub); subImproved = true; }
      }
    }
    // Map sub-communities back to global IDs
    const subMap = new Map<number, number>();
    members.forEach((id) => {
      const sub = subComm.get(id)!;
      if (!subMap.has(sub)) subMap.set(sub, nextCommId++);
      refined.set(id, subMap.get(sub)!);
    });
  });

  // Remap to 0-based sequential
  const commMap = new Map<number, number>();
  let nextId = 0;
  return nodeIds.map((id) => {
    const orig = refined.get(id)!;
    if (!commMap.has(orig)) commMap.set(orig, nextId++);
    return { nodeId: id, communityId: commMap.get(orig)! };
  });
}

// ─── Walktrap Algorithm ───────────────────────────────────────────────────────
// Random-walk based community detection. Short random walks tend to stay within
// densely connected communities. Uses hierarchical agglomerative clustering.
export function walktrap(nodes: NodeData[], edges: EdgeData[], steps = 4): CommunityResult[] {
  const { nodeIds, adj } = buildGraph(nodes, edges);
  const n = nodeIds.length;
  if (n === 0) return [];
  if (edges.length === 0) return nodeIds.map((id, i) => ({ nodeId: id, communityId: i }));

  const idxMap = new Map<string, number>();
  nodeIds.forEach((id, i) => idxMap.set(id, i));

  // Degree array
  const deg = nodeIds.map((id) => adj.get(id)!.size || 1);

  // Transition probability matrix P[i][j] = 1/deg[i] if edge exists
  // Compute t-step random walk probability: P^t
  // We approximate P^t via repeated matrix-vector multiplication
  // For each node i, compute r_i = P^t * e_i (probability distribution after t steps from i)
  function randomWalkDist(startIdx: number): Float64Array {
    const dist = new Float64Array(n);
    dist[startIdx] = 1.0;
    for (let step = 0; step < steps; step++) {
      const next = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        if (dist[i] === 0) continue;
        const id = nodeIds[i];
        const neighbors = adj.get(id)!;
        const d = deg[i];
        neighbors.forEach((nb) => {
          const j = idxMap.get(nb)!;
          next[j] += dist[i] / d;
        });
      }
      dist.set(next);
    }
    return dist;
  }

  // Compute distance between two nodes based on their walk distributions
  // d(i,j) = sqrt( sum_k ( r_i[k]/deg[k] - r_j[k]/deg[k] )^2 * deg[k] )
  // Simplified: Euclidean distance between normalized walk vectors
  function walkDistance(ri: Float64Array, rj: Float64Array): number {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const dk = deg[k];
      const diff = ri[k] / Math.sqrt(dk) - rj[k] / Math.sqrt(dk);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  // Compute walk distributions for all nodes
  const walks = nodeIds.map((_, i) => randomWalkDist(i));

  // Hierarchical agglomerative clustering (single-linkage for speed)
  // Each node starts in its own cluster
  const clusters: number[] = nodeIds.map((_, i) => i); // cluster assignment
  const clusterMembers: Map<number, number[]> = new Map();
  nodeIds.forEach((_, i) => clusterMembers.set(i, [i]));

  // Only merge nodes that are connected (neighbors)
  // Compute pairwise distances for edges only
  let numClusters = n;
  const targetClusters = Math.max(2, Math.round(Math.sqrt(n)));
  const maxMerges = n - targetClusters;

  for (let merge = 0; merge < maxMerges; merge++) {
    // Find minimum distance pair among adjacent clusters
    let minDist = Infinity;
    let bestI = -1, bestJ = -1;

    for (let i = 0; i < n; i++) {
      const id = nodeIds[i];
      const ci = clusters[i];
      adj.get(id)!.forEach((nb) => {
        const j = idxMap.get(nb)!;
        const cj = clusters[j];
        if (ci >= cj) return; // avoid duplicates
        const d = walkDistance(walks[i], walks[j]);
        if (d < minDist) { minDist = d; bestI = ci; bestJ = cj; }
      });
    }
    if (bestI === -1) break;

    // Merge cluster bestJ into bestI
    const membersJ = clusterMembers.get(bestJ)!;
    const membersI = clusterMembers.get(bestI)!;
    membersJ.forEach((idx) => { clusters[idx] = bestI; membersI.push(idx); });
    clusterMembers.delete(bestJ);
    numClusters--;
  }

  // Remap to 0-based sequential
  const commMap = new Map<number, number>();
  let nextId = 0;
  return nodeIds.map((id, i) => {
    const orig = clusters[i];
    if (!commMap.has(orig)) commMap.set(orig, nextId++);
    return { nodeId: id, communityId: commMap.get(orig)! };
  });
}

// ─── Greedy Modularity (CNM / Clauset-Newman-Moore) ──────────────────────────
// Greedily merges communities to maximize modularity gain.
// Fast O(n log^2 n) algorithm suitable for large sparse networks.
export function greedyModularity(nodes: NodeData[], edges: EdgeData[]): CommunityResult[] {
  const { nodeIds, adj } = buildGraph(nodes, edges);
  const m = edges.length;
  if (m === 0) return nodeIds.map((id, i) => ({ nodeId: id, communityId: i }));

  const idxMap = new Map<string, number>();
  nodeIds.forEach((id, i) => idxMap.set(id, i));
  const n = nodeIds.length;

  // Degree
  const deg = nodeIds.map((id) => adj.get(id)!.size);
  const twoM = 2 * m;

  // Each node starts in its own community
  const community = nodeIds.map((_, i) => i);

  // e[i][j] = fraction of edges between community i and j
  // a[i] = fraction of edge ends in community i = deg[i] / 2m
  const eMatrix = new Map<string, number>(); // key = "i,j" with i < j
  const a = deg.map((d) => d / twoM);

  // Initialize eMatrix from edges
  edges.forEach((edge) => {
    const i = idxMap.get(edge.source)!;
    const j = idxMap.get(edge.target)!;
    if (i === j) return;
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    eMatrix.set(key, (eMatrix.get(key) || 0) + 1 / twoM);
  });

  // Initial modularity Q = sum_i (e[i][i] - a[i]^2)
  // Since we start with each node as its own community, Q_initial = sum_i (e[i][i] - a[i]^2)
  // e[i][i] = 0 (no self-loops), so Q = -sum a[i]^2

  // deltaQ[i][j] = 2*(e[i][j] - a[i]*a[j]) for adjacent communities
  function getDeltaQ(ci: number, cj: number): number {
    const key = ci < cj ? `${ci},${cj}` : `${cj},${ci}`;
    const eij = eMatrix.get(key) || 0;
    return 2 * (eij - a[ci] * a[cj]);
  }

  // Track active communities
  const active = new Set<number>(nodeIds.map((_, i) => i));
  // Map from node index to community
  const nodeComm = nodeIds.map((_, i) => i);

  const targetCommunities = Math.max(2, Math.round(Math.sqrt(n)));
  const maxMerges = n - targetCommunities;

  for (let merge = 0; merge < maxMerges; merge++) {
    // Find pair of adjacent communities with maximum deltaQ
    let bestDelta = -Infinity;
    let bestCi = -1, bestCj = -1;

    eMatrix.forEach((eij, key) => {
      const [si, sj] = key.split(",").map(Number);
      if (!active.has(si) || !active.has(sj)) return;
      const delta = 2 * (eij - a[si] * a[sj]);
      if (delta > bestDelta) { bestDelta = delta; bestCi = si; bestCj = sj; }
    });

    if (bestCi === -1 || bestDelta < 0) break; // No beneficial merge

    // Merge bestCj into bestCi
    // Update a: a[ci] += a[cj]
    a[bestCi] += a[bestCj];
    active.delete(bestCj);

    // Update nodeComm
    for (let i = 0; i < n; i++) {
      if (nodeComm[i] === bestCj) nodeComm[i] = bestCi;
    }

    // Update eMatrix: for each community k adjacent to bestCj, merge into bestCi
    const toUpdate = new Map<number, number>();
    eMatrix.forEach((eij, key) => {
      const [si, sj] = key.split(",").map(Number);
      if (si === bestCj || sj === bestCj) {
        const other = si === bestCj ? sj : si;
        if (other === bestCi) return;
        toUpdate.set(other, (toUpdate.get(other) || 0) + eij);
        eMatrix.delete(key);
      }
    });
    // Remove old bestCi-bestCj entry
    const oldKey = bestCi < bestCj ? `${bestCi},${bestCj}` : `${bestCj},${bestCi}`;
    eMatrix.delete(oldKey);

    toUpdate.forEach((val, other) => {
      if (!active.has(other)) return;
      const newKey = bestCi < other ? `${bestCi},${other}` : `${other},${bestCi}`;
      eMatrix.set(newKey, (eMatrix.get(newKey) || 0) + val);
    });
  }

  // Remap to 0-based sequential
  const commMap = new Map<number, number>();
  let nextId = 0;
  return nodeIds.map((id, i) => {
    const orig = nodeComm[i];
    if (!commMap.has(orig)) commMap.set(orig, nextId++);
    return { nodeId: id, communityId: commMap.get(orig)! };
  });
}
