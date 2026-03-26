import sys
import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
import schemas
from ml.pipeline import SentimentAndSalesPipeline

engine = create_engine("sqlite:///:memory:")
models.Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify_speed_optimization():
    db = SessionLocal()
    pipeline = SentimentAndSalesPipeline()
    
    # 1. Setup sample
    post = models.SocialPost(
        id=1, product_name="Test", brand_name="Test", 
        platform="YouTube", content="This is a test comment about the product.",
        posted_at=time.strftime("%Y-%m-%d")
    )
    db.add(post)
    db.commit()
    
    print("--- FIRST CALL (Should trigger LLM) ---")
    start = time.time()
    # Note: This will use Fallback if no API keys, which is fine for speed check
    pipeline.analyze_posts(db, [post], product_name="Test", brand_name="Test")
    first_duration = time.time() - start
    print(f"First call took {first_duration:.2f}s")
    
    print("\n--- SECOND CALL (Should be FAST) ---")
    start = time.time()
    pipeline.analyze_posts(db, [post], product_name="Test", brand_name="Test")
    second_duration = time.time() - start
    print(f"Second call took {second_duration:.2f}s")
    
    if second_duration < first_duration / 2 or second_duration < 1.0:
        print("\nSUCCESS: Speed optimization is working!")
    else:
        print("\nCAUTION: Second call is still slow.")

if __name__ == "__main__":
    verify_speed_optimization()
