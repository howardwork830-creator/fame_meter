/**
 * Celebrity Popularity Quantifier - Auto Fix
 * Taiwan Edition v5.0
 *
 * Functions for automatically fixing common data issues
 */

// =====================================================
// RESULTS SHEET FIXES
// =====================================================

/**
 * Add missing v5.0 columns to existing Results sheet
 * Call this if Results sheet exists but is missing newer columns
 */
function addMissingResultsColumns() {
  const ui = SpreadsheetApp.getUi();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Results");
    if (!sheet) {
      ui.alert("Results sheet not found");
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    let addedColumns = [];

    RESULTS_HEADERS.forEach((col, idx) => {
      if (!headers.includes(col)) {
        // Add column at end
        const newColIdx = sheet.getLastColumn() + 1;
        sheet.getRange(1, newColIdx).setValue(col);
        addedColumns.push(col);
      }
    });

    if (addedColumns.length > 0) {
      ui.alert(`✓ Added ${addedColumns.length} missing columns:\n\n${addedColumns.join("\n")}`);
      Logger.log(`Added columns to Results: ${addedColumns.join(", ")}`);
    } else {
      ui.alert("✓ All required columns already exist");
    }

  } catch (e) {
    ui.alert(`Error: ${e.message}`);
    Logger.log(`Error adding columns: ${e.message}`);
  }
}

/**
 * Auto-fix common issues in Results sheet
 * - Convert TRUE/FALSE to Yes/No
 * - Add missing trend emojis
 * - Fix empty JSON fields
 */
function fixResultsSheet() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    '🔧 Fix Results Sheet',
    'This will automatically fix:\n' +
    '• Convert TRUE/FALSE to Yes/No\n' +
    '• Add missing trend emojis\n' +
    '• Add {} for empty JSON fields\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Results");
    if (!sheet) {
      ui.alert("Results sheet not found");
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      ui.alert("No data to fix");
      return;
    }

    const headers = data[0];
    const riskIdx = headers.indexOf("Risk_Flag");
    const endorsementIdx = headers.indexOf("Endorsement_Ready");
    const trendIdx = headers.indexOf("Trend_Direction");
    const sourceBreakdownIdx = headers.indexOf("Source_Breakdown");
    const scoreChangeIdx = headers.indexOf("Score_Change_Breakdown");
    const scoreIdx = headers.indexOf("Weighted_Popularity_Score");

    let fixCount = 0;

    for (let i = 1; i < data.length; i++) {
      let rowChanged = false;

      // Fix Risk_Flag: TRUE/FALSE → Yes/No
      if (riskIdx >= 0) {
        const val = String(data[i][riskIdx]).toUpperCase().trim();
        if (val === "TRUE") {
          data[i][riskIdx] = "Yes";
          rowChanged = true;
        } else if (val === "FALSE") {
          data[i][riskIdx] = "No";
          rowChanged = true;
        }
      }

      // Fix Endorsement_Ready: TRUE/FALSE → Yes/No
      if (endorsementIdx >= 0) {
        const val = String(data[i][endorsementIdx]).toUpperCase().trim();
        if (val === "TRUE") {
          data[i][endorsementIdx] = "Yes";
          rowChanged = true;
        } else if (val === "FALSE") {
          data[i][endorsementIdx] = "No";
          rowChanged = true;
        }
      }

      // Fix Trend_Direction: Add emoji if missing
      if (trendIdx >= 0) {
        const trend = String(data[i][trendIdx] || "");
        const hasEmoji = TREND_EMOJIS.some(e => trend.includes(e));

        if (!hasEmoji && trend) {
          // Try to determine direction from value or default to stable
          let newTrend = "→ Stable";

          // If we have score data, check previous row for delta
          if (scoreIdx >= 0 && i > 1) {
            const currentScore = Number(data[i][scoreIdx]);
            const prevScore = Number(data[i-1][scoreIdx]);
            const delta = currentScore - prevScore;

            if (delta > 0.15) newTrend = "🚀 Fast Rising";
            else if (delta > 0.05) newTrend = "↑ Rising";
            else if (delta < -0.15) newTrend = "📉 Fast Falling";
            else if (delta < -0.05) newTrend = "↓ Falling";
          }

          data[i][trendIdx] = newTrend;
          rowChanged = true;
        } else if (!trend) {
          data[i][trendIdx] = "→ Stable";
          rowChanged = true;
        }
      }

      // Fix Source_Breakdown: Add {} if empty
      if (sourceBreakdownIdx >= 0) {
        const val = String(data[i][sourceBreakdownIdx] || "").trim();
        if (!val) {
          data[i][sourceBreakdownIdx] = "{}";
          rowChanged = true;
        }
      }

      // Fix Score_Change_Breakdown: Add {} if empty
      if (scoreChangeIdx >= 0) {
        const val = String(data[i][scoreChangeIdx] || "").trim();
        if (!val) {
          data[i][scoreChangeIdx] = "{}";
          rowChanged = true;
        }
      }

      if (rowChanged) fixCount++;
    }

    // Write back data
    if (fixCount > 0) {
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    }

    ui.alert(`✓ Fixed ${fixCount} rows in Results sheet`);
    Logger.log(`Fixed ${fixCount} rows in Results sheet`);

  } catch (e) {
    ui.alert(`Error: ${e.message}`);
    Logger.log(`Fix error: ${e.message}`);
  }
}

