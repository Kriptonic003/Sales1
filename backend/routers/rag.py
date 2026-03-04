"""
routers/rag.py — RAG chatbot endpoints
POST /rag/chat  — upload file + question → AI answer
Supported: PDF, DOCX, XLSX/XLS, CSV, PPTX, TXT, MD
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

_rag_executor = ThreadPoolExecutor(max_workers=1)

from services.rag_service import SUPPORTED_EXTENSIONS, run_rag
from schemas import RagChatResponse

router = APIRouter(tags=["RAG Chatbot"])

# Human-readable label for the error message
SUPPORTED_LABEL = "PDF, DOCX, XLSX, CSV, PPTX, TXT, MD"


@router.post("/chat", response_model=RagChatResponse)
async def rag_chat(
    file: UploadFile = File(..., description="Sales data file to analyse"),
    question: str = Form(..., description="Question to ask about the file"),
):
    """
    One-shot RAG endpoint.
    Upload a supported file and ask any question — returns an AI-generated answer
    grounded in the file content, plus the source text chunks used.
    Supported formats: PDF, DOCX, XLSX/XLS, CSV, PPTX, TXT, MD
    """
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported formats: {SUPPORTED_LABEL}",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 20 MB.")

    question = question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        # run_rag is CPU-bound (embedding + LLM). Run in a thread so we
        # don't block the uvicorn event loop and crash the worker process.
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            _rag_executor,
            partial(run_rag, file_bytes, filename, question),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {e}")

    return RagChatResponse(
        answer=result["answer"],
        llm_used=result["llm_used"],
        source_chunks=result["source_chunks"],
    )

