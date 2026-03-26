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

def verify_final():
    db = SessionLocal()
    pipeline = SentimentAndSalesPipeline()
    
    # Tricky samples that MUST not be neutral
    samples = [
        ("Good product, but the delivery was slow", "Positive"), # Mix
        ("The hair serum made my scalp itchy and oily", "Negative"), # Descriptive negative
        ("Worth every penny, best serum in India", "Positive"), # Strong positive
        ("Kia Seltos owner here, great drive", "Positive"), # Contextual
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
    
    print("Testing FINAL decisive classification...")
    summary = pipeline.analyze_posts(db, posts, product_name="Seltos", brand_name="Kia")
    
    print(f"\nFinal Results: Pos={summary.positive_count}, Neg={summary.negative_count}, Neu={summary.neutral_count}")
    
    # At least 3 should be Non-Neutral
    if summary.neutral_count <= 1:
        print("\nSUCCESS: Final verification passed! Neutrality is minimized.")
    else:
        print("\nCAUTION: Still seeing too many neutrals.")

if __name__ == "__main__":
    try:
        verify_final()
    except Exception:
        print(traceback.format_exc())
