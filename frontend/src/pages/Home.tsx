import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BrainCircuit, Activity, LineChart, Sparkles, LogIn } from 'lucide-react';
import { IconBrandGoogle } from '@tabler/icons-react';
import { useAuthStore } from '../store/useAuthStore';
import { Logo } from '../components/Logo';
import { PageTransition } from '../components/PageTransition';

const Home = () => {
  const { user } = useAuthStore();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background-light dark:bg-[#0f0f13] overflow-hidden relative selection:bg-primary/30">
        
        {/* Animated Background Gradients */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[150px] pointer-events-none" 
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 -right-40 w-[800px] h-[800px] rounded-full bg-accent/20 blur-[150px] pointer-events-none" 
        />

        <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="flex items-center gap-3 text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
          >
            <Logo />
            Cognify
          </motion.div>
          
          <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', bounce: 0.5 }}
          >
            <button onClick={() => setIsAuthOpen(true)} className="btn-primary flex items-center gap-2">
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          </motion.div>
        </nav>

        <main className="relative z-20 max-w-7xl mx-auto px-6 pt-16 pb-32">
          
          <AnimatePresence mode="wait">
            {!isAuthOpen ? (
              <motion.div 
                key="hero"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                className="grid lg:grid-cols-2 gap-16 items-center"
              >
                
                {/* Hero Content */}
                <div className="text-left z-20">
                  <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-primary/30 text-primary mb-8 font-medium shadow-[0_0_20px_rgba(124,58,237,0.2)]">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Next-Gen Content Intelligence</span>
                  </motion.div>
                  
                  <motion.h1 variants={itemVariants} className="font-display text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[1.1]">
                    Master Your <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-accent to-purple-400 drop-shadow-sm">
                      Digital Mind
                    </span>
                  </motion.h1>
                  
                  <motion.p variants={itemVariants} className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-xl leading-relaxed font-light">
                    Stop mindless scrolling. Cognify analyzes your content diet in real-time using Agentic AI, helping you build unbreakable focus and alignment with your life goals.
                  </motion.p>

                  <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4">
                    <button onClick={() => setIsAuthOpen(true)} className="btn-primary text-lg px-8 py-4 flex items-center justify-center w-full sm:w-auto shadow-[0_0_30px_rgba(124,58,237,0.4)] group">
                      Get Started Free
                      <motion.span 
                        className="ml-2 inline-block"
                        group-hover={{ x: 5 }}
                        transition={{ type: "spring" }}
                      >→</motion.span>
                    </button>
                  </motion.div>
                </div>

                {/* 3D Floating Dashboard Mockup */}
                <motion.div
                  variants={itemVariants}
                  style={{ perspective: 1200 }}
                  className="relative hidden lg:block z-10"
                >
                  <motion.div 
                    animate={{ rotateY: [-5, 5, -5], rotateX: [2, -2, 2], y: [-10, 10, -10] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full aspect-[4/3] glass-panel rounded-2xl border border-white/10 shadow-[0_20px_70px_-10px_rgba(124,58,237,0.3)] overflow-hidden"
                  >
                    {/* Mockup Header */}
                    <div className="h-12 border-b border-white/10 bg-black/40 flex items-center px-4 gap-2 backdrop-blur-md">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    {/* Mockup Body */}
                    <div className="p-6 grid grid-cols-2 gap-4 h-full bg-gradient-to-br from-[#1a1a24] to-[#0f0f13]">
                      <div className="space-y-4">
                        <div className="h-28 rounded-xl glass-card p-4 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
                          <div className="flex justify-between items-center mb-2">
                            <div className="w-1/2 h-3 bg-white/10 rounded-full" />
                            <BrainCircuit className="w-6 h-6 text-primary" />
                          </div>
                          <div className="w-3/4 h-8 bg-primary/30 rounded-md mt-6" />
                        </div>
                        <div className="h-32 rounded-xl glass-card p-4">
                           <div className="flex justify-between items-center mb-4">
                            <div className="w-1/3 h-3 bg-white/10 rounded-full" />
                            <Activity className="w-6 h-6 text-accent" />
                          </div>
                          <div className="flex gap-2 items-end h-16">
                            {[40, 70, 45, 90, 65, 80].map((h, i) => (
                               <motion.div 
                                 key={i} 
                                 initial={{ height: 0 }}
                                 animate={{ height: `${h}%` }}
                                 transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                 className="flex-1 bg-gradient-to-t from-accent/20 to-accent/80 rounded-t-sm" 
                               />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl glass-card p-4 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 blur-xl" />
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          className="w-32 h-32 rounded-full border-4 border-dashed border-primary/30 border-t-primary/80" 
                        />
                        <div className="absolute font-display font-bold text-2xl text-white">98%</div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>

              </motion.div>
            ) : (
              /* High-end Login/Signup Modal Section */
              <motion.div 
                key="auth"
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -50 }}
                transition={{ type: 'spring', damping: 20 }}
                className="max-w-md mx-auto mt-10 z-50 relative"
              >
                <div className="glass-panel p-10 rounded-3xl relative overflow-hidden shadow-[0_0_100px_rgba(124,58,237,0.3)] border border-primary/20">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
                  
                  <div className="text-center mb-8">
                    <motion.div 
                      animate={{ rotate: [0, 10, -10, 0] }} 
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-block mb-4"
                    >
                      <Logo className="w-16 h-16 mx-auto" />
                    </motion.div>
                    <h2 className="font-display text-4xl font-bold mb-2">Welcome Back</h2>
                    <p className="text-slate-400">Initialize your neural sync.</p>
                  </div>

                  <div className="space-y-4">
                    <button 
                      onClick={handleGoogleLogin} 
                      className="w-full flex items-center justify-center gap-3 glass-card py-4 rounded-xl font-medium hover:bg-white/5 transition-all group"
                    >
                      <IconBrandGoogle className="w-5 h-5 group-hover:text-accent transition-colors" />
                      Continue with Google
                    </button>
                    
                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-transparent text-slate-500">Or use Developer Sandbox</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleLogin} 
                      className="w-full flex items-center justify-center gap-3 btn-primary py-4 rounded-xl font-medium"
                    >
                      <BrainCircuit className="w-5 h-5" />
                      Generate Demo Identity
                    </button>
                  </div>

                  <button 
                    onClick={() => setIsAuthOpen(false)}
                    className="mt-8 text-sm text-slate-500 hover:text-white transition-colors w-full text-center"
                  >
                    ← Back to Home
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feature Cards (Only show when auth is closed) */}
          <AnimatePresence>
            {!isAuthOpen && (
              <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="grid md:grid-cols-3 gap-8 mt-32 relative z-10"
              >
                  <FeatureCard 
                      icon={<Activity className="w-8 h-8 text-primary" />}
                      title="Drift Tracking"
                      description="Monitor your attention drift in real-time as you consume content."
                  />
                  <FeatureCard 
                      icon={<BrainCircuit className="w-8 h-8 text-accent" />}
                      title="AI Analysis"
                      description="Deep semantic understanding of whether content aligns with your goals."
                  />
                  <FeatureCard 
                      icon={<LineChart className="w-8 h-8 text-primary" />}
                      title="Habit Analytics"
                      description="Visualize your progress and build streaks of conscious consumption."
                  />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </PageTransition>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <motion.div 
      whileHover={{ y: -10, scale: 1.02 }}
      className="glass-card p-8 text-left cursor-default group relative overflow-hidden"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-500 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
            {icon}
        </div>
        <h3 className="font-display text-2xl font-bold mb-3">{title}</h3>
        <p className="text-slate-400 leading-relaxed font-light">{description}</p>
    </motion.div>
);

export default Home;
