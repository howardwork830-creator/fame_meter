/**
 * Celebrity Popularity Quantifier - Dashboard
 * Taiwan Edition v5.0 - User-Friendly Traditional Chinese Version
 *
 * Interactive HTML5 dashboard with 4 tabs:
 * - Tab 1: 排名 (Rankings)
 * - Tab 2: 最新動態 (News View - NEW)
 * - Tab 3: 評分 (Feedback - Simplified)
 * - Tab 4: 分析 (Analytics)
 */

const DASHBOARD_SHEET_ID = "1sgKkhqP0_WAzdBfBbH2oWLAav-WlGkbCyayLguaHG6Q";

// =====================================================
// WEB APP ENTRY POINT
// =====================================================

/**
 * Serve the HTML dashboard as a web app
 * Deploy as: Web app > Execute as me > Anyone can access
 */
function doGet() {
  return HtmlService.createHtmlOutput(getHtmlDashboard())
    .setTitle("名人聲量監測儀表板")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Show dashboard as modal dialog in Google Sheets
 * Run from: Sheet > Extensions > Apps Script > Run > showDashboard
 */
function showDashboard() {
  const html = HtmlService.createHtmlOutput(getHtmlDashboard())
    .setWidth(1200)
    .setHeight(800);

  SpreadsheetApp.getUi().showModelessDialog(html, '🎬 名人聲量監測儀表板');
}

// =====================================================
// HTML DASHBOARD TEMPLATE
// =====================================================

function getHtmlDashboard() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>名人聲量監測儀表板</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans TC', sans-serif;
      background: #f5f5f5;
      color: #333;
      padding: 20px;
      line-height: 1.8;
      font-size: 16px;
    }

    .container { max-width: 1200px; margin: 0 auto; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px 30px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .header h1 { font-size: 26px; font-weight: 700; }
    .header p { font-size: 14px; opacity: 0.9; margin-top: 5px; }

    .refresh-btn {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.3s;
    }

    .refresh-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: translateY(-1px);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      background: white;
      padding: 8px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .tab-btn {
      flex: 1;
      padding: 15px 20px;
      background: none;
      border: 2px solid transparent;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      color: #666;
      border-radius: 10px;
      transition: all 0.3s;
    }

    .tab-btn:hover {
      background: #f0f0f0;
      border-color: #ddd;
    }

    .tab-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: transparent;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .tab-content {
      display: none;
      animation: fadeIn 0.3s ease;
    }

    .tab-content.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* TAB 1: RANKINGS TABLE */
    .rankings-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .rankings-table th {
      background: #f8f9fa;
      padding: 18px 15px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      color: #666;
      border-bottom: 2px solid #eee;
    }

    .rankings-table td {
      padding: 18px 15px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 15px;
    }

    .rankings-table tr:hover {
      background: #fafafa;
    }

    .rankings-table tr:last-child td {
      border-bottom: none;
    }

    .rank {
      font-weight: 700;
      font-size: 20px;
      color: #667eea;
    }

    .rank-1 { color: #ffd700; }
    .rank-2 { color: #c0c0c0; }
    .rank-3 { color: #cd7f32; }

    .celebrity-name {
      font-weight: 600;
      font-size: 17px;
    }

    .score {
      font-weight: 700;
      font-size: 18px;
      color: #667eea;
    }

    .confidence {
      font-size: 14px;
      color: #888;
      background: #f0f0f0;
      padding: 6px 10px;
      border-radius: 6px;
    }

    .trend {
      font-size: 16px;
      font-weight: 600;
    }

    .trend.up { color: #28a745; }
    .trend.down { color: #dc3545; }
    .trend.stable { color: #6c757d; }

    /* TAB 2: NEWS VIEW */
    .news-container {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .news-header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }

    .news-header h2 {
      font-size: 22px;
      color: #333;
      margin-bottom: 5px;
    }

    .news-subtitle {
      font-size: 14px;
      color: #888;
    }

    .news-filters {
      display: flex;
      gap: 15px;
      margin-bottom: 25px;
    }

    .news-filters select {
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 15px;
      background: white;
      cursor: pointer;
      min-width: 160px;
    }

    .news-filters select:focus {
      outline: none;
      border-color: #667eea;
    }

    .news-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .news-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #e9ecef;
      transition: all 0.3s ease;
    }

    .news-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
      border-color: #667eea;
    }

    .news-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .news-celebrity-name {
      font-size: 16px;
      font-weight: 700;
      color: #333;
    }

    .news-platform-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 20px;
      background: #e9ecef;
      color: #666;
    }

    .news-platform-badge.instagram { background: #fce4ec; color: #c2185b; }
    .news-platform-badge.facebook { background: #e3f2fd; color: #1565c0; }
    .news-platform-badge.youtube { background: #ffebee; color: #c62828; }
    .news-platform-badge.tiktok { background: #e8eaf6; color: #3f51b5; }
    .news-platform-badge.news { background: #e8f5e9; color: #2e7d32; }

    .news-content {
      font-size: 15px;
      line-height: 1.7;
      color: #444;
      margin-bottom: 15px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .news-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #e9ecef;
      font-size: 13px;
      color: #888;
    }

    .news-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }

    .news-link:hover {
      text-decoration: underline;
    }

    .news-celebrity-group {
      margin-bottom: 30px;
    }

    .news-celebrity-group-header {
      font-size: 20px;
      font-weight: 700;
      color: #333;
      padding: 15px 0;
      border-bottom: 3px solid #667eea;
      margin-bottom: 20px;
    }

    /* TAB 3: FLASHCARD FEEDBACK (SIMPLIFIED) */
    .flashcard-container {
      background: white;
      border-radius: 12px;
      padding: 35px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    }

    .flashcard {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #dee2e6;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 25px;
    }

    .flashcard-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 25px;
    }

    .meta-item {
      background: white;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .meta-label {
      font-size: 12px;
      color: #888;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .meta-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .flashcard-content {
      background: white;
      padding: 25px;
      border-radius: 10px;
      margin-bottom: 20px;
      min-height: 150px;
      font-size: 17px;
      line-height: 2;
      border-left: 5px solid #667eea;
    }

    .feedback-buttons {
      display: flex;
      gap: 20px;
      margin: 30px 0;
    }

    .feedback-buttons button {
      flex: 1;
      padding: 25px 30px;
      border: none;
      border-radius: 16px;
      font-size: 22px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 100px;
    }

    .btn-icon {
      font-size: 32px;
    }

    .btn-good {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
    }

    .btn-good:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(40, 167, 69, 0.4);
    }

    .btn-bad {
      background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%);
      color: white;
    }

    .btn-bad:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(220, 53, 69, 0.4);
    }

    .btn-skip {
      background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
      color: white;
    }

    .btn-skip:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(255, 193, 7, 0.4);
    }

    /* Feedback button - LOADING STATE */
    .feedback-buttons button {
      transition: all 0.15s ease;
    }

    .feedback-buttons button:disabled {
      pointer-events: none;
      opacity: 0.6;
    }

    /* When button is clicked - show loading spinner */
    .feedback-buttons button.is-loading {
      background: #555 !important;
      transform: scale(0.95);
      pointer-events: none;
    }

    .feedback-buttons button.is-loading .btn-icon {
      display: none !important;
    }

    .feedback-buttons button.is-loading span:last-child {
      visibility: hidden;
    }

    .feedback-buttons button.is-loading::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 32px;
      height: 32px;
      margin: -16px 0 0 -16px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: btnSpin 0.6s linear infinite;
    }

    .feedback-buttons button.is-loading::after {
      content: '處理中...';
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 14px;
      color: white;
    }

    @keyframes btnSpin {
      to { transform: rotate(360deg); }
    }

    /* SUCCESS state after loading */
    .feedback-buttons button.is-success {
      background: #00c853 !important;
    }

    .feedback-buttons button.is-success .btn-icon {
      display: none !important;
    }

    .feedback-buttons button.is-success span:last-child {
      visibility: hidden;
    }

    .feedback-buttons button.is-success::before {
      content: '✓';
      position: absolute;
      top: 35%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 40px;
      animation: popCheck 0.3s ease;
    }

    .feedback-buttons button.is-success::after {
      content: '已記錄';
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 16px;
      font-weight: bold;
    }

    @keyframes popCheck {
      0% { transform: translateX(-50%) scale(0); }
      60% { transform: translateX(-50%) scale(1.3); }
      100% { transform: translateX(-50%) scale(1); }
    }

    .reason-input {
      width: 100%;
      padding: 15px 18px;
      border: 2px solid #e9ecef;
      border-radius: 10px;
      font-size: 15px;
      resize: vertical;
      min-height: 70px;
      transition: border-color 0.3s;
    }

    .reason-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .nav-buttons {
      display: flex;
      gap: 15px;
      margin-top: 20px;
    }

    .nav-btn {
      flex: 1;
      padding: 15px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .nav-btn:hover {
      background: #5a6fd6;
    }

    .progress-container {
      margin-top: 30px;
      padding-top: 25px;
      border-top: 1px solid #eee;
    }

    .progress-bar {
      height: 14px;
      background: #e9ecef;
      border-radius: 7px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 7px;
      transition: width 0.5s ease;
    }

    .progress-text {
      text-align: center;
      font-size: 16px;
      font-weight: 600;
      color: #667eea;
    }

    /* TAB 4: ANALYTICS */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 25px;
    }

    .metric-card {
      background: white;
      padding: 28px;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      transition: transform 0.3s;
    }

    .metric-card:hover {
      transform: translateY(-3px);
    }

    .metric-label {
      font-size: 14px;
      color: #888;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 40px;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .metric-trend {
      font-size: 14px;
      color: #28a745;
      margin-top: 10px;
      font-weight: 500;
    }

    .alert {
      padding: 18px 22px;
      border-radius: 12px;
      margin-bottom: 15px;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .alert.warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      color: #856404;
    }

    .alert.danger {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }

    .alert.success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }

    /* Loading state */
    .loading {
      text-align: center;
      padding: 50px;
      color: #888;
      font-size: 16px;
    }

    .loading::after {
      content: '';
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid #667eea;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s linear infinite;
      margin-left: 12px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #888;
    }

    .empty-state h3 {
      margin-bottom: 10px;
      color: #666;
      font-size: 18px;
    }

    /* Hidden elements */
    .hidden {
      display: none !important;
    }

    /* TAB 5: SOURCE RATING */
    .sources-container {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .sources-header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }

    .sources-header h2 {
      font-size: 22px;
      color: #333;
      margin-bottom: 5px;
    }

    .sources-subtitle {
      font-size: 14px;
      color: #888;
    }

    .sources-filters {
      display: flex;
      gap: 15px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }

    .sources-filters select {
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 15px;
      background: white;
      cursor: pointer;
      min-width: 160px;
    }

    .sources-filters select:focus {
      outline: none;
      border-color: #667eea;
    }

    .sources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .source-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border: 2px solid #e9ecef;
      transition: all 0.3s ease;
    }

    .source-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
      border-color: #667eea;
    }

    .source-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .source-name {
      font-size: 18px;
      font-weight: 700;
      color: #333;
      word-break: break-all;
    }

    .source-type-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 12px;
      background: #e9ecef;
      color: #666;
      white-space: nowrap;
    }

    .source-type-badge.official { background: #d4edda; color: #155724; }
    .source-type-badge.fan { background: #cce5ff; color: #004085; }
    .source-type-badge.media { background: #fff3cd; color: #856404; }

    .source-platform {
      font-size: 13px;
      color: #888;
      margin-bottom: 15px;
    }

    .source-rating {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .star-btn {
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      transition: all 0.2s;
      padding: 0;
      color: #ddd;
    }

    .star-btn:hover {
      transform: scale(1.2);
    }

    .star-btn.active {
      color: #ffc107;
    }

    .star-btn.hover {
      color: #ffdb4d;
    }

    .source-meta {
      font-size: 12px;
      color: #aaa;
      padding-top: 10px;
      border-top: 1px solid #e9ecef;
    }

    .source-save-indicator {
      display: inline-block;
      margin-left: 10px;
      font-size: 12px;
      color: #28a745;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .source-save-indicator.show {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>🎬 名人聲量監測儀表板</h1>
        <p>台灣市場分析 | 最後更新：<span id="lastUpdate">載入中...</span></p>
      </div>
      <button class="refresh-btn" onclick="location.reload()">🔄 重新整理</button>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('rankings')">📊 排名</button>
      <button class="tab-btn" onclick="switchTab('news')">📰 最新動態</button>
      <button class="tab-btn" onclick="switchTab('feedback')">⭐ 評分</button>
      <button class="tab-btn" onclick="switchTab('sources')">🎯 來源評分</button>
      <button class="tab-btn" onclick="switchTab('analytics')">📈 分析</button>
    </div>

    <!-- TAB 1: 排名 (RANKINGS) -->
    <div id="rankings" class="tab-content active">
      <table class="rankings-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>名人</th>
            <th>綜合分數</th>
            <th>可信度</th>
            <th>趨勢</th>
          </tr>
        </thead>
        <tbody id="rankingsBody">
          <tr><td colspan="5" class="loading">載入中...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- TAB 2: 最新動態 (NEWS VIEW - NEW) -->
    <div id="news" class="tab-content">
      <div class="news-container">
        <div class="news-header">
          <h2>📰 最新動態</h2>
          <p class="news-subtitle">近期名人相關新聞與社群貼文</p>
        </div>
        <div class="news-filters">
          <select id="celebrityFilter" onchange="filterNews()">
            <option value="all">全部名人</option>
          </select>
          <select id="platformFilter" onchange="filterNews()">
            <option value="all">全部平台</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
            <option value="News">新聞</option>
          </select>
        </div>
        <div id="newsGrid" class="news-grid">
          <div class="loading">載入中...</div>
        </div>
      </div>
    </div>

    <!-- TAB 3: 評分 (FEEDBACK - SIMPLIFIED) -->
    <div id="feedback" class="tab-content">
      <div class="flashcard-container">
        <div class="flashcard">
          <div class="flashcard-meta">
            <div class="meta-item">
              <div class="meta-label">平台</div>
              <div class="meta-value" id="post-platform">-</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">名人</div>
              <div class="meta-value" id="post-celebrity">-</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">日期</div>
              <div class="meta-value" id="post-date">-</div>
            </div>
          </div>

          <div class="flashcard-content" id="post-content">
            點擊「下一則」開始審核貼文...
          </div>

          <!-- Hidden field for post ID (needed for backend) -->
          <input type="hidden" id="post-id" value="-">
        </div>

        <div class="feedback-buttons">
          <button class="btn-good" onclick="submitFeedback('Good', this)">
            <span class="btn-icon">👍</span>
            <span>好評</span>
          </button>
          <button class="btn-bad" onclick="submitFeedback('Bad', this)">
            <span class="btn-icon">👎</span>
            <span>負評</span>
          </button>
          <button class="btn-skip" onclick="submitFeedback('Skip', this)">
            <span class="btn-icon">➡️</span>
            <span>跳過</span>
          </button>
        </div>

        <textarea class="reason-input" id="badReason"
          placeholder="如果選擇「負評」，請說明原因（例如：諷刺未被識別、垃圾訊息、重複內容、不相關）..."></textarea>

        <div class="nav-buttons">
          <button class="nav-btn" onclick="loadPrevPost()">← 上一則</button>
          <button class="nav-btn" onclick="loadNextPost()">下一則 →</button>
        </div>

        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill" style="width: 0%"></div>
          </div>
          <div class="progress-text">
            已審核 <span id="reviewCount">0</span> / <span id="totalCount">0</span> 則
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: 分析 (ANALYTICS) -->
    <div id="analytics" class="tab-content">
      <div id="alertsContainer"></div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">模型準確度</div>
          <div class="metric-value" id="accuracy">-</div>
          <div class="metric-trend" id="accuracyTrend">-</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">訓練資料</div>
          <div class="metric-value" id="trainingData">-</div>
          <div class="metric-trend">已標記的貼文數</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">好評比例</div>
          <div class="metric-value" id="goodRatio">-</div>
          <div class="metric-trend">資料品質指標</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">上次執行</div>
          <div class="metric-value" id="lastRun">-</div>
          <div class="metric-trend" id="lastRunStatus">-</div>
        </div>
      </div>
    </div>

    <!-- TAB 5: 來源評分 (SOURCE RATING) -->
    <div id="sources" class="tab-content">
      <div class="sources-container">
        <div class="sources-header">
          <h2>🎯 來源評分</h2>
          <p class="sources-subtitle">為各個來源設定重要性分數 (1-5 星)，系統會自動記住您的設定</p>
        </div>
        <div class="sources-filters">
          <select id="sourcePlatformFilter" onchange="filterSources()">
            <option value="all">全部平台</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
            <option value="News">新聞</option>
          </select>
          <select id="sourceTypeFilter" onchange="filterSources()">
            <option value="all">全部類型</option>
            <option value="官方">官方帳號</option>
            <option value="粉絲">粉絲帳號</option>
            <option value="媒體">媒體</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div id="sourcesGrid" class="sources-grid">
          <div class="loading">載入中...</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // ==========================================
    // GLOBAL STATE WITH CACHING
    // ==========================================
    let currentPostIndex = 0;
    let posts = [];
    let currentTab = 'rankings';

    // Unified data cache - loaded once, used everywhere
    let dataCache = {
      results: [],
      news: { posts: [], celebrities: [] },
      sources: [],
      analytics: null,
      progress: { reviewed: 0, total: 0 },
      timestamp: 0,
      loaded: false
    };
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Batch queues for reducing API calls
    let feedbackBatch = [];
    let pendingSourceRatings = {};

    // Legacy aliases for compatibility
    let allNewsData = [];
    let allSourcesData = [];

    // XSS Prevention - escape HTML in user content
    function escapeHtml(text) {
      if (text === null || text === undefined) return '';
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    }

    // ==========================================
    // UTILITY HELPERS
    // ==========================================
    function debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    function isCacheValid() {
      return dataCache.loaded && (Date.now() - dataCache.timestamp < CACHE_TTL);
    }

    function showGlobalLoading(show) {
      document.getElementById('lastUpdate').textContent = show ? '載入中...' : new Date().toLocaleString('zh-TW');
    }

    // ==========================================
    // PRELOADING - Single API call loads ALL data
    // ==========================================
    function preloadAllData() {
      showGlobalLoading(true);
      google.script.run
        .withSuccessHandler(function(data) {
          // Store everything in cache
          dataCache = {
            results: data.results || [],
            news: data.news || { posts: [], celebrities: [] },
            sources: data.sources || [],
            analytics: data.analytics || null,
            progress: data.progress || { reviewed: 0, total: 0 },
            timestamp: Date.now(),
            loaded: true
          };

          // Update legacy aliases
          allNewsData = dataCache.news.posts;
          allSourcesData = dataCache.sources;
          posts = data.feedback ? data.feedback.posts || [] : [];

          showGlobalLoading(false);
          renderCurrentTab();
        })
        .withFailureHandler(function(error) {
          showGlobalLoading(false);
          console.error('Preload failed:', error);
          // Fallback to individual loads
          loadRankings();
        })
        .getAllDashboardData();
    }

    function renderCurrentTab() {
      renderTab(currentTab);
    }

    // ==========================================
    // TAB SWITCHING - Uses cached data (instant!)
    // ==========================================
    function switchTab(tabName) {
      // Flush pending saves when switching tabs
      flushPendingFeedback();
      flushPendingSourceRatings();

      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

      document.getElementById(tabName).classList.add('active');
      event.target.classList.add('active');
      currentTab = tabName;

      // Use cached data - instant render, no API calls!
      if (isCacheValid()) {
        renderTab(tabName);
      } else {
        preloadAllData();
      }
    }

    function renderTab(tabName) {
      if (tabName === 'rankings') renderRankings(dataCache.results);
      if (tabName === 'news') renderNewsFromCache();
      if (tabName === 'feedback') renderFeedbackFromCache();
      if (tabName === 'sources') renderSourcesFromCache();
      if (tabName === 'analytics') renderAnalytics(dataCache.analytics);
    }

    // ==========================================
    // TAB 1: 排名 (Rankings)
    // ==========================================
    function renderRankings(results) {
      const tbody = document.getElementById('rankingsBody');

      if (!results || results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><h3>尚無排名資料</h3><p>請執行資料擷取流程</p></td></tr>';
        return;
      }

      tbody.innerHTML = results.map(r => {
        const rankClass = r.rank <= 3 ? 'rank-' + r.rank : '';
        const trend = r.trend || '→ 持平';
        const trendClass = trend.includes('↑') ? 'up' : trend.includes('↓') ? 'down' : 'stable';
        const trendText = trend.includes('↑') ? '↑ 上升' : trend.includes('↓') ? '↓ 下降' : '→ 持平';

        return \`
          <tr>
            <td><span class="rank \${rankClass}">#\${escapeHtml(r.rank)}</span></td>
            <td class="celebrity-name">\${escapeHtml(r.celebrity)}</td>
            <td class="score">\${typeof r.score === 'number' ? r.score.toFixed(2) : escapeHtml(r.score)}</td>
            <td><span class="confidence">\${escapeHtml(r.confidence)}%</span></td>
            <td class="trend \${trendClass}">\${escapeHtml(trendText)}</td>
          </tr>
        \`;
      }).join('');
    }

    // Fallback loader (used if preload fails)
    function loadRankings() {
      google.script.run
        .withSuccessHandler(function(results) {
          dataCache.results = results || [];
          renderRankings(dataCache.results);
        })
        .withFailureHandler(function(error) {
          document.getElementById('rankingsBody').innerHTML =
            '<tr><td colspan="5" class="empty-state"><h3>載入失敗</h3><p>' + escapeHtml(error.message) + '</p></td></tr>';
        })
        .getResults();
    }

    // ==========================================
    // TAB 2: 最新動態 (News View)
    // ==========================================
    function renderNewsFromCache() {
      allNewsData = dataCache.news.posts || [];
      populateCelebrityFilter(dataCache.news.celebrities || []);
      renderNewsCards(allNewsData);
    }

    // Fallback loader
    function loadNewsData() {
      document.getElementById('newsGrid').innerHTML = '<div class="loading">載入中...</div>';

      google.script.run
        .withSuccessHandler(function(data) {
          dataCache.news = data;
          allNewsData = data.posts || [];
          populateCelebrityFilter(data.celebrities || []);
          renderNewsCards(allNewsData);
        })
        .withFailureHandler(function(error) {
          document.getElementById('newsGrid').innerHTML =
            '<div class="empty-state"><h3>載入失敗</h3><p>' + escapeHtml(error.message) + '</p></div>';
        })
        .getNewsData();
    }

    function populateCelebrityFilter(celebrities) {
      const select = document.getElementById('celebrityFilter');
      select.innerHTML = '<option value="all">全部名人</option>';
      celebrities.forEach(c => {
        select.innerHTML += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>';
      });
    }

    function filterNews() {
      const celebrity = document.getElementById('celebrityFilter').value;
      const platform = document.getElementById('platformFilter').value;

      let filtered = allNewsData;

      if (celebrity !== 'all') {
        filtered = filtered.filter(p => p.celebrity === celebrity);
      }
      if (platform !== 'all') {
        filtered = filtered.filter(p => p.platform === platform);
      }

      renderNewsCards(filtered);
    }

    function renderNewsCards(posts) {
      const grid = document.getElementById('newsGrid');

      if (!posts || posts.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>目前無最新動態</h3><p>請稍後再查看</p></div>';
        return;
      }

      // Group by celebrity
      const grouped = {};
      posts.forEach(post => {
        if (!grouped[post.celebrity]) {
          grouped[post.celebrity] = [];
        }
        grouped[post.celebrity].push(post);
      });

      let html = '';

      Object.keys(grouped).forEach(celebrity => {
        html += '<div class="news-celebrity-group">';
        html += '<div class="news-celebrity-group-header">🎤 ' + escapeHtml(celebrity) + '</div>';
        html += '<div class="news-grid">';

        grouped[celebrity].slice(0, 6).forEach(post => {
          const platformClass = post.platform.toLowerCase().replace(' ', '');

          html += \`
            <div class="news-card">
              <div class="news-card-header">
                <span class="news-celebrity-name">\${escapeHtml(post.celebrity)}</span>
                <span class="news-platform-badge \${platformClass}">\${escapeHtml(post.platform)}</span>
              </div>
              <div class="news-content">\${escapeHtml(post.content)}</div>
              <div class="news-card-footer">
                <span>📅 \${escapeHtml(post.date)}</span>
                <a href="\${post.url}" target="_blank" class="news-link">查看原文 →</a>
              </div>
            </div>
          \`;
        });

        html += '</div></div>';
      });

      grid.innerHTML = html;
    }

    // ==========================================
    // TAB 3: 評分 (Feedback - Optimized with batching)
    // ==========================================
    function renderFeedbackFromCache() {
      updateProgress(dataCache.progress);
      if (posts.length > 0) {
        displayPost(0);
      } else {
        document.getElementById('post-content').textContent = '已審核完畢！🎉 感謝您的協助！';
      }
    }

    // Fallback loader
    function loadFeedbackData() {
      google.script.run
        .withSuccessHandler(function(data) {
          posts = data.posts || [];
          dataCache.progress = data.progress || { reviewed: 0, total: 0 };
          updateProgress(dataCache.progress);
          if (posts.length > 0) {
            displayPost(0);
          } else {
            document.getElementById('post-content').textContent = '已審核完畢！🎉 感謝您的協助！';
          }
        })
        .getFeedbackData();
    }

    function displayPost(index) {
      if (index < 0 || index >= posts.length) return;

      currentPostIndex = index;
      const post = posts[index];

      document.getElementById('post-platform').textContent = post.platform || '-';
      document.getElementById('post-celebrity').textContent = post.celebrity || '-';
      document.getElementById('post-date').textContent = post.date || '-';
      document.getElementById('post-id').value = post.id || '-';
      document.getElementById('post-content').textContent = post.content || '-';
      document.getElementById('badReason').value = '';
    }

    function loadNextPost() {
      if (currentPostIndex < posts.length - 1) {
        displayPost(currentPostIndex + 1);
      } else {
        // Flush any pending feedback before refreshing
        flushPendingFeedback();
        loadFeedbackData();
      }
    }

    function loadPrevPost() {
      if (currentPostIndex > 0) {
        displayPost(currentPostIndex - 1);
      }
    }

    // Feedback with clear loading indicator
    function submitFeedback(feedback, clickedBtn) {
      const postId = document.getElementById('post-id').value;
      const reason = feedback === 'Bad' ? document.getElementById('badReason').value : '';

      if (postId === '-') {
        alert('請先選擇貼文');
        return;
      }

      // === STEP 1: IMMEDIATE - Show loading spinner ===
      const buttons = document.querySelectorAll('.feedback-buttons button');
      buttons.forEach(btn => btn.disabled = true);
      clickedBtn.classList.add('is-loading');

      // Add to batch queue (background save)
      feedbackBatch.push({ postId, feedback, reason });

      // Update progress counter locally
      dataCache.progress.reviewed++;
      updateProgress(dataCache.progress);

      // Remove from local posts array
      posts.splice(currentPostIndex, 1);

      // === STEP 2: After 300ms - Show success checkmark ===
      setTimeout(function() {
        clickedBtn.classList.remove('is-loading');
        clickedBtn.classList.add('is-success');
      }, 300);

      // === STEP 3: After 600ms - Move to next post ===
      setTimeout(function() {
        clickedBtn.classList.remove('is-success');
        buttons.forEach(btn => btn.disabled = false);

        if (posts.length > 0) {
          displayPost(Math.min(currentPostIndex, posts.length - 1));
        } else {
          document.getElementById('post-content').textContent = '已審核完畢！🎉 感謝您的協助！';
        }
      }, 600);

      // Batch save in background
      if (feedbackBatch.length >= 5) {
        flushPendingFeedback();
      } else {
        debouncedFlushFeedback();
      }
    }

    // Debounced flush - saves after 3s of inactivity
    const debouncedFlushFeedback = debounce(flushPendingFeedback, 3000);

    function flushPendingFeedback() {
      if (feedbackBatch.length === 0) return;

      const batch = [...feedbackBatch];
      feedbackBatch = [];

      google.script.run
        .withSuccessHandler(function() {
          console.log('Batch saved:', batch.length, 'items');
        })
        .withFailureHandler(function(error) {
          console.error('Batch save failed:', error);
          // Re-add failed items for retry
          feedbackBatch = batch.concat(feedbackBatch);
        })
        .saveFeedbackBatch(batch);
    }

    function updateProgress(progress) {
      if (!progress) return;
      document.getElementById('reviewCount').textContent = progress.reviewed || 0;
      document.getElementById('totalCount').textContent = progress.total || 0;
      const pct = progress.total > 0 ? (progress.reviewed / progress.total * 100) : 0;
      document.getElementById('progressFill').style.width = pct + '%';
    }

    // ==========================================
    // TAB 4: 分析 (Analytics)
    // ==========================================
    function renderAnalytics(analytics) {
      if (!analytics) {
        document.getElementById('accuracy').textContent = '-';
        return;
      }

      document.getElementById('accuracy').textContent = (analytics.accuracy || 0) + '%';
      document.getElementById('accuracyTrend').textContent = analytics.accuracyTrend || '-';
      document.getElementById('trainingData').textContent = analytics.trainingData || 0;
      document.getElementById('goodRatio').textContent = (analytics.goodRatio || 0) + '%';
      document.getElementById('lastRun').textContent = analytics.lastRun || '-';
      document.getElementById('lastRunStatus').textContent = analytics.lastRunStatus || '-';

      // Show alerts in Chinese
      const alertsContainer = document.getElementById('alertsContainer');
      alertsContainer.innerHTML = '';

      if (analytics.accuracy < 85) {
        alertsContainer.innerHTML += \`
          <div class="alert danger">
            ⚠️ 模型準確度 (\${analytics.accuracy}%) 低於門檻值 (85%)。建議收集更多評分資料。
          </div>
        \`;
      }

      if (analytics.goodRatio < 75) {
        alertsContainer.innerHTML += \`
          <div class="alert warning">
            ⚠️ 好評比例 (\${analytics.goodRatio}%) 低於 75%。請檢查資料品質。
          </div>
        \`;
      }

      if (analytics.accuracy >= 90) {
        alertsContainer.innerHTML += \`
          <div class="alert success">
            ✓ 模型準確度優異 (\${analytics.accuracy}%)。系統運作正常。
          </div>
        \`;
      }
    }

    // Fallback loader
    function loadAnalytics() {
      google.script.run
        .withSuccessHandler(function(analytics) {
          dataCache.analytics = analytics;
          renderAnalytics(analytics);
        })
        .withFailureHandler(function(error) {
          console.error('載入分析資料失敗:', error);
        })
        .getAnalytics();
    }

    // ==========================================
    // TAB 5: 來源評分 (Source Rating - Optimized)
    // ==========================================
    function renderSourcesFromCache() {
      allSourcesData = dataCache.sources || [];
      renderSourceCards(allSourcesData);
    }

    // Fallback loader
    function loadSourcesData() {
      document.getElementById('sourcesGrid').innerHTML = '<div class="loading">載入中...</div>';

      google.script.run
        .withSuccessHandler(function(data) {
          dataCache.sources = data || [];
          allSourcesData = dataCache.sources;
          renderSourceCards(allSourcesData);
        })
        .withFailureHandler(function(error) {
          document.getElementById('sourcesGrid').innerHTML =
            '<div class="empty-state"><h3>載入失敗</h3><p>' + escapeHtml(error.message) + '</p></div>';
        })
        .getSourcesData();
    }

    function filterSources() {
      const platform = document.getElementById('sourcePlatformFilter').value;
      const type = document.getElementById('sourceTypeFilter').value;

      let filtered = allSourcesData;

      if (platform !== 'all') {
        filtered = filtered.filter(s => s.platform === platform);
      }
      if (type !== 'all') {
        filtered = filtered.filter(s => s.sourceType === type);
      }

      renderSourceCards(filtered);
    }

    function renderSourceCards(sources) {
      const grid = document.getElementById('sourcesGrid');

      if (!sources || sources.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>目前無來源資料</h3><p>資料擷取後會自動新增來源</p></div>';
        return;
      }

      let html = '';

      sources.forEach((source, idx) => {
        const typeClass = source.sourceType === '官方' ? 'official' :
                          source.sourceType === '粉絲' ? 'fan' :
                          source.sourceType === '媒體' ? 'media' : '';

        const rating = source.rating || 3;
        const stars = renderStars(rating, idx);

        html += \`
          <div class="source-card" id="source-card-\${idx}">
            <div class="source-card-header">
              <span class="source-name">\${escapeHtml(source.name)}</span>
              <span class="source-type-badge \${typeClass}">\${escapeHtml(source.sourceType)}</span>
            </div>
            <div class="source-platform">📱 \${escapeHtml(source.platform)}</div>
            <div class="source-rating" id="rating-\${idx}">
              \${stars}
              <span class="source-save-indicator" id="save-indicator-\${idx}">✓ 已儲存</span>
            </div>
            <div class="source-meta">
              評分者：\${escapeHtml(source.ratedBy || 'auto')} |
              更新：\${escapeHtml(source.lastModified || '-')}
            </div>
          </div>
        \`;
      });

      grid.innerHTML = html;

      // Add hover effects for stars
      sources.forEach((source, idx) => {
        const starBtns = document.querySelectorAll('#rating-' + idx + ' .star-btn');
        starBtns.forEach((btn, starIdx) => {
          btn.addEventListener('mouseenter', function() {
            highlightStars(idx, starIdx + 1);
          });
          btn.addEventListener('mouseleave', function() {
            resetStars(idx, source.rating || 3);
          });
        });
      });
    }

    function renderStars(rating, idx) {
      let html = '';
      for (let i = 1; i <= 5; i++) {
        const activeClass = i <= rating ? 'active' : '';
        html += \`<button class="star-btn \${activeClass}" onclick="rateSource(\${idx}, \${i})">★</button>\`;
      }
      return html;
    }

    function highlightStars(idx, hoverRating) {
      const starBtns = document.querySelectorAll('#rating-' + idx + ' .star-btn');
      starBtns.forEach((btn, i) => {
        btn.classList.remove('active', 'hover');
        if (i < hoverRating) {
          btn.classList.add('hover');
        }
      });
    }

    function resetStars(idx, rating) {
      const starBtns = document.querySelectorAll('#rating-' + idx + ' .star-btn');
      starBtns.forEach((btn, i) => {
        btn.classList.remove('hover');
        if (i < rating) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // OPTIMIZED: Debounced batch rating - collects ratings and saves in batch
    function rateSource(idx, rating) {
      const source = allSourcesData[idx];
      if (!source) return;

      // Update local state immediately
      source.rating = rating;
      resetStars(idx, rating);

      // Show pending indicator
      const indicator = document.getElementById('save-indicator-' + idx);
      indicator.textContent = '待儲存...';
      indicator.classList.add('show');

      // Add to pending batch (keyed to prevent duplicates)
      pendingSourceRatings[\`\${source.name}|\${source.platform}\`] = {
        name: source.name,
        platform: source.platform,
        rating: rating,
        idx: idx
      };

      // Debounce: save after 2s of inactivity
      debouncedFlushSourceRatings();
    }

    // Debounced flush for source ratings
    const debouncedFlushSourceRatings = debounce(flushPendingSourceRatings, 2000);

    function flushPendingSourceRatings() {
      const ratings = Object.values(pendingSourceRatings);
      if (ratings.length === 0) return;

      // Clear pending
      const toSave = [...ratings];
      pendingSourceRatings = {};

      // Update indicators to "saving"
      toSave.forEach(r => {
        const indicator = document.getElementById('save-indicator-' + r.idx);
        if (indicator) indicator.textContent = '儲存中...';
      });

      google.script.run
        .withSuccessHandler(function() {
          toSave.forEach(r => {
            const indicator = document.getElementById('save-indicator-' + r.idx);
            if (indicator) {
              indicator.textContent = '✓ 已儲存';
              setTimeout(() => indicator.classList.remove('show'), 2000);
            }

            // Update meta
            const source = allSourcesData[r.idx];
            if (source) {
              source.ratedBy = 'user';
              source.lastModified = new Date().toLocaleDateString('zh-TW');
              const card = document.getElementById('source-card-' + r.idx);
              if (card) {
                const meta = card.querySelector('.source-meta');
                if (meta) meta.innerHTML = \`評分者：user | 更新：\${source.lastModified}\`;
              }
            }
          });
          console.log('Batch saved:', toSave.length, 'source ratings');
        })
        .withFailureHandler(function(error) {
          toSave.forEach(r => {
            const indicator = document.getElementById('save-indicator-' + r.idx);
            if (indicator) {
              indicator.textContent = '❌ 儲存失敗';
              setTimeout(() => indicator.classList.remove('show'), 3000);
            }
          });
          console.error('Batch source rating save failed:', error);
          // Re-add failed items
          toSave.forEach(r => {
            pendingSourceRatings[\`\${r.name}|\${r.platform}\`] = r;
          });
        })
        .saveSourceRatingsBatch(toSave);
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================
    document.addEventListener('DOMContentLoaded', function() {
      // Load ALL data in one API call - then all tabs are instant!
      preloadAllData();
    });

    // Save pending data before user leaves
    window.addEventListener('beforeunload', function() {
      flushPendingFeedback();
      flushPendingSourceRatings();
    });
  </script>
</body>
</html>
  `;
}

// =====================================================
// DATA FUNCTIONS FOR DASHBOARD
// =====================================================

/**
 * Get results for Rankings tab (Tab 1)
 * @returns {Array} Array of ranking objects
 */
function getResults() {
  try {
    const resultsSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Results");

    if (!resultsSheet) {
      return [];
    }

    const data = resultsSheet.getDataRange().getValues();

    if (data.length <= 1) {
      return [];
    }

    return data.slice(1).map((row) => ({
      rank: row[0] || 0,
      celebrity: row[1] || "",
      score: row[5] || 0,  // Weighted_Popularity_Score
      confidence: row[6] || 0,  // Confidence_Score
      // endorsement removed - not needed
      trend: row[9] || "→ Stable"  // Trend_Direction
    })).filter(r => r.celebrity);

  } catch (e) {
    Logger.log(`Error in getResults: ${e.message}`);
    return [];
  }
}

/**
 * Get news data for News View tab (Tab 2) - NEW
 * @returns {Object} Object with posts array and celebrities list
 */
function getNewsData() {
  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Raw Data");

    if (!rawSheet) {
      return { posts: [], celebrities: [] };
    }

    const data = rawSheet.getDataRange().getValues();
    const posts = [];
    const celebritiesSet = new Set();

    // Get last 7 days of data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (let i = 1; i < data.length; i++) {
      const timestamp = new Date(data[i][0]);
      const celebrity = data[i][1] || "";

      if (celebrity) {
        celebritiesSet.add(celebrity);
      }

      // Include all recent posts
      if (timestamp >= sevenDaysAgo || isNaN(timestamp.getTime())) {
        posts.push({
          celebrity: celebrity,
          platform: data[i][2] || "",
          content: truncateContent(data[i][4] || "", 200),
          date: data[i][7] ? formatDate(data[i][7]) : formatDate(data[i][0]),
          url: data[i][6] || "#"
        });
      }
    }

    // Sort by date descending (most recent first)
    posts.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

    return {
      posts: posts.slice(0, 100), // Limit to 100 posts
      celebrities: Array.from(celebritiesSet).sort()
    };

  } catch (e) {
    Logger.log(`Error in getNewsData: ${e.message}`);
    return { posts: [], celebrities: [] };
  }
}

/**
 * Truncate content to specified length with ellipsis
 */
function truncateContent(text, maxLength) {
  if (!text) return "";
  text = String(text);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Format date to Taiwan locale
 */
function formatDate(dateValue) {
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString('zh-TW');
  } catch (e) {
    return "-";
  }
}

/**
 * Get feedback data for Feedback Loop tab (Tab 3)
 * @returns {Object} Object with posts array and progress
 */
function getFeedbackData() {
  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Raw Data");

    if (!rawSheet) {
      return { posts: [], progress: { reviewed: 0, total: 0 } };
    }

    const data = rawSheet.getDataRange().getValues();

    const unreviewedPosts = [];
    let reviewed = 0;
    let total = data.length - 1;

    for (let i = 1; i < data.length; i++) {
      const feedback = data[i][9]; // Feedback column (J)

      if (feedback && feedback !== '') {
        reviewed++;
      } else {
        // Unreviewed post
        unreviewedPosts.push({
          id: i,
          platform: data[i][2] || "",
          celebrity: data[i][1] || "",
          date: data[i][7] ? formatDate(data[i][7]) : formatDate(data[i][0]),
          content: data[i][4] || ""
        });
      }
    }

    return {
      posts: unreviewedPosts.slice(0, 50), // Limit to 50 at a time
      progress: { reviewed: reviewed, total: total }
    };

  } catch (e) {
    Logger.log(`Error in getFeedbackData: ${e.message}`);
    return { posts: [], progress: { reviewed: 0, total: 0 } };
  }
}

/**
 * Save feedback for a post
 * @param {number} postId - Row number in Raw Data sheet
 * @param {string} feedback - Good, Bad, or Skip
 * @param {string} reason - Reason for Bad feedback
 */
function saveFeedback(postId, feedback, reason) {
  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Raw Data");

    if (!rawSheet) {
      throw new Error("Raw Data 工作表找不到");
    }

    // Validate row index to prevent data corruption
    const rowNum = parseInt(postId);
    if (isNaN(rowNum) || rowNum < 1) {
      throw new Error(`無效的貼文編號: ${postId}`);
    }

    const sheetRowNum = rowNum + 1; // +1 for header row
    const maxRows = rawSheet.getLastRow();

    if (sheetRowNum > maxRows) {
      throw new Error(`貼文編號 ${rowNum} 超出範圍`);
    }

    // Validate feedback value
    const validFeedback = ['Good', 'Bad', 'Skip'];
    if (!validFeedback.includes(feedback)) {
      throw new Error(`無效的評分: ${feedback}`);
    }

    // Sanitize reason (limit length)
    const sanitizedReason = String(reason || '').substring(0, 500);

    rawSheet.getRange(sheetRowNum, 10).setValue(feedback);  // Column J: Feedback
    rawSheet.getRange(sheetRowNum, 11).setValue(sanitizedReason);    // Column K: Feedback_Notes

    Logger.log(`Saved feedback for row ${sheetRowNum}: ${feedback}`);

    return { success: true };

  } catch (e) {
    Logger.log(`Error in saveFeedback: ${e.message}`);
    throw e;
  }
}

/**
 * Get progress statistics
 * @returns {Object} Progress object with reviewed and total counts
 */
function getProgress() {
  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Raw Data");

    if (!rawSheet) {
      return { reviewed: 0, total: 0 };
    }

    const data = rawSheet.getDataRange().getValues();
    let reviewed = 0;
    let total = data.length - 1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][9] && data[i][9] !== '') {
        reviewed++;
      }
    }

    return { reviewed: reviewed, total: total };

  } catch (e) {
    Logger.log(`Error in getProgress: ${e.message}`);
    return { reviewed: 0, total: 0 };
  }
}

