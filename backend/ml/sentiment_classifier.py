"""
DistilBERT-based Sentiment Classification Module
Uses pre-trained DistilBERT model for high-quality sentiment analysis
"""

from typing import Dict, Tuple
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification


class DistilBERTSentimentClassifier:
    """
    Wraps DistilBERT for sentiment classification.
    Classifies text as positive, negative, or neutral.
    """

    def __init__(self, device: str = None):
        """
        Initialize the DistilBERT sentiment classifier.
        
        Args:
            device (str): 'cuda' for GPU, 'cpu' for CPU. Auto-detects if None.
        """
        # Auto-detect GPU availability
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.device = device
        self.model_name = "distilbert-base-uncased-finetuned-sst-2-english"
        
        # Load the pipeline (handles model + tokenizer)
        self.classifier = pipeline(
            "sentiment-analysis",
            model=self.model_name,
            device=0 if device == "cuda" else -1  # -1 for CPU, 0 for first GPU
        )
        
        print(f"✓ DistilBERT Sentiment Classifier loaded on {device.upper()}")

    def classify(self, text: str) -> Tuple[str, float]:
        """
        Classify sentiment of text.
        
        Args:
            text (str): Input text to classify
            
        Returns:
            Tuple[str, float]: (sentiment_label, confidence_score)
                - sentiment_label: 'POSITIVE', 'NEGATIVE', or neutral
                - confidence_score: float between 0 and 1
                
        Example:
            label, score = classifier.classify("This product is amazing!")
            # Returns: ('POSITIVE', 0.998)
        """
        if not text or not text.strip():
            return "neutral", 0.0
        
        # Truncate if too long (DistilBERT max is 512 tokens)
        text = text[:512]
        
        try:
            result = self.classifier(text)[0]
            label = result['label'].lower()  # 'POSITIVE' -> 'positive'
            score = result['score']
            
            return label, score
        except Exception as e:
            print(f"Error classifying text: {e}")
            return "neutral", 0.0

    def classify_batch(self, texts: list) -> list:
        """
        Classify multiple texts efficiently.
        
        Args:
            texts (list): List of texts to classify
            
        Returns:
            list: List of (label, score) tuples
        """
        if not texts:
            return []
        
        # Filter empty texts
        texts = [t for t in texts if t and t.strip()]
        
        if not texts:
            return []
        
        try:
            results = self.classifier(texts)
            return [(r['label'].lower(), r['score']) for r in results]
        except Exception as e:
            print(f"Error in batch classification: {e}")
            return [("neutral", 0.0) for _ in texts]

    def convert_to_sentiment_score(self, label: str, score: float) -> float:
        """
        Convert DistilBERT output to sentiment score between -1 and 1.
        
        Args:
            label (str): 'positive', 'negative', or 'neutral'
            score (float): Confidence score from 0 to 1
            
        Returns:
            float: Sentiment score from -1 (very negative) to 1 (very positive)
        """
        if label == "positive":
            return score  # 0 to 1
        elif label == "negative":
            return -score  # 0 to -1
        else:
            return 0.0  # neutral

    def get_sentiment_summary(self, texts: list) -> Dict:
        """
        Get sentiment summary for a list of texts.
        
        Args:
            texts (list): List of texts to analyze
            
        Returns:
            Dict: Contains average_sentiment, positive_count, negative_count, neutral_count
        """
        if not texts:
            return {
                "average_sentiment": 0.0,
                "positive_percentage": 0.0,
                "negative_percentage": 0.0,
                "neutral_percentage": 0.0,
                "total_texts": 0
            }
        
        results = self.classify_batch(texts)
        
        positive_count = sum(1 for label, _ in results if label == "positive")
        negative_count = sum(1 for label, _ in results if label == "negative")
        neutral_count = len(results) - positive_count - negative_count
        
        sentiment_scores = [self.convert_to_sentiment_score(label, score) 
                           for label, score in results]
        average_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0.0
        
        total = len(results)
        
        return {
            "average_sentiment": average_sentiment,
            "positive_percentage": (positive_count / total) * 100,
            "negative_percentage": (negative_count / total) * 100,
            "neutral_percentage": (neutral_count / total) * 100,
            "total_texts": total,
            "positive_count": positive_count,
            "negative_count": negative_count,
            "neutral_count": neutral_count
        }
