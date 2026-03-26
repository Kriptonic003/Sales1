import sys
import os

# Add the backend directory and its parents to sys.path
backend_dir = r"c:\Sales1\backend"
sys.path.append(backend_dir)
os.chdir(backend_dir)

from services.youtube_service import is_hindi_script, is_english, contains_hinglish

test_texts = [
    "This is a great product!",
    "मुझे यह बहुत पसंद है", # Hindi script
    "Bhai bahut acha hai", # Hinglish
    "It works perfectly fine",
    "kya baat hai samsung", # Hinglish
    "samsung s23 is best",
    "bakwaas product yaar", # Hinglish
    "very bad experience",
]

with open(r'c:\Sales1\tmp\verify_results.txt', 'w', encoding='utf-8') as f:
    for text in test_texts:
        h_script = is_hindi_script(text)
        en = is_english(text)
        hinglish = contains_hinglish(text)
        filtered = h_script or (not en) or hinglish
        f.write(f"TEXT: {text}\n")
        f.write(f"  H-Script: {h_script}, English: {en}, Hinglish: {hinglish} -> FILTERED: {filtered}\n\n")
