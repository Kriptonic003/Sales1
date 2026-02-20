from datetime import date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class SentimentAnalysisRequest(BaseModel):
    product_name: str
    brand_name: str
    platform: str
    start_date: date
    end_date: date


class SentimentAnalysisResponse(BaseModel):
    product_name: str
    platform: str
    average_sentiment: float
    negative_percentage: float
    total_posts: int
    start_date: date
    end_date: date


class SalesLossPredictionRequest(BaseModel):
    product_name: str
    brand_name: str
    platform: str
    start_date: date
    end_date: date


class SalesLossPredictionResponse(BaseModel):
    product_name: str
    brand_name: str
    predicted_drop_percentage: float
    loss_probability: float
    confidence: float
    risk_level: str
    explanation: str


class SentimentDailyPoint(BaseModel):
    date: date
    average_sentiment: float
    total_posts: int


class SalesPoint(BaseModel):
    date: date
    actual_revenue: float
    predicted_revenue: float


class KPISection(BaseModel):
    average_sentiment: float
    negative_percentage: float
    positive_percentage: float
    neutral_percentage: float
    negative_count: int
    positive_count: int
    neutral_count: int
    predicted_sales_drop: float
    risk_level: str


class DashboardResponse(BaseModel):
    kpis: KPISection
    sentiment_trend: List[SentimentDailyPoint]
    sentiment_distribution: dict
    comment_volume: List[SentimentDailyPoint]
    sales_series: List[SalesPoint]
    ai_insights: List[str]
    alerts: List[str]


class SentimentScoreOut(BaseModel):
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    
    class Config:
        from_attributes = True


class SocialPostOut(BaseModel):
    id: int
    platform: str
    product_name: str
    brand_name: str
    posted_at: date
    content: str
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def from_orm(cls, obj):
        """Map ORM object including sentiment relationship"""
        sentiment_label = None
        sentiment_score = None
        
        if hasattr(obj, 'sentiment') and obj.sentiment:
            sentiment_label = obj.sentiment.sentiment_label
            sentiment_score = obj.sentiment.sentiment_score
        
        return cls(
            id=obj.id,
            platform=obj.platform,
            product_name=obj.product_name,
            brand_name=obj.brand_name,
            posted_at=obj.posted_at,
            content=obj.content,
            sentiment_label=sentiment_label,
            sentiment_score=sentiment_score,
        )


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


