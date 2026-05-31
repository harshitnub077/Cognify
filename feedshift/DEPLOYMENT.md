# 🚀 FeedShift Production Deployment Guide

Your codebase is now production-ready. Follow these steps to take FeedShift live so anyone can use it.

## 1. Deploy the Backend (Railway / Render / Heroku)
We recommend **Railway** for the backend because it's fast and supports Node.js natively.

1. Go to [Railway.app](https://railway.app/) and connect your GitHub account.
2. Create a new project and select "Deploy from GitHub repo".
3. Point it to your `feedshift/backend` directory.
4. **Environment Variables**: Add the following to your Railway project settings:
   - `PORT=8080` (or whatever Railway assigns)
   - `OPENAI_API_KEY=your_real_openai_key`
   - `SUPABASE_URL=https://your-id.supabase.co`
   - `SUPABASE_SERVICE_KEY=your_service_role_key`
5. Once deployed, copy the new production URL (e.g., `https://feedshift-api.up.railway.app`).

## 2. Deploy the Dashboard (Vercel)
Vercel is the perfect host for our Next.js dashboard.

1. Go to [Vercel.com](https://vercel.com/) and create a new project.
2. Import your GitHub repository.
3. Set the "Root Directory" to `dashboard`.
4. **Environment Variables**: Add these in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL=https://your-id.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key`
   - `BACKEND_URL=https://feedshift-api.up.railway.app` (The URL you got from step 1)
5. Click **Deploy**. Vercel will give you a domain like `feedshift.vercel.app`.

## 3. Update Supabase & Google Auth
Now that you have real URLs, you need to update your auth providers so they allow production logins.

### In Supabase:
1. Go to **Authentication > URL Configuration**.
2. Set the **Site URL** to your Vercel domain (e.g., `https://feedshift.vercel.app`).
3. Add `https://feedshift.vercel.app/auth/callback` to the **Redirect URLs**.

### In Google Cloud Console:
1. Go to your OAuth Client ID settings.
2. Add your Vercel domain to **Authorized JavaScript origins**.
3. Add your Supabase Callback URL to **Authorized redirect URIs**.

## 4. Publish the Chrome Extension
1. Open `extension/src/classify.js` and `background.js` and update any `http://localhost:3000` or `3001` URLs to point to your new Vercel/Railway production URLs.
2. Go to your `extension` folder and zip it: `zip -r feedshift-extension.zip .`
3. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
4. Pay the $5 registration fee (if you haven't already).
5. Upload `feedshift-extension.zip`.
6. Fill out the store listing details, upload the icon I generated (`feedshift_extension_icon.png`), and link to the `PRIVACY_POLICY.md`.
7. Submit for review!

---
**Congratulations!** You have built a complete, AI-powered SaaS product. 
