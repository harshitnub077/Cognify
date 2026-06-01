# Cognify 🧠

Cognify is an AI-powered conscious content intelligence platform designed to cure mindless scrolling. It analyzes your content diet across YouTube, Instagram, and Twitter, scoring it against your personal goals to help you align your digital habits with your ideal self.

## 🌟 Key Features
- **Identity Drift Tracking**: Real-time monitoring of how far your content consumption drifts from your life goals.
- **Socratic AI Coach**: A Claude-powered coach that never gives direct advice—only insightful, psychologically probing questions.
- **Goal-Aligned Recommendations**: Replaces algorithm slot-machines with curated content perfectly mapped to your "Deep Thinker" or "Mindful Creator" goals.
- **Annual Mind Report**: A Spotify-Wrapped style retrospective of your digital year with PDF export capabilities.
- **Accountability Circles**: Private, privacy-first leaderboards to stay aligned with friends without sharing specific viewing history.
- **Gamification**: Earn XP, unlock trophies, and maintain streaks for conscious consumption.

## 🏗 Architecture
Cognify is a robust microservice architecture:
1. **Frontend**: React 18, Vite, Tailwind CSS, Zustand, React Query, Recharts.
2. **Backend**: Node.js, Express, Prisma ORM, PostgreSQL.
3. **NLP Engine**: Python 3.11, FastAPI, HuggingFace Transformers (Toxicity/Emotion detection).
4. **Extension**: Chrome Manifest V3 side-panel extension injecting AI analytics directly into social platforms.

## 🚀 Setup Instructions

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL
- Redis (for BullMQ / NLP caching)

### 1. Database & Backend
```bash
cd backend
npm install
cp ../.env.example .env # Fill in your DB credentials
npx prisma db push
npx prisma generate
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
cp ../.env.example .env # Fill in your Supabase and API URLs
npm run dev
```

### 3. Python NLP Service
```bash
cd cognify-nlp
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## 🔒 Production Security
- Configured with `helmet.js` and `express-rate-limit`.
- Inputs validated via `zod`.
- Error tracking integrated via `@sentry/node` and `@sentry/react`.
- Google Analytics 4 tracking.
