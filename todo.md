# 網絡分析平台 TODO

## Phase 2: 基礎架構與樣式
- [x] 設計全域 CSS 樣式（elegant light theme，精緻配色）
- [x] 建立 NetworkDashboardLayout（側邊欄導覽，四大模組串聯）
- [x] 建立 NetworkContext（全域狀態管理）
- [x] 更新 App.tsx 路由結構

## Phase 3: 資料匯入模組
- [x] 支援 Excel (.xlsx/.xls) 上傳與解析
- [x] 支援 CSV 上傳與解析
- [x] 支援 TXT 上傳與解析
- [x] 支援 PDF 上傳與文字提取
- [x] 欄位選擇介面（選擇 source/target 欄位）
- [x] 自動轉置為 Edge 格式（source, target）
- [x] 自動生成 Node 資料（唯一節點清單）
- [x] 下載 Node CSV 功能

## Phase 4: Node 屬性管理模組
- [x] 匯入 Node 資料 CSV（含多個 attribute 欄位）
- [x] 顯示已匯入的 attribute 欄位清單
- [x] 選擇要套用於視覺化的 attribute

## Phase 5: 網絡圖繪製模組
- [x] 整合 Cytoscape.js 繪製互動式網絡圖
- [x] 支援手動拖拉節點
- [x] 5 種 Layout：Force-directed (Cola)、Circle、Grid、Hierarchical (Dagre)、Random
- [x] 可自訂 iteration 次數（Force-directed）
- [x] 節點標籤從 attribute 套用
- [x] 手動編輯單一節點標籤（點擊節點）
- [x] 縮放控制（放大/縮小/適合視窗）
- [x] 社群偵測結果顏色同步顯示

## Phase 6: 社群偵測模組
- [x] Louvain 演算法實作
- [x] Label Propagation 演算法實作
- [x] Girvan-Newman 演算法實作（可設定目標社群數）
- [x] 偵測結果以顏色標示於圖上
- [x] 下載含社群編號與節點名稱的 CSV

## Phase 7: 網絡預測模組
- [x] Link Prediction（Common Neighbors + Jaccard + Adamic-Adar）
- [x] Link Dissolution（弱連結偵測）
- [x] 預測結果直接標示於圖上（綠色/紅色虛線）
- [x] Top K 結果數量可調整

## Phase 8: 整合測試
- [x] 撰寫 Vitest 測試（13 tests，全部通過）
- [x] 首頁 Landing Page
- [x] 儲存 Checkpoint

## 配色更新
- [x] 更新 index.css 全域 CSS 變數為新配色（Cherry Blossom / Powder Petal / Dust Grey / Ash Grey / Iron Grey）
- [x] 確認側邊欄、卡片、按鈕、Badge 等元件配色一致
- [x] 儲存 Checkpoint

## 演算法教學說明
- [x] NetworkVisualize：5 種 Layout 演算法加入詳細教學說明（原理、適用情境、參數）
- [x] CommunityDetection：3 種社群偵測演算法加入詳細教學說明
- [x] NetworkPrediction：Link Prediction 與 Link Dissolution 演算法加入詳細教學說明
- [x] 儲存 Checkpoint

## UCINET 格式支援
- [x] 建立 UCINET 解析器（DL format、Pajek .net、adjacency matrix）
- [x] 更新 DataImport 頁面接受 .dl / .net / .txt UCINET 格式
- [x] 新增格式說明提示
- [x] 撰寫 Vitest 測試覆蓋 UCINET 解析器
- [x] 儲存 Checkpoint

## NodeAttributes 多格式匯入
- [x] 更新 NodeAttributes 頁面支援 Excel/CSV/TXT/PDF/DL/NET/DAT 格式
- [x] 整合 ucinetParser（UCINET DL / Pajek .net 格式解析為 node attributes）
- [x] 加入格式說明提示
- [x] 儲存 Checkpoint

