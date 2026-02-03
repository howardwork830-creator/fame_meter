# 名人聲量分析系統（台灣市場）— 完整技術規格書

**專案名稱:** 名人聲量分析系統 (CPQ) - 台灣版
**狀態:** 生產就緒，具備進階機器學習與互動式儀表板
**版本:** 5.0（強化 PDF 匯出、比較檢視、準確度圖表與趨勢速度）
**日期:** 2026-01-30
**市場:** 僅限台灣 (TW)
**語言:** 繁體中文
**目標讀者:** 軟體工程師 / DevOps / 商業團隊

---

## 1. 執行摘要（工程師版）

### 1.1 專案目標
建立一套**每日批次處理管道**，功能包含：
1. 擷取台灣名人社群媒體提及（Perplexity API）
2. 將原始資料儲存於 Google Sheets
3. 透過人工回饋迴圈訓練並驗證情感模型（Kaggle ML）
4. 生成帶有可信度區間的每日排名
5. 提供互動式 HTML 儀表板進行回饋審核與結果檢視
6. 透過生產級機器學習管道持續改善模型

### 1.2 技術架構
- **資料擷取:** Perplexity API (透過 HTTP)
- **協調排程:** Google Apps Script (GAS)
- **資料儲存:** Google Sheets（主要資料庫）
- **驗證:** Google Cloud 服務帳戶 (OAuth 2.0)
- **機器學習處理:** Kaggle Notebook (Python 3.10, 免費 GPU)
- **模型:** `lxyuan/distilbert-base-multilingual-cased-sentiments-student` (Hugging Face)
- **機器學習管道:** scikit-learn（訓練/測試/驗證分割、模型評估）
- **儀表板:** HTML5 + JavaScript（透過 GAS 嵌入 Google Sheets）
- **回饋:** 互動式閃卡介面 → 模型微調的訓練資料集

### 1.3 v4.0 主要改進

**改進 #1: 生產級機器學習管道**
- ✅ 處理所有貼文（好評/負評/跳過）進行情感分析
- ✅ 訓練/測試/驗證分割 (70%/20%/10%)
- ✅ 模型評估指標（準確度、精確度、召回率）
- ✅ 所有結果附帶可信度區間（例如 0.92 ± 0.05）
- ✅ 模型漂移偵測（準確度低於 85% 時警報）

**改進 #2: 互動式 HTML 儀表板**
- ✅ 分頁 1: 高層排名（可排序、狀態指標）
- ✅ 分頁 2: 閃卡回饋迴圈（審核貼文、標記好評/負評/跳過）
- ✅ 分頁 3: 模型分析（準確度趨勢、訓練資料統計）
- ✅ 即時進度追蹤（已審核 X/N 則貼文）
- ✅ 一鍵回饋記錄（自動更新訓練資料集）

**改進 #3: 生產就緒功能**
- ✅ 稽核追蹤與可重現性（執行版本控制）
- ✅ 警報系統（異常時發送電子郵件警報）
- ✅ 可信度區間與模型指標
- ✅ 比較檢視（名人對比）
- ✅ 來源透明度（分數分解）
- ✅ 趨勢速度（上升/下降名人）
- ✅ ROI 追蹤與商業影響指標

**改進 #4: v5.0 新功能 (2026-01-30)**
- ✅ PDF 匯出: 一鍵生成包含排名、指標、代言摘要的 PDF 報告
- ✅ 名人比較: 並排彈出視窗比較 2 位名人的分數條、趨勢、平台分解
- ✅ 準確度趨勢圖: Google Charts 整合顯示最近 7 次執行與 85% 門檻線
- ✅ 趨勢速度指標: 🚀 快速上升 / 📉 快速下降 表示顯著變化 (>15%)
- ✅ 來源歸因: 最大貢獻來源和分數變化分解欄位顯示哪個平台驅動分數變化

