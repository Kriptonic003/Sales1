from datetime import date, timedelta
from typing import List
import numpy as np
import time

from sqlalchemy.orm import Session
from sklearn.linear_model import LogisticRegression, LinearRegression

import models
import schemas
import crud
from ml.sentiment_classifier import DistilBERTSentimentClassifier

# =====================================================
# AI RELEVANCE FILTER (LIGHTWEIGHT)
# =====================================================

from sentence_transformers import SentenceTransformer, util

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


def is_relevant_comment(comment: str, product_name: str) -> bool:
    product_embedding = embedding_model.encode(product_name, convert_to_tensor=True)
    comment_embedding = embedding_model.encode(comment, convert_to_tensor=True)
    similarity_score = util.cos_sim(product_embedding, comment_embedding)
    return similarity_score.item() > 0.4


# =====================================================
# SENTIMENT SUMMARY
# =====================================================

class SentimentSummary:
    def __init__(self, average_sentiment, negative_percentage, total_posts,
                 positive_count=0, negative_count=0, neutral_count=0):
        self.average_sentiment = average_sentiment
        self.negative_percentage = negative_percentage
        self.total_posts = total_posts
        self.positive_count = positive_count
        self.negative_count = negative_count
        self.neutral_count = neutral_count

        self.positive_percentage = (positive_count / total_posts * 100) if total_posts > 0 else 0.0
        self.neutral_percentage = (neutral_count / total_posts * 100) if total_posts > 0 else 0.0


# =====================================================
# MAIN PIPELINE
# =====================================================

class SentimentAndSalesPipeline:

    def __init__(self):
        self.sentiment_classifier = DistilBERTSentimentClassifier()
        self.loss_classifier = LogisticRegression()
        self.sales_regressor = LinearRegression()
        self._trained = False

    def _score_text(self, text: str):
        label, confidence = self.sentiment_classifier.classify(text)
        score = self.sentiment_classifier.convert_to_sentiment_score(label, confidence)
        return score, label.lower(), confidence

    # =====================================================
    # ANALYZE POSTS (WITH AI FILTER)
    # =====================================================

    def analyze_posts(self, db: Session, posts: List[models.SocialPost]) -> SentimentSummary:
        if not posts:
            return SentimentSummary(0.0, 0.0, 0)

        # 🔥 Filter relevant posts using semantic similarity
        relevant_posts = [
            post for post in posts
            if is_relevant_comment(post.content, post.product_name)
        ]

        if not relevant_posts:
            return SentimentSummary(0.0, 0.0, 0)

        total_score = 0.0
        positive = negative = neutral = 0

        for post in relevant_posts:
            score, label, _ = self._score_text(post.content)

            if label == "positive":
                positive += 1
            elif label == "negative":
                negative += 1
            else:
                neutral += 1

            total_score += score

            if not post.sentiment:
                db.add(models.SentimentScore(
                    post_id=post.id,
                    sentiment_label=label,
                    sentiment_score=score,
                ))
            else:
                post.sentiment.sentiment_label = label
                post.sentiment.sentiment_score = score

        db.commit()

        total_posts = len(relevant_posts)

        return SentimentSummary(
            average_sentiment=total_score / total_posts,
            negative_percentage=(negative / total_posts) * 100.0,
            total_posts=total_posts,
            positive_count=positive,
            negative_count=negative,
            neutral_count=neutral,
        )

    # =====================================================
    # SALES LOSS CALCULATION
    # =====================================================

    def _calculate_sales_loss(self, negative_percentage, comment_volume, revenues):
        base_loss = (negative_percentage / 100.0) ** 1.5 * 40.0
        volume_confidence = min(1.0, max(0.3, comment_volume / 50.0))
        adjusted_loss = base_loss * volume_confidence

        loss_prob = 1.0 / (1.0 + np.exp(-(negative_percentage - 15.0) / 5.0))

        recent_rev = revenues[-1] if revenues else 10000.0
        predicted_revenue = recent_rev * (1.0 - adjusted_loss / 100.0)

        if loss_prob < 0.25:
            risk = "Low"
        elif loss_prob < 0.60:
            risk = "Medium"
        else:
            risk = "High"

        return predicted_revenue, adjusted_loss, loss_prob, risk

    # =====================================================
    # PREDICT SALES LOSS
    # =====================================================

    def predict_sales_loss(self, db: Session, req: schemas.SalesLossPredictionRequest):

        posts = crud.get_or_create_social_posts(
            db,
            schemas.SentimentAnalysisRequest(
                product_name=req.product_name,
                brand_name=req.brand_name,
                platform=req.platform,
                start_date=req.start_date,
                end_date=req.end_date,
            ),
        )

        summary = self.analyze_posts(db, posts)

        sales_rows = crud.get_sales_range(
            db,
            req.product_name,
            req.brand_name,
            req.start_date - timedelta(days=30),
            req.end_date,
        )

        revenues = [r.revenue for r in sales_rows] if sales_rows else [10000.0] * 30

        predicted_revenue, drop_pct, loss_prob, risk = self._calculate_sales_loss(
            summary.negative_percentage,
            summary.total_posts,
            revenues
        )

        return schemas.SalesLossPredictionResponse(
            product_name=req.product_name,
            brand_name=req.brand_name,
            predicted_drop_percentage=drop_pct,
            loss_probability=loss_prob,
            confidence=min(1.0, max(0.3, summary.total_posts / 50.0)),
            risk_level=risk,
            explanation=f"{summary.negative_percentage:.1f}% comments are negative.",
        )

    # =====================================================
    # DASHBOARD
    # =====================================================

    def build_dashboard(self, db: Session, product_name: str, brand_name: str, platform: str):

        posts = crud.get_social_posts_only(db, product_name, brand_name, platform)

        if not posts:
            return schemas.DashboardResponse(
                kpis=schemas.KPISection(
                    average_sentiment=0.0,
                    negative_percentage=0.0,
                    positive_percentage=0.0,
                    neutral_percentage=0.0,
                    positive_count=0,
                    negative_count=0,
                    neutral_count=0,
                    predicted_sales_drop=0.0,
                    risk_level="Low",
                ),
                sentiment_trend=[],
                sentiment_distribution={"positive": 0, "neutral": 0, "negative": 0},
                comment_volume=[],
                sales_series=[],
                ai_insights=["No comments available."],
                alerts=[],
            )

        summary = self.analyze_posts(db, posts)

        sentiment_distribution = {
            "positive": summary.positive_count,
            "neutral": summary.neutral_count,
            "negative": summary.negative_count,
        }

        return schemas.DashboardResponse(
            kpis=schemas.KPISection(
                average_sentiment=summary.average_sentiment,
                negative_percentage=summary.negative_percentage,
                positive_percentage=summary.positive_percentage,
                neutral_percentage=summary.neutral_percentage,
                positive_count=summary.positive_count,
                negative_count=summary.negative_count,
                neutral_count=summary.neutral_count,
                predicted_sales_drop=0.0,
                risk_level="Low",
            ),
            sentiment_trend=[],
            sentiment_distribution=sentiment_distribution,
            comment_volume=[],
            sales_series=[],
            ai_insights=[
                f"Average sentiment: {summary.average_sentiment:.2f}",
                f"Negative percentage: {summary.negative_percentage:.1f}%"
            ],
            alerts=[],
        )