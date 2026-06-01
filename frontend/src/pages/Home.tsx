import React from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BrainCircuit, Activity, LineChart, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Logo } from '../components/Logo';
import { PageTransition } from '../components/PageTransition';

const Home = () => {
  const { user } = useAuthStore();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async () => {
    const email = `demo_${Math.floor(Math.random()*1000)}@cognify.dev`;
    const { error } = await supabase.auth.signUp({
        email,
        password: 'password123',
        options: {
            data: { full_name: 'Demo User' }
        }
    });

    if (error) {
        console.error('Login error:', error);
    } else {
        await supabase.auth.signInWithPassword({ email, password: 'password123' });
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) {
      console.error('Google login error:', error);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background-light dark:bg-background-dark overflow-hidden relative selection:bg-primary/30">
        {/* Background gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

        <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
          >
            <Logo />
            Cognify
          </motion.div>
          
          <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
          >
            <button onClick={handleLogin} className="btn-primary">
              Start Journey
            </button>
          </motion.div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 font-medium">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered Content Intelligence</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Take Control of Your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  Digital Consciousness
                </span>
              </h1>
              
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-xl leading-relaxed">
                Stop mindless scrolling. Cognify analyzes your content diet in real-time, helping you build healthier consumption habits through actionable intelligence.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button onClick={handleGoogleLogin} className="btn-primary text-lg px-8 py-4 flex items-center justify-center w-full sm:w-auto">
                  Sign In with Google
                </button>
                <button onClick={handleLogin} className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
                  Try Developer Sandbox
                </button>
              </div>
            </motion.div>

            {/* 3D Floating Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: -20 }}
              animate={{ opacity: 1, x: 0, rotateY: -8 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ perspective: 1000 }}
              className="relative hidden lg:block"
            >
              <div 
                className="w-full aspect-[4/3] rounded-2xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
                style={{ transform: 'rotateX(3deg) rotateY(-8deg)', transformStyle: 'preserve-3d' }}
              >
                {/* Mockup Header */}
                <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                {/* Mockup Body */}
                <div className="p-6 grid grid-cols-2 gap-4 h-full bg-slate-50 dark:bg-slate-900">
                  <div className="space-y-4">
                    <div className="h-24 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <BrainCircuit className="w-5 h-5 text-primary" />
                      </div>
                      <div className="w-3/4 h-8 bg-primary/20 rounded-md mt-4" />
                    </div>
                    <div className="h-32 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                       <div className="flex justify-between items-center mb-4">
                        <div className="w-1/3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <Activity className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex gap-2 items-end h-16">
                        {[40, 70, 45, 90, 65, 80].map((h, i) => (
                           <div key={i} className="flex-1 bg-accent/40 rounded-t-sm" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col">
                    <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-700 rounded-full mb-6" />
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full border-8 border-primary/20 border-t-primary animate-[spin_10s_linear_infinite]" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements to enhance 3D effect */}
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-8 -top-8 glass-panel p-4 rounded-xl flex items-center gap-3"
                style={{ transform: 'translateZ(50px)' }}
              >
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-lg">
                  <LineChart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">+12% Focus</p>
                  <p className="text-xs text-slate-500">Since last week</p>
                </div>
              </motion.div>
            </motion.div>

          </div>

          {/* Feature Cards */}
          <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid md:grid-cols-3 gap-6 mt-24"
          >
              <FeatureCard 
                  icon={<Activity className="w-6 h-6 text-primary" />}
                  title="Drift Tracking"
                  description="Monitor your attention drift in real-time as you consume content."
              />
              <FeatureCard 
                  icon={<BrainCircuit className="w-6 h-6 text-accent" />}
                  title="AI Analysis"
                  description="Deep semantic understanding of whether content aligns with your goals."
              />
              <FeatureCard 
                  icon={<LineChart className="w-6 h-6 text-primary" />}
                  title="Habit Analytics"
                  description="Visualize your progress and build streaks of conscious consumption."
              />
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="glass-panel p-8 rounded-2xl text-left hover:-translate-y-1 transition-transform duration-300 group cursor-default">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
);

export default Home;
