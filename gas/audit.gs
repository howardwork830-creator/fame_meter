/**
 * Celebrity Popularity Quantifier - Audit
 * Taiwan Edition v5.0
 *
 * Pre-presentation data validation functions
 */

// =====================================================
// MAIN AUDIT FUNCTION
// =====================================================

/**
 * MAIN AUDIT FUNCTION
 * Run this before presentations to validate all data
 * Accessible from CPQ Tools menu
 */
function runFullAudit() {
  const ui = SpreadsheetApp.getUi();

  Logger.log("========================================");
  Logger.log("STARTING FULL DATA AUDIT");
  Logger.log("========================================");

  const report = {
    timestamp: new Date().toISOString(),
    sheets: {},
    totalIssues: 0,
    criticalIssues: 0,
    warnings: 0
  };

  // Audit each sheet
  report.sheets.rawData = auditRawDataSheet();
  report.sheets.results = auditResultsSheet();
  report.sheets.config = auditConfigSheet();
  report.sheets.modelMetrics = auditModelMetricsSheet();
  report.sheets.sourceWeights = auditSourceWeightsSheet();
  report.sheets.sourceConfig = auditSourceConfigSheet();

  // Calculate totals
  Object.values(report.sheets).forEach(sheet => {
    report.totalIssues += sheet.issues.length;
    sheet.issues.forEach(issue => {
      if (issue.severity === "CRITICAL") report.criticalIssues++;
      else if (issue.severity === "WARNING") report.warnings++;
    });
  });

  // Log summary
  Logger.log("\n========================================");
  Logger.log("AUDIT COMPLETE");
  Logger.log(`Total Issues: ${report.totalIssues}`);
  Logger.log(`Critical: ${report.criticalIssues}`);
  Logger.log(`Warnings: ${report.warnings}`);
  Logger.log("========================================");

  // Show UI alert
  const status = report.criticalIssues > 0 ? "❌ CRITICAL ISSUES FOUND" :
                 report.warnings > 0 ? "⚠️ WARNINGS FOUND" :
                 "✅ ALL CHECKS PASSED";

  let message = `${status}\n\n`;
  message += `Total Issues: ${report.totalIssues}\n`;
  message += `Critical: ${report.criticalIssues}\n`;
  message += `Warnings: ${report.warnings}\n\n`;

  if (report.totalIssues > 0) {
    message += "Issues by sheet:\n";
    Object.entries(report.sheets).forEach(([name, data]) => {
      if (data.issues.length > 0) {
        message += `\n• ${name}: ${data.issues.length} issues\n`;
        data.issues.slice(0, 3).forEach(issue => {
          message += `  - [${issue.severity}] ${issue.message}\n`;
        });
        if (data.issues.length > 3) {
          message += `  ... and ${data.issues.length - 3} more\n`;
        }
      }
    });
    message += "\nCheck Logger for full details.";
  }

  ui.alert("📋 Audit Report", message, ui.ButtonSet.OK);

  return report;
}

// =====================================================
// RAW DATA AUDIT
// =====================================================

/**
 * Audit Raw Data sheet
 * Checks: schema, data types, valid values, duplicates
 */