### 1.4 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│ 06:00 AM UTC+8: GAS 觸發器                                      │
│ fetchTaiwanSocialMedia()                                        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 迴圈: 對設定中的每位名人執行                                       │
│ 使用 Perplexity 提示範本建立提示                                  │
│ POST /api.perplexity.ai/chat/completions (Bearer auth)          │
│ 解析 JSON 回應 → 驗證結構                                         │
│ 附加資料列到工作表("原始資料")                                     │
│ 記錄: 時間戳記、數量、錯誤                                         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Google Sheet: "原始資料" 分頁（所有貼文）                          │
│ 結構: 欄位 A-M（詳見第 3.2 節）                                   │
│ 狀態: 貼文等待人工回饋審核                                         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ GAS HTML 儀表板 (06:30 UTC+8 起)                                 │
│ doGet() → 互動式閃卡介面                                          │
│ • 分頁 1: 排名檢視（即時從結果工作表讀取）                          │
│ • 分頁 2: 回饋迴圈（閃卡審核）                                     │
│ • 分頁 3: 模型分析（準確度、訓練統計）                              │
│ • 自動儲存回饋到 "原始資料" 欄位 J (回饋)                          │
│ • 人工審核貼文 (1-2 小時，非同步)                                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 07:00 AM UTC+8: Kaggle Notebook 觸發                            │
│ sentiment_pipeline_v4.ipynb (生產級機器學習管道)                  │
│                                                                  │
│ 步驟 1-3: 驗證與資料擷取                                          │
│   • 讀取 "原始資料" 工作表 → 載入所有貼文（好評/負評/跳過）         │
│   • 對 100% 貼文執行情感分析                                      │
│   • 儲存每則貼文的 sentiment_score                                │
│                                                                  │
│ 步驟 4: 訓練/測試/驗證分割                                        │
│   • 70% 訓練: 標記為「好評」的貼文                                 │
│   • 20% 驗證: 標記為「負評」的貼文（測量準確度）                    │
│   • 10% 測試: 保留集（訓練時從未見過）                             │
│   • 使用分層分割（依名人平衡）                                     │
│                                                                  │
│ 步驟 5: 模型評估                                                  │
│   • 計算: 準確度、精確度、召回率、F1 分數                          │
│   • 若準確度 < 85%: 警報（需重新訓練）                             │
│   • 若準確度 > 90%: 良好（可部署）                                 │
│   • 輸出: 模型效能指標到工作表                                     │
│                                                                  │
│ 步驟 6: 生成帶可信度的結果                                        │
│   • 對 100% 貼文使用已驗證的模型                                   │
│   • 計算: 聲量分數 ± 可信度邊界                                    │
│   • 依名人彙整並加權來源                                          │
│   • 排序並排名（附風險標記）                                       │
│   • 寫入 "結果" 工作表                                            │
│                                                                  │
│ 步驟 7: 回饋記錄與訓練資料                                        │
│   • 記錄所有貼文（好評/負評）到 "回饋歷史"                         │
│   • 儲存: 預測、人工標籤、不符原因                                 │
│   • 準備下一輪微調的訓練資料集                                     │
│   • 每月: 使用累積回饋進行模型重新訓練                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Google Sheet: "結果" 分頁（每日排名）                              │
│ 結構: 欄位 A-L（詳見第 3.4 節）                                   │
│ 新欄位 (v4.0):                                                   │
│  • 可信度分數（例如 87%）                                         │
│  • 分數區間（例如 0.88-0.96）                                     │
│  • 模型準確度（例如 89%）                                         │
│  • 趨勢方向（↑ 上升 / → 穩定 / ↓ 下降）                          │
│  • 來源分析（JSON: TikTok×0.94, Instagram×0.88）                 │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ GAS HTML 儀表板 (v5.0 功能)                                      │
│ • 分頁 1: 排名含比較勾選框                                        │
│ • 分頁 2: 動態消息含篩選器                                        │
│ • 分頁 3: 回饋閃卡（好評/負評/跳過）                               │
│ • 分頁 4: 分析 + 準確度趨勢圖 (Google Charts)                     │
│ • 分頁 5: 來源評分（1-5 星）                                      │
│ • 比較彈出視窗: 並排名人分析                                       │
│ • PDF 匯出: 一鍵下載報告                                          │
│ • 趨勢速度: 🚀/↑/→/↓/📉 指標                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. API 規格

