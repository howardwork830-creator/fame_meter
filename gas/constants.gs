/**
 * Celebrity Popularity Quantifier - Constants
 * Taiwan Edition v5.0
 *
 * Shared constants used across all modules
 */

// =====================================================
// API CONFIGURATION
// =====================================================
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar";
const MAX_API_RETRIES = 3;

// =====================================================
// SHEET CONFIGURATION
// =====================================================
const SHEET_ID = "1sgKkhqP0_WAzdBfBbH2oWLAav-WlGkbCyayLguaHG6Q";
const DASHBOARD_SHEET_ID = SHEET_ID; // Same sheet for dashboard

// =====================================================
// TIMING CONFIGURATION
// =====================================================
const TIMEZONE = "Asia/Taipei";
const MAX_EXECUTION_TIME_MS = 5 * 60 * 1000; // 5 minutes (buffer before 6-min limit)
const API_RATE_LIMIT_MS = 1500; // Rate limit between API calls (ms)

// =====================================================
// DATA VALIDATION
// =====================================================
const VALID_PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "News"];
const DEFAULT_CELEBRITIES = ["蔡依林", "王心凌", "柯震東", "林俊傑", "五月天"];

// =====================================================
// FEEDBACK VALIDATION
// =====================================================
const VALID_FEEDBACK_VALUES = ["Good", "Bad", "Skip", ""];

// =====================================================
// TREND INDICATORS
// =====================================================
const TREND_EMOJIS = ["🚀", "↑", "→", "↓", "📉"];

// =====================================================
// COLUMN SCHEMAS
// =====================================================
const RAW_DATA_HEADERS = [
  "Collection_Timestamp", "Celebrity", "Platform", "Account_Name",
  "Post_Content", "Engagement_Metric", "Post_URL", "Post_Timestamp",
  "Account_Type", "Feedback", "Feedback_Notes", "Sentiment_Score", "Processing_Date"
];

const RESULTS_HEADERS = [
  "Rank", "Celebrity", "Avg_Sentiment_Raw", "Total_Posts_Analyzed",
  "Sentiment_StdDev", "Weighted_Popularity_Score", "Confidence_Score",
  "Score_Range", "Model_Accuracy", "Trend_Direction", "Source_Breakdown",
  "Top_Source", "Good_Records_Ratio", "Risk_Flag", "Endorsement_Ready",
  "Top_Contributing_Source", "Score_Change_Breakdown", "Last_Updated", "Analysis_Notes"
];

const MODEL_METRICS_HEADERS = [
  "Run_Date", "Run_ID", "Total_Posts_Processed", "Good_Posts", "Bad_Posts",
  "Skip_Posts", "Training_Accuracy", "Training_Precision", "Training_Recall",
  "Training_F1_Score", "Model_Status", "Celebrity_Count", "Celebrities_Ranked",
  "Pipeline_Status", "Error_Log"
];

const CONFIG_HEADERS = ["Setting_Name", "Value", "Description", "Last_Updated"];

const SOURCE_WEIGHTS_HEADERS = ["Source", "Weight_Score", "Rationale", "Last_Modified"];

const SOURCE_CONFIG_HEADERS = [
  "Source_Name", "Source_Type", "Platform", "Importance_Score", "Rated_By", "Last_Modified"
];

const FEEDBACK_HISTORY_HEADERS = [
  "Post_ID", "Post_Text", "Kaggle_Predicted_Sentiment", "Human_Feedback",
  "Feedback_Reason", "Feedback_Date", "Feedback_Round"
];

// =====================================================
// DEFAULT PLATFORM WEIGHTS
// =====================================================
const DEFAULT_PLATFORM_WEIGHTS = [
  ["TikTok", 10, "Highest reach; viral potential"],
  ["Instagram", 9, "Visual engagement; younger demographic"],
  ["YouTube", 8, "Long-form content; deep engagement"],
  ["Facebook", 7, "Broad reach; older demographic"],
  ["News", 6, "Credibility; media coverage"]
];

// =====================================================
// PLATFORM NAME NORMALIZATION
// =====================================================
const PLATFORM_NAME_MAP = {
  "instagram": "Instagram",
  "facebook": "Facebook",
  "tiktok": "TikTok",
  "youtube": "YouTube",
  "news": "News"
};
