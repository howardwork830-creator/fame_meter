/**
 * Unit tests for orchestrator.gs functions
 *
 * These tests mock Google Apps Script services to test pure logic functions.
 * Run with: npm test
 */

// Mock Google Apps Script globals
const mockSpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(),
  openById: jest.fn()
};

const mockLogger = {
  log: jest.fn()
};

global.SpreadsheetApp = mockSpreadsheetApp;
global.Logger = mockLogger;

// Import functions to test (these would be extracted for testing)
// In production, these are inline in orchestrator.gs

/**
 * Validates Perplexity API response posts
 * Extracted logic from orchestrator.gs for testing
 */
function validatePerplexityResponse(posts, celebrity) {
  const required_fields = ["platform", "account_name", "content", "engagement",
                          "post_timestamp", "post_url"];
  const valid_platforms = ["Instagram", "Facebook", "TikTok", "YouTube", "News"];

  return posts.filter(post => {
    if (!required_fields.every(field => field in post)) {
      return false;
    }

    if (!valid_platforms.includes(post.platform)) {
      return false;
    }

    const engagement = post.engagement.likes || post.engagement.views;
    if (!engagement || engagement <= 0) {
      return false;
    }

    if (!post.post_timestamp.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return false;
    }

    return true;
  });
}

/**
 * Parses post timestamp from various formats
 */
function parsePostTimestamp(timestamp) {
  // Handle ISO 8601 format with timezone
  if (timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    return new Date(timestamp);
  }

  // Handle date-only format
  if (timestamp.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(timestamp + 'T00:00:00+08:00');
  }

  // Return null for invalid formats
  return null;
}

// Tests
describe('validatePerplexityResponse', () => {
  const validPost = {
    platform: 'Instagram',
    account_name: '@test_account',
    content: 'Test post content',
    engagement: { likes: 1000, comments: 50 },
    post_timestamp: '2026-01-30T10:00:00+08:00',
    post_url: 'https://instagram.com/p/test123',
    account_type: 'official'
  };

  test('accepts valid post with all required fields', () => {
    const result = validatePerplexityResponse([validPost], 'Test Celebrity');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(validPost);
  });

  test('rejects post missing required field', () => {
    const invalidPost = { ...validPost };
    delete invalidPost.platform;

    const result = validatePerplexityResponse([invalidPost], 'Test Celebrity');
    expect(result).toHaveLength(0);
  });

  test('rejects post with invalid platform', () => {
    const invalidPost = { ...validPost, platform: 'Twitter' };

    const result = validatePerplexityResponse([invalidPost], 'Test Celebrity');
    expect(result).toHaveLength(0);
  });

  test('accepts post with views instead of likes', () => {
    const videoPost = {
      ...validPost,
      platform: 'TikTok',
      engagement: { views: 50000, likes: 0 }
    };

    const result = validatePerplexityResponse([videoPost], 'Test Celebrity');
    expect(result).toHaveLength(1);
  });

  test('rejects post with zero engagement', () => {
    const noEngagement = {
      ...validPost,
      engagement: { likes: 0, comments: 0 }
    };

    const result = validatePerplexityResponse([noEngagement], 'Test Celebrity');
    expect(result).toHaveLength(0);
  });

  test('rejects post with invalid timestamp format', () => {
    const invalidTimestamp = {
      ...validPost,
      post_timestamp: 'January 30, 2026'
    };

    const result = validatePerplexityResponse([invalidTimestamp], 'Test Celebrity');
    expect(result).toHaveLength(0);
  });

  test('accepts News platform', () => {
    const newsPost = { ...validPost, platform: 'News' };

    const result = validatePerplexityResponse([newsPost], 'Test Celebrity');
    expect(result).toHaveLength(1);
  });

  test('filters multiple posts correctly', () => {
    const validPost2 = { ...validPost, content: 'Second valid post' };
    const invalidPost = { ...validPost, platform: 'Twitter' };

    const result = validatePerplexityResponse(
      [validPost, invalidPost, validPost2],
      'Test Celebrity'
    );
    expect(result).toHaveLength(2);
  });
});

describe('parsePostTimestamp', () => {
  test('parses ISO 8601 format with timezone', () => {
    const result = parsePostTimestamp('2026-01-30T10:00:00+08:00');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2026);
  });

  test('parses ISO 8601 format without timezone', () => {
    const result = parsePostTimestamp('2026-01-30T10:00:00');
    expect(result).toBeInstanceOf(Date);
  });

  test('parses date-only format', () => {
    const result = parsePostTimestamp('2026-01-30');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January = 0
    expect(result.getDate()).toBe(30);
  });

  test('returns null for invalid format', () => {
    const result = parsePostTimestamp('January 30, 2026');
    expect(result).toBeNull();
  });

  test('returns null for empty string', () => {
    const result = parsePostTimestamp('');
    expect(result).toBeNull();
  });
});

// Export for use in other test files
module.exports = {
  validatePerplexityResponse,
  parsePostTimestamp
};
