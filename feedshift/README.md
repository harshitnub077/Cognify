# FeedShift 🎯

> Intercept YouTube's feed. Filter by your interests. Retrain the algorithm.

FeedShift is a Chrome Extension + Node.js backend + Next.js dashboard that classifies every YouTube video against your personal interest profile, hides irrelevant videos, and programmatically sends "Not Interested" signals to retrain YouTube's recommendation engine.

---

## 📁 Monorepo Structure

```
feedshift/
├── extension/          Chrome Extension (Manifest V3, vanilla JS)
├── backend/            Node.js + Express classifier API
├── dashboard/          Next.js 14 App Router dashboard
└── shared/             Shared TypeScript types
```

---

## 🚀 Local Development

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.0.0 |
| npm | ≥ 10.0.0 |
| Chrome | Latest stable |
| Redis | Optional (in-memory fallback used if absent) |

---

### 1. Backend (Express API)

```bash
cd feedshift/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in: OPENAI_API_KEY, YOUTUBE_DATA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Start dev server (hot-reload via --watch)
npm run dev
# → http://localhost:3001
```

**Available endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/classify` | Classify a single video |
| `POST` | `/classify/batch` | Classify multiple videos |
| `GET` | `/profile/:userId` | Get user profile |
| `POST` | `/profile` | Create / update profile |
| `POST` | `/signal` | Record learning signal |
| `POST` | `/signal/batch` | Bulk signal flush |
| `GET` | `/health` | Server health check |

---

### 2. Dashboard (Next.js 14)

```bash
cd feedshift/dashboard

# Install dependencies
npm install

# Configure environment
# Create .env.local:
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
BACKEND_URL=http://localhost:3001
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
EOF

# Start dev server
npm run dev
# → http://localhost:3000
```

**Pages:**

| Route | Description |
|-------|-------------|
| `/` | Landing / login |
| `/dashboard` | Content diet dashboard |
| `/dashboard/settings` | Profile editor |
| `/parent` | Parent monitoring view |

---

### 3. Chrome Extension

No build step needed — vanilla JS with ES modules.

```bash
# 1. Open Chrome → chrome://extensions/
# 2. Enable "Developer mode" (top right toggle)
# 3. Click "Load unpacked"
# 4. Select: feedshift/extension/
# 5. FeedShift icon appears in toolbar
# 6. Onboarding page opens automatically on first install
```

> **Important:** The backend must be running on `http://localhost:3001` for the AI classification (Layer 5) to work. Layers 1–4 work fully offline.

---

## 🧠 5-Layer Classification Engine

| Layer | Trigger | Speed |
|-------|---------|-------|
| **Cache** | Video seen before | ~0ms |
| **2 — Blocked Keywords** | Title contains blocked topic | ~1ms |
| **3 — Confirmed Keywords** | Title contains confirmed topic | ~1ms |
| **4 — Channel Trust** | Trust score ≥ 80 or ≤ 20 | ~1ms |
| **5 — AI (GPT-4o-mini)** | All other videos | ~500ms |

---

## 🗄️ Supabase Schema

Run this in your Supabase SQL editor:

```sql
-- Profiles table
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Signals table
create table signals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null,
  video_id text,
  video_title text,
  watch_percent int,
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table signals enable row level security;
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | GPT-4o-mini classification |
| `YOUTUBE_DATA_API_KEY` | ✅ | Video metadata enrichment |
| `SUPABASE_URL` | ✅ | Profile storage |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Backend Supabase access |
| `REDIS_URL` | ❌ | Cache (in-memory fallback if absent) |
| `PORT` | ❌ | Default: 3001 |

### Dashboard (`dashboard/.env.local`)
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `BACKEND_URL` | ❌ | Default: http://localhost:3001 |
| `RAZORPAY_KEY_ID` | ✅ | Payments |
| `RAZORPAY_KEY_SECRET` | ✅ | Payments |

---

## 📦 Install All Packages at Once

```bash
# From the feedshift/ root
cd feedshift/backend && npm install && cd ..
cd dashboard && npm install && cd ..
```

---

## 🧑‍💻 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push and open a Pull Request

---

## 📜 License

MIT © FeedShift Contributors
