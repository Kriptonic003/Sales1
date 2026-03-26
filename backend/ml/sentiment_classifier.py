"""
DistilBERT-based Sentiment Classification Module
Uses pre-trained DistilBERT model for high-quality sentiment analysis
"""

from typing import Dict, Tuple, List
import torch
import os
import json
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage


class TargetedSentimentClassifier:
    """
    Uses Groq LLM to classify sentiment specifically towards a product.
    Resolves false positives where competitors or the video itself are praised.
    """
    def __init__(self, model_name: str = "llama-3.1-8b-instant", temperature: float = 0.0):
        self.model_name = model_name
        self.temperature = temperature
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not self.api_key:
            print("WARNING: GROQ_API_KEY not set. Targeted sentiment will fallback to neutral.")
            
    def classify_batch(self, texts: List[str], product_name: str) -> List[Tuple[str, float]]:
        """
        Classifies a batch of texts towards the specified product.
        Returns a list of (label, confidence) tuples.
        """
        if not texts:
            return []
            
        if not self.api_key:
            return [("neutral", 0.0) for _ in texts]
            
        system_prompt = f"""You are an expert aspect-based sentiment analyzer.
Your task is to analyze the sentiment of user comments strictly towards the product: '{product_name}'.
Rules:
1. Ignore praise or criticism focused on competitors, alternative products, or the video/content creator.
2. If the comment says a competitor is better, the sentiment towards '{product_name}' is negative (or neutral if they just mention it without comparison).
3. If the comment is completely unrelated to '{product_name}', mark it as neutral.
4. Output STRICTLY IN JSON format.

Output format:
{{
  "results": [
    {{"label": "positive"|"negative"|"neutral", "confidence": <float 0.8>}}
  ]
}}
Your output array MUST have exactly {len(texts)} elements, matching the order of input comments."""

        truncated_texts = [str(t)[:500] for t in texts]
        
        user_prompt = "Comments to analyze:\n"
        for i, text in enumerate(truncated_texts):
            user_prompt += f"{i+1}. {text}\n"

        try:
            llm = ChatGroq(
                model=self.model_name, 
                groq_api_key=self.api_key, 
                temperature=self.temperature
            ).bind(response_format={"type": "json_object"})
            
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])
            
            parsed = json.loads(response.content)
            results = parsed.get("results", [])
            
            output = []
            for i in range(len(texts)):
                if i < len(results):
                    lbl = str(results[i].get("label", "neutral")).lower()
                    if lbl not in ["positive", "negative", "neutral"]:
                        lbl = "neutral"
                    try:
                        conf = float(results[i].get("confidence", 0.8))
                    except:
                        conf = 0.8
                    output.append((lbl, conf))
                else:
                    output.append(("neutral", 0.0))
            return output
        except Exception as e:
            print(f"Error in Groq ABSA: {e}")
            return [("neutral", 0.0) for _ in texts]

    def convert_to_sentiment_score(self, label: str, score: float) -> float:
        label = label.lower()
        if label == "positive": return score
        elif label == "negative": return -score
        else: return 0.0




class LocalSarcasmDetector:
    """
    Local sarcasm detection using a specialized RoBERTa model.
    Helps filter out false positives in sentiment analysis.
    """
    def __init__(self, device: str | None = None):
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.device = device
        # Using already-cached irony model (Twitter-trained)
        self.model_name = "cardiffnlp/twitter-roberta-base-irony"
        
        self.detector = pipeline(
            "text-classification",
            model=self.model_name,
            device=0 if device == "cuda" else -1
        )
        print(f"INFO: Local Sarcasm (Irony) Detector loaded on {device.upper()}")

    def is_sarcastic(self, text: str, threshold: float = 0.80) -> bool:
        """
        Returns True if the text is detected as sarcastic (ironic) with confidence above threshold.
        Includes a 'Contrast Check' safeguard to prevent false positives on genuine extreme praise.
        """
        if not text or not text.strip():
            return False
            
        text_lower = text.lower()
        
        # 1. Failure Indicators (Words that suggest something went wrong)
        failure_indicators = [
            'broke', 'stop', 'fail', 'bad', 'waste', 'worst', 'issue', 'faulty', 
            'return', 'refund', 'slow', 'disappointing', 'garbage', 'trash',
            'not working', 'didn\'t work', 'day one', 'week one'
        ]
        
        # 2. Sincerity Markers (Words that suggest genuine extreme satisfaction)
        sincerity_markers = [
            'perfectly', 'flawlessly', 'champ', 'best ever', 'must buy', 
            'highly recommend', 'no issues', 'no complaints', 'love it', 'amazing'
        ]
        
        has_failure = any(word in text_lower for word in failure_indicators)
        has_sincerity = any(word in text_lower for word in sincerity_markers)
        
        try:
            # Truncate to avoid model limits
            text_truncated = text[:500]
            result = self.detector(text_truncated)[0]
            
            label = result['label'].upper()
            score = result['score']
            
            # ML detection
            is_ironic_ml = (label in ['IRONY', 'LABEL_1'] and score >= threshold)
            
            # CONTRAST CHECK LOGIC:
            # - If ML says it's ironic AND we have a failure word -> Sarcasm (True)
            # - If it has extreme sincerity markers and no failure words -> NOT Sarcasm (False)
            # - Otherwise, trust the ML only if it has a failure indicator.
            if is_ironic_ml:
                if has_sincerity and not has_failure:
                    return False  # Likely extreme genuine praise
                return has_failure  # Only flip if there's a reason to believe it's sarcasm
                
            return False
            
        except Exception as e:
            print(f"Error in sarcasm detection: {e}")
            return False


