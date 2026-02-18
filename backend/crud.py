from datetime import date, datetime
from typing import List, Optional

from sqlalchemy.orm import Session

import models
import schemas

# Limit real YouTube fetch to this many videos when no posts exist
YOUTUBE_FALLBACK_MAX_VIDEOS = 3


def get_or_create_social_posts(
    db: Session,
    req: schemas.SentimentAnalysisRequest
) -> List[models.SocialPost]:
    print(f"DEBUG: get_or_create_social_posts called for {req.product_name}")

    posts = (
        db.query(models.SocialPost)
        .filter(
            models.SocialPost.product_name == req.product_name,
            models.SocialPost.brand_name == req.brand_name,
            models.SocialPost.platform == req.platform,
            models.SocialPost.posted_at >= req.start_date,
            models.SocialPost.posted_at <= req.end_date,
        )
        .all()
    )

    if posts:
        return posts

    # If no posts in range and platform is YouTube, fetch real comments from limited videos
    # ✅ RESTORED FALLBACK FETCH (Optimized):
    # If frontend fetch skipped/failed, we MUST try to fetch something here, otherwise results are empty.
    # We limit to 1 video to prevent timeouts.
    if req.platform == "YouTube":
        from services.youtube_service import fetch_comments_from_top_videos

        query = f"{req.brand_name} {req.product_name}".strip()
        # Optimize: Fetch only 1 video in fallback to be fast
        comments = fetch_comments_from_top_videos(
            query,
            max_videos=1, 
        )
        if comments:
            save_youtube_comments(
                db=db,
                product_name=req.product_name,
                brand_name=req.brand_name,
                platform=req.platform,
                comments=comments,
            )
            # Return all posts for this product/brand/platform (the ones we just saved)
            return (
                db.query(models.SocialPost)
                .filter(
                    models.SocialPost.product_name == req.product_name,
                    models.SocialPost.brand_name == req.brand_name,
                    models.SocialPost.platform == req.platform,
                )
                .all()
            )
    # No posts and either not YouTube or fetch returned nothing
    return []

def delete_social_posts(
    db: Session,
    product_name: str,
    brand_name: str,
    platform: str,
) -> int:
    """Delete all stored posts for a product/brand/platform (used to refresh fetched comments)."""
    deleted = (
        db.query(models.SocialPost)
        .filter(
            models.SocialPost.product_name == product_name,
            models.SocialPost.brand_name == brand_name,
            models.SocialPost.platform == platform,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return int(deleted or 0)


def get_comments(
    db: Session,
    product_name: str,
    brand_name: str,
    platform: str,
    sentiment_filter: Optional[str] = None,
) -> List[models.SocialPost]:

    query = (
        db.query(models.SocialPost)
        .join(
            models.SentimentScore,
            models.SentimentScore.post_id == models.SocialPost.id,
            isouter=True,
        )
        .filter(
            models.SocialPost.product_name == product_name,
            models.SocialPost.brand_name == brand_name,
            models.SocialPost.platform == platform,
        )
    )

    if sentiment_filter:
        query = query.filter(models.SentimentScore.sentiment_label == sentiment_filter)

    return query.all()


def upsert_prediction(
    db: Session,
    product_name: str,
    brand_name: str,
    date_value: date,
    loss_probability: float,
    drop_pct: float,
    risk_level: str,
    explanation: str,
) -> models.Prediction:

    pred = (
        db.query(models.Prediction)
        .filter(
            models.Prediction.product_name == product_name,
            models.Prediction.brand_name == brand_name,
            models.Prediction.date == date_value,
        )
        .first()
    )

    if not pred:
        pred = models.Prediction(
            product_name=product_name,
            brand_name=brand_name,
            date=date_value,
        )
        db.add(pred)

    pred.loss_probability = loss_probability
    pred.predicted_drop_percentage = drop_pct
    pred.risk_level = risk_level
    pred.explanation = explanation

    db.commit()
    db.refresh(pred)
    return pred


def get_sales_range(
    db: Session,
    product_name: str,
    brand_name: str,
    start_date: date,
    end_date: date,
) -> List[models.SalesData]:

    return (
        db.query(models.SalesData)
        .filter(
            models.SalesData.product_name == product_name,
            models.SalesData.brand_name == brand_name,
            models.SalesData.date >= start_date,
            models.SalesData.date <= end_date,
        )
        .order_by(models.SalesData.date)
        .all()
    )
def get_social_posts_only(
    db: Session,
    product_name: str,
    brand_name: str,
    platform: str,
):
    return (
        db.query(models.SocialPost)
        .filter(
            models.SocialPost.product_name == product_name,
            models.SocialPost.brand_name == brand_name,
            models.SocialPost.platform == platform,
        )
        .all()
    )
def save_youtube_comments(
    db: Session,
    product_name: str,
    brand_name: str,
    platform: str,
    comments: list,
) -> List[models.SocialPost]:
    """Save YouTube API comments (with 'text' and 'published_at') as SocialPost rows."""
    saved_posts = []
    for c in comments:
        post = models.SocialPost(
            product_name=product_name,
            brand_name=brand_name,
            platform=platform,
            content=c["text"],
            posted_at=datetime.fromisoformat(
                c["published_at"].replace("Z", "")
            ).date(),
        )
        db.add(post)
        saved_posts.append(post)
    db.commit()
    for post in saved_posts:
        db.refresh(post)
    return saved_posts
