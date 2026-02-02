/**
 * Celebrity Popularity Quantifier - Deduplication
 * Taiwan Edition v5.0
 *
 * Functions for detecting and removing duplicate posts
 */

// =====================================================
// POST KEY GENERATION
// =====================================================

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

// =====================================================
// EXISTING KEYS LOADER
// =====================================================

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
    const headers = data[0];

    // Dynamic column lookup using header names
    const celebrityIdx = headers.indexOf("Celebrity");
    const platformIdx = headers.indexOf("Platform");
    const accountIdx = headers.indexOf("Account_Name");
    const contentIdx = headers.indexOf("Post_Content");
    const urlIdx = headers.indexOf("Post_URL");

    // Validate required columns exist
    if (celebrityIdx === -1 || platformIdx === -1 || urlIdx === -1) {
      Logger.log("Warning: Required columns not found for deduplication. Using fallback indices.");
      // Fallback to expected positions from RAW_DATA_HEADERS schema
      const fallbackCelebrity = 1, fallbackPlatform = 2, fallbackAccount = 3, fallbackContent = 4, fallbackUrl = 6;

      for (let i = 1; i < data.length; i++) {
        const key = generatePostKey(
          data[i][fallbackUrl] || '',
          data[i][fallbackCelebrity] || '',
          data[i][fallbackPlatform] || '',
          data[i][fallbackAccount] || '',
          data[i][fallbackContent] || ''
        );
        existingKeys.add(key);
      }
    } else {
      // Use dynamic indices
      for (let i = 1; i < data.length; i++) {
        const celebrity = data[i][celebrityIdx] || '';
        const platform = data[i][platformIdx] || '';
        const accountName = accountIdx >= 0 ? (data[i][accountIdx] || '') : '';
        const content = contentIdx >= 0 ? (data[i][contentIdx] || '') : '';
        const postUrl = data[i][urlIdx] || '';

        const key = generatePostKey(postUrl, celebrity, platform, accountName, content);
        existingKeys.add(key);
      }
    }

    Logger.log(`Loaded ${existingKeys.size} existing post keys for deduplication`);

  } catch (e) {
    Logger.log(`Warning: Could not load existing posts for deduplication: ${e.message}`);
  }

  return existingKeys;
}

// =====================================================
// BATCH DEDUPLICATION
// =====================================================

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

// =====================================================
// INTERACTIVE DEDUPLICATION
// =====================================================

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

    // Dynamic column lookup using header names
    const celebrityIdx = header.indexOf("Celebrity");
    const platformIdx = header.indexOf("Platform");
    const accountIdx = header.indexOf("Account_Name");
    const contentIdx = header.indexOf("Post_Content");
    const urlIdx = header.indexOf("Post_URL");

    // Validate required columns exist
    if (celebrityIdx === -1 || platformIdx === -1 || urlIdx === -1) {
      ui.alert("Error: Required columns not found (Celebrity, Platform, Post_URL). Run Fix Raw Data Headers first.");
      return;
    }

    // Process each row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const celebrity = row[celebrityIdx] || '';
      const platform = row[platformIdx] || '';
      const accountName = accountIdx >= 0 ? (row[accountIdx] || '') : '';
      const content = contentIdx >= 0 ? (row[contentIdx] || '') : '';
      const postUrl = row[urlIdx] || '';

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

// =====================================================
// SILENT DEDUPLICATION
// =====================================================

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

  // Dynamic column lookup using header names with fallback to expected positions
  const celebrityIdx = header.indexOf("Celebrity") >= 0 ? header.indexOf("Celebrity") : 1;
  const platformIdx = header.indexOf("Platform") >= 0 ? header.indexOf("Platform") : 2;
  const accountIdx = header.indexOf("Account_Name") >= 0 ? header.indexOf("Account_Name") : 3;
  const contentIdx = header.indexOf("Post_Content") >= 0 ? header.indexOf("Post_Content") : 4;
  const urlIdx = header.indexOf("Post_URL") >= 0 ? header.indexOf("Post_URL") : 6;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const key = generatePostKey(
      row[urlIdx] || '',
      row[celebrityIdx] || '',
      row[platformIdx] || '',
      row[accountIdx] || '',
      row[contentIdx] || ''
    );

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