## 有向/無向圖與權重設定
- [x] DataImport：加入「有向圖 / 無向圖」切換選項
- [x] DataImport：加入「有無權重」切換選項，若有權重則顯示權重欄位下拉選單
- [x] NetworkContext：新增 graphDirected (boolean) 與 graphWeighted (boolean) 欄位
- [x] NetworkVisualize：Cytoscape 依 directed 設定顯示箭頭；依 weighted 設定調整邊的粗細
- [x] Stats overlay 加入有向/無向與加權 Badge
- [x] 儲存 Checkpoint

## Node Label 欄位設定
- [x] NodeAttributes：上傳後顯示「Node Label 欄位」下拉選單，可從所有欄位中選擇
- [x] NetworkContext：新增 nodeLabelColumn 狀態與 setter
- [x] NetworkVisualize：buildElements 優先使用 nodeLabelColumn 作為節點顯示標籤
- [x] 儲存 Checkpoint

## NodeAttributes 欄位選擇器改版
- [x] 上傳後進入「欄位設定」暫存狀態，顯示所有欄位供使用者選擇 Node Name（ID）與 Node Label 欄位
- [x] 兩個選擇器整合在同一個確認卡片，確認後才執行 setNodeCSV + setNodeLabelColumn
- [x] 已匯入後仍可重新選擇 Node Name / Node Label 欄位
- [x] 儲存 Checkpoint

## 網絡繪製強化
- [x] 計算四種中心性：Degree、Betweenness、Closeness、Eigenvector/PageRank
- [x] 節點大小可依選擇的中心性排序設定（滑桿控制最小/最大尺寸）
- [x] 節點顏色：依 type 屬性分類別顏色，或依中心性值調整深淺
- [x] Edge 依 weight 設定粗細與顏色深淺
- [x] 網絡圖畫布背景改為白色
- [x] 側邊欄（主選單+次選單）可收合，讓畫布視窗更大
- [x] 儲存 Checkpoint

## 節點搜尋與高亮
- [x] NetworkVisualize 頁面加入搜尋框（支援模糊搜尋節點 ID / Label）
- [x] 搜尋結果以下拉清單顯示，鍵盤上下鍵導覽，Enter 確認
- [x] 選中節點後：高亮該節點（放大+顏色強調）、淡化其他節點、視圖置中並縮放
- [x] 清除搜尋後恢復所有節點正常顯示
- [x] 儲存 Checkpoint

## 節點與邊顏色自訂
- [x] 節點顏色：新增「自訂」模式，提供調色盤讓使用者選擇單一全域顏色套用至所有節點
- [x] 節點顏色：支援「依社群自訂」模式，每個社群可個別設定顏色
- [x] 邊顏色：新增自訂顏色選擇器，讓使用者設定邊的顏色
- [x] 預設提供 Cherry Blossom 配色系列的色票快速選擇
- [x] 儲存 Checkpoint

## Edge 欄位自動預選
- [x] DataImport：解析 edge 資料後自動預選第一欄為 source、第二欄為 target、第三欄為 weight
- [x] 儲存 Checkpoint

## Label 顏色與 Edge 粗細自訂
- [x] NetworkVisualize：新增 label 顏色選擇器（色票 + color picker），即時更新圖上文字顏色
- [x] NetworkVisualize：Edge 粗細加入基礎粗細滑桿（無權重時固定粗細；有權重時可設定最細/最粗範圍）
- [x] 儲存 Checkpoint

## 節點大小自訂
- [x] NetworkVisualize：「固定大小」模式下新增滑桿（10–80px），讓使用者調整統一節點尺寸
- [x] 儲存 Checkpoint

## 標籤字體大小控制
- [x] NetworkVisualize：「節點標籤」區塊加入字體大小滑桿（8–20px），即時更新圖上標籤文字大小
- [x] 儲存 Checkpoint

## 畫布背景色自訂
- [x] NetworkVisualize：新增畫布背景色選項（白色 #ffffff、淡灰 #f5f3f0、深色 #1e1e2e），以 3 個按鈕切換
- [x] 儲存 Checkpoint

