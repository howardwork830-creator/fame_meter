"""
Unit tests for Kaggle sentiment pipeline functions.

These tests verify the core logic of the sentiment analysis pipeline
without requiring actual API connections or model inference.

Run with: python -m pytest test_sentiment.py -v
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime


# ============================================================================
# Functions extracted from sentiment_pipeline_v4.ipynb for testing
# ============================================================================

def normalize_sentiment_score(score: float) -> float:
    """
    Normalize sentiment score to range [-1, 1].

    Args:
        score: Raw sentiment score

    Returns:
        Normalized score clamped to [-1, 1]
    """
    return max(-1.0, min(1.0, score))


def calculate_trend_direction(current_score: float, previous_score: float) -> str:
    """
    Calculate trend direction based on score change.

    Args:
        current_score: Current weighted popularity score
        previous_score: Previous period's score

    Returns:
        Trend indicator string
    """
    if previous_score is None or previous_score == 0:
        return "-> Stable"

    delta = current_score - previous_score
    delta_percent = (delta / abs(previous_score)) * 100

    if delta_percent > 15:
        return "Fast Rising"
    elif delta_percent > 5:
        return "Rising"
    elif delta_percent < -15:
        return "Fast Falling"
    elif delta_percent < -5:
        return "Falling"
    else:
        return "Stable"


def calculate_endorsement_ready(
    score: float,
    stddev: float,
    confidence_threshold: float = 0.70,
    stddev_max: float = 0.25
) -> bool:
    """
    Determine if celebrity is ready for endorsement.

    Args:
        score: Weighted popularity score
        stddev: Sentiment standard deviation
        confidence_threshold: Minimum score threshold (default 0.70)
        stddev_max: Maximum acceptable volatility (default 0.25)

    Returns:
        True if ready for endorsement, False otherwise
    """
    return score > confidence_threshold and stddev < stddev_max


def validate_post_data(post: dict) -> bool:
    """
    Validate that a post has all required fields.

    Args:
        post: Dictionary containing post data

    Returns:
        True if valid, False otherwise
    """
    required_fields = [
        'Celebrity', 'Platform', 'Post_Content',
        'Engagement_Metric', 'Post_Timestamp'
    ]
    return all(field in post and post[field] for field in required_fields)


def calculate_weighted_score(
    sentiment_score: float,
    platform: str,
    source_weights: dict
) -> float:
    """
    Calculate weighted score based on platform weight.

    Args:
        sentiment_score: Raw sentiment score (-1 to 1)
        platform: Social media platform name
        source_weights: Dictionary of platform weights

    Returns:
        Weighted sentiment score
    """
    weight = source_weights.get(platform, 5) / 10.0
    return sentiment_score * weight


# ============================================================================
# Test Cases
# ============================================================================

class TestNormalizeSentimentScore:
    """Tests for sentiment score normalization."""

    def test_score_within_range(self):
        """Score within [-1, 1] should remain unchanged."""
        assert normalize_sentiment_score(0.5) == 0.5
        assert normalize_sentiment_score(-0.5) == -0.5
        assert normalize_sentiment_score(0.0) == 0.0

    def test_score_above_max(self):
        """Score above 1 should be clamped to 1."""
        assert normalize_sentiment_score(1.5) == 1.0
        assert normalize_sentiment_score(100.0) == 1.0

    def test_score_below_min(self):
        """Score below -1 should be clamped to -1."""
        assert normalize_sentiment_score(-1.5) == -1.0
        assert normalize_sentiment_score(-100.0) == -1.0

    def test_boundary_values(self):
        """Test exact boundary values."""
        assert normalize_sentiment_score(1.0) == 1.0
        assert normalize_sentiment_score(-1.0) == -1.0


class TestCalculateTrendDirection:
    """Tests for trend direction calculation."""

    def test_fast_rising(self):
        """Score increase > 15% should be Fast Rising."""
        result = calculate_trend_direction(0.80, 0.60)  # 33% increase
        assert result == "Fast Rising"

    def test_rising(self):
        """Score increase > 5% but <= 15% should be Rising."""
        result = calculate_trend_direction(0.70, 0.65)  # ~7.7% increase
        assert result == "Rising"

    def test_stable(self):
        """Score change within +/- 5% should be Stable."""
        result = calculate_trend_direction(0.70, 0.68)  # ~2.9% increase
        assert result == "Stable"

        result = calculate_trend_direction(0.68, 0.70)  # ~2.9% decrease
        assert result == "Stable"

    def test_falling(self):
        """Score decrease > 5% but <= 15% should be Falling."""
        result = calculate_trend_direction(0.60, 0.65)  # ~7.7% decrease
        assert result == "Falling"

    def test_fast_falling(self):
        """Score decrease > 15% should be Fast Falling."""
        result = calculate_trend_direction(0.50, 0.70)  # ~28.6% decrease
        assert result == "Fast Falling"

    def test_no_previous_score(self):
        """None previous score should return Stable."""
        result = calculate_trend_direction(0.70, None)
        assert result == "-> Stable"

    def test_zero_previous_score(self):
        """Zero previous score should return Stable (avoid division by zero)."""
        result = calculate_trend_direction(0.70, 0)
        assert result == "-> Stable"


class TestCalculateEndorsementReady:
    """Tests for endorsement readiness calculation."""

    def test_endorsement_ready(self):
        """High score and low volatility should be ready."""
        assert calculate_endorsement_ready(0.85, 0.15) is True

    def test_score_too_low(self):
        """Score below threshold should not be ready."""
        assert calculate_endorsement_ready(0.60, 0.15) is False

    def test_volatility_too_high(self):
        """High volatility should not be ready."""
        assert calculate_endorsement_ready(0.85, 0.30) is False

    def test_both_fail(self):
        """Both conditions failing should not be ready."""
        assert calculate_endorsement_ready(0.60, 0.30) is False

    def test_boundary_values(self):
        """Test exact threshold values."""
        # Exactly at threshold (should fail - needs to be greater than)
        assert calculate_endorsement_ready(0.70, 0.25) is False

        # Just above/below thresholds
        assert calculate_endorsement_ready(0.71, 0.24) is True

    def test_custom_thresholds(self):
        """Test with custom threshold values."""
        assert calculate_endorsement_ready(
            0.55, 0.20,
            confidence_threshold=0.50,
            stddev_max=0.25
        ) is True


class TestValidatePostData:
    """Tests for post data validation."""

    def test_valid_post(self):
        """Post with all required fields should be valid."""
        post = {
            'Celebrity': 'Test Celebrity',
            'Platform': 'Instagram',
            'Post_Content': 'Test content',
            'Engagement_Metric': 1000,
            'Post_Timestamp': '2026-01-30T10:00:00+08:00'
        }
        assert validate_post_data(post) is True

    def test_missing_field(self):
        """Post missing required field should be invalid."""
        post = {
            'Celebrity': 'Test Celebrity',
            'Platform': 'Instagram',
            # Missing Post_Content
            'Engagement_Metric': 1000,
            'Post_Timestamp': '2026-01-30T10:00:00+08:00'
        }
        assert validate_post_data(post) is False

    def test_empty_field(self):
        """Post with empty required field should be invalid."""
        post = {
            'Celebrity': 'Test Celebrity',
            'Platform': '',  # Empty
            'Post_Content': 'Test content',
            'Engagement_Metric': 1000,
            'Post_Timestamp': '2026-01-30T10:00:00+08:00'
        }
        assert validate_post_data(post) is False

    def test_zero_engagement(self):
        """Post with zero engagement should be invalid."""
        post = {
            'Celebrity': 'Test Celebrity',
            'Platform': 'Instagram',
            'Post_Content': 'Test content',
            'Engagement_Metric': 0,
            'Post_Timestamp': '2026-01-30T10:00:00+08:00'
        }
        assert validate_post_data(post) is False


class TestCalculateWeightedScore:
    """Tests for weighted score calculation."""

    @pytest.fixture
    def source_weights(self):
        """Default source weights fixture."""
        return {
            'TikTok': 10,
            'Instagram': 9,
            'YouTube': 8,
            'Facebook': 7,
            'News': 6
        }

    def test_tiktok_weight(self, source_weights):
        """TikTok (weight 10) should have full weight."""
        result = calculate_weighted_score(0.80, 'TikTok', source_weights)
        assert result == pytest.approx(0.80)

    def test_instagram_weight(self, source_weights):
        """Instagram (weight 9) should have 90% weight."""
        result = calculate_weighted_score(0.80, 'Instagram', source_weights)
        assert result == pytest.approx(0.72)

    def test_unknown_platform(self, source_weights):
        """Unknown platform should use default weight of 5."""
        result = calculate_weighted_score(0.80, 'Unknown', source_weights)
        assert result == pytest.approx(0.40)  # 0.8 * 0.5

    def test_negative_sentiment(self, source_weights):
        """Negative sentiment should produce negative weighted score."""
        result = calculate_weighted_score(-0.50, 'TikTok', source_weights)
        assert result == pytest.approx(-0.50)


class TestIntegration:
    """Integration tests with DataFrame operations."""

    def test_aggregate_by_celebrity(self):
        """Test celebrity aggregation logic."""
        data = pd.DataFrame({
            'Celebrity': ['A', 'A', 'A', 'B', 'B'],
            'Platform': ['Instagram', 'TikTok', 'YouTube', 'Instagram', 'Facebook'],
            'Sentiment_Score': [0.8, 0.9, 0.7, 0.6, 0.5]
        })

        result = data.groupby('Celebrity')['Sentiment_Score'].agg(['mean', 'std', 'count'])

        assert len(result) == 2
        assert result.loc['A', 'count'] == 3
        assert result.loc['B', 'count'] == 2
        assert result.loc['A', 'mean'] == pytest.approx(0.8, rel=0.01)

    def test_ranking_sort(self):
        """Test ranking sort by weighted score."""
        data = pd.DataFrame({
            'Celebrity': ['A', 'B', 'C'],
            'Weighted_Score': [0.75, 0.90, 0.60]
        })

        ranked = data.sort_values('Weighted_Score', ascending=False).reset_index(drop=True)
        ranked['Rank'] = range(1, len(ranked) + 1)

        assert ranked.iloc[0]['Celebrity'] == 'B'
        assert ranked.iloc[0]['Rank'] == 1
        assert ranked.iloc[2]['Celebrity'] == 'C'
        assert ranked.iloc[2]['Rank'] == 3


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