function auditRawDataSheet() {
  const result = {
    sheetName: "Raw Data",
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Raw Data");

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "CRITICAL", message: "Raw Data sheet not found" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1; // Exclude header

    if (data.length <= 1) {
      result.issues.push({ severity: "WARNING", message: "Raw Data sheet is empty (no data rows)" });
      return result;
    }

    const headers = data[0];

    // Dynamic column lookup for data validation
    const celebrityIdx = headers.indexOf("Celebrity");
    const platformIdx = headers.indexOf("Platform");
    const engagementIdx = headers.indexOf("Engagement_Metric");
    const feedbackIdx = headers.indexOf("Feedback");
    const postUrlIdx = headers.indexOf("Post_URL");
    const timestampIdx = headers.indexOf("Post_Timestamp");

    if (celebrityIdx === -1 || platformIdx === -1 || postUrlIdx === -1) {
      result.issues.push({
        severity: "CRITICAL",
        message: "Required columns not found: Celebrity, Platform, or Post_URL"
      });
      return result;
    }

    // Check headers
    RAW_DATA_HEADERS.forEach((expected, idx) => {
      if (headers[idx] !== expected) {
        result.issues.push({
          severity: "CRITICAL",
          message: `Column ${String.fromCharCode(65 + idx)} header mismatch: expected "${expected}", got "${headers[idx] || '(empty)'}"`
        });
      }
    });

    if (headers.length < 13) {
      result.issues.push({
        severity: "CRITICAL",
        message: `Missing columns: expected 13, found ${headers.length}`
      });
    }

    // Validate each data row
    const seenUrls = new Set();
    let emptyCelebrities = 0;
    let invalidPlatforms = 0;
    let negativeEngagements = 0;
    let invalidFeedback = 0;
    let duplicateUrls = 0;
    let invalidTimestamps = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      // Check empty celebrity (using dynamic index)
      if (!row[celebrityIdx] || String(row[celebrityIdx]).trim() === "") {
        emptyCelebrities++;
      }

      // Check valid platform (using dynamic index)
      const platform = String(row[platformIdx] || "").trim();
      if (platform && !VALID_PLATFORMS.includes(platform)) {
        invalidPlatforms++;
        if (invalidPlatforms <= 3) {
          result.issues.push({
            severity: "WARNING",
            message: `Row ${rowNum}: Invalid platform "${platform}"`
          });
        }
      }

      // Check negative engagement (using dynamic index)
      const engagement = engagementIdx >= 0 ? Number(row[engagementIdx]) : 0;
      if (!isNaN(engagement) && engagement < 0) {
        negativeEngagements++;
      }

      // Check valid feedback (using dynamic index)
      const feedback = feedbackIdx >= 0 ? String(row[feedbackIdx] || "").trim() : "";
      if (feedback && !VALID_FEEDBACK_VALUES.includes(feedback)) {
        invalidFeedback++;
        if (invalidFeedback <= 3) {
          result.issues.push({
            severity: "WARNING",
            message: `Row ${rowNum}: Invalid feedback value "${feedback}"`
          });
        }
      }

      // Check duplicate URLs (using dynamic index)
      const url = String(row[postUrlIdx] || "").trim();
      if (url && url !== "#" && url.startsWith("http")) {
        if (seenUrls.has(url)) {
          duplicateUrls++;
        } else {
          seenUrls.add(url);
        }
      }

      // Check timestamp format (using dynamic index)
      const timestamp = timestampIdx >= 0 ? String(row[timestampIdx] || "") : "";
      if (timestamp && !timestamp.match(/\d{4}-\d{2}-\d{2}/)) {
        invalidTimestamps++;
      }
    }

    // Add summary issues
    if (emptyCelebrities > 0) {
      result.issues.push({
        severity: "CRITICAL",
        message: `${emptyCelebrities} rows have empty Celebrity names`
      });
    }

    if (invalidPlatforms > 3) {
      result.issues.push({
        severity: "WARNING",
        message: `${invalidPlatforms} total rows have invalid platform values`
      });
    }

    if (negativeEngagements > 0) {
      result.issues.push({
        severity: "CRITICAL",
        message: `${negativeEngagements} rows have negative engagement numbers`
      });
    }

    if (invalidFeedback > 3) {
      result.issues.push({
        severity: "WARNING",
        message: `${invalidFeedback} total rows have invalid feedback values`
      });
    }

    if (duplicateUrls > 0) {
      result.issues.push({
        severity: "WARNING",
        message: `${duplicateUrls} duplicate post URLs found (run Remove Duplicates)`
      });
    }

    if (invalidTimestamps > 0) {
      result.issues.push({
        severity: "WARNING",
        message: `${invalidTimestamps} rows have invalid timestamp format (expected YYYY-MM-DD)`
      });
    }

    result.status = result.issues.some(i => i.severity === "CRITICAL") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log(`Raw Data audit: ${result.rowCount} rows, ${result.issues.length} issues`);

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "CRITICAL", message: `Audit error: ${e.message}` });
  }

  return result;
}