### 2.1 Perplexity API 整合

**端點:** `POST https://api.perplexity.ai/chat/completions`

**驗證:** Bearer token (Perplexity API 金鑰)

**請求內容:**
```javascript
{
  "model": "sonar",
  "messages": [
    {
      "role": "user",
      "content": `台灣名人社群媒體分析任務。\n\n找出關於 ${CELEBRITY_NAME} 的社群媒體提及（Instagram、Facebook、TikTok、YouTube）。\n找出使用者會發現的最熱門／最受關注的貼文。\n\n對每一個貼文，記錄：\n1. platform (平台)\n2. account (發文帳號)\n3. content (貼文完整內容)\n4. post_timestamp (貼文時間，UTC+8台灣時間)\n5. url (貼文連結)\n\n請回傳一個有效的 JSON 物件。格式如下（只回傳 JSON，沒有其他文字）:\n\n{\n  "celebrity_name": "${CELEBRITY_NAME}",\n  "data_collection_date": "${TODAY}",\n  "region": "Taiwan",\n  "posts": [\n    {\n      "platform": "Instagram",\n      "account_name": "@official",\n      "account_type": "official",\n      "content": "...",\n      "post_timestamp": "2026-01-07T14:30:00+08:00",\n      "post_url": "https://..."\n    }\n  ]\n}`
    }
  ]
}
```

**回應解析:**
```
HTTP 200 OK
{
  "choices": [
    {
      "message": {
        "content": "{\"celebrity_name\": \"...\", \"posts\": [...]}"
      }
    }
  ]
}
→ 擷取 choices[0].message.content
→ JSON.parse() → 驗證結構
```

**速率限制:** 無明確速率限制；假設 10 req/sec（對 10 位名人綽綽有餘）

**錯誤處理:**
- HTTP 401: 無效 API 金鑰 → 檢查 PropertiesService
- HTTP 429: 速率限制 → 指數退避重試
- HTTP 500: 伺服器錯誤 → 記錄並跳過該名人，繼續迴圈
- 無效 JSON → 記錄錯誤，跳過該貼文

### 2.2 Google Sheets API 整合

**驗證:** 服務帳戶 (OAuth 2.0 + gspread 函式庫)

**讀取操作:**
```python
import gspread
from oauth2client.service_account import ServiceAccountCredentials

credentials = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
client = gspread.authorize(credentials)
sheet = client.open("Celebrity Dashboard").worksheet("原始資料")
records = sheet.get_all_records()
```

**寫入操作:**
```python
results_sheet = client.open("Celebrity Dashboard").worksheet("結果")
results_sheet.clear()
results_sheet.append_rows([header_row] + data_rows)  # 批次寫入
```

**配額限制:**
- 讀取: 300 requests/min（我們每日約使用 ~5 次）
- 寫入: 300 requests/min（我們每日約使用 ~50 次）
- 完全在免費方案範圍內

---

## 3. 資料庫結構 (Google Sheets)

### 3.1 「設定」分頁（設定與組態）

| 欄位 | 類型 | 範例 | 備註 |
|--------|------|---------|-------|
| `設定名稱` | 文字 | CELEBRITIES_TO_TRACK | 唯一鍵值 |
| `值` | 文字/數字 | 蔡依林, 王心凌, 柯震東 | 逗號分隔清單 |
| `說明` | 文字 | 要監控的名人名稱清單 | 供人閱讀 |
| `最後更新` | 日期時間 | 2026-01-07 | 變更時間 |

**關鍵設定:**
```
CELEBRITIES_TO_TRACK: ["蔡依林", "王心凌", "柯震東", "林俊傑", "五月天"]
PERPLEXITY_API_KEY: [隱藏於 PropertiesService]
GCP_SERVICE_ACCOUNT_EMAIL: popularity-quantifier@project.iam.gserviceaccount.com
SHEET_ID: [Google Sheet ID]
FETCH_TIME_UTC: 06:00
KAGGLE_RUN_TIME_UTC: 07:00
DATA_RETENTION_DAYS: 30
SENTIMENT_MODEL: lxyuan/distilbert-base-multilingual-cased-sentiments-student
MODEL_ACCURACY_THRESHOLD: 0.85 (低於此值發出警報)
CONFIDENCE_THRESHOLD: 0.70 (高於此值可代言)
SENTIMENT_STDDEV_MAX: 0.25 (波動度門檻)
SOURCE_WEIGHTS: {"TikTok": 10, "Instagram": 9, "YouTube": 8, "Facebook": 7}
TRAINING_DATA_MIN: 200 (重新訓練的最低回饋樣本數)
```

