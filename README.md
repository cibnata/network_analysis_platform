# 網絡分析練習平台

> 一個專為犯罪情資分析課程設計的互動式社會網絡分析（SNA）全端 Web 應用程式，支援多格式資料匯入、網絡圖視覺化、社群偵測、連結預測與統計分析。

---

## 功能模組

本平台提供六大核心分析模組，涵蓋完整的社會網絡分析工作流程：

| 模組 | 說明 |
|---|---|
| **資料匯入** | 支援 CSV、Excel、TXT、PDF、UCINET DL、Pajek NET 六種格式；可分別匯入邊資料（Edge）與節點屬性（Node Attributes） |
| **資料處理** | One-mode 轉置：將二模資料（行動者–事件）轉換為一模網絡（行動者–行動者），並計算共同參與次數作為邊的權重 |
| **網絡繪製** | 基於 Cytoscape.js 的互動式網絡圖，支援 6 種布局演算法、節點/邊顏色自訂、標籤編輯、搜尋高亮、PNG 匯出等 |
| **社群偵測** | 6 種演算法：Louvain、Label Propagation、Girvan-Newman、Leiden、Walktrap、Greedy Modularity（CNM） |
| **網絡預測** | Link Prediction（Common Neighbors、Jaccard、Adamic-Adar）與 Link Dissolution（弱連結偵測） |
| **統計分析** | 網絡概覽、節點屬性統計、四種中心性排名（Degree、Betweenness、Closeness、Eigenvector/PageRank）、社群統計 |

---

## 技術架構

```
前端：React 19 + Tailwind CSS 4 + shadcn/ui + Cytoscape.js
後端：Express 4 + tRPC 11 + Drizzle ORM
資料庫：MySQL / TiDB
語言：TypeScript（strict mode）
測試：Vitest
套件管理：pnpm
```

### 主要相依套件

| 套件 | 版本 | 用途 |
|---|---|---|
| `cytoscape` | ^3.33.2 | 網絡圖視覺化核心 |
| `cytoscape-cola` | ^2.5.1 | Cola 力導向布局 |
| `cytoscape-dagre` | ^2.5.0 | Dagre 階層布局 |
| `cytoscape-fcose` | ^2.2.0 | fCoSE 快速力導向布局 |
| `cytoscape-euler` | ^1.2.3 | Euler 輕量力導向布局 |
| `@trpc/server` + `@trpc/client` | ^11.6.0 | 端對端型別安全 API |
| `drizzle-orm` | ^0.44.5 | 型別安全 ORM |
| `xlsx` | ^0.18.5 | Excel 檔案解析 |
| `papaparse` | ^5.5.3 | CSV 解析 |
| `pdfjs-dist` | ^5.6.205 | PDF 文字提取 |
| `recharts` | ^2.15.2 | 統計圖表 |
| `zod` | ^4.1.12 | 資料驗證 |

---

## 本地開發環境設定

### 系統需求

- Node.js 18 以上
- pnpm 10 以上
- MySQL 8.0 以上（或 TiDB）

### 安裝步驟

```bash
# 1. 複製專案
git clone <your-repo-url>
cd network_analysis_platform

# 2. 安裝相依套件
pnpm install

# 3. 設定環境變數（複製範本後填入實際值）
cp .env.example .env

# 4. 推送資料庫 Schema
pnpm db:push

# 5. 啟動開發伺服器
pnpm dev
```

開發伺服器預設運行於 `http://localhost:3000`。

### 環境變數說明

| 變數名稱 | 說明 |
|---|---|
| `DATABASE_URL` | MySQL / TiDB 連線字串 |
| `JWT_SECRET` | Session Cookie 簽署金鑰 |
| `VITE_APP_ID` | Manus OAuth 應用程式 ID |
| `OAUTH_SERVER_URL` | Manus OAuth 後端基底 URL |
| `VITE_OAUTH_PORTAL_URL` | Manus 登入入口 URL（前端） |
| `OWNER_OPEN_ID` | 平台擁有者 Open ID |
| `OWNER_NAME` | 平台擁有者名稱 |
| `BUILT_IN_FORGE_API_URL` | Manus 內建 API 基底 URL |
| `BUILT_IN_FORGE_API_KEY` | Manus 內建 API 金鑰（伺服器端） |
| `VITE_FRONTEND_FORGE_API_URL` | Manus 內建 API URL（前端） |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus 內建 API 金鑰（前端） |

> **注意**：本專案的身份驗證與資料庫服務深度整合 Manus 平台，若需在其他環境部署，需自行替換 OAuth 與資料庫服務。

---

## 常用指令

