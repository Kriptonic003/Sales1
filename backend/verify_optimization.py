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

def verify_pipeline_performance():
    db = SessionLocal()
    pipeline = SentimentAndSalesPipeline()
    
    product_name = "Test Product"
    brand_name = "Test Brand"
    
    # Create 50 synthetic posts
    posts = []
    texts = [
        "This product is amazing and I love it!",
        "Absolutely terrible, do not buy.",
        "It's okay, nothing special.",
        "The battery life is great on this phone.",
        "I hate the software bugs.",
        "Best purchase ever!",
        "Waste of money.",
        "Neutral opinion here.",
        "The design is sleek.",
        "Very disappointed with the quality."
    ] * 5
    
    for i, text in enumerate(texts):
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
    
    print(f"Starting analysis of {len(posts)} posts...")
    start_time = time.time()
    
    summary = pipeline.analyze_posts(
        db, posts,
        product_name=product_name,
        brand_name=brand_name
    )
    
    end_time = time.time()
    elapsed = end_time - start_time
    
    print(f"Analysis complete in {elapsed:.2f} seconds.")
    print(f"Total relevant posts: {summary.total_posts}")
    print(f"Average sentiment: {summary.average_sentiment:.2f}")
    print(f"Negative percentage: {summary.negative_percentage:.1f}%")
    
    # Verify that sentiment scores were saved to the DB
    saved_scores = db.query(models.SentimentScore).count()
    print(f"Sentiment scores saved to DB: {saved_scores}")
    
    if saved_scores > 0 and elapsed < 30: # 50 posts should be fast with batching
        print("VERIFICATION SUCCESSFUL!")
    else:
        print("VERIFICATION FAILED or too slow.")

if __name__ == "__main__":
    try:
        verify_pipeline_performance()
    except Exception as e:
        print(f"Error during verification: {e}")
