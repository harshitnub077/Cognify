import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { DashboardLayout } from './layouts/DashboardLayout';
import { useAuthStore } from './store/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { ScrollToTop } from './components/ScrollToTop';
import { SmoothScroll } from './components/SmoothScroll';

// Code-split all page components with React.lazy
const Home = React.lazy(() => import('./pages/Home'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Mirror = React.lazy(() => import('./pages/dashboard/Mirror'));
const Goals = React.lazy(() => import('./pages/dashboard/Goals'));
const History = React.lazy(() => import('./pages/dashboard/History'));
const Coach = React.lazy(() => import('./pages/dashboard/Coach'));
const Saved = React.lazy(() => import('./pages/dashboard/Saved'));
const Circles = React.lazy(() => import('./pages/dashboard/Circles'));
const Settings = React.lazy(() => import('./pages/dashboard/Settings'));
const AnnualReport = React.lazy(() => import('./pages/report/AnnualReport'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
});

const LoadingSpinner = () => (
  <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
    <div className="w-7 h-7 border-2 border-slate-200 dark:border-[#1a1a1a] border-t-primary rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const location = useLocation();
  // Key off only the top-level route segment (e.g. "/" | "/dashboard" | "/onboarding")
  // This prevents DashboardLayout from being destroyed/remounted on sub-route changes.
  // The PageTransition inside DashboardLayout handles the inner animations.
  const topLevelKey = '/' + location.pathname.split('/')[1];
  
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={topLevelKey}>
          <Route path="/" element={<SmoothScroll><Home /></SmoothScroll>} />
          <Route path="/report/:year" element={<AnnualReport />} />
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            } 
          >
            <Route index element={<Dashboard />} />
            <Route path="mirror" element={<Mirror />} />
            <Route path="goals" element={<Goals />} />
            <Route path="history" element={<History />} />
            <Route path="coach" element={<Coach />} />
            <Route path="saved" element={<Saved />} />
            <Route path="circles" element={<Circles />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="/auth/v1/callback" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth/callback" element={<Navigate to="/dashboard" replace />} />

          {/* 404 Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </React.Suspense>
  );
};


function App() {
  const { initialize } = useAuthStore();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Toaster 
          position="top-center"
          toastOptions={{
            className: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl',
            style: {
              background: 'var(--bg-color, #fff)',
              color: 'var(--text-color, #0f172a)',
            },
          }}
        />
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
