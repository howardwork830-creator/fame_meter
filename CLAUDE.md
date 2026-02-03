# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

名人聲量分析系統 (CPQ) - 台灣版: A daily batch pipeline that tracks Taiwan celebrity social media popularity using sentiment analysis and ML.

**Architecture:**
- **Data Ingestion**: Perplexity API fetches social media mentions (Instagram, Facebook, TikTok, YouTube)
- **Orchestration**: Google Apps Script (GAS) triggers at 06:00 UTC+8
- **Storage**: Google Sheets as primary database (Sheet ID: `YOUR_SHEET_ID`)
- **ML Processing**: Kaggle Notebook with `lxyuan/distilbert-base-multilingual-cased-sentiments-student` model
- **Dashboard**: HTML5 + JavaScript embedded in GAS

**Data Flow:**
```
Perplexity API → GAS orchestrator.gs → Google Sheets (原始資料)
                                              ↓
                        Human Review (dashboard.gs) → 回饋更新
                                              ↓
                        Kaggle Notebook → 情感分析 → 結果工作表
```

## Development Commands

### Google Apps Script (clasp)
```bash
# Push local changes to GAS
cd gas && clasp push

# Pull remote changes from GAS
cd gas && clasp pull

# Open GAS editor in browser
cd gas && clasp open

# View logs
cd gas && clasp logs
```

### Kaggle Notebook
```bash
# Push notebook to Kaggle
cd kaggle && kaggle kernels push -p .

# Pull latest notebook version
cd kaggle && kaggle kernels pull <username>/sentiment-pipeline-v4
```

### Running Tests
```bash
# Run Python tests (from project root)
cd tests/kaggle && python -m pytest test_sentiment.py -v

# Run JavaScript tests (requires Node.js)
cd tests/gas && npm test
```

### Testing GAS Functions
In GAS editor (clasp open), run these functions manually:
- `testPerplexityAPI()` - Test API connection
- `testLoadConfig()` - Verify configuration loading
- `testSingleCelebrity()` - Test fetching for one celebrity
- `testKaggleAPI()` - Test Kaggle API connection and credentials
- `initializeSheets()` - Create all required sheets with headers
- `setupDailyTrigger()` - Set up the 06:00 UTC+8 daily trigger

### Bulk Data Operations (GAS)
Run from GAS editor or via custom Sheets menu:
- `bulkFetchAllCelebrities()` - Fetch extended list of 60+ Taiwan celebrities
- `continueBulkFetch()` - Resume bulk fetch from last position (for multi-run collection)
- `deduplicateExistingData()` - Remove duplicate posts from 原始資料 sheet
- `syncSourcesToConfig()` - Auto-discover new sources and populate 來源設定 sheet

### Google Sheets Custom Menu
After deployment, a "CPQ 工具" menu appears in Sheets with:
- 執行批次擷取
- 移除重複資料
- 同步來源
- 初始化工作表
- 設定每日觸發器
- 顯示儀表板
- 執行情感分析 (triggers Kaggle notebook)
- 檢查 Kaggle 狀態 (monitor notebook execution)
- 系統重置 (reset system to clean state for presentations)

## Key Components

### Google Apps Script Files (`gas/`)

The codebase has been modularized for easier debugging and maintenance:

#### Core Orchestration
- `orchestrator.gs` (~300 lines) - Main entry point and orchestration
  - `fetchTaiwanSocialMedia()` - Daily trigger entry point
  - `bulkFetchAllCelebrities()` - Bulk data collection
  - `continueBulkFetch()` - Resume bulk operations
  - `onOpen()` - Google Sheets custom menu

#### Dashboard
- `dashboard.gs` (~2,400 lines) - HTML5 dashboard template
  - `doGet()` - Web app entry point
  - `showDashboard()` - Modal dialog in Sheets
  - `getHtmlDashboard()` - HTML/CSS/JS template with 5 tabs
- `dashboardBackend.gs` (~600 lines) - Dashboard data functions
  - `getAllDashboardData()` - Single API call loads all data (5-min cache)
  - `getResults()`, `getNewsData()`, `getSourcesData()`, `getAnalytics()`
  - `saveFeedback()`, `saveFeedbackBatch()` - Feedback submission
  - `saveSourceRating()`, `saveSourceRatingsBatch()` - Source ratings
  - `generatePdfReport()` - PDF export (v5.0)
  - `compareCelebrities()` - Celebrity comparison (v5.0)
  - `getAccuracyHistory()` - Accuracy trend chart data (v5.0)

