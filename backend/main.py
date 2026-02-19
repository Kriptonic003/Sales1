from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os

from dotenv import load_dotenv

# Load ENV first
load_dotenv()

# --------------------------------------------------
# CHECK API KEY
# --------------------------------------------------
if not os.getenv("YOUTUBE_API_KEY"):
    raise RuntimeError("YOUTUBE_API_KEY not found in environment variables")

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

# --------------------------------------------------
# DB + APP SETUP
# --------------------------------------------------
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="AI Sales Loss Prediction API")

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
    posts = crud.get_or_create_social_posts(db, request)
    summary = pipeline.analyze_posts(db, posts)

    return schemas.SentimentAnalysisResponse(
        product_name=request.product_name,
        platform=request.platform,
        average_sentiment=summary.average_sentiment,
        negative_percentage=summary.negative_percentage,
        total_posts=summary.total_posts,
        start_date=request.start_date,
        end_date=request.end_date,
    )


@app.post("/predict-sales-loss", response_model=schemas.SalesLossPredictionResponse)
def predict_sales_loss(
    request: schemas.SalesLossPredictionRequest,
    db: Session = Depends(get_db),
):
    return pipeline.predict_sales_loss(db, request)


@app.get("/get-dashboard-data", response_model=schemas.DashboardResponse)
def get_dashboard_data(
    product_name: str,
    brand_name: str,
    platform: str,
    db: Session = Depends(get_db),
):
    return pipeline.build_dashboard(db, product_name, brand_name, platform)


@app.get("/comments", response_model=List[schemas.SocialPostOut])
def get_comments(
    product_name: str,
    brand_name: str,
    platform: str,
    sentiment_filter: str | None = None,
    db: Session = Depends(get_db),
):
    # First, get or create comments (fetch from YouTube if needed)
    from datetime import date
    posts = crud.get_or_create_social_posts(
        db,
        schemas.SentimentAnalysisRequest(
            product_name=product_name,
            brand_name=brand_name,
            platform=platform,
            start_date=date.today() - timedelta(days=365),
            end_date=date.today(),
        ),
    )
    
    # Then analyze sentiment for all posts
    if posts:
        pipeline.analyze_posts(db, posts)
    
    # Finally return the comments with sentiment loaded
    return crud.get_comments(db, product_name, brand_name, platform, sentiment_filter)


@app.post("/chat", response_model=schemas.ChatResponse)
def chat(request: schemas.ChatRequest):
    reply = generate_chat_response(request.message)
    return schemas.ChatResponse(reply=reply)

# --------------------------------------------------
# YOUTUBE FETCH ENDPOINT
# --------------------------------------------------

@app.post("/fetch-youtube-comments")
def fetch_youtube_comments_multi_video(
    product_name: str,
    brand_name: str,
    max_videos: int = 3,
    db: Session = Depends(get_db),
):
    # Build a more specific query to avoid unrelated mega-viral results
    query = f"{brand_name} {product_name}".strip()
    comments = fetch_comments_from_top_videos(query, max_videos=max_videos)

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
        "videos_used": f"Top {max_videos} videos by relevance",
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
