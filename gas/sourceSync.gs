/**
 * Celebrity Popularity Quantifier - Source Sync
 * Taiwan Edition v5.0
 *
 * Functions for syncing sources and celebrities to config sheets
 */

// =====================================================
// SOURCE SYNC
// =====================================================

/**
 * Sync discovered sources to Source Config sheet
 * Auto-discovers new sources from Raw Data and adds them with default rating
 */
function syncSourcesToConfig() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Get or create Source Config sheet
  let sourceConfigSheet = ss.getSheetByName("Source Config");
  if (!sourceConfigSheet) {
    sourceConfigSheet = ss.insertSheet("Source Config");
    sourceConfigSheet.appendRow(SOURCE_CONFIG_HEADERS);
  }

  // Get existing sources (Source_Name + Platform as composite key)
  const existingData = sourceConfigSheet.getDataRange().getValues();
  const existingSources = new Set();

  // Skip header row
  for (let i = 1; i < existingData.length; i++) {
    const sourceName = existingData[i][0];
    const platform = existingData[i][2];
    if (sourceName && platform) {
      existingSources.add(`${sourceName}|${platform}`);
    }
  }

  // Get Raw Data sheet
  const rawDataSheet = ss.getSheetByName("Raw Data");
  if (!rawDataSheet) {
    Logger.log("Warning: Raw Data sheet not found");
    return;
  }

  const rawData = rawDataSheet.getDataRange().getValues();
  if (rawData.length <= 1) {
    Logger.log("No data in Raw Data sheet");
    return;
  }

  // Find column indices dynamically using header names
  const headers = rawData[0];
  const accountNameCol = headers.indexOf("Account_Name");
  const platformCol = headers.indexOf("Platform");
  const accountTypeCol = headers.indexOf("Account_Type");

  if (accountNameCol === -1 || platformCol === -1) {
    Logger.log("Warning: Required columns not found in Raw Data");
    return;
  }

  // Discover new sources
  const newSources = new Map(); // Map to avoid duplicates in same run
  const now = new Date();

  for (let i = 1; i < rawData.length; i++) {
    const accountName = rawData[i][accountNameCol];
    const platform = rawData[i][platformCol];
    const accountType = accountTypeCol >= 0 ? (rawData[i][accountTypeCol] || "unknown") : "unknown";

    if (!accountName || !platform) continue;

    const key = `${accountName}|${platform}`;

    // Skip if already exists in Source Config
    if (existingSources.has(key)) continue;

    // Skip if already found in this run
    if (newSources.has(key)) continue;

    // Map account_type to source_type for display
    let sourceType = "其他";
    if (accountType === "official") sourceType = "官方";
    else if (accountType === "fan") sourceType = "粉絲";
    else if (accountType === "media") sourceType = "媒體";

    newSources.set(key, {
      name: accountName,
      type: sourceType,
      platform: platform
    });
  }

  // Batch add new sources with default importance score of 3
  if (newSources.size > 0) {
    const newRows = [];

    newSources.forEach((source, key) => {
      newRows.push([
        source.name,           // Source_Name
        source.type,           // Source_Type
        source.platform,       // Platform
        3,                     // Importance_Score (default: neutral)
        "auto",                // Rated_By
        now                    // Last_Modified
      ]);
    });

    // Append all new sources at once
    const startRow = sourceConfigSheet.getLastRow() + 1;
    sourceConfigSheet.getRange(startRow, 1, newRows.length, 6).setValues(newRows);

    Logger.log(`✓ Added ${newRows.length} new sources to Source Config`);
  } else {
    Logger.log("No new sources to add");
  }
}

// =====================================================
// CELEBRITY SYNC
// =====================================================

/**
 * Sync CELEBRITIES_TO_TRACK in Config sheet with celebrities found in Raw Data
 * This ensures Config matches the actual data collected
 */
function syncCelebritiesToConfig() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Get all unique celebrities from Raw Data
  const rawDataSheet = ss.getSheetByName("Raw Data");
  if (!rawDataSheet || rawDataSheet.getLastRow() <= 1) {
    ui.alert("No data in Raw Data sheet");
    return;
  }

  const rawData = rawDataSheet.getDataRange().getValues();
  const celebrities = new Set();

  // Dynamic column lookup for Celebrity
  const headers = rawData[0];
  const celebrityIdx = headers.indexOf("Celebrity");
  if (celebrityIdx === -1) {
    ui.alert("Error: Celebrity column not found in Raw Data sheet");
    return;
  }

  for (let i = 1; i < rawData.length; i++) {
    const celeb = String(rawData[i][celebrityIdx] || "").trim();
    if (celeb) {
      celebrities.add(celeb);
    }
  }

  const celebList = Array.from(celebrities).sort();
  Logger.log(`Found ${celebList.length} unique celebrities in Raw Data`);

  // Get current Config
  const configSheet = ss.getSheetByName("Config");
  if (!configSheet) {
    ui.alert("Config sheet not found. Run Initialize Sheets first.");
    return;
  }

  const configData = configSheet.getDataRange().getValues();
  let celebRowIndex = -1;
  let currentCelebs = [];

  for (let i = 1; i < configData.length; i++) {
    if (configData[i][0] === "CELEBRITIES_TO_TRACK") {
      celebRowIndex = i + 1; // 1-indexed for sheet
      currentCelebs = String(configData[i][1] || "").split(",").map(s => s.trim()).filter(s => s);
      break;
    }
  }

  // Show comparison
  const newCelebs = celebList.filter(c => !currentCelebs.includes(c));
  const removedCelebs = currentCelebs.filter(c => !celebList.includes(c));

  let message = `📊 Celebrity Sync Analysis\n\n`;
  message += `Current in Config: ${currentCelebs.length} celebrities\n`;
  message += `Found in Raw Data: ${celebList.length} celebrities\n\n`;

  if (newCelebs.length > 0) {
    message += `➕ New (${newCelebs.length}): ${newCelebs.slice(0, 10).join(", ")}`;
    if (newCelebs.length > 10) message += `... and ${newCelebs.length - 10} more`;
    message += "\n\n";
  }

  if (removedCelebs.length > 0) {
    message += `➖ In Config but no data (${removedCelebs.length}): ${removedCelebs.join(", ")}\n\n`;
  }

  if (newCelebs.length === 0 && removedCelebs.length === 0) {
    ui.alert("✅ Config is already in sync with Raw Data");
    return;
  }

  message += "Update Config to match Raw Data?";

  const response = ui.alert("🔄 Sync Celebrities", message, ui.ButtonSet.YES_NO);

  if (response !== ui.Button.YES) {
    ui.alert("Cancelled. No changes made.");
    return;
  }

  // Update Config sheet
  const newValue = celebList.join(", ");

  if (celebRowIndex > 0) {
    // Update existing row
    configSheet.getRange(celebRowIndex, 2).setValue(newValue);
    configSheet.getRange(celebRowIndex, 4).setValue(new Date()); // Update Last_Updated
  } else {
    // Add new row
    configSheet.appendRow(["CELEBRITIES_TO_TRACK", newValue, "List of celebrity names to monitor", new Date()]);
  }

  ui.alert(`✅ Updated CELEBRITIES_TO_TRACK\n\nNow tracking ${celebList.length} celebrities.\n\nThe daily trigger will now fetch data for all these celebrities.`);
  Logger.log(`Updated CELEBRITIES_TO_TRACK with ${celebList.length} celebrities`);
}