// =====================================================
// RESULTS AUDIT
// =====================================================

/**
 * Audit Results sheet
 * Checks: schema, valid scores, sequential ranks, valid JSON, trend emojis
 */
function auditResultsSheet() {
  const result = {
    sheetName: "Results",
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Results");

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "CRITICAL", message: "Results sheet not found" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    if (data.length <= 1) {
      result.issues.push({ severity: "WARNING", message: "Results sheet is empty" });
      return result;
    }

    const headers = data[0];

    // Check key headers exist
    const requiredHeaders = ["Rank", "Celebrity", "Weighted_Popularity_Score", "Trend_Direction", "Risk_Flag", "Endorsement_Ready"];
    requiredHeaders.forEach(header => {
      if (!headers.includes(header)) {
        result.issues.push({
          severity: "CRITICAL",
          message: `Missing required column: ${header}`
        });
      }
    });

    // Find column indices
    const rankIdx = headers.indexOf("Rank");
    const scoreIdx = headers.indexOf("Weighted_Popularity_Score");
    const sentimentIdx = headers.indexOf("Avg_Sentiment_Raw");
    const trendIdx = headers.indexOf("Trend_Direction");
    const sourceBreakdownIdx = headers.indexOf("Source_Breakdown");
    const riskIdx = headers.indexOf("Risk_Flag");
    const endorsementIdx = headers.indexOf("Endorsement_Ready");
    const scoreChangeIdx = headers.indexOf("Score_Change_Breakdown");

    let prevRank = 0;
    let rankGaps = 0;
    let invalidScores = 0;
    let invalidJson = 0;
    let missingTrendEmoji = 0;
    let invalidRiskFlag = 0;
    let invalidEndorsement = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      // Check sequential ranks
      if (rankIdx >= 0) {
        const rank = Number(row[rankIdx]);
        if (rank !== prevRank + 1) {
          rankGaps++;
          if (rankGaps <= 2) {
            result.issues.push({
              severity: "WARNING",
              message: `Row ${rowNum}: Rank gap (expected ${prevRank + 1}, got ${rank})`
            });
          }
        }
        prevRank = rank;
      }

      // Check score range (0-1)
      if (scoreIdx >= 0) {
        const score = Number(row[scoreIdx]);
        if (!isNaN(score) && (score < 0 || score > 1)) {
          invalidScores++;
        }
      }

      // Check sentiment range (-1 to +1)
      if (sentimentIdx >= 0) {
        const sentiment = Number(row[sentimentIdx]);
        if (!isNaN(sentiment) && (sentiment < -1 || sentiment > 1)) {
          result.issues.push({
            severity: "WARNING",
            message: `Row ${rowNum}: Sentiment score ${sentiment} out of range (-1 to +1)`
          });
        }
      }

      // Check Source_Breakdown is valid JSON
      if (sourceBreakdownIdx >= 0) {
        const jsonStr = String(row[sourceBreakdownIdx] || "").trim();
        if (jsonStr && jsonStr !== "") {
          try {
            JSON.parse(jsonStr);
          } catch (e) {
            invalidJson++;
            if (invalidJson <= 2) {
              result.issues.push({
                severity: "WARNING",
                message: `Row ${rowNum}: Invalid JSON in Source_Breakdown`
              });
            }
          }
        }
      }

      // Check Score_Change_Breakdown is valid JSON
      if (scoreChangeIdx >= 0) {
        const jsonStr = String(row[scoreChangeIdx] || "").trim();
        if (jsonStr && jsonStr !== "") {
          try {
            JSON.parse(jsonStr);
          } catch (e) {
            invalidJson++;
          }
        }
      }

      // Check trend has emoji
      if (trendIdx >= 0) {
        const trend = String(row[trendIdx] || "");
        if (trend && !TREND_EMOJIS.some(emoji => trend.includes(emoji))) {
          missingTrendEmoji++;
        }
      }

      // Check Risk_Flag is "Yes" or "No"
      if (riskIdx >= 0) {
        const riskFlag = String(row[riskIdx] || "").trim();
        if (riskFlag && riskFlag !== "Yes" && riskFlag !== "No") {
          invalidRiskFlag++;
          if (invalidRiskFlag <= 2) {
            result.issues.push({
              severity: "WARNING",
              message: `Row ${rowNum}: Risk_Flag should be "Yes" or "No", got "${riskFlag}"`
            });
          }
        }
      }

      // Check Endorsement_Ready is "Yes" or "No"
      if (endorsementIdx >= 0) {
        const endorsement = String(row[endorsementIdx] || "").trim();
        if (endorsement && endorsement !== "Yes" && endorsement !== "No") {
          invalidEndorsement++;
          if (invalidEndorsement <= 2) {
            result.issues.push({
              severity: "WARNING",
              message: `Row ${rowNum}: Endorsement_Ready should be "Yes" or "No", got "${endorsement}"`
            });
          }
        }
      }
    }

    // Add summary issues
    if (rankGaps > 2) {
      result.issues.push({
        severity: "WARNING",
        message: `${rankGaps} total rank sequence gaps found`
      });
    }

    if (invalidScores > 0) {
      result.issues.push({
        severity: "CRITICAL",
        message: `${invalidScores} rows have scores outside 0-1 range`
      });
    }

    if (invalidJson > 2) {
      result.issues.push({
        severity: "WARNING",
        message: `${invalidJson} total invalid JSON fields found`
      });
    }

    if (missingTrendEmoji > 0) {
      result.issues.push({
        severity: "WARNING",
        message: `${missingTrendEmoji} rows missing trend emoji (🚀, ↑, →, ↓, 📉)`
      });
    }

    if (invalidRiskFlag > 2) {
      result.issues.push({
        severity: "WARNING",
        message: `${invalidRiskFlag} total invalid Risk_Flag values (should be "Yes" or "No")`
      });
    }

    if (invalidEndorsement > 2) {
      result.issues.push({
        severity: "WARNING",
        message: `${invalidEndorsement} total invalid Endorsement_Ready values`
      });
    }

    result.status = result.issues.some(i => i.severity === "CRITICAL") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log(`Results audit: ${result.rowCount} rows, ${result.issues.length} issues`);

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "CRITICAL", message: `Audit error: ${e.message}` });
  }

  return result;
}

