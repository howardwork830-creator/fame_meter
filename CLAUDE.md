# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Celebrity Popularity Quantifier (CPQ) - Taiwan Edition: A daily batch pipeline that tracks Taiwan celebrity social media popularity using sentiment analysis and ML.

**Architecture:**
- **Data Ingestion**: Perplexity API fetches social media mentions (Instagram, Facebook, TikTok, YouTube)
- **Orchestration**: Google Apps Script (GAS) triggers at 06:00 UTC+8
- **Storage**: Google Sheets as primary database (Sheet ID: `YOUR_SHEET_ID`)
- **ML Processing**: Kaggle Notebook with `lxyuan/distilbert-base-multilingual-cased-sentiments-student` model
- **Dashboard**: HTML5 + JavaScript embedded in GAS

**Data Flow:**
```
Perplexity API → GAS orchestrator.gs → Google Sheets (Raw Data)
                                              ↓
                        Human Review (dashboard.gs) → Feedback Updated
                                              ↓
                        Kaggle Notebook → Sentiment Analysis → Results Sheet
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
- `initializeSheets()` - Create all required sheets with headers
- `setupDailyTrigger()` - Set up the 06:00 UTC+8 daily trigger

### Bulk Data Operations (GAS)
Run from GAS editor or via custom Sheets menu:
- `bulkFetchAllCelebrities()` - Fetch extended list of 60+ Taiwan celebrities
- `continueBulkFetch()` - Resume bulk fetch from last position (for multi-run collection)
- `deduplicateExistingData()` - Remove duplicate posts from Raw Data sheet
- `syncSourcesToConfig()` - Auto-discover new sources and populate Source Config sheet

### Google Sheets Custom Menu
After deployment, a "CPQ Tools" menu appears in Sheets with:
- Run Bulk Fetch
- Remove Duplicates
- Sync Sources
- Initialize Sheets
- Setup Daily Trigger

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
  - Column header schemas (`RAW_DATA_HEADERS`, `RESULTS_HEADERS`, etc.)
- `config.gs` (~130 lines) - Configuration loading
  - `loadConfig()` - Main config loader from Config sheet
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
  - `deduplicateExistingData()` - Remove duplicates from Raw Data (with UI)
  - `deduplicateRawDataSilent()` - Silent deduplication for scripts

#### Maintenance & Monitoring
- `logging.gs` (~80 lines) - Logging and alerts
  - `updateLogSheet()` - Write to Model Metrics sheet
  - `sendErrorAlert()` - Email alerts for critical errors
- `triggers.gs` (~60 lines) - Trigger management
  - `setupDailyTrigger()` - Create 06:00 UTC+8 trigger
  - `deleteAllTriggers()`, `listTriggers()`
- `sourceSync.gs` (~250 lines) - Source synchronization
  - `syncSourcesToConfig()` - Auto-discover sources from Raw Data
  - `syncCelebritiesToConfig()` - Sync celebrity list with data
- `audit.gs` (~900 lines) - Pre-presentation data validation
  - `runFullAudit()` - Main audit function (CPQ Tools menu)
  - `auditRawDataSheet()`, `auditResultsSheet()`, `auditConfigSheet()`
  - `auditModelMetricsSheet()`, `auditSourceWeightsSheet()`, `auditSourceConfigSheet()`
- `autoFix.gs` (~500 lines) - Automatic repair functions
  - `fixResultsSheet()` - Fix TRUE/FALSE → Yes/No, add trend emojis
  - `fixRawDataSheet()` - Normalize platform names, trim whitespace
  - `fixSourceWeights()` - Add missing platforms
  - `fixRawDataHeaders()` - Correct header mismatches (labels only or reorder)
  - `reorderRawDataColumns()` - Move columns to correct positions based on headers
  - `addMissingResultsColumns()` - Add v5.0 columns
- `testing.gs` (~100 lines) - Test utilities
  - `testPerplexityAPI()`, `testLoadConfig()`, `testSingleCelebrity()`
  - `testSheetAccess()`, `testDeduplicationKeys()`
  - `testFullPipelineDryRun()` - End-to-end test without writing

### Kaggle Notebook (`kaggle/`)
- `sentiment_pipeline_v4.ipynb` - Sentiment analysis pipeline
  - Uses `lxyuan/distilbert-base-multilingual-cased-sentiments-student` (multilingual BERT)
  - Train/test/validation split (70/20/10)
  - Requires Kaggle Secret: `GCP_JSON` (service account credentials)

### Google Sheets Structure
- **Config**: Settings (celebrities list, thresholds)
- **Raw Data**: All posts with columns A-L (timestamps, content, feedback)
- **Source Weights**: Platform weight scores (TikTok:10, Instagram:9, YouTube:8, Facebook:7, News:6)
- **Source Config**: Per-source importance ratings (1-5 stars), auto-populated from Raw Data
- **Results**: Daily rankings with confidence intervals
- **Feedback History**: Training dataset for model fine-tuning
- **Model Metrics**: Audit trail (accuracy, precision, recall, F1)

## v5.0 Features (2026-01-30)
- **PDF Export**: One-click PDF report with rankings, metrics, and endorsement summary
- **Celebrity Comparison**: Side-by-side modal comparing 2 celebrities with score bars, trends, platform breakdown
- **Accuracy Trend Chart**: Google Charts integration showing last 7 runs with 85% threshold line
- **Trend Velocity Indicators**: 🚀 Fast Rising / 📉 Fast Falling for significant changes (>15%)
- **Source Attribution**: Top_Contributing_Source and Score_Change_Breakdown columns showing which platform drove score changes

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

## Language & Market
- Market: Taiwan (TW) only
- Language: Traditional Chinese (繁體中文)
- Timezone: UTC+8 (Asia/Taipei)

## Pipeline Schedule
1. 06:00 UTC+8: GAS fetches social media data via Perplexity API
2. 06:30 UTC+8: Human feedback review via dashboard (async)
3. 07:00 UTC+8: Kaggle notebook runs sentiment analysis and generates rankings

## Important Implementation Details

- GAS has 6-minute execution limit; orchestrator uses `MAX_EXECUTION_TIME_MS = 5 * 60 * 1000` buffer
- Dashboard uses `escapeHtml()` for XSS prevention on user content
- Sentiment scores range from -1 (negative) to +1 (positive)
- Valid platforms: Instagram, Facebook, TikTok, YouTube, News
- Deduplication uses post URL as primary key, content fingerprint as fallback
- Dashboard batches feedback saves (debounced 3s) to reduce API calls
- Kaggle notebook requires ≥10 labelled samples to report accuracy metrics; otherwise shows "N/A"
- Model uses stratified train/test/val split to balance celebrity representation

## JSON Field Formats

**Source_Breakdown** (Results sheet column K):
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

**Score_Change_Breakdown** (Results sheet column Q):
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
| 🚀 | Fast Rising | >+15% | `fast-up` |
| ↑ | Rising | +5% to +15% | `up` |
| → | Stable | -5% to +5% | `stable` |
| ↓ | Falling | -15% to -5% | `down` |
| 📉 | Fast Falling | <-15% | `fast-down` |

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
