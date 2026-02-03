# 名人聲量分析系統 (CPQ) - 台灣版

一套每日批次處理的資料管道，使用情感分析和機器學習追蹤台灣名人的社群媒體聲量。

## 概覽

CPQ 自動收集來自 Instagram、Facebook、TikTok、YouTube 和新聞來源的社群媒體提及，使用多語言 BERT 模型進行情感分析，並生成帶有可信度區間的每日聲量排名。

**目標市場:** 台灣 (TW)
**語言:** 繁體中文
**版本:** 5.0

## 功能特色

### 核心功能
- **每日資料收集**: 透過 Perplexity API 於 06:00 UTC+8 自動擷取
- **情感分析**: 使用 `lxyuan/distilbert-base-multilingual-cased-sentiments-student` 模型
- **加權評分**: 平台權重 + 來源重要性評分
- **人工回饋迴圈**: 儀表板提供貼文標註功能 (好評/負評/跳過)
- **模型評估**: 訓練/測試/驗證分割與準確度指標

### 儀表板功能 (v5.0)
| 分頁 | 功能 |
|-----|---------|
| 📊 排名 | 名人排名與趨勢指標 |
| 📰 最新動態 | 最新貼文動態與篩選器 |
| ⭐ 評分 | 閃卡式回饋介面 |
| 📈 分析 | 模型指標 + 準確度趨勢圖 |
| 🎯 來源評分 | 來源重要性評分 (1-5 星) |

### v5.0 新功能
- **PDF 匯出**: 一鍵下載包含排名和指標的報告
- **名人比較**: 並排比較兩位名人的彈出視窗
- **準確度趨勢圖**: Google Charts 顯示最近 7 次執行與 85% 門檻線
- **趨勢速度**: 🚀 快速上升 / 📉 快速下降 顯著變化指標
- **來源歸因**: 顯示哪個平台導致分數變化

## 系統架構

```
Perplexity API → GAS orchestrator.gs → Google Sheets (原始資料)
                                              ↓
                        人工審核 (dashboard.gs) → 回饋更新
                                              ↓
                        Kaggle Notebook → 情感分析 → 結果工作表
```

## 技術架構

| 元件 | 技術 |
|-----------|------------|
| 資料擷取 | Perplexity API |
| 協調排程 | Google Apps Script (GAS) |
| 儲存 | Google Sheets |
| 機器學習處理 | Kaggle Notebook (Python 3.10, GPU) |
| 情感模型 | DistilBERT Multilingual |
| 儀表板 | HTML5 + JavaScript + Google Charts |

## 安裝設定

### 前置需求
- 啟用 Sheets API 的 Google Cloud 服務帳戶
- Perplexity API 金鑰
- 具有 GPU 存取權限的 Kaggle 帳戶

### 1. Google Apps Script 設定
```bash
cd gas
clasp login
clasp push
```

### 2. 設定腳本屬性
在 GAS 編輯器中設定：
- `PERPLEXITY_API_KEY`: 您的 Perplexity API 金鑰

### 3. Kaggle 設定
新增 Kaggle Secret：
- `GCP_JSON`: Google Cloud 服務帳戶 JSON 憑證

### 4. 初始化工作表
在 GAS 編輯器中執行：
```javascript
initializeSheets()
setupDailyTrigger()
```

## 使用方式

### 每日工作流程
| 時間 (UTC+8) | 動作 |
|--------------|--------|
| 06:00 | GAS 擷取社群媒體資料 |
| 06:30+ | 透過儀表板進行人工回饋審核 |
| 07:00 | Kaggle notebook 執行情感分析 |

### 開發指令

**Google Apps Script:**
```bash
cd gas && clasp push      # 推送變更
cd gas && clasp pull      # 拉取變更
cd gas && clasp open      # 開啟編輯器
```

**Kaggle:**
```bash
cd kaggle && kaggle kernels push -p .
```

## Google Sheets 結構

| 工作表 | 用途 |
|-------|---------|
| 設定 | 設定值與名人清單 |
| 原始資料 | 所有收集的貼文 |
| 結果 | 每日排名輸出 |
| 來源權重 | 平台權重分數 |
| 來源設定 | 各來源重要性評分 |
| 回饋歷史 | 訓練資料集 |
| 模型指標 | 稽核追蹤記錄 |

## 關鍵門檻值

| 指標 | 門檻值 |
|--------|-----------|
| 模型準確度 | ≥ 85% |
| 代言可信度 | ≥ 70% |
| 情感標準差上限 | ≤ 0.25 |
| 訓練資料下限 | 200 筆樣本 |

## 結果資料結構

結果工作表中的 19 個欄位（對應 constants.gs 中的 RESULTS_HEADERS）：

| 欄位 | 說明 |
|--------|-------------|
| `排名` | 每日排名位置 |
| `名人` | 名人名稱 |
| `平均情感分數` | 原始平均情感分數 (-1 到 +1) |
| `分析貼文數` | 已分析的貼文數量 |
| `情感標準差` | 情感標準差（波動度） |
| `加權聲量分數` | 主要 KPI（加權分數） |
| `可信度分數` | 模型可信度 % |
| `分數區間` | 最小-最大分數範圍 |
| `模型準確度` | 此名人的模型準確度 |
| `趨勢方向` | 🚀/↑/→/↓/📉 |
| `來源分析` | JSON: 各平台情感 |
| `主要來源` | 情感最高的平台 |
| `好評比例` | 「好評」回饋比例 |
| `風險標記` | 下降超過 20% 時為是 |
| `可代言` | 是/否 |
| `最大貢獻來源` | 驅動變化的平台 (v5.0) |
| `分數變化分析` | 各平台變化量 JSON (v5.0) |
| `最後更新` | 最後更新時間戳記 |
| `分析備註` | 額外備註/標記 |

## 測試

```bash
# 執行 Python 單元測試
cd tests/kaggle && python -m pytest test_sentiment.py -v

# 執行 JavaScript 測試（需要 Node.js）
cd tests/gas && npm test
```

詳細測試文件請參閱 [tests/README.md](tests/README.md)。

## 安全性

### 最佳實務
- **API 金鑰**: 儲存於 GAS Script Properties，絕不提交至版本庫
- **服務帳戶**: 使用最小必要權限（僅 Sheets API）
- **Web App 存取**: 在 `appsscript.json` 中設定適當的存取層級
- **資料隱私**: 原始社群媒體資料不應包含公開貼文以外的個人識別資訊

### 設定
- GAS webapp 存取權可設定為：`ANYONE_ANONYMOUS`（公開）或 `ANYONE`（需 Google 登入）
- Sheet ID 應保持私密（使用環境變數或 Script Properties）

## 文件

- [MANUAL.md](MANUAL.md) - 使用者手冊（繁體中文）
- [PROJECT-TECHNICAL-SPEC.md](PROJECT-TECHNICAL-SPEC.md) - 完整技術規格書
- [CLAUDE.md](CLAUDE.md) - Claude Code 開發指南

## 授權

私人專案 - 保留所有權利。

## 更新日誌

### v5.0 (2026-01-30)
- 新增 PDF 匯出功能
- 新增名人比較彈出視窗
- 新增準確度趨勢圖 (Google Charts)
- 強化趨勢方向與速度指標
- 新增來源歸因欄位

### v4.0 (2026-01-07)
- 生產級機器學習管道，含訓練/測試/驗證分割
- 互動式 HTML 儀表板，含 5 個分頁
- 可信度區間與模型指標
- 稽核追蹤與警報系統