// =====================================================
// CONFIG AUDIT
// =====================================================

/**
 * Audit Config sheet
 * Checks: required settings exist, valid numeric values
 */
function auditConfigSheet() {
  const result = {
    sheetName: "Config",
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Config");

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "CRITICAL", message: "Config sheet not found" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    // Build config map
    const config = {};
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0] || "").trim();
      const value = data[i][1];
      if (key) config[key] = value;
    }

    // Required settings
    const requiredSettings = [
      { name: "CELEBRITIES_TO_TRACK", type: "string" },
      { name: "MODEL_ACCURACY_THRESHOLD", type: "number", min: 0, max: 1 },
      { name: "CONFIDENCE_THRESHOLD", type: "number", min: 0, max: 1 },
      { name: "SENTIMENT_STDDEV_MAX", type: "number", min: 0, max: 1 },
      { name: "TRAINING_DATA_MIN", type: "number", min: 1 }
    ];

    requiredSettings.forEach(setting => {
      if (!(setting.name in config)) {
        result.issues.push({
          severity: "CRITICAL",
          message: `Missing required setting: ${setting.name}`
        });
      } else if (setting.type === "number") {
        const val = Number(config[setting.name]);
        if (isNaN(val)) {
          result.issues.push({
            severity: "CRITICAL",
            message: `${setting.name} must be a number, got "${config[setting.name]}"`
          });
        } else {
          if (setting.min !== undefined && val < setting.min) {
            result.issues.push({
              severity: "WARNING",
              message: `${setting.name} value ${val} is below minimum ${setting.min}`
            });
          }
          if (setting.max !== undefined && val > setting.max) {
            result.issues.push({
              severity: "WARNING",
              message: `${setting.name} value ${val} is above maximum ${setting.max}`
            });
          }
        }
      }
    });

    // Check CELEBRITIES_TO_TRACK has values
    if (config.CELEBRITIES_TO_TRACK) {
      const celebrities = String(config.CELEBRITIES_TO_TRACK).split(",").map(s => s.trim()).filter(s => s);
      if (celebrities.length === 0) {
        result.issues.push({
          severity: "CRITICAL",
          message: "CELEBRITIES_TO_TRACK is empty"
        });
      } else {
        Logger.log(`Config: ${celebrities.length} celebrities configured`);
      }
    }

    result.status = result.issues.some(i => i.severity === "CRITICAL") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log(`Config audit: ${result.issues.length} issues`);

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "CRITICAL", message: `Audit error: ${e.message}` });
  }

  return result;
}

