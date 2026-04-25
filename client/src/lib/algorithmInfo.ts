/**
 * 演算法教學說明資料
 * 供 Layout、社群偵測、網絡預測頁面使用
 */

// ─── Layout 演算法 ───────────────────────────────────────────────────────────

export interface LayoutInfo {
  id: string;
  label: string;
  sublabel: string;
  principle: string;
  howItWorks: string;
  useCases: string[];
  pros: string[];
  cons: string[];
  parameters?: { name: string; description: string }[];
  reference?: string;
}

export const LAYOUT_INFO: LayoutInfo[] = [
  {
    id: "cola",
    label: "Force-directed",
    sublabel: "力導向佈局（Cola）",
    principle:
      "力導向演算法將節點視為帶電粒子，邊視為彈簧。節點間的排斥力使其分散，邊的彈力將相連節點拉近，系統在能量最小化時達到平衡，自然呈現網絡的拓撲結構。",
    howItWorks:
      "每次迭代中，演算法計算所有節點對之間的排斥力（Coulomb 斥力）與相連節點的吸引力（Hooke 彈力），疊加後更新節點位置。重複此過程直到系統能量收斂或達到最大迭代次數。Cola（Constraint-based Layout）在標準力導向基礎上加入約束條件，可避免節點重疊。",
    useCases: [
      "一般社交網絡、犯罪關係網絡的初步探索",
      "節點數量中等（50–500 個）的網絡",
      "希望直觀呈現群聚結構與橋接節點",
    ],
    pros: [
      "自動呈現網絡的自然群聚結構",
      "視覺上美觀，易於識別中心節點與邊緣節點",
      "支援迭代次數調整，可控制精細程度",
    ],
    cons: [
      "大型網絡（>1000 節點）計算較慢",
      "結果具隨機性，每次執行可能略有不同",
      "高度連結的密集網絡可能造成節點重疊",
    ],
    parameters: [
      { name: "迭代次數", description: "模擬步驟數，越高越精確但越慢。建議值：100–300" },
      { name: "節點間距（nodeSpacing）", description: "節點間最小距離，避免重疊" },
      { name: "邊長（edgeLengthVal）", description: "理想邊長，影響整體疏密程度" },
    ],
    reference: "Dwyer, T. (2009). Scalable, Versatile and Simple Constrained Graph Layout.",
  },

  {
    id: "dagre",
    label: "Hierarchical",
    sublabel: "層次佈局（Dagre）",
    principle:
      "層次佈局（又稱 Sugiyama 方法）將有向圖的節點按層級由上至下排列，使邊盡量朝同一方向流動。適合呈現具有明確層級關係的網絡，如指揮鏈、資金流向或資訊傳遞路徑。",
    howItWorks:
      "演算法分三個階段：(1) 層次分配：將節點分配到不同層級，使邊盡量向下；(2) 交叉最小化：調整同層節點順序，減少邊的交叉；(3) 座標分配：計算最終 x、y 座標，使佈局美觀。",
    useCases: [
      "犯罪組織的指揮層級分析",
      "資金流向追蹤（誰轉帳給誰）",
      "資訊傳播路徑分析",
      "具有明確上下游關係的有向網絡",
    ],
    pros: [
      "清晰呈現層級結構與流向關係",
      "邊的方向一致，易於追蹤路徑",
      "適合有向圖（Directed Graph）",
    ],
    cons: [
      "對無向圖效果較差",
      "高度連結的網絡可能產生大量交叉邊",
      "不適合循環（Cycle）結構的網絡",
    ],
    parameters: [
      { name: "排列方向（rankDir）", description: "TB（上到下）、LR（左到右）、BT（下到上）、RL（右到左）" },
      { name: "節點間距（nodeSep）", description: "同層節點的水平間距" },
      { name: "層級間距（rankSep）", description: "不同層級之間的垂直間距" },
    ],
    reference: "Sugiyama, K. et al. (1981). Methods for Visual Understanding of Hierarchical System Structures.",
  },
  {
    id: "random",
    label: "Random",
    sublabel: "隨機佈局",
    principle:
      "將節點隨機分布在畫布上，不採用任何最佳化策略。雖然視覺上較為混亂，但可作為其他演算法的初始狀態，或用於觀察網絡在最無序狀態下的連結分布。",
    howItWorks:
      "為每個節點隨機產生 (x, y) 座標，均勻分布在畫布範圍內。每次執行結果不同，具有完全的隨機性。",
    useCases: [
      "快速測試資料是否正確匯入",
      "作為力導向演算法的初始狀態（再切換至 Force-directed）",
      "觀察網絡在無結構假設下的原始樣貌",
    ],
    pros: [
      "計算速度極快",
      "不帶任何結構假設，客觀呈現原始資料",
    ],
    cons: [
      "節點位置無意義，難以進行視覺分析",
      "邊線高度交叉，閱讀困難",
      "每次結果不同，無法重現",
    ],
  },
  {
    id: "fcose",
    label: "fCoSE",
    sublabel: "快速力導向（推薦）",
    principle:
      "fCoSE（Fast Compound Spring Embedder）是 CoSE-Bilkent 的高效能改進版，結合力導向物理模擬與增量式佈局最佳化。它在保持高品質視覺效果的同時，大幅提升運算速度，是目前 Cytoscape.js 生態中最推薦的力導向佈局。",
    howItWorks:
      "演算法分兩階段：(1) 粗化階段（Coarsening）：將圖逐步合併為更小的圖，快速找到近似最佳解；(2) 精化階段（Refinement）：在原始圖上展開並以力導向微調，消除節點重疊並最佳化邊長。支援固定位置、對齊、相對位置等約束條件。",
    useCases: [
      "大型社交網絡（500–5000 節點）的高效視覺化",
      "需要高品質佈局結果且對速度有要求的場景",
      "一般網絡分析的首選佈局",
      "需要指定部分節點固定位置的情境",
    ],
    pros: [
      "速度比 CoSE-Bilkent 快 3–5 倍，品質相當",
      "自動避免節點重疊，佈局整潔",
      "支援複合節點（Compound Nodes）",
      "支援使用者自訂位置約束",
    ],
    cons: [
      "超大型網絡（>5000 節點）仍需較長時間",
      "結果具一定隨機性，每次略有不同",
    ],
    parameters: [
      { name: "迭代次數", description: "力導向模擬步驟數，建議 100–2500" },
      { name: "節點排斥力（nodeRepulsion）", description: "節點間排斥力強度，越大節點越分散" },
      { name: "理想邊長（idealEdgeLength）", description: "邊的目標長度，影響整體疏密" },
    ],
    reference: "Balci, H. et al. (2019). fCoSE: A Fast Compound Graph Layout Algorithm with Constraint Support.",
  },

  {
    id: "breadthfirst",
    label: "Breadthfirst",
    sublabel: "廣度優先樹狀佈局",
    principle:
      "廣度優先佈局從度數最高的節點開始，以廣度優先搜尋（BFS）遍歷圖，將節點按遍歷層次由上至下排列，形成樹狀或層次結構。適合呈現具有明確中心節點的放射狀網絡。",
    howItWorks:
      "選定根節點後，以 BFS 逐層遍歷所有節點，第 0 層（根）置於頂部，第 1 層（直接鄰居）置於第二行，以此類推。同層節點均勻分布在水平方向。",
    useCases: [
      "以特定人物為中心的關係擴散分析",
      "樹狀組織結構或指揮鏈視覺化",
      "資訊傳播路徑分析（從源頭向外擴散）",
      "識別網絡中的直接連結與間接連結層次",
    ],
    pros: [
      "清晰呈現從中心節點向外擴展的層次關係",
      "佈局直觀，易於追蹤路徑",
      "計算速度快，適合大型網絡",
      "內建於 Cytoscape.js，無需額外套件",
    ],
    cons: [
      "對非樹狀結構（有大量環路的圖）效果較差",
      "密集連結的網絡可能產生大量交叉邊",
    ],
    parameters: [
      { name: "根節點（roots）", description: "BFS 起始節點，預設為度數最高的節點" },
      { name: "層間距（spacingFactor）", description: "節點間距的縮放因子" },
    ],
  },
  {
    id: "euler",
    label: "Euler",
    sublabel: "輕量力導向佈局",
    principle:
      "Euler 是一個輕量級的力導向佈局，以歐拉積分法（Euler integration）求解物理模擬方程式。它在檔案大小、執行速度與佈局品質之間取得良好平衡，特別適合中小型網絡的快速視覺化。",
    howItWorks:
      "與 Cola 類似，Euler 將節點視為帶電粒子，邊視為彈簧，透過力學模擬達到能量最小化。使用歐拉積分法更新節點位置，計算簡單但速度快。支援邊長權重，可依 weight 屬性調整邊的理想長度。",
    useCases: [
      "中小型網絡（< 500 節點）的快速探索",
      "加權網絡的視覺化（依 weight 調整邊長）",
      "需要流暢動畫效果的互動式展示",
      "作為 Cola 的輕量替代方案",
    ],
    pros: [
      "套件體積小，載入速度快",
      "動畫流暢，視覺效果佳",
      "支援加權邊，可依 weight 調整佈局",
      "參數簡單，易於調整",
    ],
    cons: [
      "大型網絡（>1000 節點）品質不如 fCoSE",
      "不支援複合節點（Compound Nodes）",
      "對高度密集的網絡可能出現節點重疊",
    ],
    parameters: [
      { name: "排斥力（repulsion）", description: "節點間排斥力強度，越大節點越分散" },
      { name: "彈力（springLength）", description: "邊的理想長度" },
      { name: "重力（gravity）", description: "將節點拉向畫布中心的力，防止節點飛散" },
    ],
    reference: "Klymenko, O. (2018). Euler: A fast, small file-size, high-quality force-directed layout.",
  },
];

