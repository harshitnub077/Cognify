import React, { useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { IconArrowRight, IconShieldCheck, IconBrain, IconTargetArrow, IconChartPie, IconMenu2, IconX, IconLock, IconSparkles } from '@tabler/icons-react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

const blurReveal = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 30 },
  visible: { opacity: 1, filter: "blur(0px)", y: 0 }
};

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
    const toastId = toast.loading('Logging into demo account...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'demo@example.com',
        password: 'password123'
      });
      if (error) throw error;
      toast.success('Welcome to Cognify!', { id: toastId });
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-white/20 selection:text-white bg-[#000000] text-white overflow-hidden relative font-sans">
      
      {/* Premium Grey/Black Geometric 4K Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.9 }}
          transition={{ duration: 2.5, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/bg-1.jpg')" }}
        />
        {/* Dark Overlays for text legibility (Fixed to not hide the image) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-[#050505]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent h-[60vh] bottom-0" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/40 backdrop-blur-2xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <Logo className="w-6 h-6 text-white" />
            <span className="font-display font-bold text-lg tracking-tight">Cognify</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400"
          >
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden md:flex items-center gap-3"
          >
            {user ? (
              <Link to="/dashboard" className="h-10 px-6 rounded-full bg-white text-black font-semibold text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                Dashboard <IconArrowRight size={16} />
              </Link>
            ) : (
              <>
                <button onClick={handleDemo} className="h-10 px-5 rounded-full text-slate-300 font-semibold text-sm hover:text-white hover:bg-white/5 transition-colors">Try Demo</button>
                <button onClick={handleLogin} className="h-10 px-6 rounded-full bg-white text-black font-semibold text-sm flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  Sign In
                </button>
              </>
            )}
          </motion.div>

          <button className="md:hidden p-2 text-white relative z-50" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-48 pb-20 px-6 text-center relative z-10 w-full max-w-[1600px] mx-auto">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-white text-xs font-semibold border border-white/10 backdrop-blur-xl shadow-2xl mb-12"
          >
            <IconSparkles size={14} className="text-slate-300" />
            <span className="tracking-[0.2em] uppercase text-slate-300">Strict Mode Enforced</span>
          </motion.div>

          <motion.h1 
            variants={blurReveal}
            initial="hidden"
            animate="visible"
            transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-5xl md:text-[84px] font-bold tracking-tight leading-[1.05] mb-8 text-white drop-shadow-2xl"
          >
            Reclaim your mind from <br className="hidden md:block" />
            <span className="tracking-tighter font-medium text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-600">
              algorithmic noise.
            </span>
          </motion.h1>

          <motion.p 
            variants={blurReveal}
            initial="hidden"
            animate="visible"
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-slate-400/90 max-w-2xl mx-auto mb-14 leading-[1.8] font-medium tracking-wide"
          >
            You are wasting countless minutes on videos that do not align with your goals. Cognify is a strict extension that forces you to confront the reality of your consumption.
          </motion.p>

          <motion.div 
            variants={blurReveal}
            initial="hidden"
            animate="visible"
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto"
          >
            {user ? (
              <Link to="/dashboard" className="h-14 px-8 rounded-full bg-white text-black font-semibold text-base flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] w-full sm:w-auto">
                Go to Dashboard <IconArrowRight size={18} />
              </Link>
            ) : (
              <>
                <button onClick={handleLogin} className="group relative h-14 px-10 rounded-full bg-white text-black font-bold text-base flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] w-full sm:w-auto overflow-hidden">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white via-slate-200 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="relative z-10 flex items-center gap-2">Get Started Free <IconArrowRight size={18} /></span>
                </button>
                <button onClick={handleDemo} className="h-14 px-10 rounded-full bg-[#0a0a0a]/50 border border-white/10 text-white font-semibold text-base hover:bg-white/10 hover:border-white/20 transition-colors w-full sm:w-auto backdrop-blur-xl shadow-xl">
                  View Demo
                </button>
              </>
            )}
          </motion.div>
        </div>

        {/* Premium Glow Bento Grid - Smaller Sizes */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          id="features" 
          className="w-full max-w-5xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-12 gap-5 text-left relative z-10"
        >
          {/* Socratic AI Coach - Large Card */}
          <PremiumCard 
            icon={IconBrain} 
            title="Socratic AI Coach" 
            description="A personalized guide that asks the right questions to help you reflect on your habits, without judging."
            className="md:col-span-7 min-h-[260px]"
            glowColor="rgba(255, 255, 255, 0.05)"
          >
            {/* Minimalist abstract UI element inside the card */}
            <div className="absolute right-0 bottom-0 w-1/2 h-1/2 border-t border-l border-[#333] rounded-tl-2xl bg-gradient-to-br from-[#111] to-[#050505] p-5 shadow-2xl opacity-50 overflow-hidden translate-x-12 translate-y-12 group-hover:translate-x-8 group-hover:translate-y-8 transition-transform duration-700">
              <div className="h-2 w-12 bg-[#222] rounded-full mb-3"></div>
              <div className="h-2 w-full bg-[#333] rounded-full mb-2"></div>
              <div className="h-2 w-4/5 bg-[#333] rounded-full"></div>
            </div>
          </PremiumCard>

          {/* Strict Enforcement - Tall Card */}
          <PremiumCard 
            icon={IconLock} 
            title="Strict Enforcement" 
            description="Blocks cheap dopamine triggers and reroutes you to curated content."
            className="md:col-span-5 min-h-[260px]"
            glowColor="rgba(255, 0, 0, 0.05)"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-500/10 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          </PremiumCard>

          {/* Goal Alignment - Wide Card */}
          <PremiumCard 
            icon={IconTargetArrow} 
            title="Goal Alignment" 
            description="Tell Cognify what you're working on. It scores the content you watch against your real-life goals."
            className="md:col-span-6 min-h-[220px]"
            glowColor="rgba(255, 255, 255, 0.05)"
          >
             <div className="absolute top-1/2 right-6 -translate-y-1/2 opacity-[0.08] group-hover:opacity-15 transition-opacity duration-700 pointer-events-none">
                <IconTargetArrow size={120} stroke={1} />
             </div>
          </PremiumCard>

          {/* Cognitive Heatmaps - Wide Card */}
          <PremiumCard 
            icon={IconChartPie} 
            title="Cognitive Heatmaps" 
            description="Visualize the emotional impact of your feed over time and spot patterns."
            className="md:col-span-6 min-h-[220px]"
            glowColor="rgba(255, 255, 255, 0.05)"
          >
            <div className="absolute bottom-0 left-0 w-full h-1/2 opacity-20 pointer-events-none overflow-hidden">
               {/* Abstract graph simulation */}
               <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full text-[#555] stroke-current stroke-[2] fill-none">
                 <path d="M0,100 L0,50 Q100,0 200,60 T400,20 L400,100 Z" className="fill-[#111] stroke-none" />
                 <path d="M0,50 Q100,0 200,60 T400,20" />
               </svg>
            </div>
          </PremiumCard>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-8 text-center text-xs text-slate-500 relative z-10 bg-[#050505]/80 backdrop-blur-2xl">
        <div className="flex items-center justify-center gap-2 mb-3 font-medium">
          <IconShieldCheck size={16} />
          <span>Privacy first. Your data never leaves your device unencrypted.</span>
        </div>
        <p className="font-medium">&copy; {new Date().getFullYear()} Cognify. All rights reserved.</p>
      </footer>
    </div>
  );
};

const PremiumCard = ({ icon: Icon, title, description, className, children, glowColor = "rgba(255,255,255,0.05)" }: any) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative rounded-[24px] bg-[#080808] border border-[#222] overflow-hidden transition-colors hover:border-[#444] shadow-2xl flex flex-col p-8",
        className
      )}
    >
      {/* Dynamic Hover Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 rounded-[24px]"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`,
        }}
      />
      
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#111] via-transparent to-transparent opacity-50" />

      {/* Internal Elements */}
      {children}

      <div className="w-12 h-12 rounded-xl bg-[#151515] flex items-center justify-center text-white border border-[#333] mb-6 shadow-inner relative z-10">
        <Icon size={24} stroke={1.5} />
      </div>
      <div className="relative z-10 mt-auto">
        <h3 className="font-display text-2xl font-bold text-white mb-2 tracking-tight drop-shadow-sm">{title}</h3>
        <p className="text-slate-400 leading-relaxed font-medium text-sm max-w-md">{description}</p>
      </div>
    </div>
  );
};

export default Home;