/**
 * Get analytics for Model Analytics tab (Tab 4)
 * @returns {Object} Analytics object
 */
function getAnalytics() {
  try {
    const metricsSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Model Metrics");
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Raw Data");

    let accuracy = 0;
    let lastRun = "-";
    let lastRunStatus = "-";

    if (metricsSheet) {
      const metricsData = metricsSheet.getDataRange().getValues();
      if (metricsData.length > 1) {
        const latestRow = metricsData[metricsData.length - 1];
        accuracy = parseFloat(String(latestRow[6]).replace('%', '')) || 0;
        lastRun = latestRow[0] ? new Date(latestRow[0]).toLocaleDateString('zh-TW') : "-";
        lastRunStatus = latestRow[13] === "SUCCESS" ? "✓ 成功" :
                        latestRow[13] === "WARNING" ? "⚠️ 警告" :
                        latestRow[13] || "-";
      }
    }

    let goodCount = 0;
    let badCount = 0;
    let totalWithFeedback = 0;

    if (rawSheet) {
      const rawData = rawSheet.getDataRange().getValues();
      for (let i = 1; i < rawData.length; i++) {
        const feedback = rawData[i][9];
        if (feedback === "Good") {
          goodCount++;
          totalWithFeedback++;
        } else if (feedback === "Bad") {
          badCount++;
          totalWithFeedback++;
        }
      }
    }

    const goodRatio = totalWithFeedback > 0 ? Math.round((goodCount / totalWithFeedback) * 100) : 0;

    return {
      accuracy: accuracy,
      accuracyTrend: accuracy >= 85 ? "✓ 表現良好" : "⚠️ 需要改善",
      trainingData: totalWithFeedback,
      goodRatio: goodRatio,
      lastRun: lastRun,
      lastRunStatus: lastRunStatus
    };

  } catch (e) {
    Logger.log(`Error in getAnalytics: ${e.message}`);
    return {
      accuracy: 0,
      accuracyTrend: "-",
      trainingData: 0,
      goodRatio: 0,
      lastRun: "-",
      lastRunStatus: "-"
    };
  }
}

