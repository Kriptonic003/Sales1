from datetime import date, timedelta
from typing import List
import numpy as np

from sqlalchemy.orm import Session
from sklearn.linear_model import LogisticRegression, LinearRegression

import models
import schemas
import crud
from ml.sentiment_classifier import DistilBERTSentimentClassifier


class SentimentSummary:
    def __init__(self, average_sentiment: float, negative_percentage: float, total_posts: int, 
                 positive_count: int = 0, negative_count: int = 0, neutral_count: int = 0):
        self.average_sentiment = average_sentiment
        self.negative_percentage = negative_percentage
        self.total_posts = total_posts
        self.positive_count = positive_count
        self.negative_count = negative_count
        self.neutral_count = neutral_count
        # Calculate percentages
        self.positive_percentage = (positive_count / total_posts * 100) if total_posts > 0 else 0.0
        self.neutral_percentage = (neutral_count / total_posts * 100) if total_posts > 0 else 0.0


class SentimentAndSalesPipeline:
    def __init__(self):
        self.sentiment_classifier = DistilBERTSentimentClassifier()
        self.loss_classifier = LogisticRegression()
        self.sales_regressor = LinearRegression()
        self._trained = False

    def _score_text(self, text: str) -> tuple:
        """
        Score text using DistilBERT.
        
        Returns:
            Tuple of (sentiment_score, sentiment_label, confidence)
            - sentiment_score: -1 to 1
            - sentiment_label: 'positive', 'negative', or 'neutral'
            - confidence: 0 to 1
        """
        label, confidence = self.sentiment_classifier.classify(text)
        sentiment_score = self.sentiment_classifier.convert_to_sentiment_score(label, confidence)
        return sentiment_score, label, confidence

    def analyze_posts(self, db: Session, posts: List[models.SocialPost]) -> SentimentSummary:
        if not posts:
            return SentimentSummary(0.0, 0.0, 0)

        total_score = 0.0
        negative = 0
        positive = 0
        neutral = 0

        for post in posts:
            score, label, confidence = self._score_text(post.content)
            
            # Use DistilBERT's label directly (it's already well-calibrated)
            final_label = label.lower()
            
            # Track counts
            if final_label == "positive":
                positive += 1
            elif final_label == "negative":
                negative += 1
            else:
                neutral += 1

            total_score += score

            # Check if sentiment already exists to avoid duplicates
            if not post.sentiment:
                db.add(
                    models.SentimentScore(
                        post_id=post.id,
                        sentiment_label=final_label,
                        sentiment_score=score,
                    )
                )
            else:
                # Update existing sentiment score
                post.sentiment.sentiment_label = final_label
                post.sentiment.sentiment_score = score

        db.commit()

        return SentimentSummary(
            average_sentiment=total_score / len(posts),
            negative_percentage=(negative / len(posts)) * 100.0,
            total_posts=len(posts),
            positive_count=positive,
            negative_count=negative,
            neutral_count=neutral,
        )

    def _calculate_sales_loss(self, 
                           negative_percentage: float, 
                           comment_volume: int,
                           revenues: List[float]) -> tuple:
        """
        Calculate predicted sales loss based on negative sentiment and comment volume.
        
        Formula:
        - Baseline: negative_percentage drives the loss
        - Amplification: higher comment volume = more reliable signal
        - Cap: maximum realistic loss is 40%
        
        Returns:
            Tuple of (predicted_revenue, drop_percentage, loss_probability, risk_level)
        """
        # Base loss calculation: negative % ranges from 0-100 → loss ranges from 0-40%
        # Using quadratic function to give more weight to extreme negativity
        base_loss = (negative_percentage / 100.0) ** 1.5 * 40.0
        
        # Volume adjustment: more comments = higher confidence
        # Minimum volume to trust prediction: 20 comments
        volume_confidence = min(1.0, max(0.3, comment_volume / 50.0))
        
        # Apply volume confidence to loss
        adjusted_loss = base_loss * volume_confidence
        
        # Calculate loss probability with sigmoid-like curve
        # Centered at 15% negative sentiment = 50% loss probability
        loss_prob = 1.0 / (1.0 + np.exp(-(negative_percentage - 15.0) / 5.0))
        
        # Calculate predicted revenue
        recent_rev = revenues[-1] if revenues else 10000.0
        predicted_revenue = recent_rev * (1.0 - adjusted_loss / 100.0)
        
        # Determine risk level
        if loss_prob < 0.25:
            risk = "Low"
        elif loss_prob < 0.60:
            risk = "Medium"
        else:
            risk = "High"
        
        return predicted_revenue, adjusted_loss, loss_prob, risk

    def _train_models(self, revenues: List[float], avg_sentiments: List[float]):
        """Legacy method - kept for compatibility but not actively used."""
        X = np.array([[s] for s in avg_sentiments])
        y_loss = np.array([1 if s < 0 else 0 for s in avg_sentiments])
        y_sales = np.array(revenues)

        if len(np.unique(y_loss)) < 2:
            y_loss[0] = 1 - y_loss[0]

        self.loss_classifier.fit(X, y_loss)
        self.sales_regressor.fit(X, y_sales)
        self._trained = True

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

        # Only analyze posts that DON'T have sentiment yet
        posts_without_sentiment = [p for p in posts if not p.sentiment]
        if posts_without_sentiment:
            summary = self.analyze_posts(db, posts_without_sentiment)
        else:
            # Calculate summary from existing sentiments
            total_score = 0.0
            negative = positive = neutral = 0
            for p in posts:
                if p.sentiment:
                    total_score += p.sentiment.sentiment_score
                    label = p.sentiment.sentiment_label.lower()
                    if label == "negative":
                        negative += 1
                    elif label == "positive":
                        positive += 1
                    else:
                        neutral += 1
            from ml.pipeline import SentimentSummary
            summary = SentimentSummary(
                average_sentiment=total_score / len(posts) if posts else 0.0,
                negative_percentage=(negative / len(posts) * 100.0) if posts else 0.0,
                total_posts=len(posts),
                positive_count=positive,
                negative_count=negative,
                neutral_count=neutral,
            )

        sales_rows = crud.get_sales_range(
            db,
            req.product_name,
            req.brand_name,
            req.start_date - timedelta(days=30),
            req.end_date,
        )

        revenues = [r.revenue for r in sales_rows] if sales_rows else [10000.0] * 30
        
        # Use new model based on negative sentiment percentage
        predicted_revenue, drop_pct, loss_prob, risk = self._calculate_sales_loss(
            negative_percentage=summary.negative_percentage,
            comment_volume=summary.total_posts,
            revenues=revenues
        )

        crud.upsert_prediction(
            db,
            req.product_name,
            req.brand_name,
            req.end_date,
            loss_prob,
            drop_pct,
            risk,
            f"Prediction based on {summary.negative_percentage:.1f}% negative sentiment ({summary.negative_count} negative out of {summary.total_posts} comments)",
        )

        return schemas.SalesLossPredictionResponse(
            product_name=req.product_name,
            brand_name=req.brand_name,
            predicted_drop_percentage=drop_pct,
            loss_probability=loss_prob,
            confidence=min(1.0, max(0.3, summary.total_posts / 50.0)),  # Higher comments = higher confidence
            risk_level=risk,
            explanation=f"{summary.negative_percentage:.1f}% of comments are negative, indicating {'high' if risk == 'High' else 'moderate' if risk == 'Medium' else 'low'} sales risk.",
        )

    # ✅ DASHBOARD (NO AUTO DATA CREATION)
    def build_dashboard(self, db: Session, product_name: str, brand_name: str, platform: str):
        posts = crud.get_social_posts_only(db, product_name, brand_name, platform)

        # 🚫 NO COMMENTS → EMPTY DASHBOARD
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
                sentiment_distribution={
                    "positive": 0,
                    "neutral": 0,
                    "negative": 0,
                },
                comment_volume=[],
                sales_series=[],
                ai_insights=["No comments available to generate dashboard analytics."],
                alerts=[],
            )

        today = date.today()
        start = today - timedelta(days=30)

        # Only analyze posts that DON'T have sentiment yet
        import time
        analyze_start = time.time()
        posts_without_sentiment = [p for p in posts if not p.sentiment]
        posts_with_sentiment = len(posts) - len(posts_without_sentiment)
        
        if posts_without_sentiment:
            print(f"[DASHBOARD] Analyzing {len(posts_without_sentiment)} new posts (already have sentiment for {posts_with_sentiment})")
            summary = self.analyze_posts(db, posts_without_sentiment)
        else:
            print(f"[DASHBOARD] All {len(posts)} posts already analyzed")
            # Calculate summary from existing sentiments
            total_score = 0.0
            positive = negative = neutral = 0
            for p in posts:
                if p.sentiment:
                    total_score += p.sentiment.sentiment_score
                    label = p.sentiment.sentiment_label.lower()
                    if label == "positive":
                        positive += 1
                    elif label == "negative":
                        negative += 1
                    else:
                        neutral += 1
            summary = SentimentSummary(
                average_sentiment=total_score / len(posts) if posts else 0.0,
                negative_percentage=(negative / len(posts) * 100.0) if posts else 0.0,
                total_posts=len(posts),
                positive_count=positive,
                negative_count=negative,
                neutral_count=neutral,
            )
        
        analyze_time = time.time() - analyze_start
        print(f"[DASHBOARD] Sentiment analysis: {analyze_time:.2f}s")

        sales_rows = crud.get_sales_range(db, product_name, brand_name, start, today)
        revenues = [r.revenue for r in sales_rows] if sales_rows else [10000.0] * len(posts)
        avg_sentiments = [summary.average_sentiment for _ in revenues]

        self._train_models(revenues, avg_sentiments)

        sentiment_trend = []
        comment_volume = []
        sentiment_distribution = {"positive": 0, "neutral": 0, "negative": 0}

        posts_by_day = {}
        for p in posts:
            posts_by_day.setdefault(p.posted_at, []).append(p)

        for d, day_posts in sorted(posts_by_day.items()):
            scores = []
            for p in day_posts:
                if p.sentiment:
                    scores.append(p.sentiment.sentiment_score)
                    sentiment_distribution[p.sentiment.sentiment_label] += 1

            avg_score = float(np.mean(scores)) if scores else 0.0

            sentiment_trend.append(
                schemas.SentimentDailyPoint(
                    date=d,
                    average_sentiment=avg_score,
                    total_posts=len(day_posts),
                )
            )

            comment_volume.append(
                schemas.SentimentDailyPoint(
                    date=d,
                    average_sentiment=avg_score,
                    total_posts=len(day_posts),
                )
            )

        sales_series = [
            schemas.SalesPoint(
                date=r.date,
                actual_revenue=r.revenue,
                predicted_revenue=r.revenue,
            )
            for r in sales_rows
        ]

        # Fetch latest prediction for this product/brand
        from sqlalchemy import desc
        latest_pred = (
            db.query(models.Prediction)
            .filter(
                models.Prediction.product_name == product_name,
                models.Prediction.brand_name == brand_name,
            )
            .order_by(desc(models.Prediction.date))
            .first()
        )

        predicted_sales_drop = latest_pred.predicted_drop_percentage if latest_pred else 0.0
        risk_level = latest_pred.risk_level if latest_pred else "Low"

        return schemas.DashboardResponse(
            kpis=schemas.KPISection(
                average_sentiment=summary.average_sentiment,
                negative_percentage=summary.negative_percentage,
                positive_percentage=summary.positive_percentage,
                neutral_percentage=summary.neutral_percentage,
                positive_count=summary.positive_count,
                negative_count=summary.negative_count,
                neutral_count=summary.neutral_count,
                predicted_sales_drop=predicted_sales_drop,
                risk_level=risk_level,
            ),
            sentiment_trend=sentiment_trend,
            sentiment_distribution=sentiment_distribution,
            comment_volume=comment_volume,
            sales_series=sales_series,
            ai_insights=[
                f"Average sentiment over 30 days: {summary.average_sentiment:.2f}",
                f"Negative comment share: {summary.negative_percentage:.1f}%",
            ],
            alerts=[],
        )