// ─── 社群偵測演算法 ──────────────────────────────────────────────────────────

export interface CommunityAlgorithmInfo {
  id: string;
  label: string;
  badge: string;
  complexity: string;
  principle: string;
  howItWorks: string;
  modularity: string;
  useCases: string[];
  pros: string[];
  cons: string[];
  parameters?: { name: string; description: string }[];
  reference?: string;
}

export const COMMUNITY_ALGORITHM_INFO: CommunityAlgorithmInfo[] = [
  {
    id: "louvain",
    label: "Louvain",
    badge: "推薦",
    complexity: "O(n log n)",
    principle:
      "Louvain 演算法是目前最廣泛使用的社群偵測方法，以最大化「模組度（Modularity）」為目標。模組度衡量網絡中實際邊數與隨機網絡中預期邊數的差異，值越高代表社群結構越明顯。",
    howItWorks:
      "演算法分兩個階段反覆執行：第一階段（局部最佳化）：每個節點嘗試加入鄰居的社群，若能提升模組度則移動，重複直到無法再提升；第二階段（網絡壓縮）：將每個社群壓縮為單一超節點，建立新的網絡。兩階段交替執行，形成層次化的社群結構。",
    modularity:
      "模組度 Q = Σ[Aij - ki·kj/(2m)] × δ(ci, cj) / (2m)，其中 Aij 為鄰接矩陣，ki 為節點度數，m 為總邊數，δ 為 Kronecker delta（同社群為 1，否則為 0）。Q 值範圍 [-0.5, 1]，通常 Q > 0.3 代表顯著的社群結構。",
    useCases: [
      "大型社交網絡的社群發現（百萬節點以上）",
      "犯罪集團的派系識別",
      "需要快速且準確結果的情境",
      "不確定社群數量時的探索性分析",
    ],
    pros: [
      "速度快，可處理大規模網絡",
      "自動決定社群數量，無需預設",
      "結果穩定，模組度有明確的數學意義",
      "產生層次化社群結構，可觀察不同粒度",
    ],
    cons: [
      "對小型社群（< √(2m) 個節點）的識別能力較弱（解析度限制問題）",
      "結果具有一定隨機性，多次執行可能略有不同",
    ],
    reference: "Blondel, V. D. et al. (2008). Fast unfolding of communities in large networks. Journal of Statistical Mechanics.",
  },
  {
    id: "label-propagation",
    label: "Label Propagation",
    badge: "快速",
    complexity: "O(n + m)",
    principle:
      "標籤傳播演算法（LPA）基於一個直觀假設：在密集連結的社群中，節點的標籤（社群編號）會自然地向鄰居傳播，最終同一社群的節點會收斂到相同的標籤。",
    howItWorks:
      "初始化：每個節點獲得唯一標籤（即自身 ID）。傳播階段：隨機選取節點，將其標籤更新為鄰居中出現最多次的標籤（多數決）。若有平手，隨機選擇一個。重複傳播直到所有節點的標籤不再改變（收斂）。擁有相同標籤的節點即屬同一社群。",
    modularity:
      "LPA 不直接最佳化模組度，而是透過局部多數決讓社群自然浮現。收斂後可計算模組度作為評估指標，但不保證全域最佳。",
    useCases: [
      "需要極快速結果的即時分析",
      "超大型網絡（百萬節點以上）",
      "作為其他演算法的初始社群分配",
      "網絡結構較為清晰、社群邊界明顯的情境",
    ],
    pros: [
      "時間複雜度接近線性，速度最快",
      "實作簡單，易於理解",
      "不需要預設社群數量",
      "記憶體需求低",
    ],
    cons: [
      "結果不穩定，多次執行可能產生截然不同的社群劃分",
      "對社群邊界模糊的網絡效果較差",
      "可能產生少數超大社群（巨型社群問題）",
    ],
    reference: "Raghavan, U. N. et al. (2007). Near linear time algorithm to detect community structures in large-scale networks. Physical Review E.",
  },
  {
    id: "girvan-newman",
    label: "Girvan-Newman",
    badge: "精確",
    complexity: "O(n · m²)",
    principle:
      "Girvan-Newman 演算法基於「邊介數（Edge Betweenness）」的概念：連接不同社群的橋接邊，必然會被大量最短路徑經過，因此具有高邊介數。透過反覆移除高介數邊，可逐步分解網絡為獨立社群。",
    howItWorks:
      "計算所有邊的邊介數（通過該邊的最短路徑數量）。移除介數最高的邊。重新計算剩餘邊的介數（因網絡結構已改變）。重複步驟 1–3，直到網絡分裂為目標數量的連通分量（社群）。此過程形成樹狀的層次化社群結構（Dendrogram）。",
    modularity:
      "每次移除邊後可計算當前分割的模組度 Q，選取 Q 最大時的社群劃分作為最終結果。也可由使用者指定目標社群數量，在達到該數量時停止。",
    useCases: [
      "小型至中型網絡（< 500 節點）的精確社群分析",
      "需要了解社群層次結構的研究",
      "識別網絡中的關鍵橋接節點（移除後網絡分裂）",
      "犯罪網絡中關鍵中間人（Broker）的識別",
    ],
    pros: [
      "理論基礎清晰，結果可解釋性強",
      "能識別橋接邊與關鍵中間人",
      "產生完整的層次化社群樹狀圖",
      "結果確定性高，相同輸入產生相同輸出",
    ],
    cons: [
      "時間複雜度高，不適合大型網絡",
      "每次移除邊後需重新計算所有邊介數，計算量大",
      "對加權網絡的支援較弱",
    ],
    parameters: [
      { name: "目標社群數量", description: "指定最終要分割成幾個社群。若不確定，可觀察模組度變化曲線選擇最佳值" },
    ],
    reference: "Girvan, M. & Newman, M. E. J. (2002). Community structure in social and biological networks. PNAS.",
  },
  {
    id: "leiden",
    label: "Leiden",
    badge: "高品質",
    complexity: "O(n log n)",
    principle:
      "Leiden 演算法是 Louvain 的改良版，由 Traag 等人於 2019 年提出。研究發現 Louvain 有時會產生內部不連通的社群（即社群內部存在孤立子群），Leiden 透過新增「精緻（Refinement）」階段解決此問題，保證每個社群都是內部連通的。",
    howItWorks:
      "演算法分三個階段：第一階段（局部移動）：與 Louvain 相同，每個節點嘗試移動到能最大化模組度增益的鄰居社群，但 Leiden 只重新訪問鄰居有變化的節點，速度更快；第二階段（精緻分割）：對第一階段找到的每個社群，嘗試在其內部進一步細分，允許隨機合併以探索更廣的解空間；第三階段（網絡壓縮）：將精緻後的社群壓縮為超節點，建立新網絡，重複執行直到收斂。",
    modularity:
      "與 Louvain 使用相同的模組度公式 Q，但精緻階段允許隨機探索，避免陷入局部最佳解。Leiden 保證最終每個社群都是 γ-分離的（內部連通且與外部弱連接），品質更有保障。",
    useCases: [
      "需要高品質社群結果的學術研究",
      "大型社交網絡分析（百萬節點以上）",
      "Louvain 結果出現不連通社群時的替代方案",
      "需要可重複且穩定結果的分析",
    ],
    pros: [
      "保證社群內部連通，品質優於 Louvain",
      "速度與 Louvain 相當，適合大規模網絡",
      "精緻階段能探索更廣的解空間，避免局部最佳",
      "自動決定社群數量",
    ],
    cons: [
      "實作複雜度高於 Louvain",
      "精緻階段引入隨機性，多次執行結果略有差異",
      "對極小型社群（< 3 節點）的識別效果有限",
    ],
    reference: "Traag, V. A. et al. (2019). From Louvain to Leiden: guaranteeing well-connected communities. Scientific Reports.",
  },
  {
    id: "walktrap",
    label: "Walktrap",
    badge: "穩定",
    complexity: "O(n² log n)",
    principle:
      "Walktrap 演算法由 Pons 與 Latapy 於 2005 年提出，基於隨機遊走（Random Walk）的直覺：在密集連結的社群內部，短距離隨機遊走會傾向於停留在同一社群中，而不會輕易跨越社群邊界。透過測量節點間的隨機遊走距離，可識別結構相似的節點群體。",
    howItWorks:
      "計算每個節點的 t 步隨機遊走機率分布（預設 t=4）。定義節點間距離：若兩節點的隨機遊走分布相似，則距離小，屬於同一社群。使用層次聚合式分群（Hierarchical Agglomerative Clustering）：從每個節點各自為一個社群開始，反覆合併距離最小的相鄰社群對，直到達到目標社群數量（預設 √n）。",
    modularity:
      "Walktrap 使用隨機遊走距離而非模組度作為合併標準，但最終可計算模組度評估結果品質。其距離定義為：d(i,j) = √Σ_k (P^t_{ik}/√d_k - P^t_{jk}/√d_k)²，其中 P^t 為 t 步轉移矩陣。",
    useCases: [
      "中小型網絡（< 1000 節點）的精確社群分析",
      "需要穩定且可重複結果的研究",
      "網絡具有層次化社群結構的分析",
      "社群邊界不明顯、密度差異較小的網絡",
    ],
    pros: [
      "結果穩定，多次執行差異小",
      "能識別層次化社群結構",
      "對社群大小不均勻的網絡表現良好",
      "理論基礎嚴謹，基於隨機遊走的數學性質",
    ],
    cons: [
      "時間複雜度較高，不適合超大型網絡（> 10000 節點）",
      "需要預設步數 t，不同 t 值可能影響結果",
      "對稀疏網絡效果較差（隨機遊走容易陷入孤立節點）",
    ],
    reference: "Pons, P. & Latapy, M. (2005). Computing communities in large networks using random walks. ISCIS.",
  },
  {
    id: "greedy-modularity",
    label: "Greedy Modularity (CNM)",
    badge: "大圖適用",
    complexity: "O(n log² n)",
    principle:
      "Greedy Modularity 演算法（又稱 Clauset-Newman-Moore 演算法，CNM）由 Clauset 等人於 2004 年提出，是一種自底向上的貪婪合併策略：從每個節點各自為一個社群開始，每次合併能最大化模組度增益（ΔQ）的相鄰社群對，直到無法再提升模組度為止。",
    howItWorks:
      "初始化：每個節點為獨立社群，計算所有相鄰社群對的 ΔQ。貪婪合併：選取 ΔQ 最大的社群對進行合併，更新相關的 ΔQ 值。重複合併直到 ΔQ ≤ 0（合併不再提升模組度）或達到目標社群數量。使用優先佇列（Heap）加速尋找最大 ΔQ，達到接近線性的時間複雜度。",
    modularity:
      "ΔQ(i,j) = 2(e_ij - a_i × a_j)，其中 e_ij 為社群 i 與 j 之間的邊佔總邊數的比例，a_i 為社群 i 的邊端點佔總邊端點的比例。每次選取 ΔQ 最大的合併，保證每步都是局部最佳。",
    useCases: [
      "大型稀疏網絡（萬節點以上）的快速社群分析",
      "需要模組度最佳化保證的研究",
      "資源有限環境下的快速社群偵測",
      "作為其他演算法的基準比較",
    ],
    pros: [
      "速度快，適合大型稀疏網絡",
      "直接最佳化模組度，結果有明確的數學保證",
      "確定性演算法，相同輸入產生相同輸出",
      "自動決定社群數量",
    ],
    cons: [
      "貪婪策略可能陷入局部最佳解，全域模組度不如 Louvain",
      "對稠密網絡效率較低",
      "同樣受到模組度解析度限制（小社群識別能力弱）",
    ],
    reference: "Clauset, A. et al. (2004). Finding community structure in very large networks. Physical Review E.",
  },
];

