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
