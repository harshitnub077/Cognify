# Cognify 🧠: Agentic Content Intelligence

Cognify is an AI-powered, conscious content intelligence platform engineered to cure mindless scrolling. It operates as an **autonomous Agentic RAG system**, actively analyzing a user's digital diet (YouTube, Twitter) and providing real-time, personalized reality checks to align their content consumption with their stated life goals.

## 🌟 Core Architecture & Engineering Feats

Built for extreme performance and zero cloud compute cost, the backend architecture relies on advanced NLP techniques, local vector databases, and smart LLM routing.

### 1. Agentic RAG "Drift Coach"
- **Contextual Awareness**: The agent retrieves the user’s last 20 consumed videos/articles from a vector database and maps them against the user's life goals.
- **Harsh but Fair Coach**: Using the Groq Llama 3 model, it generates a "Drift Score" (0-100), a brutal 1-sentence reality check, and actionable algorithmic fixes.

### 2. Multi-LLM Smart Router with Fallback
- Designed a custom **Smart LLM Router** that transparently cascades requests to ensure 100% uptime with **Zero Cost**.
- **Priority Cascade**: 
  1. Groq API (Llama 3, lightning fast, free tier) 
  2. Gemini 2.0 Flash (free tier fallback)
- Features Redis-backed daily quota tracking and automatic failovers.

### 3. Local Vector Embeddings & Semantic Caching
- **HuggingFace Embeddings**: Bypassed paid OpenAI embeddings by running `sentence-transformers/all-MiniLM-L6-v2` locally within the FastAPI runtime.
- **Qdrant Vector DB**: Utilized a local Qdrant instance to store consumed content vectors.
- **0.95 Similarity Cache**: Engineered a semantic cache layer. Before calling the LLM to analyze a video, it embeds the title and queries Qdrant. If a >0.95 similarity match is found, it bypasses the LLM entirely, saving massive compute.

### 4. Fully Async Python Backend
- High-concurrency **FastAPI** backend utilizing `asyncio.gather` for simultaneous web-scraping, embedding generation, and LLM inferences.
- Uses `asyncio.to_thread` for CPU-bound tasks (like local HuggingFace embeddings) to prevent event loop blocking.

## 🏗 Tech Stack
- **AI & NLP Engine**: Python 3.11, FastAPI, HuggingFace (`sentence-transformers`), Qdrant, Groq (Llama 3), Gemini.
- **Backend Infrastructure**: Node.js, Express, Prisma ORM, PostgreSQL, Redis (Caching/Quotas).
- **Frontend**: React 18, Vite, Tailwind CSS, Zustand.
- **Extension**: Chrome Manifest V3 side-panel extension.

## 🚀 Local Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- Qdrant (Docker)
- Redis

### 1. Python NLP Service (Core AI Engine)
```bash
cd cognify-nlp
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 2. Database & Express Backend
```bash
cd backend
npm install
cp ../.env.example .env # Fill in DB credentials
npx prisma db push
npm run dev
```

### 3. React Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔒 Security & Performance
- **Zero-Paid APIs**: The entire NLP architecture is engineered to run free and fast using local models + free tier cloud GPUs (Groq).
- **Concurrency Control**: Async data pipelines prevent starvation during peak load.
- Input validated via `pydantic` and `zod`.