// =====================================================
// MODEL METRICS AUDIT
// =====================================================

/**
 * Audit Model Metrics sheet
 * Checks: at least one run, accuracy format, status values
 */
function auditModelMetricsSheet() {
  const result = {
    sheetName: "Model Metrics",
    status: "OK",
    rowCount: 0,
    issues: []
  };

  // Load config to get accuracy threshold
  const config = loadConfig();
  const accuracyThreshold = (config.MODEL_ACCURACY_THRESHOLD || 0.85) * 100;

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Model Metrics");

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "WARNING", message: "Model Metrics sheet not found (will be created on first run)" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    if (data.length <= 1) {
      result.issues.push({ severity: "WARNING", message: "No model runs recorded yet" });
      return result;
    }

    const headers = data[0];
    const accuracyIdx = headers.indexOf("Training_Accuracy");
    const modelStatusIdx = headers.indexOf("Model_Status");
    const pipelineStatusIdx = headers.indexOf("Pipeline_Status");

    // Check latest run (last row)
    const lastRow = data[data.length - 1];

    // Check accuracy format (should include %)
    if (accuracyIdx >= 0) {
      const accuracy = String(lastRow[accuracyIdx] || "");
      if (accuracy && !accuracy.includes("%") && accuracy !== "N/A" && accuracy !== "") {
        result.issues.push({
          severity: "WARNING",
          message: `Latest accuracy value "${accuracy}" missing % symbol`
        });
      }

      // Check if accuracy is above threshold
      const accNum = parseFloat(accuracy.replace("%", ""));
      if (!isNaN(accNum) && accNum < accuracyThreshold) {
        result.issues.push({
          severity: "WARNING",
          message: `Latest accuracy ${accuracy} is below ${accuracyThreshold}% threshold`
        });
      }
    }

    // Check model status
    if (modelStatusIdx >= 0) {
      const modelStatus = String(lastRow[modelStatusIdx] || "").toUpperCase();
      if (modelStatus && modelStatus !== "PASSED" && modelStatus !== "FETCH_COMPLETE") {
        result.issues.push({
          severity: "WARNING",
          message: `Latest Model_Status is "${modelStatus}" (expected PASSED)`
        });
      }
    }

    // Check pipeline status
    if (pipelineStatusIdx >= 0) {
      const pipelineStatus = String(lastRow[pipelineStatusIdx] || "").toUpperCase();
      if (pipelineStatus === "ERROR" || pipelineStatus === "FAILED") {
        result.issues.push({
          severity: "CRITICAL",
          message: `Latest Pipeline_Status is "${pipelineStatus}"`
        });
      }
    }

    result.status = result.issues.some(i => i.severity === "CRITICAL") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log(`Model Metrics audit: ${result.rowCount} runs, ${result.issues.length} issues`);

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "CRITICAL", message: `Audit error: ${e.message}` });
  }

  return result;
}

// =====================================================
// SOURCE WEIGHTS AUDIT
// =====================================================

/**
 * Audit Source Weights sheet
 * Checks: all platforms listed, valid weights (1-10)
 */