### 3.2 「原始資料」分頁（所有貼文 — 好評/負評/跳過）

| 欄位 | 類型 | 範例 | 填寫者 | 備註 |
|--------|------|---------|-----------|-------|
| A: 收集時間 | 日期時間 | 2026-01-07 06:15 | GAS | UTC+8 |
| B: 名人 | 文字 | 蔡依林 | GAS | 須符合設定 |
| C: 平台 | 文字 | Instagram | GAS | 下拉選單: Instagram, Facebook, TikTok, YouTube |
| D: 帳號名稱 | 文字 | @jolin.official | GAS | 從 API 擷取 |
| E: 貼文內容 | 文字（長） | 新專輯宣布... | GAS | 完整貼文內容 |
| F: 貼文網址 | 超連結 | https://instagram.com/... | GAS | 可點擊連結 |
| G: 發布時間 | 日期時間 (ISO 8601) | 2026-01-07T14:30:00+08:00 | GAS | UTC+8 時間 |
| H: 帳號類型 | 文字 | official | GAS | official / fan |
| **I: 回饋** | **下拉選單** | **好評** | **人工 (儀表板)** | **好評 / 負評 / 跳過** |
| **J: 回饋備註** | **文字** | **未偵測到諷刺** | **人工 (儀表板)** | **負評原因** |
| K: 情感分數 | 數字 | 0.87 | Kaggle | -1 到 +1 |
| L: 處理日期 | 日期時間 | 2026-01-07 07:15 | Kaggle | 處理時間 |

**資料驗證:**
- 平台: 下拉選單 (Instagram, Facebook, TikTok, YouTube)
- 回饋: 下拉選單 (好評, 負評, 跳過)
- 情感分數: 數字 ∈ [-1, 1]

### 3.3 「來源權重」分頁（組態）

| 欄位 | 類型 | 範例 | 備註 |
|--------|------|---------|-------|
| A: 來源 | 文字 | TikTok | 平台名稱 |
| B: 權重分數 | 數字 | 10 | 範圍: 1-10 |
| C: 理由 | 文字 | 最高觸及率；病毒式傳播潛力 | 稽核追蹤 |
| D: 最後修改 | 日期時間 | 2026-01-07 | 變更歷史 |

### 3.4 「結果」分頁（每日排名 + 可信度區間）

| 欄位 | 類型 | 範例 | 填寫者 | v4.0/v5.0 新增 |
|--------|------|---------|-----------|-----------|
| A: 排名 | 數字 | 1 | Kaggle | 依分數排序 |
| B: 名人 | 文字 | 蔡依林 | Kaggle | |
| C: 平均情感分數 | 數字 | 0.87 | Kaggle | -1 到 +1 |
| D: 分析貼文數 | 數字 | 47 | Kaggle | 來自所有資料 |
| E: 情感標準差 | 數字 | 0.12 | Kaggle | 波動度指標 |
| F: 加權聲量分數 | 數字 | 0.92 | Kaggle | **主要 KPI** |
| **G: 可信度分數** | **百分比** | **87%** | **Kaggle** | **✨ v4.0: 模型準確度** |
| **H: 分數區間** | **文字** | **0.88-0.96** | **Kaggle** | **✨ v4.0: ± 誤差範圍** |
| **I: 模型準確度** | **百分比** | **89%** | **Kaggle** | **✨ v4.0: 驗證集準確度** |
| **J: 趨勢方向** | **文字** | **🚀 快速上升** | **Kaggle** | **✨ v5.0: 速度指標** |
| **K: 來源分析** | **JSON** | **{"TikTok":0.94, "Instagram":0.88}** | **Kaggle** | **✨ v4.0: 各平台分數** |
| L: 主要來源 | 文字 | TikTok | Kaggle | 最高貢獻者 |
| M: 好評比例 | 百分比 | 92% | Kaggle | 資料品質指標 |
| N: 風險標記 | 布林值 | 否 | Kaggle | 情感下降 > 20% |
| O: 可代言 | 布林值 | 是 | Kaggle | 分數 > 0.70 且 標準差 < 0.25 |
| **P: 最大貢獻來源** | **文字** | **Instagram (+0.12)** | **Kaggle** | **✨ v5.0: 驅動變化的平台** |
| **Q: 分數變化分析** | **JSON** | **{"TikTok":0.05, "IG":-0.02}** | **Kaggle** | **✨ v5.0: 各平台變化量** |
| R: 最後更新 | 日期時間 | 2026-01-30 07:15 | Kaggle | 執行時間戳記 |
| S: 分析備註 | 文字 | 強力候選人 | Kaggle | 摘要備註 |