// =====================================================
// RAW DATA SHEET FIXES
// =====================================================

/**
 * Auto-fix common issues in Raw Data sheet
 * - Normalize platform names
 * - Remove negative engagement values
 */
function fixRawDataSheet() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    '🔧 Fix Raw Data Sheet',
    'This will automatically fix:\n' +
    '• Normalize platform names (instagram → Instagram)\n' +
    '• Convert negative engagement to 0\n' +
    '• Trim whitespace from text fields\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Raw Data");
    if (!sheet) {
      ui.alert("Raw Data sheet not found");
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      ui.alert("No data to fix");
      return;
    }

    // Use dynamic header lookup instead of hardcoded indices
    const headers = data[0];
    const platformIdx = headers.indexOf("Platform");
    const engagementIdx = headers.indexOf("Engagement_Metric");
    const celebrityIdx = headers.indexOf("Celebrity");

    if (platformIdx === -1 || engagementIdx === -1 || celebrityIdx === -1) {
      ui.alert("Error: Required columns not found. Expected: Platform, Engagement_Metric, Celebrity");
      return;
    }

    let fixCount = 0;

    for (let i = 1; i < data.length; i++) {
      let rowChanged = false;

      // Fix platform names
      const platform = String(data[i][platformIdx] || "").trim().toLowerCase();
      if (PLATFORM_NAME_MAP[platform] && data[i][platformIdx] !== PLATFORM_NAME_MAP[platform]) {
        data[i][platformIdx] = PLATFORM_NAME_MAP[platform];
        rowChanged = true;
      }

      // Fix negative engagement
      const engagement = Number(data[i][engagementIdx]);
      if (!isNaN(engagement) && engagement < 0) {
        data[i][engagementIdx] = 0;
        rowChanged = true;
      }

      // Trim celebrity name
      const celebrity = String(data[i][celebrityIdx] || "").trim();
      if (celebrity !== data[i][celebrityIdx]) {
        data[i][celebrityIdx] = celebrity;
        rowChanged = true;
      }

      if (rowChanged) fixCount++;
    }

    // Write back data
    if (fixCount > 0) {
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    }

    ui.alert(`✓ Fixed ${fixCount} rows in Raw Data sheet`);
    Logger.log(`Fixed ${fixCount} rows in Raw Data sheet`);

  } catch (e) {
    ui.alert(`Error: ${e.message}`);
    Logger.log(`Fix error: ${e.message}`);
  }
}

// =====================================================
// SOURCE WEIGHTS FIXES
// =====================================================

/**
 * Fix Source Weights sheet - adds missing platforms
 */
function fixSourceWeights() {
  const ui = SpreadsheetApp.getUi();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Source Weights");
    if (!sheet) {
      ui.alert("Source Weights sheet not found. Run Initialize Sheets first.");
      return;
    }

    const data = sheet.getDataRange().getValues();
    const existingSources = new Set();

    // Find existing sources
    for (let i = 1; i < data.length; i++) {
      const source = String(data[i][0] || "").trim();
      if (source) existingSources.add(source);
    }

    let added = [];

    DEFAULT_PLATFORM_WEIGHTS.forEach(([platform, weight, rationale]) => {
      if (!existingSources.has(platform)) {
        sheet.appendRow([platform, weight, rationale, new Date()]);
        added.push(platform);
      }
    });

    if (added.length > 0) {
      ui.alert(`✓ Added missing platforms:\n\n${added.join("\n")}`);
      Logger.log(`Added platforms to Source Weights: ${added.join(", ")}`);
    } else {
      ui.alert("✓ All required platforms already exist.");
    }

  } catch (e) {
    ui.alert(`Error: ${e.message}`);
  }
}

// =====================================================
// RAW DATA HEADERS FIX
// =====================================================

/**
 * Fix Raw Data headers - shows current vs expected and offers to fix
 * Offers two modes:
 * - YES: Fix labels only (rename headers, don't move data)
 * - NO: Reorder columns (move data to correct positions based on header names)
 */
