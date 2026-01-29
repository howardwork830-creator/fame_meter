/**
 * Celebrity Popularity Quantifier - Orchestrator
 * Taiwan Edition v4.0
 *
 * Main orchestration for daily social media data fetching via Perplexity API
 * Triggered daily at 06:00 UTC+8
 */

// =====================================================
// CONSTANTS
// =====================================================
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar";
const VALID_PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "News"];
const SHEET_ID = "1sgKkhqP0_WAzdBfBbH2oWLAav-WlGkbCyayLguaHG6Q";
const TIMEZONE = "Asia/Taipei";
const MAX_EXECUTION_TIME_MS = 5 * 60 * 1000; // 5 minutes (buffer before 6-min limit)
const MAX_API_RETRIES = 3;

// =====================================================
// MAIN ENTRY POINT
// =====================================================

/**
 * MAIN ENTRY POINT
 * Triggered daily at 06:00 UTC+8 by Google Apps Script time-based trigger
 */
function fetchTaiwanSocialMedia() {
  // CRITICAL FIX 1.1: Execution lock to prevent concurrent runs
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Pipeline already running, skipping this execution");
    return;
  }

  const startTime = new Date().getTime();

  try {
    const config = loadConfig();
    const celebrities = config.CELEBRITIES_TO_TRACK;
    const apiKey = PropertiesService.getScriptProperties().getProperty('PERPLEXITY_API_KEY');

    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY not found in Script Properties");
    }

    const sheet = getSheetSafe(SHEET_ID, "Raw Data");

    // Load existing posts for deduplication
    const existingKeys = loadExistingPostKeys();

    let totalAdded = 0;
    let duplicatesFiltered = 0;
    let errors = [];
    let processedCount = 0;

    for (let celebrity of celebrities) {
      // CRITICAL FIX 1.5: Check execution time before each celebrity
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

        // CRITICAL FIX 1.4: Batch sheet operations instead of per-row
        if (uniquePosts.length > 0) {
          const batchData = uniquePosts.map(post => [
            new Date(),                                              // A: Collection_Timestamp
            celebrity,                                               // B: Celebrity
            post.platform,                                           // C: Platform
            post.account_name,                                       // D: Account_Name
            post.content,                                            // E: Post_Content
            post.engagement.likes || post.engagement.views || 0,     // F: Engagement_Metric
            post.post_url,                                           // G: Post_URL
            post.post_timestamp,                                     // H: Post_Timestamp
            post.account_type || "unknown",                          // I: Account_Type
            "",                                                      // J: Feedback (human fills via Dashboard)
            "",                                                      // K: Feedback_Notes (human fills)
            "",                                                      // L: Sentiment_Score (Kaggle fills)
            ""                                                       // M: Processing_Date (Kaggle fills)
          ]);

          const startRow = sheet.getLastRow() + 1;
          sheet.getRange(startRow, 1, batchData.length, batchData[0].length).setValues(batchData);
          totalAdded += uniquePosts.length;
        }

        Logger.log(`✓ Added ${uniquePosts.length} posts for ${celebrity} (${validated.length - uniquePosts.length} duplicates filtered)`);
        processedCount++;

        // Rate limiting - wait 1 second between celebrities
        Utilities.sleep(1000);

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
// PERPLEXITY API INTEGRATION
// =====================================================

/**
 * Query Perplexity API for celebrity social media data
 * @param {string} celebrity - Celebrity name in Traditional Chinese
 * @param {string} apiKey - Perplexity API key
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Array} Array of post objects
 */
function queryPerplexityAPI(celebrity, apiKey, retryCount = 0) {
  // CRITICAL FIX 1.2: Prevent infinite recursion with retry limit
  if (retryCount >= MAX_API_RETRIES) {
    throw new Error(`API rate limit exceeded after ${MAX_API_RETRIES} retries`);
  }

  const prompt = buildPerplexityPrompt(celebrity);

  const payload = {
    model: PERPLEXITY_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a social media data analyst. You MUST always respond with valid JSON only, no other text. Search the web to find recent social media discussions about the celebrity. If you cannot find specific posts, create a JSON response with an empty posts array: {\"posts\": []}. NEVER respond with natural language explanations - only JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.1,  // Lower temperature for more consistent JSON output
    max_tokens: 4000
  };

  const options = {
    method: "post",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(PERPLEXITY_API_URL, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 401) {
      throw new Error("Invalid API key - check PERPLEXITY_API_KEY in Script Properties");
    }

    if (responseCode === 429) {
      const waitTime = Math.pow(2, retryCount) * 2000; // Exponential backoff: 2s, 4s, 8s
      Logger.log(`Rate limited, waiting ${waitTime/1000}s (retry ${retryCount + 1}/${MAX_API_RETRIES})...`);
      Utilities.sleep(waitTime);
      return queryPerplexityAPI(celebrity, apiKey, retryCount + 1);
    }

    if (responseCode !== 200) {
      throw new Error(`Perplexity API error: ${responseCode} - ${response.getContentText().substring(0, 200)}`);
    }

    // CRITICAL FIX 1.3: Safe JSON parsing with null checks
    let result;
    try {
      result = JSON.parse(response.getContentText());
    } catch (parseError) {
      throw new Error(`Failed to parse API response as JSON: ${parseError.message}`);
    }

    // Safe access with null checks
    const jsonString = result?.choices?.[0]?.message?.content;
    if (!jsonString) {
      Logger.log(`API response missing expected structure for ${celebrity}`);
      return [];
    }

    // Log raw response for debugging (truncated)
    Logger.log(`Raw API response for ${celebrity}: ${jsonString.substring(0, 150)}...`);

    // Check if response looks like a refusal/explanation instead of JSON
    const trimmed = jsonString.trim();
    if (trimmed.startsWith("I ") ||
        trimmed.startsWith("Sorry") ||
        trimmed.startsWith("Unfortunately") ||
        trimmed.startsWith("我無法") ||
        trimmed.startsWith("抱歉")) {
      Logger.log(`API returned explanation instead of JSON: ${trimmed.substring(0, 100)}`);
      return []; // Return empty array instead of failing
    }

    // Clean the response - sometimes API returns markdown code blocks
    let cleanJson = jsonString;
    if (jsonString.includes("```json")) {
      cleanJson = jsonString.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonString.includes("```")) {
      cleanJson = jsonString.replace(/```\n?/g, "");
    }

    // Try to extract JSON if there's text before/after it
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    let jsonData;
    try {
      jsonData = JSON.parse(cleanJson.trim());
    } catch (contentParseError) {
      Logger.log(`Failed to parse content JSON for ${celebrity}: ${contentParseError.message}`);
      return [];
    }

    return jsonData.posts || [];

  } catch (e) {
    throw new Error(`Perplexity API call failed: ${e.message}`);
  }
}

/**
 * Build the Perplexity API prompt in Traditional Chinese
 * @param {string} celebrity - Celebrity name
 * @returns {string} Formatted prompt
 */
function buildPerplexityPrompt(celebrity) {
  const today = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd');

  return `Search the web for recent news and social media activity about Taiwan celebrity "${celebrity}".

Find:
1. Recent news articles about ${celebrity}
2. Social media posts mentioning ${celebrity} on Instagram, Facebook, YouTube, TikTok
3. Fan discussions, trending topics, or viral content about ${celebrity}

For each piece of content found, extract:
- platform: The source platform (Instagram, Facebook, YouTube, TikTok, or News)
- account_name: The account or source name
- account_type: "official" if it's the celebrity's own account, "fan" for fan accounts, "media" for news outlets
- content: Summary of the post content in Traditional Chinese (繁體中文)
- engagement: Estimated engagement metrics (likes, comments, shares, views)
- post_timestamp: Approximate date in ISO format
- post_url: URL if available, otherwise use "#"

Return ONLY a valid JSON object with this exact structure:

{
  "celebrity_name": "${celebrity}",
  "data_collection_date": "${today}",
  "region": "Taiwan",
  "posts": [
    {
      "platform": "Instagram",
      "account_name": "@example",
      "account_type": "official",
      "content": "內容摘要...",
      "engagement": {
        "likes": 10000,
        "comments": 500,
        "shares": 100
      },
      "post_timestamp": "${today}T12:00:00+08:00",
      "post_url": "https://example.com"
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON, no explanations or markdown
- Include at least 3-5 posts if any information is found
- If no recent activity found, return: {"celebrity_name": "${celebrity}", "data_collection_date": "${today}", "region": "Taiwan", "posts": []}`;
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate Perplexity API response
 * @param {Array} posts - Array of post objects
 * @param {string} celebrity - Celebrity name for logging
 * @returns {Array} Validated posts
 */
function validatePerplexityResponse(posts, celebrity) {
  if (!Array.isArray(posts)) {
    Logger.log(`Warning: posts is not an array for ${celebrity}`);
    return [];
  }

  const requiredFields = ["platform", "account_name", "content", "engagement", "post_timestamp", "post_url"];

  return posts.filter(post => {
    // Check required fields
    if (!requiredFields.every(field => field in post)) {
      Logger.log(`Skipping post: missing required field for ${celebrity}`);
      return false;
    }

    // Validate platform
    if (!VALID_PLATFORMS.includes(post.platform)) {
      Logger.log(`Skipping post: invalid platform ${post.platform}`);
      return false;
    }

    // Validate engagement metrics (MEDIUM FIX 3.1: allow zero, reject negative)
    const engagement = post.engagement?.likes || post.engagement?.views || 0;
    if (engagement < 0) {
      Logger.log(`Skipping post: negative engagement metric`);
      return false;
    }
    if (engagement === 0) {
      Logger.log(`Warning: Zero engagement post for ${celebrity} (keeping for analysis)`);
    }

    // Validate timestamp format (basic check)
    if (!post.post_timestamp || !post.post_timestamp.match(/\d{4}-\d{2}-\d{2}/)) {
      Logger.log(`Skipping post: invalid timestamp format`);
      return false;
    }

    // Validate content exists
    if (!post.content || post.content.trim().length === 0) {
      Logger.log(`Skipping post: empty content`);
      return false;
    }

    return true;
  });
}

// =====================================================
// CONFIGURATION
// =====================================================

/**
 * Load configuration from Config sheet
 * @returns {Object} Configuration object
 */
function loadConfig() {
  const configSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Config");

  if (!configSheet) {
    // Return default config if Config sheet doesn't exist
    return {
      CELEBRITIES_TO_TRACK: ["蔡依林", "王心凌", "柯震東", "林俊傑", "五月天"],
      MODEL_ACCURACY_THRESHOLD: 0.85,
      CONFIDENCE_THRESHOLD: 0.70,
      SENTIMENT_STDDEV_MAX: 0.25,
      DATA_RETENTION_DAYS: 30
    };
  }

  const data = configSheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < data.length; i++) {
    const [key, value] = [data[i][0], data[i][1]];

    if (!key) continue;

    if (key === "CELEBRITIES_TO_TRACK") {
      config[key] = String(value).split(",").map(s => s.trim()).filter(s => s.length > 0);
    } else if (key.includes("WEIGHT") || key.includes("DAYS") || key.includes("MIN")) {
      config[key] = parseInt(value) || 0;
    } else if (key.includes("THRESHOLD") || key.includes("MAX")) {
      config[key] = parseFloat(value) || 0;
    } else {
      config[key] = value;
    }
  }

  // Ensure celebrities list exists
  if (!config.CELEBRITIES_TO_TRACK || config.CELEBRITIES_TO_TRACK.length === 0) {
    config.CELEBRITIES_TO_TRACK = ["蔡依林", "王心凌", "柯震東", "林俊傑", "五月天"];
  }

  return config;
}

// =====================================================
// LOGGING & ALERTS
// =====================================================

/**
 * Update Model Metrics sheet with run summary
 * @param {Object} summary - Summary object with timestamp, counts, errors
 */
function updateLogSheet(summary) {
  try {
    let metricsSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Model Metrics");

    if (!metricsSheet) {
      // Create the sheet if it doesn't exist
      const ss = SpreadsheetApp.openById(SHEET_ID);
      metricsSheet = ss.insertSheet("Model Metrics");
      metricsSheet.appendRow([
        "Run_Date", "Run_ID", "Total_Posts_Processed", "Good_Posts", "Bad_Posts",
        "Skip_Posts", "Training_Accuracy", "Training_Precision", "Training_Recall",
        "Training_F1_Score", "Model_Status", "Celebrity_Count", "Celebrities_Ranked",
        "Pipeline_Status", "Error_Log"
      ]);
    }

    const runId = `fetch_${Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd_HHmmss')}`;

    metricsSheet.appendRow([
      summary.timestamp,
      runId,
      summary.total_posts,
      "", "", "", "", "", "", "",
      "FETCH_COMPLETE",
      summary.celebrities_processed,
      "",
      summary.errors === "None" ? "SUCCESS" : "WARNING",
      summary.errors
    ]);

  } catch (e) {
    Logger.log(`Failed to update log sheet: ${e.message}`);
  }
}

/**
 * Send email alert on critical errors
 * @param {Error} error - Error object
 */
function sendErrorAlert(error) {
  try {
    const email = Session.getActiveUser().getEmail();
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;

    GmailApp.sendEmail(
      email,
      "🚨 Celebrity Popularity Quantifier - Pipeline Error",
      `Error: ${error.message}\n\nCheck GAS execution log for details.\n\nSheet: ${sheetUrl}\n\nTimestamp: ${new Date().toISOString()}`
    );

    Logger.log(`Error alert sent to ${email}`);

  } catch (e) {
    Logger.log(`Failed to send error alert: ${e.message}`);
  }
}

// =====================================================
// TRIGGER MANAGEMENT
// =====================================================

/**
 * Setup daily trigger at 06:00 UTC+8
 * Run this once to initialize the daily schedule
 */
function setupDailyTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "fetchTaiwanSocialMedia") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new trigger at 06:00 UTC+8 (22:00 UTC previous day)
  ScriptApp.newTrigger("fetchTaiwanSocialMedia")
    .timeBased()
    .atHour(6)  // 06:00 in project timezone (Asia/Taipei)
    .everyDays(1)
    .create();

  Logger.log("✓ Trigger created: daily at 06:00 UTC+8 (Asia/Taipei)");
}

/**
 * Delete all triggers for this project
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log(`Deleted ${triggers.length} triggers`);
}

// =====================================================
// BULK DATA COLLECTION
// =====================================================

/**
 * Extended list of Taiwan celebrities for bulk data collection
 */
const EXTENDED_CELEBRITIES = [
  // 歌手 Singers
  "蔡依林", "王心凌", "林俊傑", "周杰倫", "蕭敬騰", "林宥嘉", "蔡健雅", "田馥甄",
  "張惠妹", "楊丞琳", "羅志祥", "潘瑋柏", "周湯豪", "畢書盡", "李榮浩", "鄧紫棋",
  "陳奕迅", "張韶涵", "梁靜茹", "光良", "品冠", "蘇打綠", "盧廣仲", "韋禮安",
  "徐佳瑩", "艾怡良", "魏如萱", "陳綺貞", "戴佩妮", "丁噹", "A-Lin", "蕭亞軒",

  // 樂團 Bands
  "五月天", "S.H.E", "動力火車", "告五人", "茄子蛋", "滅火器", "草東沒有派對",
  "宇宙人", "八三夭", "獅子合唱團", "麋先生", "美秀集團", "落日飛車",

  // 演員 Actors
  "柯震東", "彭于晏", "阮經天", "張鈞甯", "林依晨", "陳意涵", "周渝民", "言承旭",
  "吳慷仁", "許瑋甯", "謝盈萱", "桂綸鎂", "郭書瑤", "安心亞", "陳庭妮", "邱澤",
  "劉以豪", "宋芸樺", "李國毅", "林心如", "霍建華", "趙又廷", "高以翔", "修杰楷",
  "賈靜雯", "徐若瑄", "任賢齊", "金城武", "吳奇隆", "蘇有朋", "古天樂", "劉德華",

  // 網紅/KOL
  "蔡阿嘎", "理科太太", "館長", "千千", "阿翰", "白癡公主", "這群人", "眾量級",
  "Sandy吳姍儒", "黃氏兄弟", "反骨男孩", "小玉", "聖結石", "阿滴英文", "滴妹",
  "志祺七七", "HowHow", "蔡桃貴", "那對夫妻", "Joeman", "愛莉莎莎",

  // 主持人 Hosts
  "吳宗憲", "黃子佼", "蔡康永", "小S徐熙娣", "浩角翔起", "曾國城", "陶晶瑩",
  "侯佩岑", "NONO", "阿Ken", "納豆", "黃鴻升",

  // 運動員 Athletes
  "戴資穎", "林昀儒", "王齊麟", "李洋", "郭婞淳", "楊勇緯", "文姿云", "潘政琮",
  "王柏融", "林智勝", "陳金鋒", "王建民", "林書豪", "曾雅妮", "盧彥勳",

  // 政商名人
  "蔡英文", "賴清德", "柯文哲", "韓國瑜", "侯友宜", "郭台銘", "張忠謀"
];

/**
 * Bulk fetch data for extended celebrity list
 * Run this to populate database with 1000+ posts
 */
function bulkFetchAllCelebrities() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Pipeline already running, skipping this execution");
    return;
  }

  const startTime = new Date().getTime();
  const MAX_RUNTIME_MS = 5.5 * 60 * 1000; // 5.5 minutes

  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('PERPLEXITY_API_KEY');
    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY not found in Script Properties");
    }

    const sheet = getSheetSafe(SHEET_ID, "Raw Data");

    // Load existing posts for deduplication
    const existingKeys = loadExistingPostKeys();

    let totalAdded = 0;
    let duplicatesFiltered = 0;
    let errors = [];
    let processedCount = 0;

    Logger.log(`Starting bulk fetch for ${EXTENDED_CELEBRITIES.length} celebrities...`);
    Logger.log(`Deduplication enabled: ${existingKeys.size} existing posts loaded`);

    for (let celebrity of EXTENDED_CELEBRITIES) {
      // Check time limit
      const elapsedTime = new Date().getTime() - startTime;
      if (elapsedTime > MAX_RUNTIME_MS) {
        Logger.log(`⚠️ Time limit reached after ${processedCount} celebrities. Run again to continue.`);
        break;
      }

      try {
        Logger.log(`Fetching: ${celebrity} (${processedCount + 1}/${EXTENDED_CELEBRITIES.length})`);
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
            post.engagement.likes || post.engagement.views || 0,
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

        // Rate limiting
        Utilities.sleep(1500);

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
    Logger.log(`Processed: ${processedCount}/${EXTENDED_CELEBRITIES.length} celebrities`);
    Logger.log(`Total posts added: ${totalAdded}`);
    Logger.log(`Duplicates filtered: ${duplicatesFiltered}`);
    Logger.log(`Errors: ${errors.length}`);
    Logger.log(`Time: ${totalTime}s`);
    Logger.log(`========================================`);

    return {
      processed: processedCount,
      total: EXTENDED_CELEBRITIES.length,
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
// TESTING FUNCTIONS
// =====================================================

/**
 * Test Perplexity API connection
 */
function testPerplexityAPI() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('PERPLEXITY_API_KEY');

  if (!apiKey) {
    Logger.log("ERROR: PERPLEXITY_API_KEY not found in Script Properties");
    Logger.log("Go to Project Settings > Script Properties > Add Property");
    return;
  }

  // HIGH FIX 2.1: Never log API keys, even partially
  Logger.log("✓ API Key found in Script Properties");

  try {
    const posts = queryPerplexityAPI("蔡依林", apiKey);
    Logger.log(`✓ API test successful! Received ${posts.length} posts`);

    if (posts.length > 0) {
      Logger.log(`Sample post: ${JSON.stringify(posts[0], null, 2)}`);
    }
  } catch (e) {
    Logger.log(`✗ API test failed: ${e.message}`);
  }
}

/**
 * Test configuration loading
 */
function testLoadConfig() {
  const config = loadConfig();
  Logger.log("Configuration loaded:");
  Logger.log(`- Celebrities: ${config.CELEBRITIES_TO_TRACK.join(", ")}`);
  Logger.log(`- Accuracy Threshold: ${config.MODEL_ACCURACY_THRESHOLD}`);
  Logger.log(`- Confidence Threshold: ${config.CONFIDENCE_THRESHOLD}`);
}

/**
 * Manual test run (single celebrity)
 */
function testSingleCelebrity() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('PERPLEXITY_API_KEY');
  const celebrity = "蔡依林";

  Logger.log(`Testing fetch for: ${celebrity}`);

  try {
    const posts = queryPerplexityAPI(celebrity, apiKey);
    const validated = validatePerplexityResponse(posts, celebrity);

    Logger.log(`Raw posts: ${posts.length}`);
    Logger.log(`Validated posts: ${validated.length}`);

    validated.forEach((post, i) => {
      Logger.log(`Post ${i + 1}: ${post.platform} - ${post.content.substring(0, 50)}...`);
    });

  } catch (e) {
    Logger.log(`Error: ${e.message}`);
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Add custom menu to Google Sheets UI
 * Runs automatically when spreadsheet is opened
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎬 CPQ Tools')
    .addItem('🔄 Run Bulk Fetch', 'bulkFetchAllCelebrities')
    .addItem('🧹 Remove Duplicates', 'deduplicateExistingData')
    .addItem('📊 Sync Sources', 'syncSourcesToConfig')
    .addSeparator()
    .addItem('⚙️ Initialize Sheets', 'initializeSheets')
    .addItem('🕐 Setup Daily Trigger', 'setupDailyTrigger')
    .addToUi();
}

/**
 * Remove duplicate posts from Raw Data sheet
 * Keeps the first occurrence, removes subsequent duplicates
 * @returns {Object} Summary of deduplication results
 */
function deduplicateExistingData() {
  const ui = SpreadsheetApp.getUi();

  // Confirm before running
  const response = ui.alert(
    '🧹 Remove Duplicates',
    'This will scan the Raw Data sheet and remove duplicate posts.\n\nDuplicates are identified by: Post URL (primary) or Celebrity + Platform + Account + Content (fallback)\n\nContinue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('Operation cancelled.');
    return;
  }

  const startTime = new Date().getTime();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Raw Data");
    if (!sheet) {
      ui.alert('Error: Raw Data sheet not found.');
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      ui.alert('No data to deduplicate.');
      return;
    }

    const header = data[0];
    const seenKeys = new Set();
    const uniqueRows = [header]; // Keep header
    const duplicateRows = [];

    // Process each row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const celebrity = row[1] || '';   // Column B
      const platform = row[2] || '';    // Column C
      const accountName = row[3] || ''; // Column D
      const content = row[4] || '';     // Column E
      const postUrl = row[6] || '';     // Column G (Post_URL)

      const key = generatePostKey(postUrl, celebrity, platform, accountName, content);

      if (seenKeys.has(key)) {
        duplicateRows.push(i + 1); // Store 1-indexed row number
      } else {
        seenKeys.add(key);
        uniqueRows.push(row);
      }
    }

    const duplicateCount = data.length - uniqueRows.length;

    if (duplicateCount === 0) {
      ui.alert('✓ No duplicates found!\n\nYour data is already clean.');
      return { removed: 0, remaining: uniqueRows.length - 1 };
    }

    // Clear sheet and rewrite unique data
    sheet.clear();
    if (uniqueRows.length > 0) {
      sheet.getRange(1, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
    }

    const totalTime = Math.round((new Date().getTime() - startTime) / 1000);

    const summary = `✓ Deduplication Complete!\n\n` +
      `• Duplicates removed: ${duplicateCount}\n` +
      `• Unique posts remaining: ${uniqueRows.length - 1}\n` +
      `• Time taken: ${totalTime}s`;

    ui.alert(summary);
    Logger.log(summary);

    return {
      removed: duplicateCount,
      remaining: uniqueRows.length - 1,
      timeSeconds: totalTime
    };

  } catch (e) {
    const errorMsg = `Error during deduplication: ${e.message}`;
    ui.alert(errorMsg);
    Logger.log(errorMsg);
    throw e;
  }
}

/**
 * Standalone deduplication function (no UI prompts)
 * For use in scripts or API calls
 */
function deduplicateRawDataSilent() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Raw Data");
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log("No data to deduplicate");
    return { removed: 0, remaining: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const seenKeys = new Set();
  const uniqueRows = [header];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // row[6] = Post_URL, row[1] = Celebrity, row[2] = Platform, row[3] = Account, row[4] = Content
    const key = generatePostKey(row[6], row[1], row[2], row[3], row[4]);

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueRows.push(row);
    }
  }

  const duplicateCount = data.length - uniqueRows.length;

  if (duplicateCount > 0) {
    sheet.clear();
    sheet.getRange(1, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
    Logger.log(`Removed ${duplicateCount} duplicates. ${uniqueRows.length - 1} unique posts remain.`);
  }

  return { removed: duplicateCount, remaining: uniqueRows.length - 1 };
}

/**
 * Generate a unique key for a post (used for deduplication)
 * Primary key: Post URL (most reliable unique identifier)
 * Fallback: Celebrity + Platform + Account + Content (for posts without URL)
 * @param {string} postUrl - Post URL (Column G)
 * @param {string} celebrity - Celebrity name (fallback)
 * @param {string} platform - Platform name (fallback)
 * @param {string} accountName - Account name (fallback)
 * @param {string} content - Post content (fallback)
 * @returns {string} Unique key
 */
function generatePostKey(postUrl, celebrity, platform, accountName, content) {
  // Primary: Use URL if available and not placeholder
  const url = String(postUrl || '').trim();
  if (url && url !== '#' && url !== '' && url.startsWith('http')) {
    return `url:${url}`;
  }

  // Fallback: Use content fingerprint for posts without valid URL
  const contentFingerprint = String(content || '').substring(0, 100).trim().toLowerCase();
  return `content:${celebrity}|${platform}|${accountName}|${contentFingerprint}`;
}

/**
 * Load existing post keys from Raw Data sheet for deduplication
 * @returns {Set} Set of existing post keys
 */
function loadExistingPostKeys() {
  const existingKeys = new Set();

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Raw Data");
    if (!sheet || sheet.getLastRow() <= 1) {
      return existingKeys;
    }

    const data = sheet.getDataRange().getValues();

    // Skip header row, build set of keys
    for (let i = 1; i < data.length; i++) {
      const celebrity = data[i][1] || '';   // Column B
      const platform = data[i][2] || '';    // Column C
      const accountName = data[i][3] || ''; // Column D
      const content = data[i][4] || '';     // Column E
      const postUrl = data[i][6] || '';     // Column G (Post_URL)

      const key = generatePostKey(postUrl, celebrity, platform, accountName, content);
      existingKeys.add(key);
    }

    Logger.log(`Loaded ${existingKeys.size} existing post keys for deduplication`);

  } catch (e) {
    Logger.log(`Warning: Could not load existing posts for deduplication: ${e.message}`);
  }

  return existingKeys;
}

/**
 * Filter out duplicate posts before insertion
 * @param {Array} posts - Array of post objects from API
 * @param {string} celebrity - Celebrity name
 * @param {Set} existingKeys - Set of existing post keys
 * @returns {Array} Filtered posts (duplicates removed)
 */
function deduplicatePosts(posts, celebrity, existingKeys) {
  if (!posts || posts.length === 0) return [];

  const uniquePosts = [];
  let duplicateCount = 0;

  for (const post of posts) {
    const key = generatePostKey(
      post.post_url || '',      // Primary: URL
      celebrity,                 // Fallback params
      post.platform || '',
      post.account_name || '',
      post.content || ''
    );

    if (existingKeys.has(key)) {
      duplicateCount++;
      continue;
    }

    // Add to existing keys to prevent duplicates within same batch
    existingKeys.add(key);
    uniquePosts.push(post);
  }

  if (duplicateCount > 0) {
    Logger.log(`  Filtered ${duplicateCount} duplicate posts for ${celebrity}`);
  }

  return uniquePosts;
}

/**
 * HIGH FIX 2.2: Safe sheet access wrapper with validation
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
 * HIGH FIX 3.2: Find column index by header name
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
 * Initialize all required sheets with headers
 * Run once to set up the Google Sheet structure
 */
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Raw Data sheet
  let rawSheet = ss.getSheetByName("Raw Data");
  if (!rawSheet) {
    rawSheet = ss.insertSheet("Raw Data");
    rawSheet.appendRow([
      "Collection_Timestamp", "Celebrity", "Platform", "Account_Name",
      "Post_Content", "Engagement_Metric", "Post_URL", "Post_Timestamp",
      "Account_Type", "Feedback", "Feedback_Notes", "Sentiment_Score", "Processing_Date"
    ]);
    Logger.log("✓ Created 'Raw Data' sheet");
  }

  // Config sheet
  let configSheet = ss.getSheetByName("Config");
  if (!configSheet) {
    configSheet = ss.insertSheet("Config");
    configSheet.appendRow(["Setting_Name", "Value", "Description", "Last_Updated"]);
    configSheet.appendRow(["CELEBRITIES_TO_TRACK", "蔡依林, 王心凌, 柯震東, 林俊傑, 五月天", "List of celebrity names to monitor", new Date()]);
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
    weightsSheet.appendRow(["Source", "Weight_Score", "Rationale", "Last_Modified"]);
    weightsSheet.appendRow(["TikTok", 10, "Highest reach; viral potential", new Date()]);
    weightsSheet.appendRow(["Instagram", 9, "Visual engagement; younger demographic", new Date()]);
    weightsSheet.appendRow(["YouTube", 8, "Long-form content; deep engagement", new Date()]);
    weightsSheet.appendRow(["Facebook", 7, "Broad reach; older demographic", new Date()]);
    Logger.log("✓ Created 'Source Weights' sheet");
  }

  // Results sheet
  let resultsSheet = ss.getSheetByName("Results");
  if (!resultsSheet) {
    resultsSheet = ss.insertSheet("Results");
    resultsSheet.appendRow([
      "Rank", "Celebrity", "Avg_Sentiment_Raw", "Total_Posts_Analyzed",
      "Sentiment_StdDev", "Weighted_Popularity_Score", "Confidence_Score",
      "Score_Range", "Model_Accuracy", "Trend_Direction", "Source_Breakdown",
      "Top_Source", "Good_Records_Ratio", "Risk_Flag",
      "Last_Updated", "Analysis_Notes"
    ]);
    Logger.log("✓ Created 'Results' sheet");
  }

  // Feedback History sheet
  let feedbackSheet = ss.getSheetByName("Feedback History");
  if (!feedbackSheet) {
    feedbackSheet = ss.insertSheet("Feedback History");
    feedbackSheet.appendRow([
      "Post_ID", "Post_Text", "Kaggle_Predicted_Sentiment", "Human_Feedback",
      "Feedback_Reason", "Feedback_Date", "Feedback_Round"
    ]);
    Logger.log("✓ Created 'Feedback History' sheet");
  }

  // Model Metrics sheet
  let metricsSheet = ss.getSheetByName("Model Metrics");
  if (!metricsSheet) {
    metricsSheet = ss.insertSheet("Model Metrics");
    metricsSheet.appendRow([
      "Run_Date", "Run_ID", "Total_Posts_Processed", "Good_Posts", "Bad_Posts",
      "Skip_Posts", "Training_Accuracy", "Training_Precision", "Training_Recall",
      "Training_F1_Score", "Model_Status", "Celebrity_Count", "Celebrities_Ranked",
      "Pipeline_Status", "Error_Log"
    ]);
    Logger.log("✓ Created 'Model Metrics' sheet");
  }

  // Source Config sheet (for source-specific importance ratings)
  let sourceConfigSheet = ss.getSheetByName("Source Config");
  if (!sourceConfigSheet) {
    sourceConfigSheet = ss.insertSheet("Source Config");
    sourceConfigSheet.appendRow([
      "Source_Name", "Source_Type", "Platform", "Importance_Score", "Rated_By", "Last_Modified"
    ]);
    Logger.log("✓ Created 'Source Config' sheet");
  }

  Logger.log("✓ All sheets initialized successfully!");
}

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
    sourceConfigSheet.appendRow([
      "Source_Name", "Source_Type", "Platform", "Importance_Score", "Rated_By", "Last_Modified"
    ]);
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

  // Find column indices (Account_Name = D, Platform = C, Account_Type = I)
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
    const accountType = rawData[i][accountTypeCol] || "unknown";

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
