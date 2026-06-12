"""
Cognify NLP API — main entry point.

Architecture:
  - Startup: initializes shared embedder, Qdrant client, semantic cache, content store
  - Routers: analyze, coach, recommend, health
  - Middleware: CORS (dev origins), request timing
"""
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import analyze, recommend, health, search
from routers.coach import router as coach_router


# ── Startup / Shutdown lifecycle ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Initialize all shared resources exactly once at startup.
    Keeps model loading out of the critical request path.
    """
    print("🚀 Cognify NLP API starting up...")

    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    embedder = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    print("✅ Embedder loaded (sentence-transformers/all-MiniLM-L6-v2)")

    # 2. Connect to local Qdrant
    from qdrant_client import QdrantClient
    qdrant_path = os.path.join(os.path.dirname(__file__), "qdrant_db")
    os.makedirs(qdrant_path, exist_ok=True)
    qdrant_client = QdrantClient(path=qdrant_path)
    print(f"✅ Qdrant connected at {qdrant_path}")

    # 3. Initialize semantic cache (Qdrant collection)
    from services.semantic_cache import init_semantic_cache
    init_semantic_cache(embedder, qdrant_client)
    print("✅ Semantic cache ready")

    # 3.5 Initialize semantic chunking
    from services.semantic_chunking import init_semantic_chunking
    init_semantic_chunking(embedder)
    print("✅ Semantic chunking ready")

    # 4. Initialize content store (Qdrant collection)
    from services.content_store import init_content_store
    init_content_store(embedder, qdrant_client)
    print("✅ Content store ready")

    # 5. Check Ollama availability (async, non-blocking)
    from services.llm_router import _check_ollama
    ollama_ok = await _check_ollama()
    if ollama_ok:
        print("✅ Ollama is running — local LLM active (zero cost!)")
    else:
        print("⚠️  Ollama not running — will use Groq → Gemini fallback")
        print("   To enable: install Ollama + run 'ollama run llama3'")

    print("🎯 Cognify NLP API ready!\n")
    yield

    # Shutdown
    print("👋 Cognify NLP API shutting down...")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Cognify NLP API",
    version="2.0.0",
    description="""
    AI-powered content intelligence backend for Cognify.
    
    Features:
    - **Smart LLM Router**: Ollama (local) → Groq → Gemini — always zero cost
    - **Semantic Cache**: Qdrant embedding cache, skips LLM for similar videos
    - **Agentic Coach**: ReAct-style drift analysis with 6 parallel analysis tools
    - **Semantic Search**: Natural language search over personal content history
    - **Parallel Analysis**: Emotion + toxicity + insight run concurrently
    """,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",   # alt dev port
    "http://localhost:3001",   # backend (for internal calls)
]

# Add production frontend URL if configured
prod_origin = os.getenv("FRONTEND_URL")
if prod_origin:
    ALLOWED_ORIGINS.append(prod_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Process-Time-Ms"] = str(duration_ms)
    if duration_ms > 3000:
        print(f"⚠️  Slow request: {request.method} {request.url.path} took {duration_ms}ms")
    return response


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analyze.router)
app.include_router(recommend.router)
app.include_router(coach_router)
app.include_router(health.router)
app.include_router(search.router)


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": "Cognify NLP API",
        "version": "2.0.0",
        "docs": "/docs",
        "status": "running",
        "features": [
            "Smart LLM Router (Ollama → Groq → Gemini)",
            "Semantic Cache (Qdrant, >95% similarity threshold)",
            "Agentic Drift Coach",
            "Semantic Personal History Search",
            "Parallel NLP Analysis",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