**趨勢方向值 (v5.0):**
- `🚀 快速上升`: delta > 0.15（顯著正向變化）
- `↑ 上升`: delta > 0.05
- `→ 穩定`: -0.05 ≤ delta ≤ 0.05
- `↓ 下降`: delta < -0.05
- `📉 快速下降`: delta < -0.15（顯著負向變化）

### 3.5 「回饋歷史」分頁（訓練資料集）

| 欄位 | 類型 | 範例 | 用途 |
|--------|------|---------|----------|
| A: 貼文編號 | 文字 | raw_data_row_42 | 參照 |
| B: 貼文內容 | 文字 | 新專輯宣布... | 模型訓練 |
| C: Kaggle預測情感 | 數字 | 0.85 | 驗證預測 |
| D: 人工回饋 | 二元 | 1 (好評) / 0 (負評) | 訓練標籤 |
| E: 回饋原因 | 文字 | 未偵測諷刺 | 錯誤分析 |
| F: 回饋日期 | 日期時間 | 2026-01-08 09:00 | 稽核追蹤 |
| G: 回饋輪次 | 數字 | 1 | 微調迭代 |

**每月微調:**
- 累積 200-500 個標記範例
- 訓練/測試/驗證分割: 70/20/10
- 重新訓練情感模型
- A/B 測試: 在保留測試集上比較新舊模型
- 若準確度提升 >5% 則部署

### 3.6 「模型指標」分頁（稽核追蹤 - v4.0 新增）

| 欄位 | 類型 | 範例 | 備註 |
|--------|------|---------|-------|
| A: 執行日期 | 日期時間 | 2026-01-07 07:15 | Kaggle 執行時間 |
| B: 執行編號 | 文字 | run_20260107_071500 | 唯一識別碼 |
| C: 處理貼文數 | 數字 | 120 | 所有貼文 |
| D: 好評貼文 | 數字 | 110 | 來自回饋欄位 |
| E: 負評貼文 | 數字 | 8 | 來自回饋欄位 |
| F: 跳過貼文 | 數字 | 2 | 來自回饋欄位 |
| G: 訓練準確度 | 百分比 | 89% | 驗證集 |
| H: 訓練精確度 | 百分比 | 87% | 正類 |
| I: 訓練召回率 | 百分比 | 91% | 涵蓋率 |
| J: 訓練F1分數 | 百分比 | 89% | 調和平均 |
| K: 模型狀態 | 文字 | PASSED | 若準確度 > 85% |
| L: 名人數量 | 數字 | 5 | 排名人數 |
| M: 已排名名人 | 文字 | 蔡依林, 王心凌, ... | 清單 |
| N: 流程狀態 | 文字 | SUCCESS | 整體狀態 |
| O: 錯誤記錄 | 文字 | [如有] | 除錯用 |

---

## 4. Google Apps Script 實作 (v4.0)

> **注意:** 以下程式碼範例為說明性虛擬程式碼，展示預期邏輯。實際實作請參閱 `gas/` 目錄。

### 4.1 檔案: `orchestrator.gs`（強化版）

**用途:** 主要協調排程；每日 06:00 UTC+8 由觸發器執行

