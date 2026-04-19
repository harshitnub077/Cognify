# 🚀 FeedShift Startup Guide

Follow these steps to get the entire FeedShift ecosystem (Extension, Dashboard, and Backend) running on your local machine.

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **Supabase Account**: You'll need a project URL and an anon/service key.
- **OpenAI API Key**: For the Layer 5 AI classification.

---

## 2. Database Setup (Supabase)
1. Create a new project in [Supabase](https://supabase.com/).
2. Run the SQL migrations found in `/supabase/migrations/` in your Supabase SQL Editor:
   - `001_initial.sql`
   - `002_subscriptions.sql` (if you want payment support)
3. Ensure the tables `profiles`, `diet_events`, and `subscriptions` are created.

---

## 3. Backend Setup
1. Open a terminal in `/feedshift/backend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your `.env` file:
   - `SUPABASE_URL` & `SUPABASE_SERVICE_KEY`
   - `OPENAI_API_KEY`
   - `YOUTUBE_DATA_API_KEY`
   - `PORT=3001`
4. Start the backend:
   ```bash
   npm run dev
   ```

---

## 4. Dashboard Setup
1. Open a terminal in `/feedshift/dashboard`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `BACKEND_URL=http://localhost:3001`
4. Start the dashboard:
   ```bash
   npm run dev
   ```

---

## 5. Chrome Extension Setup
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer Mode**.
3. Click **Load unpacked** and select the `/feedshift/extension` folder.
4. Click the FeedShift icon and select **Complete Setup**.

---

## 6. Testing the Flow
1. **Onboarding**: Complete the onboarding.
2. **Focus Mode**: Toggle "Study Mode" ON.
3. **YouTube**: Go to YouTube and verify filtering.
4. **Analytics**: Visit `http://localhost:3000/dashboard`.
