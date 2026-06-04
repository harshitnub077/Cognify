import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { IconArrowRight, IconShieldCheck, IconBrain, IconTargetArrow, IconChartPie, IconMenu2, IconX } from '@tabler/icons-react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Home = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = React.useState(false);

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard' }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDemo = async () => {
    const toastId = toast.loading('Creating demo account...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'demo@example.com',
        password: 'password123'
      });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: 'demo@example.com',
            password: 'password123',
            options: { data: { full_name: 'Demo User' } }
          });
          if (signUpError) throw signUpError;
        } else {
          throw error;
        }
      }
      toast.success('Welcome to Cognify!', { id: toastId });
      navigate('/onboarding');
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-lg border-b border-slate-200 dark:border-surface-border transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6" />
            <span className="font-display font-bold text-lg tracking-tight">Cognify</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">How it works</a>
            <a href="#privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary flex items-center gap-2">
                Dashboard <IconArrowRight size={16} />
              </Link>
            ) : (
              <>
                <button onClick={handleDemo} className="btn-ghost">Try Demo</button>
                <button onClick={handleLogin} className="btn-primary">Sign In</button>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-surface-hover text-slate-500 dark:text-slate-400 text-xs font-medium mb-12 border border-slate-200/60 dark:border-surface-border transition-colors hover:bg-slate-100">
            <IconTargetArrow size={14} />
            Strict Mode Enforced
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-8 text-slate-900 dark:text-white">
            Stop wasting hours on <br className="hidden md:block" />
            <span className="text-slate-400 dark:text-slate-500">
              brain-rotting content.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-surface-muted max-w-2xl mx-auto mb-12 leading-relaxed">
            You are wasting countless minutes on videos that do not align with your goals. Cognify is a strict extension that forces you to confront the reality of your consumption and makes you realize you should just close the tab.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-base font-medium px-8 py-3.5 w-full sm:w-auto shadow-sm">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <button onClick={handleLogin} className="btn-primary text-base font-medium px-8 py-3.5 w-full sm:w-auto shadow-sm">
                  Get Started Free
                </button>
                <button onClick={handleDemo} className="bg-white dark:bg-[#111] border border-slate-200 dark:border-surface-border hover:bg-slate-50 dark:hover:bg-[#1a1a1a] text-slate-900 dark:text-white transition-colors text-base font-medium px-8 py-3.5 w-full sm:w-auto rounded-xl">
                  View Demo
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div id="features" className="w-full max-w-6xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <FeatureCard
            icon={IconBrain}
            title="Socratic AI Coach"
            description="A personalized guide that asks the right questions to help you reflect on your habits, without judging."
          />
          <FeatureCard
            icon={IconTargetArrow}
            title="Goal Alignment"
            description="Tell Cognify what you're working on. It scores the content you watch against your real-life goals."
          />
          <FeatureCard
            icon={IconChartPie}
            title="Cognitive Heatmaps"
            description="Visualize the emotional impact of your feed over time. Spot patterns between scrolling and your mood."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-surface-border py-12 text-center text-sm text-slate-500 dark:text-surface-muted">
        <div className="flex items-center justify-center gap-2 mb-4">
          <IconShieldCheck size={18} />
          <span>Privacy first. Your data never leaves your device unencrypted.</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Cognify. All rights reserved.</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="p-8 rounded-2xl bg-white dark:bg-surface-card border border-slate-100 dark:border-surface-border flex flex-col gap-5 shadow-sm transition-all hover:shadow-md"
  >
    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-surface-hover flex items-center justify-center text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-surface-border">
      <Icon size={20} stroke={1.5} />
    </div>
    <div>
      <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-surface-muted leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

export default Home;
