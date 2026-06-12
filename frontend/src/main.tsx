import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react";
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import './index.css'
import App from './App.tsx'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  integrations: [],
  tracesSampleRate: 1.0,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary fallback={<p className="p-8 text-center text-red-500">An unexpected error occurred. Please refresh.</p>}>
      <Sentry.ErrorBoundary fallback={<p className="p-8 text-center text-red-500">An unexpected error occurred. Please refresh.</p>}>
        <App />
      </Sentry.ErrorBoundary>
    </GlobalErrorBoundary>
  </StrictMode>
)