class DistilBERTSentimentClassifier:
    """
    Wraps DistilBERT for sentiment classification.
    Classifies text as positive, negative, or neutral.
    """

    def __init__(self, device: str | None = None, neutral_threshold: float = 0.55):
        """
        Initialize the DistilBERT sentiment classifier.
        
        Args:
            device (str): 'cuda' for GPU, 'cpu' for CPU. Auto-detects if None.
            neutral_threshold (float): Confidence threshold below which text is classified as neutral.
                                      Default 0.55 (55% confidence required for positive/negative)
                                      Values close to 0.5 catch borderline/ambiguous text as neutral
        """
        # Auto-detect GPU availability
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.device = device
        # Use a model that supports 3-way classification (positive, negative, neutral)
        # cardiffnlp model is trained on Twitter data and explicitly recognizes neutral sentiment
        self.model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"
        self.neutral_threshold = neutral_threshold  # Confidence threshold for neutral classification
        
        # Load the pipeline (handles model + tokenizer)
        self.classifier = pipeline(
            "sentiment-analysis",
            model=self.model_name,
            device=0 if device == "cuda" else -1  # -1 for CPU, 0 for first GPU
        )
        
        print(f"INFO: DistilBERT Sentiment Classifier loaded on {device.upper()}")
        print(f"  Neutral threshold: {self.neutral_threshold:.0%} confidence")
        print(f"  Texts with confidence < {self.neutral_threshold:.0%} are classified as NEUTRAL")

    def classify(self, text: str) -> Tuple[str, float]:
        """
        Classify sentiment of text.
        
        Args:
            text (str): Input text to classify
            
        Returns:
            Tuple[str, float]: (sentiment_label, confidence_score)
                - sentiment_label: 'positive', 'negative', or 'neutral'
                - confidence_score: float between 0 and 1
                
        Example:
            label, score = classifier.classify("This product is amazing!")
            # Returns: ('positive', 0.998)
            
            label, score = classifier.classify("It's okay")
            # Returns: ('neutral', 0.55) - low confidence, so neutral
        """
        if not text or not text.strip():
            return "neutral", 0.0

        # Simple character truncation — avoid calling tokenizer directly
        # (fast tokenizer is not re-entrant; calling encode() then pipeline() causes 'Already borrowed')
        text = text[:500]
        
        try:
            result = self.classifier(text)[0]
            label = result['label'].lower()  # 'POSITIVE' -> 'positive'
            confidence = result['score']
            
            # Map label names if needed (cardiffnlp might use slightly different names)
            label_map = {
                'positive': 'positive',
                'negative': 'negative', 
                'neutral': 'neutral',
                'positive label': 'positive',
                'negative label': 'negative',
                'neutral_label': 'neutral',
            }
            label = label_map.get(label, label)  # Map to standard names
            
            # If confidence is low, could override to neutral
            # But with this new model, we trust its neutral classification
            if confidence < self.neutral_threshold and label in ['positive', 'negative']:
                return 'neutral', (1.0 - confidence)
            
            return label, confidence
            
            return label, confidence
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
            
            output = []
            label_map = {
                'positive': 'positive',
                'negative': 'negative', 
                'neutral': 'neutral',
            }
            
            for r in results:
                label = r['label'].lower()
                confidence = r['score']
                
                # Map labels
                label = label_map.get(label, label)
                
                # Apply neutral threshold only if needed
                if confidence < self.neutral_threshold and label in ['positive', 'negative']:
                    label = 'neutral'
                
                output.append((label, confidence))
            
            return output
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
                   0 for neutral
        """
        label = label.lower()
        
        if label == "positive":
            return score  # 0 to 1
        elif label == "negative":
            return -score  # 0 to -1
        else:  # neutral
            return 0.0

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
