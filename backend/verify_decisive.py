import traceback
import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from ml.pipeline import SentimentAndSalesPipeline

engine = create_engine("sqlite:///:memory:")
models.Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify_decisive_classification():
    db = SessionLocal()
    pipeline = SentimentAndSalesPipeline()
    
    # Samples that were likely previously neutral or tricky
    samples = [
        ("Thank god purchase krne se pahle dekh liye", "Negative"),
        ("Seltos is a absolute beast, love it!", "Positive"),
        ("The touch screen is very laggy and slow", "Negative"),
        ("Nice work sir", "Neutral"), # Should be neutral as it's video praise
    ]
    
    posts = []
    for i, (text, _) in enumerate(samples):
        post = models.SocialPost(
            id=i+1, product_name="Seltos", brand_name="Kia", 
            platform="YouTube", content=text,
            posted_at=time.strftime("%Y-%m-%d")
        )
        db.add(post)
        posts.append(post)
    db.commit()
    
    print("Testing decisive classification...")
    # This should trigger the new LLM prompt
    summary = pipeline.analyze_posts(db, posts, product_name="Seltos", brand_name="Kia")
    
    print(f"\nResults: Pos={summary.positive_count}, Neg={summary.negative_count}, Neu={summary.neutral_count}")
    
    # We expect 1 Pos, 2 Neg, 1 Neu
    if summary.positive_count >= 1 and summary.negative_count >= 2:
        print("\nSUCCESS: Classification is now more decisive!")
    else:
        print("\nCAUTION: Still seeing too many neutrals or misses.")

if __name__ == "__main__":
    try:
        verify_decisive_classification()
    except Exception:
        print(traceback.format_exc())