/**
 * Get sources data for Source Rating tab (Tab 5)
 * @returns {Array} Array of source objects
 */
function getSourcesData() {
  try {
    const sourceConfigSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Source Config");

    if (!sourceConfigSheet) {
      return [];
    }

    const data = sourceConfigSheet.getDataRange().getValues();

    if (data.length <= 1) {
      return [];
    }

    // Headers: Source_Name, Source_Type, Platform, Importance_Score, Rated_By, Last_Modified
    return data.slice(1).map((row) => ({
      name: row[0] || "",
      sourceType: row[1] || "其他",
      platform: row[2] || "",
      rating: parseInt(row[3]) || 3,
      ratedBy: row[4] || "auto",
      lastModified: row[5] ? formatDate(row[5]) : "-"
    })).filter(s => s.name);

  } catch (e) {
    Logger.log(`Error in getSourcesData: ${e.message}`);
    return [];
  }
}

/**
 * Save source rating
 * @param {string} sourceName - Source name (e.g., @JJLin)
 * @param {string} platform - Platform (e.g., Instagram)
 * @param {number} rating - Rating 1-5
 */
function saveSourceRating(sourceName, platform, rating) {
  try {
    const sourceConfigSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Source Config");

    if (!sourceConfigSheet) {
      throw new Error("Source Config 工作表找不到");
    }

    // Validate rating
    const numRating = parseInt(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new Error(`無效的評分: ${rating}`);
    }

    // Sanitize inputs
    const sanitizedName = String(sourceName || '').substring(0, 200);
    const sanitizedPlatform = String(platform || '').substring(0, 50);

    if (!sanitizedName || !sanitizedPlatform) {
      throw new Error("來源名稱或平台不能為空");
    }

    const data = sourceConfigSheet.getDataRange().getValues();

    // Find the row with matching source name and platform
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sanitizedName && data[i][2] === sanitizedPlatform) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`找不到來源: ${sanitizedName} (${sanitizedPlatform})`);
    }

    // Get current user email
    let userEmail = "user";
    try {
      userEmail = Session.getActiveUser().getEmail() || "user";
    } catch (e) {
      // User email not available
    }

    // Update the row
    sourceConfigSheet.getRange(rowIndex, 4).setValue(numRating);           // Importance_Score
    sourceConfigSheet.getRange(rowIndex, 5).setValue(userEmail);           // Rated_By
    sourceConfigSheet.getRange(rowIndex, 6).setValue(new Date());          // Last_Modified

    Logger.log(`Saved rating for ${sanitizedName} (${sanitizedPlatform}): ${numRating} by ${userEmail}`);

    return { success: true };

  } catch (e) {
    Logger.log(`Error in saveSourceRating: ${e.message}`);
    throw e;
  }
}