#### Foundation Modules
- `constants.gs` (~100 lines) - All shared constants
  - `SHEET_ID`, `DASHBOARD_SHEET_ID`, `PERPLEXITY_API_URL`
  - `VALID_PLATFORMS`, `DEFAULT_CELEBRITIES`, `TREND_EMOJIS`
  - `MAX_EXECUTION_TIME_MS`, `API_RATE_LIMIT_MS` - Timing constants
  - `SHEET_NAMES` - Chinese sheet name mapping
  - Column header schemas (`RAW_DATA_HEADERS`, `RESULTS_HEADERS`, etc.) - All in Traditional Chinese
- `config.gs` (~130 lines) - Configuration loading
  - `loadConfig()` - Main config loader from 設定 sheet
  - `loadDashboardConfig()` - Dashboard-specific config
  - `loadSourceWeights()`, `loadSourceConfig()`
  - `getPerplexityApiKey()` - API key from Script Properties
- `sheetHelpers.gs` (~150 lines) - Sheet utility functions
  - `getSheetSafe()` - Safe sheet access with error handling
  - `findColumnIndex()` - Dynamic column lookup by header
  - `initializeSheets()` - Create all required sheets
  - `truncateContent()`, `formatDate()`, `escapeHtml()`

#### API & Data Processing
- `perplexityApi.gs` (~200 lines) - Perplexity API integration
  - `queryPerplexityAPI()` - API query with retry logic
  - `buildPerplexityPrompt()` - Prompt construction in Traditional Chinese
  - `validatePerplexityResponse()` - Response validation
- `deduplication.gs` (~200 lines) - Duplicate detection
  - `generatePostKey()` - Unique key generation (URL or content fingerprint)
  - `loadExistingPostKeys()` - Load existing keys for comparison
  - `deduplicatePosts()` - Filter duplicates before insertion
  - `deduplicateExistingData()` - Remove duplicates from 原始資料 (with UI)
  - `deduplicateRawDataSilent()` - Silent deduplication for scripts

#### Maintenance & Monitoring
- `logging.gs` (~80 lines) - Logging and alerts
  - `updateLogSheet()` - Write to 模型指標 sheet
  - `sendErrorAlert()` - Email alerts for critical errors
- `triggers.gs` (~60 lines) - Trigger management
  - `setupDailyTrigger()` - Create 06:00 UTC+8 trigger
  - `deleteAllTriggers()`, `listTriggers()`
- `sourceSync.gs` (~250 lines) - Source synchronization
  - `syncSourcesToConfig()` - Auto-discover sources from 原始資料
  - `syncCelebritiesToConfig()` - Sync celebrity list with data
- `audit.gs` (~900 lines) - Pre-presentation data validation
  - `runFullAudit()` - Main audit function (CPQ 工具 menu)
  - `auditRawDataSheet()`, `auditResultsSheet()`, `auditConfigSheet()`
  - `auditModelMetricsSheet()`, `auditSourceWeightsSheet()`, `auditSourceConfigSheet()`
- `autoFix.gs` (~500 lines) - Automatic repair functions
  - `fixResultsSheet()` - Fix TRUE/FALSE → 是/否, add trend emojis
  - `fixRawDataSheet()` - Normalize platform names, trim whitespace
  - `fixSourceWeights()` - Add missing platforms
  - `fixRawDataHeaders()` - Correct header mismatches (labels only or reorder)
  - `reorderRawDataColumns()` - Move columns to correct positions based on headers
  - `addMissingResultsColumns()` - Add v5.0 columns
- `reset.gs` (~120 lines) - System reset for presentations
  - `reboot()` - Main entry point, clears all data and resets configs to defaults
  - `clearDataSheet()` - Clear a sheet while preserving headers
  - `resetConfigSheet()` - Reset 設定 to 6 default settings
  - `resetSourceWeightsSheet()` - Reset 來源權重 to 5 platform defaults
- `testing.gs` (~100 lines) - Test utilities
  - `testPerplexityAPI()`, `testLoadConfig()`, `testSingleCelebrity()`
  - `testSheetAccess()`, `testDeduplicationKeys()`
  - `testFullPipelineDryRun()` - End-to-end test without writing

