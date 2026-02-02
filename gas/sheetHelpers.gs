/**
 * Celebrity Popularity Quantifier - Sheet Helpers
 * Taiwan Edition v5.0
 *
 * Utility functions for Google Sheets operations
 */

// =====================================================
// SHEET ACCESS
// =====================================================

/**
 * Safe sheet access wrapper with validation
 * @param {string} sheetId - The spreadsheet ID
 * @param {string} sheetName - The sheet/tab name
 * @returns {Sheet} The sheet object
 * @throws {Error} If spreadsheet or sheet not found
 */
function getSheetSafe(sheetId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    if (!ss) {
      throw new Error(`Spreadsheet not found: ${sheetId}`);
    }
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }
    return sheet;
  } catch (e) {
    throw new Error(`Sheet access error: ${e.message}`);
  }
}

/**
 * Find column index by header name
 * @param {Sheet} sheet - The sheet to search
 * @param {string} headerName - The column header to find
 * @returns {number} 1-based column index
 * @throws {Error} If column not found
 */
function findColumnIndex(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(headerName);
  if (idx === -1) {
    throw new Error(`Column "${headerName}" not found in sheet`);
  }
  return idx + 1; // Convert to 1-based index
}

/**
 * Get headers from a sheet
 * @param {Sheet} sheet - The sheet to read
 * @returns {Array} Array of header strings
 */
function getSheetHeaders(sheet) {
  if (sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

// =====================================================
// SHEET INITIALIZATION
// =====================================================

/**
 * Initialize all required sheets with headers
 * Run once to set up the Google Sheet structure
 */
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Raw Data sheet
  let rawSheet = ss.getSheetByName("Raw Data");
  if (!rawSheet) {
    rawSheet = ss.insertSheet("Raw Data");
    rawSheet.appendRow(RAW_DATA_HEADERS);
    Logger.log("✓ Created 'Raw Data' sheet");
  }

  // Config sheet
  let configSheet = ss.getSheetByName("Config");
  if (!configSheet) {
    configSheet = ss.insertSheet("Config");
    configSheet.appendRow(CONFIG_HEADERS);
    configSheet.appendRow(["CELEBRITIES_TO_TRACK", DEFAULT_CELEBRITIES.join(", "), "List of celebrity names to monitor", new Date()]);
    configSheet.appendRow(["MODEL_ACCURACY_THRESHOLD", "0.85", "Alert if model accuracy below this", new Date()]);
    configSheet.appendRow(["CONFIDENCE_THRESHOLD", "0.70", "Endorsement ready if above this", new Date()]);
    configSheet.appendRow(["SENTIMENT_STDDEV_MAX", "0.25", "Maximum sentiment volatility", new Date()]);
    configSheet.appendRow(["DATA_RETENTION_DAYS", "30", "Days to keep historical data", new Date()]);
    configSheet.appendRow(["TRAINING_DATA_MIN", "200", "Minimum feedback samples for retraining", new Date()]);
    Logger.log("✓ Created 'Config' sheet");
  }

  // Source Weights sheet
  let weightsSheet = ss.getSheetByName("Source Weights");
  if (!weightsSheet) {
    weightsSheet = ss.insertSheet("Source Weights");
    weightsSheet.appendRow(SOURCE_WEIGHTS_HEADERS);
    DEFAULT_PLATFORM_WEIGHTS.forEach(([platform, weight, rationale]) => {
      weightsSheet.appendRow([platform, weight, rationale, new Date()]);
    });
    Logger.log("✓ Created 'Source Weights' sheet");
  }

  // Results sheet (19 columns per v5.0 spec)
  let resultsSheet = ss.getSheetByName("Results");
  if (!resultsSheet) {
    resultsSheet = ss.insertSheet("Results");
    resultsSheet.appendRow(RESULTS_HEADERS);
    Logger.log("✓ Created 'Results' sheet");
  }

  // Feedback History sheet
  let feedbackSheet = ss.getSheetByName("Feedback History");
  if (!feedbackSheet) {
    feedbackSheet = ss.insertSheet("Feedback History");
    feedbackSheet.appendRow(FEEDBACK_HISTORY_HEADERS);
    Logger.log("✓ Created 'Feedback History' sheet");
  }

  // Model Metrics sheet
  let metricsSheet = ss.getSheetByName("Model Metrics");
  if (!metricsSheet) {
    metricsSheet = ss.insertSheet("Model Metrics");
    metricsSheet.appendRow(MODEL_METRICS_HEADERS);
    Logger.log("✓ Created 'Model Metrics' sheet");
  }

  // Source Config sheet (for source-specific importance ratings)
  let sourceConfigSheet = ss.getSheetByName("Source Config");
  if (!sourceConfigSheet) {
    sourceConfigSheet = ss.insertSheet("Source Config");
    sourceConfigSheet.appendRow(SOURCE_CONFIG_HEADERS);
    Logger.log("✓ Created 'Source Config' sheet");
  }

  Logger.log("✓ All sheets initialized successfully!");
}

// =====================================================
// TEXT UTILITIES
// =====================================================

/**
 * Truncate content to a maximum length
 * @param {string} content - The content to truncate
 * @param {number} maxLength - Maximum length (default 200)
 * @returns {string} Truncated content with ellipsis if needed
 */
function truncateContent(content, maxLength = 200) {
  if (!content) return "";
  const str = String(content);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (default: yyyy-MM-dd HH:mm)
 * @returns {string} Formatted date string
 */
function formatDate(date, format = "yyyy-MM-dd HH:mm") {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return Utilities.formatDate(d, TIMEZONE, format);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =====================================================
// DATA CONVERSION
// =====================================================

/**
 * Convert row data to object using headers
 * @param {Array} headers - Array of header names
 * @param {Array} row - Array of row values
 * @returns {Object} Object with header keys and row values
 */
function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx];
  });
  return obj;
}

/**
 * Convert object to row data using headers
 * @param {Array} headers - Array of header names
 * @param {Object} obj - Object with values
 * @returns {Array} Array of values in header order
 */
function objectToRow(headers, obj) {
  return headers.map(header => obj[header] !== undefined ? obj[header] : "");
}