// =====================================================
// OPTIMIZED DATA FUNCTIONS - Single API call preloader
// =====================================================

/**
 * Get ALL dashboard data in one API call
 * This dramatically reduces API calls from ~6 to 1 on page load
 * @returns {Object} All dashboard data bundled together
 */
function getAllDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(DASHBOARD_SHEET_ID);

    // Single spreadsheet open - read all sheets once
    const resultsSheet = ss.getSheetByName("Results");
    const rawSheet = ss.getSheetByName("Raw Data");
    const sourceSheet = ss.getSheetByName("Source Config");
    const metricsSheet = ss.getSheetByName("Model Metrics");

    // Get raw data once - reused for news, feedback, analytics, progress
    const rawData = rawSheet ? rawSheet.getDataRange().getValues() : [];

    return {
      results: getResultsFromSheet(resultsSheet),
      news: getNewsFromRawData(rawData),
      feedback: getFeedbackFromRawData(rawData),
      sources: getSourcesFromSheet(sourceSheet),
      analytics: getAnalyticsFromData(metricsSheet, rawData),
      progress: getProgressFromRawData(rawData)
    };

  } catch (e) {
    Logger.log(`Error in getAllDashboardData: ${e.message}`);
    return {
      results: [],
      news: { posts: [], celebrities: [] },
      feedback: { posts: [] },
      sources: [],
      analytics: null,
      progress: { reviewed: 0, total: 0 }
    };
  }
}

