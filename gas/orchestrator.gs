/**
 * Celebrity Popularity Quantifier - Orchestrator
 * Taiwan Edition v5.0
 *
 * Main orchestration for daily social media data fetching via Perplexity API
 * Triggered daily at 06:00 UTC+8
 *
 * Note: This file has been modularized. Supporting functions are in:
 * - constants.gs: Shared constants
 * - config.gs: Configuration loading
 * - perplexityApi.gs: API integration
 * - deduplication.gs: Duplicate detection
 * - logging.gs: Logging and alerts
 * - triggers.gs: Trigger management
 * - sourceSync.gs: Source synchronization
 * - sheetHelpers.gs: Sheet utilities
 * - audit.gs: Data validation
 * - autoFix.gs: Auto-repair functions
 * - testing.gs: Test utilities
 */

// =====================================================
// MAIN ENTRY POINT
// =====================================================

/**
 * MAIN ENTRY POINT
 * Triggered daily at 06:00 UTC+8 by Google Apps Script time-based trigger
 */
function fetchTaiwanSocialMedia() {
  // Execution lock to prevent concurrent runs
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Pipeline already running, skipping this execution");
    return;
  }

  const startTime = new Date().getTime();

  try {
    const config = loadConfig();
    const celebrities = config.CELEBRITIES_TO_TRACK;
    const apiKey = getPerplexityApiKey();

    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY not found in Script Properties");
    }

    const sheet = getSheetSafe(SHEET_ID, SHEET_NAMES.RAW_DATA);

    // Load existing posts for deduplication
    const existingKeys = loadExistingPostKeys();

    let totalAdded = 0;
    let duplicatesFiltered = 0;
    let errors = [];
    let processedCount = 0;

    for (let celebrity of celebrities) {
      // Check execution time before each celebrity
      const elapsedTime = new Date().getTime() - startTime;
      if (elapsedTime > MAX_EXECUTION_TIME_MS) {
        Logger.log(`⚠️ Time limit approaching (${Math.round(elapsedTime/1000)}s), stopping after ${processedCount} celebrities`);
        errors.push(`Timeout: stopped after ${processedCount}/${celebrities.length} celebrities`);
        break;
      }

      try {
        Logger.log(`Fetching data for: ${celebrity}`);
        const posts = queryPerplexityAPI(celebrity, apiKey);
        const validated = validatePerplexityResponse(posts, celebrity);

        // Deduplicate before inserting
        const uniquePosts = deduplicatePosts(validated, celebrity, existingKeys);
        duplicatesFiltered += (validated.length - uniquePosts.length);

        // Batch sheet operations instead of per-row
        if (uniquePosts.length > 0) {
          const batchData = uniquePosts.map(post => [
            new Date(),                                              // A: Collection_Timestamp
            celebrity,                                               // B: Celebrity
            post.platform,                                           // C: Platform
            post.account_name,                                       // D: Account_Name
            post.content,                                            // E: Post_Content
            post.post_url,                                           // F: Post_URL
            post.post_timestamp,                                     // G: Post_Timestamp
            post.account_type || "unknown",                          // H: Account_Type
            "",                                                      // I: Feedback (human fills via Dashboard)
            "",                                                      // J: Feedback_Notes (human fills)
            "",                                                      // K: Sentiment_Score (Kaggle fills)
            ""                                                       // L: Processing_Date (Kaggle fills)
          ]);

          const startRow = sheet.getLastRow() + 1;
          sheet.getRange(startRow, 1, batchData.length, batchData[0].length).setValues(batchData);
          totalAdded += uniquePosts.length;
        }

        Logger.log(`✓ Added ${uniquePosts.length} posts for ${celebrity} (${validated.length - uniquePosts.length} duplicates filtered)`);
        processedCount++;

        // Rate limiting - wait between celebrities
        Utilities.sleep(API_RATE_LIMIT_MS);

      } catch (e) {
        errors.push(`${celebrity}: ${e.message}`);
        Logger.log(`✗ Error fetching ${celebrity}: ${e.message}`);
      }
    }

    // Log summary
    updateLogSheet({
      timestamp: new Date(),
      total_posts: totalAdded,
      celebrities_processed: processedCount,
      errors: errors.length > 0 ? errors.join("; ") : "None"
    });

    const totalTime = Math.round((new Date().getTime() - startTime) / 1000);
    Logger.log(`Pipeline complete in ${totalTime}s. Added ${totalAdded} posts. Errors: ${errors.length}`);

    // Sync discovered sources to Source Config sheet
    try {
      syncSourcesToConfig();
    } catch (e) {
      Logger.log(`Warning: Failed to sync sources: ${e.message}`);
    }

  } catch (e) {
    Logger.log(`CRITICAL: ${e.message}`);
    sendErrorAlert(e);
  } finally {
    // Always release lock
    lock.releaseLock();
  }
}

// =====================================================
// BULK DATA COLLECTION
// =====================================================

/**
 * Bulk fetch data for all celebrities in Config sheet
 * Uses CELEBRITIES_TO_TRACK from Config - the single source of truth
 *
 * To add/remove celebrities, update the Config sheet CELEBRITIES_TO_TRACK setting
 */