#### Kaggle API Integration
- `kaggleApi.gs` (~180 lines) - Kaggle notebook trigger via API
  - `triggerKaggleSentimentAnalysis()` - Menu entry point with confirmation dialog
  - `pushKaggleKernel()` - POST to Kaggle API to trigger notebook run
  - `checkKaggleKernelStatus()` - Check notebook execution status
  - `getKaggleKernelStatus()` - GET kernel status from API
  - `getKaggleCredentials()` - Load credentials from Script Properties
  - `testKaggleAPI()` - Test function to verify API connection

### Kaggle Notebook (`kaggle/`)
- `sentiment_pipeline_v4.ipynb` - Sentiment analysis pipeline
  - Uses `lxyuan/distilbert-base-multilingual-cased-sentiments-student` (multilingual BERT)
  - Train/test/validation split (70/20/10)
  - Requires Kaggle Secret: `GCP_JSON` (service account credentials)

### Google Sheets Structure (繁體中文)

| Sheet Name | Chinese | Purpose |
|------------|---------|---------|
| Config | 設定 | Settings (celebrities list, thresholds) |
| Raw Data | 原始資料 | All posts with columns A-L (timestamps, content, feedback) |
| Source Weights | 來源權重 | Platform weight scores (TikTok:10, Instagram:9, YouTube:8, Facebook:7, News:6) |
| Source Config | 來源設定 | Per-source importance ratings (1-5 stars), auto-populated from 原始資料 |
| Results | 結果 | Daily rankings with confidence intervals |
| Feedback History | 回饋歷史 | Training dataset for model fine-tuning |
| Model Metrics | 模型指標 | Audit trail (accuracy, precision, recall, F1) |

### Sheet Name Constants (constants.gs)
```javascript
const SHEET_NAMES = {
  RAW_DATA: "原始資料",
  CONFIG: "設定",
  SOURCE_WEIGHTS: "來源權重",
  RESULTS: "結果",
  FEEDBACK_HISTORY: "回饋歷史",
  MODEL_METRICS: "模型指標",
  SOURCE_CONFIG: "來源設定"
};
```

### Column Headers (繁體中文)

#### RAW_DATA_HEADERS (12 columns)
```javascript
["收集時間", "名人", "平台", "帳號名稱", "貼文內容", "貼文網址",
 "發布時間", "帳號類型", "回饋", "回饋備註", "情感分數", "處理日期"]
```

#### RESULTS_HEADERS (19 columns)
```javascript
["排名", "名人", "平均情感分數", "分析貼文數", "情感標準差",
 "加權聲量分數", "可信度分數", "分數區間", "模型準確度", "趨勢方向",
 "來源分析", "主要來源", "好評比例", "風險標記", "可代言",
 "最大貢獻來源", "分數變化分析", "最後更新", "分析備註"]
```

#### CONFIG_HEADERS (4 columns)
```javascript
["設定名稱", "值", "說明", "最後更新"]
```

#### SOURCE_WEIGHTS_HEADERS (4 columns)
```javascript
["來源", "權重分數", "理由", "最後修改"]
```

#### MODEL_METRICS_HEADERS (15 columns)
```javascript
["執行日期", "執行編號", "處理貼文數", "好評貼文", "負評貼文",
 "跳過貼文", "訓練準確度", "訓練精確度", "訓練召回率", "訓練F1分數",
 "模型狀態", "名人數量", "已排名名人", "流程狀態", "錯誤記錄"]
```

### Feedback Values (繁體中文)
```javascript
const VALID_FEEDBACK_VALUES = ["好評", "負評", "跳過"];
```

## v5.0 Features (2026-01-30)
- **PDF Export**: One-click PDF report with rankings, metrics, and endorsement summary
- **Celebrity Comparison**: Side-by-side modal comparing 2 celebrities with score bars, trends, platform breakdown
- **Accuracy Trend Chart**: Google Charts integration showing last 7 runs with 85% threshold line
- **Trend Velocity Indicators**: 🚀 快速上升 / 📉 快速下降 for significant changes (>15%)
- **Source Attribution**: 最大貢獻來源 and 分數變化分析 columns showing which platform drove score changes

## Key Thresholds
- Model accuracy threshold: 85%
- Confidence threshold for endorsement: 70%
- Sentiment StdDev max (volatility): 0.25
- Minimum training data for retraining: 200 samples

## API Integration