/**
 * Helper: Extract results from Results sheet
 */
function getResultsFromSheet(resultsSheet) {
  if (!resultsSheet) return [];

  const data = resultsSheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map((row) => ({
    rank: row[0] || 0,
    celebrity: row[1] || "",
    score: row[5] || 0,
    confidence: row[6] || 0,
    trend: row[9] || "→ Stable"
  })).filter(r => r.celebrity);
}

/**
 * Helper: Extract news data from raw data array
 */
function getNewsFromRawData(rawData) {
  const posts = [];
  const celebritiesSet = new Set();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (let i = 1; i < rawData.length; i++) {
    const timestamp = new Date(rawData[i][0]);
    const celebrity = rawData[i][1] || "";

    if (celebrity) {
      celebritiesSet.add(celebrity);
    }

    if (timestamp >= sevenDaysAgo || isNaN(timestamp.getTime())) {
      posts.push({
        celebrity: celebrity,
        platform: rawData[i][2] || "",
        content: truncateContent(rawData[i][4] || "", 200),
        date: rawData[i][7] ? formatDate(rawData[i][7]) : formatDate(rawData[i][0]),
        url: rawData[i][6] || "#"
      });
    }
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    posts: posts.slice(0, 100),
    celebrities: Array.from(celebritiesSet).sort()
  };
}

