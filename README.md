# Celebrity Popularity Quantifier (CPQ) - Taiwan Edition

A daily batch pipeline that tracks Taiwan celebrity social media popularity using sentiment analysis and ML.

## Overview

CPQ automatically collects social media mentions from Instagram, Facebook, TikTok, YouTube, and news sources, runs sentiment analysis using a multilingual BERT model, and generates daily popularity rankings with confidence intervals.

**Target Market:** Taiwan (TW)
**Language:** Traditional Chinese (繁體中文)
**Version:** 5.0

## Features

### Core Features
- **Daily Data Collection**: Automated fetching via Perplexity API at 06:00 UTC+8
- **Sentiment Analysis**: Using `lxyuan/distilbert-base-multilingual-cased-sentiments-student` model
- **Weighted Scoring**: Platform weights + source importance ratings
- **Human Feedback Loop**: Dashboard for labeling posts (Good/Bad/Skip)
- **Model Evaluation**: Train/test/validation split with accuracy metrics

### Dashboard Features (v5.0)
| Tab | Feature |
|-----|---------|
| 📊 排名 | Celebrity rankings with trend indicators |
| 📰 最新動態 | Recent posts feed with filters |
| ⭐ 評分 | Flashcard interface for feedback |
| 📈 分析 | Model metrics + accuracy trend chart |
| 🎯 來源評分 | Source importance ratings (1-5 stars) |

### New in v5.0
- **PDF Export**: One-click downloadable report with rankings and metrics
- **Celebrity Comparison**: Side-by-side modal comparing 2 celebrities
- **Accuracy Trend Chart**: Google Charts showing last 7 runs with 85% threshold
- **Trend Velocity**: 🚀 Fast Rising / 📉 Fast Falling indicators for significant changes
- **Source Attribution**: Shows which platform drove score changes

## Architecture

```
Perplexity API → GAS orchestrator.gs → Google Sheets (Raw Data)
                                              ↓
                        Human Review (dashboard.gs) → Feedback Updated
                                              ↓
                        Kaggle Notebook → Sentiment Analysis → Results Sheet
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Data Ingestion | Perplexity API |
| Orchestration | Google Apps Script (GAS) |
| Storage | Google Sheets |
| ML Processing | Kaggle Notebook (Python 3.10, GPU) |
| Sentiment Model | DistilBERT Multilingual |
| Dashboard | HTML5 + JavaScript + Google Charts |

## Setup

### Prerequisites
- Google Cloud Service Account with Sheets API enabled
- Perplexity API key
- Kaggle account with GPU access

### 1. Google Apps Script Setup
```bash
cd gas
clasp login
clasp push
```

### 2. Configure Script Properties
In GAS editor, set:
- `PERPLEXITY_API_KEY`: Your Perplexity API key

### 3. Kaggle Setup
Add Kaggle Secret:
- `GCP_JSON`: Google Cloud Service Account JSON credentials

### 4. Initialize Sheets
Run in GAS editor:
```javascript
initializeSheets()
setupDailyTrigger()
```

## Usage

### Daily Workflow
| Time (UTC+8) | Action |
|--------------|--------|
| 06:00 | GAS fetches social media data |
| 06:30+ | Human feedback review via dashboard |
| 07:00 | Kaggle notebook runs sentiment analysis |

### Development Commands

**Google Apps Script:**
```bash
cd gas && clasp push      # Push changes
cd gas && clasp pull      # Pull changes
cd gas && clasp open      # Open editor
```

**Kaggle:**
```bash
cd kaggle && kaggle kernels push -p .
```

## Google Sheets Structure

| Sheet | Purpose |
|-------|---------|
| Config | Settings and celebrity list |
| Raw Data | All collected posts |
| Results | Daily rankings output |
| Source Weights | Platform weight scores |
| Source Config | Per-source importance ratings |
| Feedback History | Training dataset |
| Model Metrics | Audit trail |

## Key Thresholds

| Metric | Threshold |
|--------|-----------|
| Model Accuracy | ≥ 85% |
| Endorsement Confidence | ≥ 70% |
| Sentiment StdDev Max | ≤ 0.25 |
| Training Data Min | 200 samples |

## Results Schema

Key output columns in Results sheet:
- `Rank`: Daily ranking position
- `Celebrity`: Celebrity name
- `Weighted_Popularity_Score`: Main KPI
- `Confidence_Score`: Model accuracy %
- `Trend_Direction`: 🚀/↑/→/↓/📉
- `Endorsement_Ready`: Yes/No
- `Risk_Flag`: Yes if >20% drop
- `Top_Contributing_Source`: Platform driving change (v5.0)
- `Score_Change_Breakdown`: Delta by platform JSON (v5.0)

## Documentation

- [MANUAL.md](MANUAL.md) - User guide (Traditional Chinese)
- [PROJECT-TECHNICAL-SPEC.md](PROJECT-TECHNICAL-SPEC.md) - Full technical specification
- [CLAUDE.md](CLAUDE.md) - Development guidance for Claude Code

## License

Private project - All rights reserved.

## Changelog

### v5.0 (2026-01-30)
- Added PDF Export functionality
- Added Celebrity Comparison modal
- Added Accuracy Trend Chart (Google Charts)
- Enhanced Trend Direction with velocity indicators
- Added Source Attribution columns

### v4.0 (2026-01-07)
- Production ML Pipeline with train/test/validation split
- Interactive HTML Dashboard with 5 tabs
- Confidence intervals and model metrics
- Audit trail and alert system