```javascript
/**
 * 主要進入點
 * 由 Google Apps Script 時間型觸發器每日 06:00 UTC+8 觸發
 */
function fetchTaiwanSocialMedia() {
  try {
    const config = loadConfig();
    const celebrities = config.CELEBRITIES_TO_TRACK;
    const sheet = SpreadsheetApp.openById(config.SHEET_ID)
      .getSheetByName("原始資料");

    let totalAdded = 0;
    let errors = [];

    for (let celebrity of celebrities) {
      try {
        const posts = queryPerplexityAPI(celebrity, config.PERPLEXITY_API_KEY);
        const validated = validatePerplexityResponse(posts, celebrity);

        validated.forEach(post => {
          sheet.appendRow([
            new Date(),  // 收集時間
            celebrity,
            post.platform,
            post.account_name,
            post.content,
            post.post_url,
            post.post_timestamp,
            post.account_type,
            "",  // 回饋（空白 - 人工透過儀表板填寫）
            "",  // 回饋備註（空白）
            "",  // 情感分數（Kaggle 填寫）
            ""   // 處理日期（Kaggle 填寫）
          ]);
        });

        totalAdded += validated.length;
        Logger.log(`✓ 為 ${celebrity} 新增 ${validated.length} 則貼文`);
      } catch (e) {
        errors.push(`${celebrity}: ${e.message}`);
        Logger.log(`✗ 擷取 ${celebrity} 時發生錯誤: ${e.message}`);
      }
    }

    // 記錄摘要
    updateLogSheet(config, {
      timestamp: new Date(),
      total_posts: totalAdded,
      celebrities_processed: celebrities.length,
      errors: errors.length > 0 ? errors.join("; ") : "無"
    });

    Logger.log(`管道完成。新增 ${totalAdded} 則貼文。錯誤: ${errors.length}`);
  } catch (e) {
    Logger.log(`嚴重錯誤: ${e.message}`);
    sendErrorAlert(e);
  }
}

/**
 * 查詢 PERPLEXITY API
 */
function queryPerplexityAPI(celebrity, apiKey) {
  const prompt = buildPerplexityPrompt(celebrity);

  const payload = {
    model: "sonar",
    messages: [{
      role: "user",
      content: prompt
    }]
  };

  const options = {
    method: "post",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(
      "https://api.perplexity.ai/chat/completions",
      options
    );

    if (response.getResponseCode() !== 200) {
      throw new Error(`Perplexity API 錯誤: ${response.getResponseCode()}`);
    }

    const result = JSON.parse(response.getContentText());
    const jsonString = result.choices[0].message.content;
    const jsonData = JSON.parse(jsonString);

    return jsonData.posts || [];
  } catch (e) {
    throw new Error(`Perplexity API 呼叫失敗: ${e.message}`);
  }
}

/**
 * 建立 PERPLEXITY 提示
 */
function buildPerplexityPrompt(celebrity) {
  return `台灣名人社群媒體分析任務。\n\n找出關於 ${celebrity} 的社群媒體提及（Instagram、Facebook、TikTok、YouTube）。\n找出使用者會發現的最熱門／最受關注的貼文。\n\n對每一個貼文，記錄：\n1. platform (平台)\n2. account (發文帳號)\n3. content (貼文完整內容)\n4. post_timestamp (貼文時間，UTC+8台灣時間)\n5. url (貼文連結)\n\n請回傳一個有效的 JSON 物件。格式如下（只回傳 JSON，沒有其他文字）：\n\n{\n  "celebrity_name": "${celebrity}",\n  "data_collection_date": "${Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd')}",\n  "region": "Taiwan",\n  "posts": [\n    {\n      "platform": "Instagram",\n      "account_name": "@official",\n      "account_type": "official",\n      "content": "...",\n      "post_timestamp": "2026-01-07T14:30:00+08:00",\n      "post_url": "https://..."\n    }\n  ]\n}`;
}

/**
 * 驗證 PERPLEXITY 回應
 */
function validatePerplexityResponse(posts, celebrity) {
  const required_fields = ["platform", "account_name", "content",
                          "post_timestamp", "post_url"];
  const valid_platforms = ["Instagram", "Facebook", "TikTok", "YouTube"];

  return posts.filter(post => {
    if (!required_fields.every(field => field in post)) {
      Logger.log(`跳過貼文: 缺少必要欄位`);
      return false;
    }

    if (!valid_platforms.includes(post.platform)) {
      Logger.log(`跳過貼文: 無效平台 ${post.platform}`);
      return false;
    }

    if (!post.post_timestamp.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      Logger.log(`跳過貼文: 無效時間戳記格式`);
      return false;
    }

    return true;
  });
}

/**
 * 載入設定
 */
function loadConfig() {
  const configSheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("設定");
  const data = configSheet.getDataRange().getValues();

  const config = {};
  for (let i = 1; i < data.length; i++) {
    const [key, value] = [data[i][0], data[i][1]];
    if (key === "CELEBRITIES_TO_TRACK") {
      config[key] = value.split(",").map(s => s.trim());
    } else if (key.includes("WEIGHT") || key.includes("DAYS") || key.includes("THRESHOLD")) {
      config[key] = parseInt(value);
    } else {
      config[key] = value;
    }
  }

  return config;
}

/**
 * 設定每日觸發器
 */
function setupDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("fetchTaiwanSocialMedia")
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  Logger.log("✓ 觸發器已建立: 每日 06:00 UTC+8");
}

/**
 * 發送錯誤警報 (v4.0 新增)
 */
function sendErrorAlert(error) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const email = Session.getActiveUser().getEmail();

  GmailApp.sendEmail(email,
    "🚨 名人聲量分析系統 - 管道錯誤",
    `錯誤: ${error.message}\n\n請檢查 GAS 執行記錄以取得詳細資訊。\n\n工作表: ${sheet.getUrl()}`
  );
}
```

