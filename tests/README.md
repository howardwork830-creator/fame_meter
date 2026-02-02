# CPQ Testing Documentation

This directory contains tests for the Celebrity Popularity Quantifier (CPQ) project.

## Directory Structure

```
tests/
├── README.md           # This file
├── gas/
│   └── test_orchestrator.js  # GAS function unit tests
└── kaggle/
    └── test_sentiment.py     # Sentiment pipeline unit tests
```

## Running Tests

### Python Tests (Kaggle Pipeline)

**Prerequisites:**
- Python 3.10+
- pytest

**Install dependencies:**
```bash
pip install pytest pandas numpy
```

**Run tests:**
```bash
cd tests/kaggle
python -m pytest test_sentiment.py -v
```

### JavaScript Tests (GAS Functions)

**Prerequisites:**
- Node.js 18+
- npm

**Install dependencies:**
```bash
cd tests/gas
npm install
```

**Run tests:**
```bash
npm test
```

## Test Coverage

### GAS Tests (`test_orchestrator.js`)
- `validatePerplexityResponse()` - Response validation with mock data
- `parsePostTimestamp()` - Timestamp parsing edge cases
- `loadConfig()` - Configuration loading validation

### Kaggle Tests (`test_sentiment.py`)
- Sentiment score normalization (-1 to +1 range)
- Trend direction calculation
- Endorsement readiness calculation
- Data validation functions

## Writing New Tests

### GAS Tests
Use the mock framework provided in `test_orchestrator.js`. Mock the `SpreadsheetApp` and `UrlFetchApp` services.

### Kaggle Tests
Use pytest fixtures for common test data. Test functions should be prefixed with `test_`.

## CI Integration

Tests are automatically run on:
- Push to `main` branch
- Pull requests to `main` branch

See `.github/workflows/ci.yml` for CI configuration.
