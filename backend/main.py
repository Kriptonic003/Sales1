from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os

from dotenv import load_dotenv

# Load ENV first
load_dotenv(override=True)

# --------------------------------------------------
# CHECK API KEY
# --------------------------------------------------
if not os.getenv("YOUTUBE_API_KEY"):
    raise RuntimeError("YOUTUBE_API_KEY not found in environment variables")

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# --------------------------------------------------
# IMPORT AFTER ENV LOAD
# --------------------------------------------------
import models
import schemas
import crud
import database

from ml.pipeline import SentimentAndSalesPipeline
from services.chatbot import generate_chat_response
from services.youtube_service import fetch_comments_from_top_videos
from routers.rag import router as rag_router

# --------------------------------------------------
# DB + APP SETUP
# --------------------------------------------------
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="AI Sales Loss Prediction API")

# RAG Chatbot router
app.include_router(rag_router, prefix="/rag")

# --------------------------------------------------
# CORS CONFIG (IMPORTANT FOR FRONTEND)
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # OK for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# DATABASE DEPENDENCY
# --------------------------------------------------
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

pipeline = SentimentAndSalesPipeline()

# --------------------------------------------------
# CORE ENDPOINTS
# --------------------------------------------------

@app.post("/analyze-sentiment", response_model=schemas.SentimentAnalysisResponse)
def analyze_sentiment(
    request: schemas.SentimentAnalysisRequest,
    db: Session = Depends(get_db),
):
    import time
    start_time = time.time()
    print(f"\n[ANALYZE] Analyzing sentiment for {request.product_name}...")
    
    posts = crud.get_or_create_social_posts(db, request)
    
    # Only analyze posts that DON'T have sentiment yet
    posts_without_sentiment = [p for p in posts if not p.sentiment]
    posts_with_sentiment = len(posts) - len(posts_without_sentiment)
    
    if posts_without_sentiment:
        print(f"[ANALYZE] Found {len(posts_without_sentiment)} new posts to analyze (already have sentiment for {posts_with_sentiment})")
        summary = pipeline.analyze_posts(db, posts_without_sentiment)
    else:
        print(f"[ANALYZE] All {len(posts)} posts already analyzed")
        # Calculate summary from existing sentiments
        total_score = 0.0
        negative = 0
        for p in posts:
            if p.sentiment:
                total_score += p.sentiment.sentiment_score
                if p.sentiment.sentiment_label.lower() == "negative":
                    negative += 1
        from ml.pipeline import SentimentSummary
        summary = SentimentSummary(
            average_sentiment=total_score / len(posts) if posts else 0.0,
            negative_percentage=(negative / len(posts) * 100.0) if posts else 0.0,
            total_posts=len(posts),
        )
    from services.chatbot import generate_sentiment_summary
    import random
    
    pos_posts = [p for p in posts if p.sentiment and p.sentiment.sentiment_label == "positive"]
    neg_posts = [p for p in posts if p.sentiment and p.sentiment.sentiment_label == "negative"]
    neu_posts = [p for p in posts if p.sentiment and p.sentiment.sentiment_label == "neutral"]
    
    sample_texts = [p.content for p in pos_posts[:20]] + [p.content for p in neg_posts[:20]]
    random.shuffle(sample_texts)
    
    summary_data = generate_sentiment_summary(request.product_name, sample_texts) if sample_texts else {"positives": [], "negatives": []}
    
    total_time = time.time() - start_time
    print(f"[ANALYZE] Complete in {total_time:.2f}s\n")

    return schemas.SentimentAnalysisResponse(
        product_name=request.product_name,
        platform=request.platform,
        average_sentiment=summary.average_sentiment,
        negative_percentage=summary.negative_percentage,
        total_posts=summary.total_posts,
        positive_count=len(pos_posts),
        neutral_count=len(neu_posts),
        negative_count=len(neg_posts),
        start_date=request.start_date,
        end_date=request.end_date,
        positives=summary_data.get("positives", []),
        negatives=summary_data.get("negatives", []),
    )


@app.post("/predict-sales-loss", response_model=schemas.SalesLossPredictionResponse)
def predict_sales_loss(
    request: schemas.SalesLossPredictionRequest,
    db: Session = Depends(get_db),
):
    import time
    start_time = time.time()
    print(f"\n[PREDICT] Predicting sales loss for {request.product_name}...")
    result = pipeline.predict_sales_loss(db, request)
    total_time = time.time() - start_time
    print(f"[PREDICT] Complete in {total_time:.2f}s - Risk: {result.risk_level}, Drop: {result.predicted_drop_percentage:.1f}%\n")
    return result


@app.get("/get-dashboard-data", response_model=schemas.DashboardResponse)
def get_dashboard_data(
    product_name: str,
    brand_name: str,
    platform: str,
    db: Session = Depends(get_db),
):
    import time
    start_time = time.time()
    print(f"\n[DASHBOARD] Building dashboard for {product_name}...")
    result = pipeline.build_dashboard(db, product_name, brand_name, platform)
    total_time = time.time() - start_time
    print(f"[DASHBOARD] Complete in {total_time:.2f}s\n")
    return result