```bash
pnpm dev          # 啟動開發伺服器（含 Hot Reload）
pnpm build        # 建置生產版本
pnpm start        # 啟動生產伺服器
pnpm test         # 執行 Vitest 單元測試
pnpm check        # TypeScript 型別檢查
pnpm db:push      # 產生並執行資料庫遷移
pnpm format       # Prettier 格式化程式碼
```

---

## 專案結構

```
network_analysis_platform/
├── client/
│   ├── public/              # 靜態設定檔（favicon 等）
│   └── src/
│       ├── components/      # 可重用 UI 元件（shadcn/ui + 自訂）
│       ├── contexts/        # React Context（NetworkContext 全域狀態）
│       ├── hooks/           # 自訂 React Hooks
│       ├── lib/             # 工具函式（演算法、解析器、tRPC 客戶端）
│       ├── pages/           # 頁面元件
│       │   ├── Home.tsx           # 首頁
│       │   ├── DataImport.tsx     # 資料匯入（Edge + Node 屬性）
│       │   ├── DataTransform.tsx  # 資料處理（One-mode 轉置）
│       │   ├── NetworkVisualize.tsx  # 網絡繪製
│       │   ├── CommunityDetection.tsx  # 社群偵測
│       │   ├── NetworkPrediction.tsx   # 網絡預測
│       │   └── Statistics.tsx     # 統計分析
│       ├── App.tsx          # 路由設定
│       └── main.tsx         # 應用程式進入點
├── drizzle/
│   └── schema.ts            # 資料庫 Schema 定義
├── server/
│   ├── _core/               # 框架核心（OAuth、tRPC、Express）
│   ├── db.ts                # 資料庫查詢輔助函式
│   └── routers.ts           # tRPC 程序定義
├── shared/                  # 前後端共用型別與常數
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── vite.config.ts
```

---

## 支援的資料格式

### 邊資料（Edge Data）

| 格式 | 副檔名 | 說明 |
|---|---|---|
| CSV | `.csv` | 逗號分隔，第一列為標題 |
| Excel | `.xlsx`, `.xls` | 第一個工作表 |
| 純文字 | `.txt` | 空白或 Tab 分隔 |
| PDF | `.pdf` | 自動提取表格文字 |
| UCINET DL | `.dl` | UCINET 標準格式 |
| Pajek NET | `.net` | Pajek 網絡格式 |

匯入後可手動選擇 **來源欄（Source）**、**目標欄（Target）**、**權重欄（Weight）**，系統會自動預選前三欄。

### 節點屬性（Node Attributes）

支援相同的六種格式，匯入後可選擇 **節點 ID 欄位** 與 **節點標籤欄位**。

---

## 網絡繪製功能

### 布局演算法

| 演算法 | ID | 特性 |
|---|---|---|
| fCoSE（快速力導向） | `fcose` | 推薦首選，品質與速度兼顧 |
| Cola（力導向） | `cola` | 穩定，適合中小型網絡 |
| Dagre（階層） | `dagre` | 適合有向圖、樹狀結構 |
| Euler（輕量力導向） | `euler` | 大型網絡首選 |
| Breadthfirst（廣度優先） | `breadthfirst` | 清楚展示層次結構 |
| Random（隨機） | `random` | 快速初始布局 |

### 視覺化控制

- 節點顏色：依社群、依類別屬性、依中心性值、自訂單色
- 節點大小：固定大小（滑桿）或依中心性值縮放
- 邊顏色：預設、依權重深淺、自訂單色
- 邊粗細：基礎粗細滑桿；加權圖可設定最大粗細
- 標籤：字體大小、顏色自訂；支援手動編輯節點與邊的標籤
- 邊標籤：顯示/隱藏開關；標籤沿邊方向自動旋轉
- 畫布背景：白色、淡灰、深色三種選項
- 搜尋：模糊搜尋節點，選中後高亮並置中

---

## 社群偵測演算法

| 演算法 | 特性 | 適用情境 |
|---|---|---|
| Louvain | 貪婪最佳化模組化指數，速度快 | 大型網絡通用 |
| Label Propagation | 標籤傳播，隨機性高 | 快速探索 |
| Girvan-Newman | 移除橋接邊，可指定社群數 | 小型網絡、需精確控制 |
| Leiden | Louvain 改良版，保證社群內部連通 | 品質要求高 |
| Walktrap | 隨機遊走，結果穩定 | 中小型網絡 |
| Greedy Modularity（CNM） | 貪婪合併，速度快 | 大型稀疏網絡 |

---

## 測試

```bash
pnpm test
```

目前共有 **25 項單元測試**，涵蓋：

- UCINET / Pajek 格式解析器（12 項）
- 網絡演算法（中心性計算、社群偵測、連結預測）（12 項）
- 身份驗證登出流程（1 項）

---

## 授權

MIT License

---

## 開發紀錄

本專案由 Manus AI 協助開發，作為犯罪情資分析課程的互動式練習工具。