/**
 * Helper: Extract feedback data from raw data array
 */
function getFeedbackFromRawData(rawData) {
  const unreviewedPosts = [];

  for (let i = 1; i < rawData.length; i++) {
    const feedback = rawData[i][9];

    if (!feedback || feedback === '') {
      unreviewedPosts.push({
        id: i,
        platform: rawData[i][2] || "",
        celebrity: rawData[i][1] || "",
        date: rawData[i][7] ? formatDate(rawData[i][7]) : formatDate(rawData[i][0]),
        content: rawData[i][4] || ""
      });
    }
  }

  return {
    posts: unreviewedPosts.slice(0, 50)
  };
}

/**
 * Helper: Extract progress from raw data array
 */
function getProgressFromRawData(rawData) {
  let reviewed = 0;
  const total = rawData.length - 1;

  for (let i = 1; i < rawData.length; i++) {
    if (rawData[i][9] && rawData[i][9] !== '') {
      reviewed++;
    }
  }

  return { reviewed, total };
}

/**
 * Helper: Extract sources from Source Config sheet
 */
function getSourcesFromSheet(sourceSheet) {
  if (!sourceSheet) return [];

  const data = sourceSheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map((row) => ({
    name: row[0] || "",
    sourceType: row[1] || "其他",
    platform: row[2] || "",
    rating: parseInt(row[3]) || 3,
    ratedBy: row[4] || "auto",
    lastModified: row[5] ? formatDate(row[5]) : "-"
  })).filter(s => s.name);
}