### 4.2 檔案: `dashboard.gs` (v4.0 新增)

**用途:** 互動式 HTML 儀表板，用於回饋審核與結果檢視

> 由於篇幅限制，儀表板程式碼已簡化。實際實作請參閱 `gas/dashboard.gs`。

---

## 5. Kaggle Notebook 實作 (v4.0 — 生產級機器學習管道)

> **注意:** 以下程式碼範例為說明性虛擬程式碼，展示預期邏輯。實際實作請參閱 `kaggle/` 目錄。

### 5.1 檔案: `sentiment_pipeline_v4.ipynb`

**執行環境:** Python 3.10, 免費 GPU (P100), 每次執行約 20 分鐘

> 由於篇幅限制，Notebook 程式碼已簡化。實際實作請參閱 `kaggle/sentiment_pipeline_v4.ipynb`。

---

## 6. 部署指南 (v4.0)

### 6.1 第一階段: Google Cloud 設定（第 1 天）

```bash
gcloud projects create celebrity-popularity-quantifier --set-as-default
gcloud services enable sheets.googleapis.com
gcloud services enable drive.googleapis.com
gcloud iam service-accounts create celebrity-bot --display-name "名人聲量分析機器人"
gcloud iam service-accounts keys create celebrity-bot-key.json --iam-account=celebrity-bot@PROJECT_ID.iam.gserviceaccount.com
# 將 Google Sheet 與服務帳戶電子郵件共用（編輯者權限）
```

### 6.2 第二階段: Google Apps Script 設定（第 1 天）

```bash
# 1. 開啟 Google Sheet → 工具 → 指令碼編輯器
# 2. 建立檔案: orchestrator.gs, dashboard.gs
# 3. 從第 4.1 和 4.2 節複製程式碼
# 4. 更新設定工作表的 API 金鑰
# 5. 執行 setupDailyTrigger()
# 6. 測試: 執行 fetchTaiwanSocialMedia()
```

### 6.3 第三階段: Kaggle 設定（第 1 天）

```bash
# 1. 前往 kaggle.com → 程式碼 → 新增 Notebook
# 2. 新增 Secret: GCP_JSON = [服務帳戶 JSON]
# 3. 複製 sentiment_pipeline_v4.ipynb 程式碼
# 4. 執行所有儲存格
# 5. 在結果工作表中驗證結果
```