function fixRawDataHeaders() {
  const ui = SpreadsheetApp.getUi();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Raw Data");
    if (!sheet) {
      ui.alert("Raw Data sheet not found.");
      return;
    }

    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Compare headers
    let mismatches = [];
    for (let i = 0; i < RAW_DATA_HEADERS.length; i++) {
      const expected = RAW_DATA_HEADERS[i];
      const current = currentHeaders[i] || "(empty)";
      if (expected !== current) {
        mismatches.push(`Column ${String.fromCharCode(65 + i)}: "${current}" → "${expected}"`);
      }
    }

    if (mismatches.length === 0) {
      ui.alert("✓ All Raw Data headers are correct!");
      return;
    }

    // Show comparison with two options
    let message = `Found ${mismatches.length} header mismatches:\n\n`;
    message += mismatches.slice(0, 10).join("\n");
    if (mismatches.length > 10) {
      message += `\n... and ${mismatches.length - 10} more`;
    }
    message += "\n\n Choose fix mode:\n";
    message += "• YES = Fix Labels Only (headers mislabeled, data is in correct position)\n";
    message += "• NO = Reorder Columns (data is misplaced, move columns based on header names)\n";
    message += "• CANCEL = Abort";

    const response = ui.alert("🔧 Fix Raw Data Headers", message, ui.ButtonSet.YES_NO_CANCEL);

    if (response === ui.Button.CANCEL) {
      ui.alert("Cancelled. No changes made.");
      return;
    }

    if (response === ui.Button.YES) {
      // Fix labels only (original behavior)
      sheet.getRange(1, 1, 1, RAW_DATA_HEADERS.length).setValues([RAW_DATA_HEADERS]);
      ui.alert(`✓ Updated ${mismatches.length} header(s) to match expected schema.\n\nNote: Data was NOT moved. If data is in wrong columns, run again and select NO.`);
      Logger.log(`Fixed Raw Data headers (labels only): ${mismatches.length} columns updated`);
    } else if (response === ui.Button.NO) {
      // Reorder columns
      reorderRawDataColumns();
    }

  } catch (e) {
    ui.alert(`Error: ${e.message}`);
  }
}

/**
 * Reorder Raw Data columns to match expected schema
 * Moves data to correct positions based on header names
 */
function reorderRawDataColumns() {
  const ui = SpreadsheetApp.getUi();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Raw Data");
    if (!sheet) {
      ui.alert("Raw Data sheet not found.");
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      ui.alert("No data in Raw Data sheet.");
      return;
    }

    const currentHeaders = data[0];

    // Build position map: header name → current column index
    const headerPositions = {};
    for (let i = 0; i < currentHeaders.length; i++) {
      const header = String(currentHeaders[i] || "").trim();
      if (header) {
        headerPositions[header] = i;
      }
    }

    // Build reorder plan and preview
    const reorderPlan = [];
    const preview = [];
    let hasChanges = false;

    for (let targetIdx = 0; targetIdx < RAW_DATA_HEADERS.length; targetIdx++) {
      const expectedHeader = RAW_DATA_HEADERS[targetIdx];
      const currentIdx = headerPositions[expectedHeader];

      if (currentIdx !== undefined && currentIdx !== targetIdx) {
        preview.push(`${expectedHeader}: Column ${String.fromCharCode(65 + currentIdx)} → Column ${String.fromCharCode(65 + targetIdx)}`);
        hasChanges = true;
      } else if (currentIdx === undefined) {
        preview.push(`${expectedHeader}: (missing) → Column ${String.fromCharCode(65 + targetIdx)} [will be empty]`);
        hasChanges = true;
      }

      reorderPlan.push({
        targetIdx: targetIdx,
        sourceIdx: currentIdx, // undefined if column not found
        header: expectedHeader
      });
    }

    if (!hasChanges) {
      ui.alert("✓ All columns are already in correct order!");
      return;
    }

    // Show preview
    let previewMsg = `Column movements:\n\n${preview.slice(0, 15).join("\n")}`;
    if (preview.length > 15) {
      previewMsg += `\n... and ${preview.length - 15} more`;
    }
    previewMsg += `\n\nThis will rewrite ALL ${data.length - 1} data rows.\n\nProceed?`;

    const confirm = ui.alert("🔄 Reorder Columns Preview", previewMsg, ui.ButtonSet.YES_NO);
    if (confirm !== ui.Button.YES) {
      ui.alert("Cancelled. No changes made.");
      return;
    }

    // Reorder all rows
    const reorderedData = [];

    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const oldRow = data[rowIdx];
      const newRow = [];

      for (let colIdx = 0; colIdx < RAW_DATA_HEADERS.length; colIdx++) {
        const plan = reorderPlan[colIdx];
        if (rowIdx === 0) {
          // Header row: use expected header name
          newRow.push(plan.header);
        } else {
          // Data row: copy from source column or empty
          if (plan.sourceIdx !== undefined) {
            newRow.push(oldRow[plan.sourceIdx]);
          } else {
            newRow.push(""); // Column doesn't exist in source
          }
        }
      }

      reorderedData.push(newRow);
    }

    // Clear and rewrite sheet
    sheet.clear();
    if (reorderedData.length > 0) {
      sheet.getRange(1, 1, reorderedData.length, reorderedData[0].length).setValues(reorderedData);
    }

    ui.alert(`✓ Reordered ${preview.length} columns.\n\nAll ${data.length - 1} data rows have been remapped to correct positions.`);
    Logger.log(`Reordered Raw Data columns: ${preview.length} columns moved, ${data.length - 1} rows processed`);

  } catch (e) {
    ui.alert(`Error: ${e.message}`);
    Logger.log(`Reorder error: ${e.message}`);
  }
}