/**
 * Helper: Extract analytics from metrics sheet and raw data
 */
function getAnalyticsFromData(metricsSheet, rawData) {
  let accuracy = 0;
  let lastRun = "-";
  let lastRunStatus = "-";

  if (metricsSheet) {
    const metricsData = metricsSheet.getDataRange().getValues();
    if (metricsData.length > 1) {
      const latestRow = metricsData[metricsData.length - 1];
      accuracy = parseFloat(String(latestRow[6]).replace('%', '')) || 0;
      lastRun = latestRow[0] ? new Date(latestRow[0]).toLocaleDateString('zh-TW') : "-";
      lastRunStatus = latestRow[13] === "SUCCESS" ? "✓ 成功" :
                      latestRow[13] === "WARNING" ? "⚠️ 警告" :
                      latestRow[13] || "-";
    }
  }

  let goodCount = 0;
  let totalWithFeedback = 0;

  for (let i = 1; i < rawData.length; i++) {
    const feedback = rawData[i][9];
    if (feedback === "Good") {
      goodCount++;
      totalWithFeedback++;
    } else if (feedback === "Bad") {
      totalWithFeedback++;
    }
  }

  const goodRatio = totalWithFeedback > 0 ? Math.round((goodCount / totalWithFeedback) * 100) : 0;

  return {
    accuracy,
    accuracyTrend: accuracy >= 85 ? "✓ 表現良好" : "⚠️ 需要改善",
    trainingData: totalWithFeedback,
    goodRatio,
    lastRun,
    lastRunStatus
  };
}