### 6.4 第四階段: 測試（第 2-7 天）

```
第 2 天: 手動完整測試
  06:00 → GAS 擷取 → 30-50 則貼文
  07:00 → Kaggle 處理
  檢查結果與模型指標工作表
  開啟儀表板（工具 → 巨集 → showDashboard）
  透過閃卡介面審核 20 則貼文

第 3-7 天: 監控
  • 每日檢查儀表板
  • 驗證模型指標工作表已更新
  • 監控準確度趨勢
  • 測試警報系統
```

### 6.5 第五階段: 正式上線（第 8 天）

```
✓ 7 天無錯誤執行
✓ 模型準確度 > 85%
✓ >75% 貼文標記為好評（資料品質）
✓ 儀表板功能完整
✓ 商業團隊簽核

→ 正式上線
```

---

## 7. 商業功能 (v4.0 — 生產就緒)

### 7.1 第一層: 關鍵功能（MVP 包含）

| 功能 | 實作 | 商業效益 |
|---------|----------------|------------------|
| **可信度區間** | 所有分數附帶 ± 誤差範圍 | 主管了解確定性程度 |
| **模型指標** | 準確度、精確度、召回率 | 透明度與責任歸屬 |
| **稽核追蹤** | 執行版本控制與指標歷史 | 可重現性與合規性 |
| **警報系統** | 準確度下降/資料問題時發送電子郵件 | 主動問題偵測 |
| **比較檢視** | 名人分數對比 | 更好的決策制定 |
| **來源分解** | 顯示 TikTok vs Instagram 貢獻 | 資料透明度 |

### 7.2 第二層: v5.0 已完成 (2026-01-30)

| 功能 | 狀態 | 實作 |
|---------|--------|----------------|
| 趨勢速度 | ✅ 完成 | 🚀/📉 快速變化指標 |
| PDF 匯出 | ✅ 完成 | 一鍵 PDF 包含排名與指標 |
| 名人比較 | ✅ 完成 | 並排彈出視窗含圖表 |
| 準確度趨勢圖 | ✅ 完成 | Google Charts 顯示最近 7 次執行 |
| 來源歸因 | ✅ 完成 | 最大貢獻來源與變化分解 |

### 7.3 第三層: 未來強化（2026 Q2）

| 功能 | 工作量 | 影響 |
|---------|--------|--------|
| 預測評分 | 中 | 30 天預測 |
| ROI 追蹤 | 中 | 連結商業成果 |
| 區隔分析 | 中 | 依年齡/地區微目標 |
| 自動警報 | 低 | 風險標記時發送 Email/Slack |

---

## 8. 成功標準（決策依據）

**技術 KPI:**
- ✅ 運行時間: 連續 30 天 99%+
- ✅ 端到端延遲: < 25 分鐘
- ✅ 模型準確度: > 85%
- ✅ 資料品質: > 75% 好評比例

**商業 KPI:**
- ✅ 排名準確度: > 85% 符合商業直覺
- ✅ 代言成功率: 0 負面事件
- ✅ 採用率: 商業團隊每週檢查儀表板

---

**技術規格書結束 v5.0**

**準備對象:** 軟體工程團隊 + 商業用戶
**狀態:** 生產就緒，具備機器學習管道、互動式儀表板與進階功能
**日期:** 2026-01-30
**版本:** 5.0（強化 PDF 匯出、比較檢視、準確度圖表、趨勢速度與來源歸因）

---

## 更新日誌

### v5.0 (2026-01-30)
- 新增 PDF 匯出功能（📄 匯出 PDF 按鈕）
- 新增名人比較彈出視窗（並排分析）
- 新增準確度趨勢圖（Google Charts，最近 7 次執行）
- 強化趨勢方向與速度指標（🚀 快速上升 / 📉 快速下降）
- 新增來源歸因（最大貢獻來源、分數變化分解欄位）

### v4.0 (2026-01-07)
- 生產級機器學習管道，含訓練/測試/驗證分割
- 互動式 HTML 儀表板，含 5 個分頁
- 可信度區間與模型指標
- 稽核追蹤與警報系統