**Perplexity API**: `POST https://api.perplexity.ai/chat/completions`
- Model: `sonar`
- Auth: Bearer token stored in GAS Script Properties (`PERPLEXITY_API_KEY`)
- Prompts in Traditional Chinese (繁體中文)
- Rate limit handling: exponential backoff (2s, 4s, 8s)

**Google Sheets API**: Service account OAuth 2.0 with gspread library
- Credentials stored in Kaggle Secrets (`GCP_JSON`)

**Kaggle API**: `POST https://www.kaggle.com/api/v1/kernels/push`
- Auth: Basic Auth with `username:apiKey` base64 encoded
- Credentials stored in GAS Script Properties (`KAGGLE_USERNAME`, `KAGGLE_API_KEY`)
- Kernel ID: `howardleeeeee/celebrity-popularity-quantifier-taiwan`
- Status endpoint: `GET /kernels/status?userName=...&kernelSlug=...`

## Language & Market
- Market: Taiwan (TW) only
- Language: Traditional Chinese (繁體中文)
- Timezone: UTC+8 (Asia/Taipei)
- All UI elements, sheet names, column headers, and error messages are in Traditional Chinese

## Pipeline Schedule
1. 06:00 UTC+8: GAS fetches social media data via Perplexity API
2. 06:30 UTC+8: Human feedback review via dashboard (async)
3. 07:00 UTC+8: Kaggle notebook runs sentiment analysis and generates rankings

## Important Implementation Details

- GAS has 6-minute execution limit; orchestrator uses `MAX_EXECUTION_TIME_MS = 5 * 60 * 1000` buffer
- Dashboard uses `escapeHtml()` for XSS prevention on user content
- Sentiment scores range from -1 (negative) to +1 (positive)
- Valid platforms: Instagram, Facebook, TikTok, YouTube, News (platform names remain in English)
- Deduplication uses post URL as primary key, content fingerprint as fallback
- Dashboard batches feedback saves (debounced 3s) to reduce API calls
- Kaggle notebook requires ≥10 labelled samples to report accuracy metrics; otherwise shows "N/A"
- Model uses stratified train/test/val split to balance celebrity representation

## JSON Field Formats

**來源分析** (結果 sheet column K):
```json
{
  "Instagram": 0.75,
  "Facebook": 0.62,
  "YouTube": 0.81,
  "TikTok": 0.58,
  "News": 0.45
}
```
Values represent average sentiment per platform (-1 to +1).

**分數變化分析** (結果 sheet column Q):
```json
{
  "Instagram": "+0.12",
  "YouTube": "-0.05",
  "dominant_source": "Instagram",
  "total_change": "+0.07"
}
```
Shows which platform drove score changes between runs.

## Trend Direction Parsing

| Emoji | Text | Threshold | CSS Class |
|-------|------|-----------|-----------|
| 🚀 | 快速上升 | >+15% | `fast-up` |
| ↑ | 上升 | +5% to +15% | `up` |
| → | 穩定 | -5% to +5% | `stable` |
| ↓ | 下降 | -15% to -5% | `down` |
| 📉 | 快速下降 | <-15% | `fast-down` |

Dashboard parses trend strings to apply appropriate styling.

## Debugging Tips

**GAS Issues:**
- View logs: `clasp logs` or Logger in GAS editor
- Execution lock stuck: wait 30s or manually release via GAS editor
- API key missing: Check `PropertiesService.getScriptProperties().getProperty('PERPLEXITY_API_KEY')`

**Kaggle Issues:**
- Auth failures: Verify `GCP_JSON` secret contains valid service account JSON
- Memory errors: Reduce batch size or use GPU runtime

**Common Perplexity API Responses:**
- Empty posts array: Celebrity name may not be recognized; try alternative names
- Markdown-wrapped JSON: Parser handles `\`\`\`json` blocks automatically
- Refusal responses: Logged and skipped gracefully

## Error Messages (繁體中文)

Common error messages in the codebase:
- `找不到工作表` - Sheet not found
- `無效的 Kaggle 憑證` - Invalid Kaggle credentials
- `無法存取筆記本` - Cannot access notebook
- `找不到結果工作表` - Results sheet not found
- `無資料需要修復` - No data to fix
- `所有必要欄位已存在` - All required columns already exist
- `發現嚴重問題` - Critical issues found
- `發現警告` - Warnings found
- `所有檢查通過` - All checks passed