// ─── 網絡預測演算法 ──────────────────────────────────────────────────────────

export interface PredictionAlgorithmInfo {
  id: string;
  label: string;
  type: "add" | "remove";
  metrics: {
    name: string;
    formula: string;
    explanation: string;
    range: string;
  }[];
  principle: string;
  howItWorks: string;
  useCases: string[];
  pros: string[];
  cons: string[];
  interpretation: string;
  reference?: string;
}

export const PREDICTION_ALGORITHM_INFO: PredictionAlgorithmInfo[] = [
  {
    id: "link-prediction",
    label: "Link Prediction（連結生成預測）",
    type: "add",
    principle:
      "連結預測（Link Prediction）旨在預測網絡中尚未存在但未來可能出現的邊。核心假設是：兩個節點若有較多共同鄰居，或在結構上較為相似，則未來建立連結的可能性越高。",
    howItWorks:
      "本系統整合三種相似度指標，對每對未連結的節點計算加權分數，取 Top K 分數最高的節點對作為預測結果。",
    metrics: [
      {
        name: "Common Neighbors（共同鄰居）",
        formula: "CN(u,v) = |N(u) ∩ N(v)|",
        explanation: "計算兩節點共同鄰居的數量。共同鄰居越多，代表兩人在同一社交圈中互動頻繁，建立直接連結的可能性越高。",
        range: "0 到 min(deg(u), deg(v))，值越大代表越可能連結",
      },
      {
        name: "Jaccard Coefficient（Jaccard 係數）",
        formula: "J(u,v) = |N(u) ∩ N(v)| / |N(u) ∪ N(v)|",
        explanation: "在共同鄰居的基礎上，除以兩節點鄰居的聯集大小，進行正規化。避免高度數節點因鄰居多而得分虛高，更公平地比較不同度數的節點對。",
        range: "0 到 1，值越接近 1 代表鄰居重疊程度越高",
      },
      {
        name: "Adamic-Adar Index（Adamic-Adar 指數）",
        formula: "AA(u,v) = Σ 1/log(|N(w)|)，w ∈ N(u) ∩ N(v)",
        explanation: "對每個共同鄰居 w，以其度數的對數倒數加權。低度數的共同鄰居（小圈子）貢獻更高的分數，因為在小圈子中的共同認識比在大圈子中更具意義。",
        range: "0 到正無窮，值越大代表連結可能性越高",
      },
    ],
    useCases: [
      "預測犯罪嫌疑人之間可能建立的新聯繫",
      "社交網絡中的好友推薦系統",
      "生物網絡中預測蛋白質交互作用",
      "學術合作網絡中預測未來合著關係",
    ],
    pros: [
      "計算簡單，不需要節點屬性資訊",
      "三種指標互補，整合後預測更穩健",
      "可解釋性強，分數有明確的數學意義",
    ],
    cons: [
      "僅考慮局部結構（鄰居），忽略全局網絡特性",
      "對稀疏網絡（邊數少）效果較差",
      "無法處理節點屬性或時間序列資訊",
    ],
    interpretation:
      "預測分數越高，代表兩節點在結構上越相似，未來建立連結的可能性越大。圖中以 Ash Grey 虛線標示預測新增的連結，分數顯示於結果列表中。",
    reference: "Liben-Nowell, D. & Kleinberg, J. (2007). The link-prediction problem for social networks. JASIST.",
  },
  {
    id: "link-dissolution",
    label: "Link Dissolution（連結斷開預測）",
    type: "remove",
    principle:
      "連結斷開預測（Link Dissolution）旨在識別網絡中結構脆弱、未來可能消失的邊。核心假設是：若兩個相連節點缺乏共同鄰居支撐（即弱連結），且彼此的社交圈差異大，則該連結較不穩定。",
    howItWorks:
      "本系統從三個維度評估每條現有邊的脆弱程度，分數越高代表越可能斷開。",
    metrics: [
      {
        name: "弱連結強度（Weak Tie Strength）",
        formula: "WTS(u,v) = 1 / (1 + |N(u) ∩ N(v)|)",
        explanation: "共同鄰居越少，連結強度越弱。沒有共同鄰居的邊（橋接邊）得分最高，是最可能斷開的連結。這呼應了 Granovetter 的「弱連結理論」：橋接不同社群的弱連結雖重要，但也最脆弱。",
        range: "0 到 1，值越接近 1 代表連結越脆弱",
      },
      {
        name: "度數差異（Degree Disparity）",
        formula: "DD(u,v) = |deg(u) - deg(v)| / (deg(u) + deg(v))",
        explanation: "若兩節點的度數差異懸殊（一個是核心節點，一個是邊緣節點），則該連結較不穩定，因為核心節點有更多替代連結選擇，而邊緣節點難以維持與核心節點的關係。",
        range: "0 到 1，值越接近 1 代表度數差異越大",
      },
      {
        name: "鄰居重疊度（Neighborhood Overlap）",
        formula: "NO(u,v) = 1 - |N(u) ∩ N(v)| / |N(u) ∪ N(v)|",
        explanation: "鄰居重疊度低（即 Jaccard 係數低）的邊，代表兩節點分屬不同社群，連結跨越社群邊界，較容易斷裂。",
        range: "0 到 1，值越接近 1 代表鄰居重疊越少",
      },
    ],
    useCases: [
      "識別犯罪網絡中的脆弱連結，預測組織分裂點",
      "社交網絡中預測友誼關係的消退",
      "供應鏈網絡中識別高風險的合作關係",
      "評估網絡韌性，找出最容易被切斷的橋接邊",
    ],
    pros: [
      "識別網絡的結構脆弱點，具有重要的安全分析價值",
      "結合多個互補指標，預測更全面",
      "可用於評估網絡的整體穩定性",
    ],
    cons: [
      "預測準確度受網絡密度影響，稀疏網絡中幾乎所有邊都是弱連結",
      "未考慮邊的時間資訊（如連結建立時間）",
      "無法區分主動斷裂與被動消失",
    ],
    interpretation:
      "預測分數越高，代表該連結在結構上越脆弱，未來斷開的可能性越大。圖中以 Cherry Blossom 虛線標示預測可能斷開的連結，分數顯示於結果列表中。",
    reference: "Granovetter, M. S. (1973). The Strength of Weak Ties. American Journal of Sociology.",
  },
];