@app.get("/comments", response_model=schemas.CommentsResponse)
def get_comments(
    product_name: str,
    brand_name: str,
    platform: str,
    sentiment_filter: str | None = None,
    db: Session = Depends(get_db),
):
    from datetime import date
    import time
    
    start_time = time.time()
    print(f"\n[COMMENTS] Fetching comments for {product_name}...")

    # Get ALL stored posts (no date filter) so every comment can be analyzed
    all_posts = crud.get_social_posts_only(db, product_name, brand_name, platform)

    fetch_time = time.time() - start_time
    print(f"[COMMENTS] Found {len(all_posts)} total posts in {fetch_time:.2f}s")

    # Analyze ALL posts that don't have sentiment yet
    if all_posts:
        posts_without_sentiment = [p for p in all_posts if not p.sentiment]
        if posts_without_sentiment:
            print(f"[COMMENTS] Analyzing {len(posts_without_sentiment)} unanalyzed posts...")
            try:
                analyze_start = time.time()
                pipeline.analyze_posts(db, posts_without_sentiment)
                analyze_time = time.time() - analyze_start
                print(f"[COMMENTS] Sentiment analysis complete in {analyze_time:.2f}s")
            except Exception as e:
                print(f"[COMMENTS] Error during sentiment analysis: {e}")
        else:
            print(f"[COMMENTS] All {len(all_posts)} posts already analyzed")

    # Get sentiment counts from ALL posts
    total_count = len(all_posts)
    pos_count = len([p for p in all_posts if p.sentiment and p.sentiment.sentiment_label == "positive"])
    neg_count = len([p for p in all_posts if p.sentiment and p.sentiment.sentiment_label == "negative"])
    neu_count = len([p for p in all_posts if p.sentiment and p.sentiment.sentiment_label == "neutral"])

    # Return comments with sentiment loaded (respecting filter)
    retrieve_start = time.time()
    comments = crud.get_comments(db, product_name, brand_name, platform, sentiment_filter)
    result = [schemas.SocialPostOut.from_orm(c) for c in comments]

    total_time = time.time() - start_time
    print(f"[COMMENTS] Returned {len(result)} comments in {total_time:.2f}s total\n")

    return schemas.CommentsResponse(
        comments=result,
        total_count=total_count,
        positive_count=pos_count,
        neutral_count=neu_count,
        negative_count=neg_count
    )

@app.post("/chat", response_model=schemas.ChatResponse)
def chat(request: schemas.ChatRequest):
    reply = generate_chat_response(request.message, context=request.context)
    return schemas.ChatResponse(reply=reply)

# --------------------------------------------------
# YOUTUBE FETCH ENDPOINT
# --------------------------------------------------

@app.post("/fetch-youtube-comments")
def fetch_youtube_comments_multi_video(
    product_name: str,
    brand_name: str,
    db: Session = Depends(get_db),
):
    # Build a more specific query to avoid unrelated mega-viral results
    query = f"{brand_name} {product_name}".strip()
    # Now passing product and brand for strict relevance filtering
    comments = fetch_comments_from_top_videos(
        query=query, 
        product_name=product_name, 
        brand_name=brand_name, 
        min_comments=150
    )

    if not comments:
        raise HTTPException(status_code=404, detail="No comments found")

    # Refresh stored comments so visualizations match the latest fetch
    crud.delete_social_posts(
        db=db,
        product_name=product_name,
        brand_name=brand_name,
        platform="YouTube",
    )

    saved = crud.save_youtube_comments(
        db=db,
        product_name=product_name,
        brand_name=brand_name,
        platform="YouTube",
        comments=comments,
    )

    return {
        "message": "YouTube comments fetched from multiple top videos",
        "videos_used": "Top 40 videos by relevance",
        "comments_saved": len(saved),
    }

# --------------------------------------------------
# DEBUG ENDPOINT FOR TESTING SENTIMENT CLASSIFICATION
# --------------------------------------------------

@app.post("/debug/test-sentiment")
def debug_test_sentiment(text: str):
    """
    Debug endpoint to test DistilBERT sentiment classification on a single text
    
    Example:
      curl -X POST "http://localhost:8000/debug/test-sentiment?text=This%20product%20is%20amazing"
    """
    try:
        label, confidence = pipeline.sentiment_classifier.classify(text)
        score = pipeline.sentiment_classifier.convert_to_sentiment_score(label, confidence)
        
        return {
            "text": text,
            "sentiment_label": label,
            "sentiment_score": score,
            "confidence": confidence,
            "model": "distilbert-base-uncased-finetuned-sst-2-english"
        }
    except Exception as e:
        return {
            "error": str(e),
            "text": text
        }

@app.post("/debug/test-batch-sentiment")
def debug_test_batch_sentiment(texts: List[str]):
    """
    Debug endpoint to test batch sentiment classification
    
    Example:
      curl -X POST "http://localhost:8000/debug/test-batch-sentiment" \\
        -H "Content-Type: application/json" \\
        -d '{"texts": ["Great product!", "Terrible quality"]}'
    """
    try:
        results = []
        for text in texts:
            label, confidence = pipeline.sentiment_classifier.classify(text)
            score = pipeline.sentiment_classifier.convert_to_sentiment_score(label, confidence)
            results.append({
                "text": text,
                "sentiment_label": label,
                "sentiment_score": score,
                "confidence": confidence
            })
        
        summary = pipeline.sentiment_classifier.get_sentiment_summary(texts)
        
        return {
            "results": results,
            "summary": summary
        }
    except Exception as e:
        return {"error": str(e)}
