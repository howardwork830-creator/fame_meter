# CPQ 測試文件

此目錄包含名人聲量分析系統 (CPQ) 專案的測試。

## 目錄結構

```
tests/
├── README.md           # 本檔案
├── gas/
│   └── test_orchestrator.js  # GAS 函式單元測試
└── kaggle/
    └── test_sentiment.py     # 情感分析管道單元測試
```

## 執行測試

### Python 測試（Kaggle 管道）

**前置需求:**
- Python 3.10+
- pytest

**安裝相依套件:**
```bash
pip install pytest pandas numpy
```

**執行測試:**
```bash
cd tests/kaggle
python -m pytest test_sentiment.py -v
```

### JavaScript 測試（GAS 函式）

**前置需求:**
- Node.js 18+
- npm

**安裝相依套件:**
```bash
cd tests/gas
npm install
```

**執行測試:**
```bash
npm test
```

## 測試覆蓋率

### GAS 測試 (`test_orchestrator.js`)
- `validatePerplexityResponse()` - 使用模擬資料的回應驗證
- `parsePostTimestamp()` - 時間戳記解析邊界案例
- `loadConfig()` - 設定載入驗證

### Kaggle 測試 (`test_sentiment.py`)
- 情感分數正規化 (-1 到 +1 範圍)
- 趨勢方向計算
- 代言準備度計算
- 資料驗證函式

## 撰寫新測試

### GAS 測試
使用 `test_orchestrator.js` 中提供的模擬框架。模擬 `SpreadsheetApp` 和 `UrlFetchApp` 服務。

### Kaggle 測試
使用 pytest fixtures 設定常用測試資料。測試函式名稱應以 `test_` 為前綴。

## CI 整合

測試會在以下情況自動執行：
- 推送至 `main` 分支
- 對 `main` 分支發起 Pull Request

CI 設定請參閱 `.github/workflows/ci.yml`。