function bulkFetchAllCelebrities() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Pipeline already running, skipping this execution");
    return;
  }

  const startTime = new Date().getTime();

  try {
    // Load celebrities from Config sheet (single source of truth)
    const config = loadConfig();
    const celebrities = config.CELEBRITIES_TO_TRACK;

    if (!celebrities || celebrities.length === 0) {
      throw new Error("No celebrities configured. Update CELEBRITIES_TO_TRACK in Config sheet.");
    }

    const apiKey = getPerplexityApiKey();
    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY not found in Script Properties");
    }

    const sheet = getSheetSafe(SHEET_ID, SHEET_NAMES.RAW_DATA);

    // Load existing posts for deduplication
    const existingKeys = loadExistingPostKeys();

    let totalAdded = 0;
    let duplicatesFiltered = 0;
    let errors = [];
    let processedCount = 0;

    Logger.log(`Starting bulk fetch for ${celebrities.length} celebrities from Config...`);
    Logger.log(`Deduplication enabled: ${existingKeys.size} existing posts loaded`);

    for (let celebrity of celebrities) {
      // Check time limit (use global constant)
      const elapsedTime = new Date().getTime() - startTime;
      if (elapsedTime > MAX_EXECUTION_TIME_MS) {
        Logger.log(`⚠️ Time limit reached after ${processedCount} celebrities. Run again to continue.`);
        break;
      }

      try {
        Logger.log(`Fetching: ${celebrity} (${processedCount + 1}/${celebrities.length})`);
        const posts = queryPerplexityAPI(celebrity, apiKey);
        const validated = validatePerplexityResponse(posts, celebrity);

        // Deduplicate before inserting
        const uniquePosts = deduplicatePosts(validated, celebrity, existingKeys);
        duplicatesFiltered += (validated.length - uniquePosts.length);

        if (uniquePosts.length > 0) {
          const batchData = uniquePosts.map(post => [
            new Date(),
            celebrity,
            post.platform,
            post.account_name,
            post.content,
            post.post_url,
            post.post_timestamp,
            post.account_type || "unknown",
            "", "", "", ""
          ]);

          const startRow = sheet.getLastRow() + 1;
          sheet.getRange(startRow, 1, batchData.length, batchData[0].length).setValues(batchData);
          totalAdded += uniquePosts.length;
        }

        Logger.log(`✓ Added ${uniquePosts.length} posts for ${celebrity} (${validated.length - uniquePosts.length} duplicates filtered)`);
        processedCount++;

        // Rate limiting (use global constant)
        Utilities.sleep(API_RATE_LIMIT_MS);

      } catch (e) {
        errors.push(`${celebrity}: ${e.message}`);
        Logger.log(`✗ Error for ${celebrity}: ${e.message}`);
      }
    }

    // Update log
    updateLogSheet({
      timestamp: new Date(),
      total_posts: totalAdded,
      celebrities_processed: processedCount,
      errors: errors.length > 0 ? errors.slice(0, 10).join("; ") : "None"
    });

    // Sync sources
    try {
      syncSourcesToConfig();
    } catch (e) {
      Logger.log(`Warning: Failed to sync sources: ${e.message}`);
    }

    const totalTime = Math.round((new Date().getTime() - startTime) / 1000);
    Logger.log(`\n========================================`);
    Logger.log(`BULK FETCH COMPLETE`);
    Logger.log(`Processed: ${processedCount}/${celebrities.length} celebrities`);
    Logger.log(`Total posts added: ${totalAdded}`);
    Logger.log(`Duplicates filtered: ${duplicatesFiltered}`);
    Logger.log(`Errors: ${errors.length}`);
    Logger.log(`Time: ${totalTime}s`);
    Logger.log(`========================================`);

    return {
      processed: processedCount,
      total: celebrities.length,
      postsAdded: totalAdded,
      errors: errors.length
    };

  } catch (e) {
    Logger.log(`CRITICAL: ${e.message}`);
    sendErrorAlert(e);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Run multiple batches to collect more data
 * Each run processes remaining celebrities from last run
 */
function continueBulkFetch() {
  Logger.log("Continuing bulk fetch from where we left off...");
  return bulkFetchAllCelebrities();
}

// =====================================================
// GOOGLE SHEETS MENU
// =====================================================

/**
 * Add custom menu to Google Sheets UI
 * Runs automatically when spreadsheet is opened
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎬 CPQ 工具')
    .addItem('📋 執行完整稽核', 'runFullAudit')
    .addSeparator()
    .addItem('🔧 修復原始資料問題', 'fixRawDataSheet')
    .addItem('🔧 修復結果問題', 'fixResultsSheet')
    .addItem('🔧 新增缺少的結果欄位', 'addMissingResultsColumns')
    .addItem('🔧 修復來源權重 (新增新聞)', 'fixSourceWeights')
    .addItem('🔧 修復原始資料標題', 'fixRawDataHeaders')
    .addItem('🔄 重新排列原始資料欄位', 'reorderRawDataColumns')
    .addSeparator()
    .addItem('🔄 執行批次擷取', 'bulkFetchAllCelebrities')
    .addItem('🧹 移除重複資料', 'deduplicateExistingData')
    .addItem('📊 同步來源', 'syncSourcesToConfig')
    .addItem('👥 同步名人', 'syncCelebritiesToConfig')
    .addSeparator()
    .addItem('⚙️ 初始化工作表', 'initializeSheets')
    .addItem('🕐 設定每日觸發器', 'setupDailyTrigger')
    .addItem('📋 顯示儀表板', 'showDashboard')
    .addSeparator()
    .addItem('🤖 執行情感分析', 'triggerKaggleSentimentAnalysis')
    .addItem('📊 檢查 Kaggle 狀態', 'checkKaggleKernelStatus')
    .addSeparator()
    .addItem('🔄 系統重置', 'reboot')
    .addToUi();
}
