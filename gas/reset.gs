/**
 * Celebrity Popularity Quantifier - System Reset
 * Taiwan Edition v5.0
 *
 * Functions to reset system to initial state for presentations
 */

/**
 * Reboot system to clean state for presentations
 * Clears all data sheets and resets config to defaults
 */
function reboot() {
  const ui = SpreadsheetApp.getUi();

  // 1. Confirm with user
  const response = ui.alert(
    '🔄 系統重置 (Reboot)',
    '此操作將清除所有資料並重置系統設定：\n\n' +
    '• 清除 Raw Data (所有貼文)\n' +
    '• 清除 Results (所有排名)\n' +
    '• 清除 Feedback History (所有回饋)\n' +
    '• 清除 Model Metrics (所有執行記錄)\n' +
    '• 清除 Source Config (所有來源評分)\n' +
    '• 重置 Config (預設設定)\n' +
    '• 重置 Source Weights (預設權重)\n\n' +
    '確定要繼續嗎？',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('已取消重置');
    return;
  }

  // 2. Execute reset
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // Clear data sheets (keep headers)
    clearDataSheet(ss, "Raw Data");
    clearDataSheet(ss, "Results");
    clearDataSheet(ss, "Feedback History");
    clearDataSheet(ss, "Model Metrics");
    clearDataSheet(ss, "Source Config");

    // Reset config sheets to defaults
    resetConfigSheet(ss);
    resetSourceWeightsSheet(ss);

    // Show success
    ui.alert(
      '✓ 系統重置完成',
      '系統已重置為初始狀態，可開始進行簡報展示。',
      ui.ButtonSet.OK
    );

    Logger.log('System reboot completed at ' + new Date().toISOString());

  } catch (e) {
    ui.alert('重置失敗: ' + e.message);
    Logger.log('Reboot failed: ' + e.message);
  }
}

/**
 * Clear a data sheet (keep header row)
 * @param {Spreadsheet} ss - Spreadsheet object
 * @param {string} sheetName - Name of sheet to clear
 */
function clearDataSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('Sheet not found: ' + sheetName);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  Logger.log('Cleared: ' + sheetName);
}

/**
 * Reset Config sheet to defaults
 * @param {Spreadsheet} ss - Spreadsheet object
 */
function resetConfigSheet(ss) {
  const sheet = ss.getSheetByName("Config");
  if (!sheet) return;

  sheet.clear();

  const now = new Date();
  const data = [
    CONFIG_HEADERS,
    ["CELEBRITIES_TO_TRACK", "蔡依林, 王心凌, 柯震東, 林俊傑, 五月天", "List of celebrities to track", now],
    ["MODEL_ACCURACY_THRESHOLD", "0.85", "Alert if model accuracy below this", now],
    ["CONFIDENCE_THRESHOLD", "0.70", "Endorsement ready if confidence above this", now],
    ["SENTIMENT_STDDEV_MAX", "0.25", "Maximum sentiment volatility allowed", now],
    ["DATA_RETENTION_DAYS", "30", "Days to keep historical data", now],
    ["TRAINING_DATA_MIN", "200", "Minimum feedback samples for retraining", now]
  ];

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  Logger.log('Reset: Config');
}

/**
 * Reset Source Weights sheet to defaults
 * @param {Spreadsheet} ss - Spreadsheet object
 */
function resetSourceWeightsSheet(ss) {
  const sheet = ss.getSheetByName("Source Weights");
  if (!sheet) return;

  sheet.clear();

  const now = new Date();
  const data = [
    SOURCE_WEIGHTS_HEADERS,
    ["TikTok", 10, "Highest reach; viral potential", now],
    ["Instagram", 9, "Visual engagement; younger demographic", now],
    ["YouTube", 8, "Long-form content; deep engagement", now],
    ["Facebook", 7, "Broad reach; older demographic", now],
    ["News", 6, "Credibility; media coverage", now]
  ];

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  Logger.log('Reset: Source Weights');
}