// =====================================================
// BATCH SAVE FUNCTIONS - Reduces API calls dramatically
// =====================================================

/**
 * Save multiple feedback items in one API call
 * Reduces 50+ individual saves to 10 batch saves
 * @param {Array} items - Array of {postId, feedback, reason}
 */
function saveFeedbackBatch(items) {
  if (!items || items.length === 0) return { success: true, count: 0 };

  try {
    const rawSheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Raw Data");
    if (!rawSheet) throw new Error("Raw Data 工作表找不到");

    // Batch all updates
    items.forEach(item => {
      const rowNum = parseInt(item.postId) + 1;
      if (rowNum > 1) {
        // Update both columns in one setValues call
        rawSheet.getRange(rowNum, 10, 1, 2).setValues([[item.feedback, item.reason || '']]);
      }
    });

    Logger.log(`Batch saved ${items.length} feedback items`);
    return { success: true, count: items.length };

  } catch (e) {
    Logger.log(`Error in saveFeedbackBatch: ${e.message}`);
    throw e;
  }
}

/**
 * Save multiple source ratings in one API call
 * Reduces many individual saves to 1-2 batch saves
 * @param {Array} ratings - Array of {name, platform, rating}
 */
function saveSourceRatingsBatch(ratings) {
  if (!ratings || ratings.length === 0) return { success: true, count: 0 };

  try {
    const sheet = SpreadsheetApp.openById(DASHBOARD_SHEET_ID).getSheetByName("Source Config");
    if (!sheet) throw new Error("Source Config 工作表找不到");

    const data = sheet.getDataRange().getValues();

    // Build lookup map: "name|platform" -> row number
    const sourceMap = {};
    for (let i = 1; i < data.length; i++) {
      sourceMap[`${data[i][0]}|${data[i][2]}`] = i + 1;
    }

    let userEmail = "user";
    try {
      userEmail = Session.getActiveUser().getEmail() || "user";
    } catch (e) {}

    const now = new Date();

    // Update each rating
    ratings.forEach(r => {
      const key = `${r.name}|${r.platform}`;
      const row = sourceMap[key];
      if (row) {
        // Update rating, user, and timestamp in one setValues call
        sheet.getRange(row, 4, 1, 3).setValues([[r.rating, userEmail, now]]);
      }
    });

    Logger.log(`Batch saved ${ratings.length} source ratings`);
    return { success: true, count: ratings.length };

  } catch (e) {
    Logger.log(`Error in saveSourceRatingsBatch: ${e.message}`);
    throw e;
  }
}
