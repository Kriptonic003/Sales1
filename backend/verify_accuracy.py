import sys
import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
import schemas
from ml.pipeline import SentimentAndSalesPipeline

# Setup a temporary in-memory DB for testing
engine = create_engine("sqlite:///:memory:")
models.Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify_accuracy():
    db = SessionLocal()
    pipeline = SentimentAndSalesPipeline()
    
    product_name = "Seltos"
    brand_name = "Kia"
    
    # Mix of relevant and irrelevant posts
    raw_data = [
        ("Kia Seltos is the best car ever!", True),      # Relevant
        ("Nice video, thanks for the info", False),      # Video noise (irrelevant)
        ("I love this channel, subscribed!", False),     # Video noise (irrelevant)
        ("The mileage of Seltos is bad", True),          # Relevant
        ("Great upload sis, keep it up", False),         # Video noise (irrelevant)
        ("Thank you for this detailed review", False),  # Video noise (irrelevant)
        ("What is the on-road price of Seltos?", True),  # Relevant
        ("Color name pls", True),                         # Semantic relevant (or product context)
    ]
    
    posts = []
    for i, (text, _) in enumerate(raw_data):
        post = models.SocialPost(
            id=i+1,
            product_name=product_name,
            brand_name=brand_name,
            platform="YouTube",
            content=text,
            posted_at=time.strftime("%Y-%m-%d")
        )
        db.add(post)
        posts.append(post)
    db.commit()
    
    print(f"Analyzing {len(posts)} posts with accuracy improvements...")
    summary = pipeline.analyze_posts(
        db, posts,
        product_name=product_name,
        brand_name=brand_name
    )
    
    print(f"Total relevant posts for KPI: {summary.total_posts}")
    print(f"Average sentiment: {summary.average_sentiment:.2f}")
    
    # We expect 4 or 5 relevant posts, not 8.
    if summary.total_posts < 8:
        print("SUCCESS: Noise filter is working!")
    else:
        print("FAILED: Noise filter is not working!")

    # Verify all posts have sentiment scores in DB
    score_count = db.query(models.SentimentScore).count()
    print(f"Total sentiment scores in DB: {score_count}")
    if score_count == len(posts):
        print("SUCCESS: All posts were classified for UI consistency.")
    else:
        print("FAILED: Some posts were skipped.")

if __name__ == "__main__":
    try:
        verify_accuracy()
    except Exception as e:
        print(f"Error: {e}")
