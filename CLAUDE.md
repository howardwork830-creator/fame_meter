# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Celebrity Popularity Quantifier (CPQ) - Taiwan Edition: A daily batch pipeline that tracks Taiwan celebrity social media popularity using sentiment analysis and ML.

**Architecture:**
- **Data Ingestion**: Perplexity API fetches social media mentions (Instagram, Facebook, TikTok, YouTube)
- **Orchestration**: Google Apps Script (GAS) triggers at 06:00 UTC+8
- **Storage**: Google Sheets as primary database (Sheet ID: `1sgKkhqP0_WAzdBfBbH2oWLAav-WlGkbCyayLguaHG6Q`)
- **ML Processing**: Kaggle Notebook with `uer/roberta-base-chinese-sentiment` model
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
- `orchestrator.gs` - Main entry point, daily trigger, Perplexity API integration
  - Entry: `fetchTaiwanSocialMedia()` - triggered daily
  - Uses execution lock to prevent concurrent runs
  - Batch writes to sheets for efficiency
- `dashboard.gs` - Interactive HTML dashboard with 5 tabs
  - Tab 1: 排名 (Rankings) - Daily celebrity rankings with trend indicators
  - Tab 2: 📰 最新動態 (News) - Recent posts card grid, filterable by celebrity/platform
  - Tab 3: ⭐ 評分 (Feedback) - Flashcard interface for labeling posts Good/Bad/Skip
  - Tab 4: 📈 分析 (Analytics) - Model metrics, accuracy alerts, training data stats
  - Tab 5: 🎯 來源評分 (Source Rating) - Star ratings (1-5) for individual sources
  - `doGet()` - Web app entry point
  - `showDashboard()` - Modal dialog in Sheets
  - `getAllDashboardData()` - Single API call loads all data (5-min cache)

### Kaggle Notebook (`kaggle/`)
- `sentiment_pipeline_v4.ipynb` - Sentiment analysis pipeline
  - Uses `lxyuan/distilbert-base-multilingual-cased-sentiments-student` (multilingual BERT)
  - Train/test/validation split (70/20/10)
  - Requires Kaggle Secret: `GCP_JSON` (service account credentials)

### Google Sheets Structure
- **Config**: Settings (celebrities list, thresholds)
- **Raw Data**: All posts with columns A-M (timestamps, content, engagement, feedback)
- **Source Weights**: Platform weight scores (TikTok:10, Instagram:9, YouTube:8, Facebook:7)
- **Source Config**: Per-source importance ratings (1-5 stars), auto-populated from Raw Data
- **Results**: Daily rankings with confidence intervals
- **Feedback History**: Training dataset for model fine-tuning
- **Model Metrics**: Audit trail (accuracy, precision, recall, F1)

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