function auditSourceWeightsSheet() {
  const result = {
    sheetName: "Source Weights",
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Source Weights");

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "WARNING", message: "Source Weights sheet not found" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    if (data.length <= 1) {
      result.issues.push({ severity: "WARNING", message: "Source Weights sheet is empty" });
      return result;
    }

    const headers = data[0];
    const sourceIdx = headers.indexOf("Source");
    const weightIdx = headers.indexOf("Weight_Score");

    const foundPlatforms = new Set();
    const duplicates = [];

    for (let i = 1; i < data.length; i++) {
      const source = String(data[i][sourceIdx >= 0 ? sourceIdx : 0] || "").trim();
      const weight = Number(data[i][weightIdx >= 0 ? weightIdx : 1]);

      if (!source) continue;

      // Check for duplicates
      if (foundPlatforms.has(source)) {
        duplicates.push(source);
      } else {
        foundPlatforms.add(source);
      }

      // Check weight range (1-10)
      if (isNaN(weight) || weight < 1 || weight > 10) {
        result.issues.push({
          severity: "WARNING",
          message: `${source}: Weight ${weight} should be between 1-10`
        });
      }
    }

    // Check all platforms are listed
    VALID_PLATFORMS.forEach(platform => {
      if (!foundPlatforms.has(platform)) {
        result.issues.push({
          severity: "WARNING",
          message: `Missing platform: ${platform}`
        });
      }
    });

    if (duplicates.length > 0) {
      result.issues.push({
        severity: "WARNING",
        message: `Duplicate platforms found: ${duplicates.join(", ")}`
      });
    }

    result.status = result.issues.some(i => i.severity === "CRITICAL") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log(`Source Weights audit: ${result.rowCount} rows, ${result.issues.length} issues`);

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "CRITICAL", message: `Audit error: ${e.message}` });
  }

  return result;
}

// =====================================================
// SOURCE CONFIG AUDIT
// =====================================================

/**
 * Audit Source Config sheet
 * Checks: auto-populated sources, valid importance scores (1-5)
 */
function auditSourceConfigSheet() {
  const result = {
    sheetName: "Source Config",
    status: "OK",
    rowCount: 0,
    issues: []
  };

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Source Config");

    if (!sheet) {
      result.status = "MISSING";
      result.issues.push({ severity: "WARNING", message: "Source Config sheet not found (run Sync Sources)" });
      return result;
    }

    const data = sheet.getDataRange().getValues();
    result.rowCount = data.length - 1;

    if (data.length <= 1) {
      result.issues.push({ severity: "WARNING", message: "Source Config sheet is empty (run Sync Sources)" });
      return result;
    }

    const headers = data[0];
    const sourceNameIdx = headers.indexOf("Source_Name");
    const importanceIdx = headers.indexOf("Importance_Score");
    const platformIdx = headers.indexOf("Platform");

    const seenSources = new Set();
    let invalidImportance = 0;
    let duplicateSources = 0;

    for (let i = 1; i < data.length; i++) {
      const sourceName = String(data[i][sourceNameIdx >= 0 ? sourceNameIdx : 0] || "").trim();
      const platform = String(data[i][platformIdx >= 0 ? platformIdx : 2] || "").trim();
      const importance = Number(data[i][importanceIdx >= 0 ? importanceIdx : 3]);

      if (!sourceName) continue;

      const key = `${sourceName}|${platform}`;

      // Check duplicates
      if (seenSources.has(key)) {
        duplicateSources++;
      } else {
        seenSources.add(key);
      }

      // Check importance range (1-5)
      if (isNaN(importance) || importance < 1 || importance > 5) {
        invalidImportance++;
      }
    }

    if (duplicateSources > 0) {
      result.issues.push({
        severity: "WARNING",
        message: `${duplicateSources} duplicate source entries found`
      });
    }

    if (invalidImportance > 0) {
      result.issues.push({
        severity: "WARNING",
        message: `${invalidImportance} sources have invalid importance score (should be 1-5)`
      });
    }

    result.status = result.issues.some(i => i.severity === "CRITICAL") ? "FAIL" :
                    result.issues.length > 0 ? "WARNING" : "OK";

    Logger.log(`Source Config audit: ${result.rowCount} sources, ${result.issues.length} issues`);

  } catch (e) {
    result.status = "ERROR";
    result.issues.push({ severity: "CRITICAL", message: `Audit error: ${e.message}` });
  }

  return result;
}
