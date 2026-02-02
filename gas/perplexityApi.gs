/**
 * Celebrity Popularity Quantifier - Perplexity API
 * Taiwan Edition v5.0
 *
 * Perplexity API integration for fetching social media data
 */

// =====================================================
// API QUERY
// =====================================================

/**
 * Query Perplexity API for celebrity social media data
 * @param {string} celebrity - Celebrity name in Traditional Chinese
 * @param {string} apiKey - Perplexity API key
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Array} Array of post objects
 */
function queryPerplexityAPI(celebrity, apiKey, retryCount = 0) {
  // Prevent infinite recursion with retry limit
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

    // Safe JSON parsing with null checks
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

// =====================================================
// PROMPT BUILDER
// =====================================================

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
// RESPONSE VALIDATION
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

    // Validate engagement metrics (allow zero, reject negative)
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