## 匯出 PNG 功能
- [x] NetworkVisualize：新增「下載 PNG」按鈕（放在縮放控制旁），使用 cy.png() 匯出目前畫布為 PNG 圖片
- [x] 儲存 Checkpoint

## 資料處理頁面（One-Mode 轉置）
- [x] 新增 DataTransform.tsx 頁面：上傳 raw data（CSV/Excel）
- [x] 欄位選擇：讓使用者選「行動者欄位」與「事件欄位」
- [x] One-mode 轉置邏輯：兩行動者若共同參加同一事件則有連結，weight = 共同事件數
- [x] 結果預覽：顯示 edge data 表格（source, target, weight）與 node data 表格
- [x] 下載 edge CSV 與 node CSV 按鈕
- [x] 在側邊欄導航加入「資料處理」入口

## 匯入頁籤合併
- [x] DataImport.tsx：將 edge data 匯入與 node data 匯入合併到同一頁面，以 Tab 切換
- [x] 保留原有分步流程，只調整 UI 結構

## Statistics 獨立頁面
- [x] 新增 Statistics.tsx 頁面
- [x] Attribute 統計：各數值欄位的描述統計（平均、中位數、標準差、最大/最小）
- [x] Centrality 統計：四種中心性的描述統計與排名 Top 10 表格
- [x] Community 統計：各社群的節點數、平均中心性
- [x] 在側邊欄導航加入「統計分析」入口
- [x] 儲存 Checkpoint

## 資料處理頁面（One-Mode 轉置）
- [x] DataTransform.tsx：上傳 raw data，選兩個欄位執行 one-mode 轉置
- [x] 計算 weight（共同連結次數 sum）
- [x] 下載 edge data CSV 與 node data CSV
- [x] 儲存 Checkpoint

## 匯入頁籤合併
- [x] DataImport.tsx：Edge 匯入與 Node 屬性管理合併為同一頁面（Tab UI）
- [x] 保留各自完整的分步流程
- [x] 儲存 Checkpoint

## Statistics 統計分析頁面
- [x] Statistics.tsx：獨立頁面，四個 Tab（網絡概覽/節點屬性/中心性/社群）
- [x] 網絡概覽：節點數、邊數、密度、度數分佈、權重統計
- [x] 節點屬性：數值型（描述統計）、類別型（頻率分佈）
- [x] 中心性：四種中心性摘要統計 + 前 20 排名表格
- [x] 社群：模組化指數、各社群節點數/內外部邊比例
- [x] 各 Tab 提供 CSV 下載功能
- [x] 更新側邊欄導航加入「資料處理」與「統計分析」
- [x] 儲存 Checkpoint

## 節點 Hover 效果
- [x] 滑鼠移到節點上時，該節點放大（scale 1.4x）
- [x] 顯示浮動 tooltip：節點 label + 所有 attribute 欄位値
- [x] 滑鼠離開後恢復原始大小，tooltip 消失
- [x] 儲存 Checkpoint

## Bug 修正：無向圖 Edge 粗細無效
- [x] 修正 initCytoscape 中非加權圖 edge width 寫死 1.5 的問題，改為統一讀取 data(edgeWidth)
- [x] 確認 re-apply effect 在非加權圖時也能正確更新 edge 粗細
- [x] 儲存 Checkpoint

## 新增推薦布局
- [x] 安裝 cytoscape-fcose、cytoscape-euler 套件
- [x] 新增 fcose（快速力導向，推薦首選）、concentric（同心圓，依度數分層）、breadthfirst（廣度優先樹狀）、euler（輕量力導向）四種布局
- [x] 更新 algorithmInfo.ts 加入四種新布局說明
- [x] 更新 NetworkVisualize.tsx 的 applyLayout 支援新布局
- [x] 儲存 Checkpoint

## 移除重複的屬性管理選項
- [x] 移除 NetworkDashboardLayout.tsx 側邊欄中重複的「屬性管理」導航項目
- [x] 儲存 Checkpoint

