import os
import requests


GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

SYSTEM_PROMPT = (
    "You are an AI Sales Analyst Copilot for the FORESIGHT Sales Loss Radar platform. "
    "You specialize in sentiment analysis, sales risk, and business insights. "
    "Answer questions clearly and concisely in business language. "
    "When dashboard data is provided in the context, use it to give specific, data-driven answers. "
    "Keep answers under 150 words unless detail is needed.\n\n"
)


def _call_groq(prompt: str) -> str:
    """Call Groq LLM directly."""
    from langchain_groq import ChatGroq
    from langchain_core.messages import HumanMessage, SystemMessage

    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise ValueError("GROQ_API_KEY not set")

    llm = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=key, temperature=0.4)
    result = llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ])
    return result.content


def _call_gemini(prompt: str) -> str:
    """Fallback: Call Gemini via raw HTTP."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        raise ValueError("GEMINI_API_KEY not set")

    payload = {
        "contents": [{"parts": [{"text": SYSTEM_PROMPT + prompt}]}],
        "generationConfig": {"temperature": 0.4},
    }
    resp = requests.post(
        GEMINI_ENDPOINT, params={"key": key}, json=payload, timeout=20
    )
    resp.raise_for_status()
    data = resp.json()
    return (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    ) or "I could not generate a detailed answer right now."


def generate_chat_response(message: str, context: dict | None = None) -> str:
    """
    Generate a response using Groq (primary) → Gemini (fallback).
    Optionally accepts dashboard/report context dict to ground the answer.
    """
    # Build the user prompt, optionally grounded in live dashboard data
    prompt = message
    if context:
        lines = ["=== Current Dashboard Data ==="]
        for k, v in context.items():
            lines.append(f"- {k}: {v}")
        lines.append(f"\n=== User Question ===\n{message}")
        prompt = "\n".join(lines)

    # Try Groq first
    try:
        return _call_groq(prompt)
    except Exception as groq_err:
        pass  # fall through to Gemini

    # Fallback to Gemini
    try:
        return _call_gemini(prompt)
    except Exception as gem_err:
        return (
            "⚠️ AI service unavailable. "
            "Please check your GROQ_API_KEY in the .env file."
        )


def generate_sentiment_summary(product_name: str, comments: list[str]) -> dict:
    """Extract top positive and negative factors from comments using Groq."""
    import json
    from langchain_groq import ChatGroq
    from langchain_core.messages import HumanMessage, SystemMessage

    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key or not comments:
        return {"positives": [], "negatives": []}

    system_prompt = f"""You are an insightful product analyst.
Based on the following user comments about '{product_name}', identify the overall sentiment.
Provide exactly the top 2-3 positive factors and top 2-3 negative factors.
Make them short, concise bulletin-style points (e.g. "Excellent battery life", "High price").
Output STRICTLY in JSON format.
{{ "positives": ["positive 1"], "negatives": ["negative 1"] }}"""

    sample_comments = comments[:40]
    user_prompt = "Comments:\n" + "\n".join([f"- {c}" for c in sample_comments])

    try:
        llm = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=key, temperature=0.2)
        llm_json = llm.bind(response_format={"type": "json_object"})
        
        response = llm_json.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        
        parsed = json.loads(response.content)
        return {
            "positives": parsed.get("positives", []),
            "negatives": parsed.get("negatives", [])
        }
    except Exception as e:
        print(f"Error extracting summary: {e}")
        return {"positives": [], "negatives": []}