## 新增社群偵測演算法
- [x] 實作 Leiden 演算法（Louvain 改良版，保證社群內部連通）
- [x] 實作 Walktrap 演算法（隨機遊走，結果穩定）
- [x] 實作 Greedy Modularity/CNM 演算法（貪婪合併，速度快）
- [x] 更新 algorithmInfo.ts 加入三種新演算法說明
- [x] 更新 CommunityDetection.tsx UI 加入新演算法選項
- [x] 儲存 Checkpoint

## 布局精簡與首頁更新
- [x] 移除 Grid、Circle、Concentric 三種布局（algorithmInfo.ts + NetworkVisualize.tsx）
- [x] 布局選擇卡片改為兩欄設計（與社群偵測頁面一致）
- [x] 首頁模組說明更新（反映最新功能）
- [x] 首頁演算法說明 badge 顏色統一
- [x] 儲存 Checkpoint

## Edge Label 編輯功能
- [x] 點擊邊後在側邊欄顯示 edge 編輯面板（source、target、weight、label）
- [x] 使用者可輸入或修改 edge label，即時更新圖上顯示
- [x] 新增「顯示 Edge Label」開關，控制是否在圖上顯示所有邊的標籤
- [x] 儲存 Checkpoint

## 邊 Hover Tooltip
- [x] 滑鼠懸停在邊上時顯示浮動 Tooltip（來源、目標、權重）
- [x] 若有加權圖則顯示權重（以主題色強調），無加權圖則省略
- [x] 若該邊有自訂標籤則一併顯示
- [x] 滑鼠移動時 Tooltip 跟隨游標位置，離開邊後消失
- [x] 儲存 Checkpoint

## 專案文件
- [x] 新增 README.md（專案說明、功能模組、技術架構、安裝步驟、目錄結構、資料格式說明）
- [x] 新增 requirements.txt（所有 npm 相依套件清單，含執行期與開發期）
- [x] 儲存 Checkpoint

## Render 靜態部署改造
- [x] 移除所有頁面的 useAuth / 登入守衛邏輯
- [x] 移除 NetworkDashboardLayout 中的登入狀態檢查與使用者資訊顯示
- [x] 移除 App.tsx 中的 tRPC Provider 與 QueryClient（改為純 React 渲染）
- [x] 移除 Home.tsx 的登入按鈕與 useAuth 呼叫（原本就沒有）
- [x] 新增 vite.config.render.ts 支援純前端靜態建置
- [x] 新增 render.yaml 部署設定檔
- [x] 新增 client/public/_redirects 支援 SPA 路由
- [x] 新增 package.json build:render 指令
- [x] 確認 pnpm build:render 成功建置靜態檔案（dist-render/）
- [x] TypeScript 零錯誤，25 項測試通過
- [x] 儲存 Checkpoint

## GitHub Pages 部署
- [x] 修正 requirements.txt 格式（改為純文字說明，避免 pip 誤認）
- [x] 新增 .github/workflows/deploy.yml（GitHub Actions 自動建置並部署到 GitHub Pages）
- [x] 調整 vite.config.render.ts 的 base 路徑（GITHUB_PAGES=true 時自動設定 /network_analysis_platform/）
- [x] 確認 GITHUB_PAGES=true 建置成功
- [x] 儲存 Checkpoint

## 畫布寬高修正
- [x] 修正 Cytoscape 畫布容器，讓網絡圖完全填滿可用畫布區域（NetworkDashboardLayout 在 /visualize 路由使用 overflow-hidden）
- [x] 視窗大小改變時自動重新計算畫布尺寸（ResizeObserver + cy.resize() + cy.fit()）
- [x] 主選單不受影響（修正範圍僅限於 page content 容器）
- [x] 儲存 Checkpoint

## 節點顏色與個別編輯功能
- [ ] 擴充節點標籤顏色選項（增加更多預設色票）
- [ ] 新增單節點編輯面板：點擊節點後可單獨設定該節點的大小、顏色、標籤
- [ ] 儲存 Checkpoint
