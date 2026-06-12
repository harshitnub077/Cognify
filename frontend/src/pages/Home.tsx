import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import { Logo } from '../components/Logo';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import api from '../lib/api';
import NeuralBackground from '../components/NeuralBackground';
import Extension3DBackground from '../components/Extension3DBackground';
import FeatureBackground from '../components/FeatureBackground';
import ArchitectureBackground from '../components/ArchitectureBackground';
import { SmoothScroll } from '../components/SmoothScroll';
import { CustomCursor } from '../components/CustomCursor';
import dashboardHeroImg from '../assets/dashboard-hero.png';
import {
  IconArrowRight, IconShieldLock, IconBrain, IconTargetArrow,
  IconCpu, IconActivity,
  IconStar,
  IconBrandChrome, IconArrowUpRight, IconCheck, IconSettings, IconShieldCheck,
  IconFileZip, IconPuzzle
} from '@tabler/icons-react';

const ease = [0.22, 1, 0.36, 1] as const;
const slowEase = [0.16, 1, 0.3, 1] as const;

// ─── Reusable Components ──────────────────────────────────────────────────
function Reveal({ children, delay = 0, className, yOffset = 40 }: { children: React.ReactNode; delay?: number; className?: string; yOffset?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y: yOffset }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, ease, delay }}>{children}</motion.div>
  );
}

function Pill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.07] bg-white/[0.025] text-[10px] font-semibold text-slate-400 tracking-[0.15em] uppercase backdrop-blur-md">
      <Icon size={12} className="text-white/50" />
      {label}
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────


function HoverCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const glowRef = useRef<HTMLDivElement>(null);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!glowRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowRef.current.style.background = `radial-gradient(circle 300px at ${x}px ${y}px, rgba(255,255,255,0.06), transparent 80%)`;
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className={cn("relative overflow-hidden group hover:border-white/[0.15] transition-all duration-700", className)}
    >
      {/* Mouse Follow Glow */}
      <div 
        ref={glowRef}
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      />
      {children}
    </div>
  );
}

// ─── Memoized Telemetry Grid (avoids Math.random() on every render) ──────────
const TELEMETRY_CELLS = Array.from({ length: 120 }, (_, i) => {
  const r1 = Math.random();
  const r2 = Math.random();
  return r1 > 0.85 ? 'high' : r2 > 0.5 ? 'med' : 'low';
});

function TelemetryGrid() {
  return (
    <div className="flex-1 flex items-center justify-center relative w-full mt-auto">
      <div className="w-[120%] flex flex-wrap justify-center gap-1.5 opacity-60 group-hover:scale-105 group-hover:-rotate-2 transition-transform duration-[1.5s] ease-out z-10">
        {TELEMETRY_CELLS.map((level, i) => (
          <div
            key={i}
            className={cn(
              "w-2.5 h-2.5 rounded-[2px]",
              level === 'high' ? "bg-white/[0.28] group-hover:bg-white/[0.45]" : level === 'med' ? "bg-white/[0.08]" : "bg-white/[0.02]"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <section id="features" ref={containerRef} className="pt-8 md:pt-16 pb-4 md:pb-8 px-6 relative z-10 overflow-hidden perspective-[2000px] -mt-24 md:-mt-48">
      {/* 3D Feature Background — perspective grid + data nodes */}
      <FeatureBackground />

      <motion.div style={{ y }} className="max-w-6xl mx-auto relative z-10 transform-gpu">
        <div className="flex flex-col items-center text-center mb-10 relative mt-12 md:mt-24">
          <Reveal yOffset={40} className="relative z-10">
            <Pill icon={IconTargetArrow} label="Cognitive Engine" />
            <h2 className="font-display font-semibold text-white tracking-tight mt-5 mb-4 leading-tight" style={{ fontSize: 'clamp(2rem, 3vw, 3rem)' }}>
              Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500">Autonomy</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
              We replaced restrictive site blockers with a real-time semantic alignment engine. It doesn't block you—it coaches you.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Card 1: Semantic Drift Analysis */}
           <Reveal yOffset={40} className="h-full">
             <HoverCard className="w-full h-[300px] rounded-3xl bg-[#050505] border border-white/[0.05] p-6 flex flex-col relative overflow-hidden group shadow-2xl hover:border-white/[0.1] transition-colors">
               <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative z-20 mb-4">
                 <h3 className="text-lg font-display font-semibold text-white mb-1">Semantic Drift Analysis</h3>
                 <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">Real-time NLP processing of your consumption vectors against your core goals.</p>
               </div>
               <div className="flex-1 flex items-end justify-center relative w-full mt-auto">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.03)_0%,transparent_100%)] pointer-events-none" />
                 <div className="w-full max-w-[300px] h-[160px] border border-white/[0.08] bg-[#030303] rounded-t-xl overflow-hidden shadow-2xl z-10 flex flex-col group-hover:translate-y-2 transition-transform duration-700 ease-out translate-y-4">
                    <div className="h-6 border-b border-white/[0.05] flex items-center px-4 gap-2 bg-[#050505]">
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-700/50" />
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-700/50" />
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-700/50" />
                       <span className="ml-2 text-[9px] font-mono text-slate-500">cognify-nlp-engine</span>
                    </div>
                    <div className="p-3 font-mono text-[10px] text-slate-400 leading-relaxed flex-1 flex flex-col gap-1.5 relative">
                       <div className="flex gap-2"><span className="text-indigo-400/80">vector</span> <span className="text-slate-300">"youtube.com/shorts"</span></div>
                       <div className="flex gap-2 text-slate-500">analyzing semantics...</div>
                       <div className="flex gap-2 opacity-80"><span className="text-emerald-400/80">goal_match:</span> <span>false</span></div>
                       <div className="flex gap-2 opacity-80"><span className="text-rose-400/80">drift_detected:</span> <span>true</span></div>
                    </div>
                 </div>
               </div>
             </HoverCard>
           </Reveal>

           {/* Card 2: Identity Telemetry */}
           <Reveal yOffset={40} delay={0.1} className="h-full">
             <HoverCard className="w-full h-[300px] rounded-3xl bg-[#050505] border border-white/[0.05] p-6 flex flex-col relative overflow-hidden group shadow-2xl hover:border-white/[0.1] transition-colors">
               <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative z-20 mb-4">
                 <h3 className="text-lg font-display font-semibold text-white mb-1">Identity Telemetry</h3>
                 <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">Visualize your entire cognitive footprint and hidden attention graph.</p>
               </div>
               <TelemetryGrid />
             </HoverCard>
           </Reveal>

           {/* Card 3: Socratic Interventions */}
           <Reveal yOffset={40} delay={0.2} className="h-full">
             <HoverCard className="w-full h-[300px] rounded-3xl bg-[#050505] border border-white/[0.05] p-6 flex flex-col relative overflow-hidden group shadow-2xl hover:border-white/[0.1] transition-colors">
               <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative z-20 mb-4">
                 <h3 className="text-lg font-display font-semibold text-white mb-1">Socratic Interventions</h3>
                 <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">AI coaching at the highest leverage moment to break trance gracefully.</p>
               </div>
               <div className="flex-1 flex items-center justify-center relative w-full mt-auto">
                 <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_100%)] blur-2xl pointer-events-none" />
                 <div className="w-[240px] bg-[#0c0c0c]/80 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 shadow-2xl group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-700 ease-out z-10">
                    <div className="text-[11px] font-medium text-slate-200 mb-3 leading-relaxed">Wait. Is this aligned with your goal to "Ship v1.0"?</div>
                    <div className="w-full h-7 bg-white/[0.03] border border-white/[0.08] rounded-md flex items-center px-3 text-[10px] text-slate-500">Type your intent...</div>
                    <div className="w-full h-7 mt-2 bg-white text-black font-bold text-[10px] rounded-md flex items-center justify-center hover:scale-[1.02] transition-transform">Reflect</div>
                 </div>
               </div>
             </HoverCard>
           </Reveal>

           {/* Card 4: Goal Anchoring */}
           <Reveal yOffset={40} delay={0.3} className="h-full">
             <HoverCard className="w-full h-[300px] rounded-3xl bg-[#050505] border border-white/[0.05] p-6 flex flex-col relative overflow-hidden group shadow-2xl hover:border-white/[0.1] transition-colors">
               <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative z-20 mb-4">
                 <h3 className="text-lg font-display font-semibold text-white mb-1">Goal Anchoring</h3>
                 <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">Automatically tie fleeting browser actions back to your long-term intent.</p>
               </div>
               <div className="flex-1 flex items-center justify-center relative w-full mt-auto">
                 <div className="absolute w-[180px] h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent -rotate-45 group-hover:scale-110 transition-transform duration-1000 z-0 pointer-events-none" />
                 <div className="w-12 h-12 rounded-full border border-white/10 bg-[#030303] absolute top-[35%] left-[25%] flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)] backdrop-blur-md group-hover:-translate-x-2 group-hover:-translate-y-2 transition-transform duration-1000 z-10">
                    <IconBrandChrome size={18} className="text-slate-400" />
                 </div>
                 <div className="w-14 h-14 rounded-full border border-white/20 bg-white/[0.05] absolute bottom-[35%] right-[25%] flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] backdrop-blur-md group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-1000 z-10">
                    <IconTargetArrow size={24} className="text-white" />
                 </div>
               </div>
             </HoverCard>
           </Reveal>
        </div>
      </motion.div>
    </section>
  );
}

function OverviewSection() {
  const [activeTab, setActiveTab] = useState(0);

  // Switch tabs every 5 seconds without triggering rapid re-renders
  useEffect(() => {
    const timeout = setTimeout(() => {
      setActiveTab(curr => (curr + 1) % 3);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  const tabs = [
    { title: 'Define Core Goals', desc: 'Input your main objectives. The system uses these goals as a baseline to evaluate whether your browser activity is productive or a distraction.', img: '/goals-demo.png' },
    { title: 'Live Semantic NLP Analysis', desc: 'As you watch YouTube, the AI instantly parses the video transcript and metadata to detect if you are drifting away from your goals.', img: '/youtube-nlp-demo.png?v=2' },
    { title: 'Telemetry Dashboard', desc: 'View your daily cognitive footprint. Track your focus metrics, analyze where your time went, and get data-driven insights to optimize your habits.', img: '/dashboard-telemetry.png' },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section id="methodology" ref={containerRef} className="pt-12 md:pt-16 pb-12 px-6 relative z-10 overflow-hidden -mt-12 md:-mt-24">
       {/* 3D minimalist constellation background */}
       <Extension3DBackground />

       <motion.div style={{ y }} className="max-w-6xl mx-auto relative z-10">
         <Reveal className="text-center mb-20" yOffset={60}>
           <Pill icon={IconSettings} label="The Architecture" />
           <h2 className="font-display font-semibold text-white tracking-tight mt-5 mb-4 leading-tight" style={{ fontSize: 'clamp(2rem, 3vw, 3rem)' }}>
             Regain autonomy <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500">in minutes</span>
           </h2>
           <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
             Map your baseline, run semantic analysis, and let AI intercept cognitive drift before it derails your focus.
           </p>
         </Reveal>

         <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-4 flex flex-col gap-3">
              {tabs.map((tab, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "p-6 rounded-2xl border cursor-pointer transition-all duration-500 interactive relative overflow-hidden group",
                    activeTab === i ? "bg-white/[0.04] border-white/[0.08]" : "bg-transparent border-transparent hover:bg-white/[0.02]"
                  )}
                >
                   {/* Hardware-accelerated Animated Progress Bar Background */}
                   {activeTab === i && (
                     <motion.div 
                       initial={{ width: "0%" }}
                       animate={{ width: "100%" }}
                       transition={{ duration: 5, ease: "linear" }}
                       className="absolute top-0 left-0 bottom-0 bg-white/[0.02] z-0"
                     />
                   )}
                   <div className="relative z-10">
                     <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-3 transition-colors", activeTab === i ? "text-slate-300" : "text-slate-600")}>Step 0{i + 1}</div>
                     <h4 className={cn("text-xl font-display font-semibold mb-2 transition-colors", activeTab === i ? "text-white" : "text-slate-500")}>{tab.title}</h4>
                     <AnimatePresence>
                       {activeTab === i && (
                         <motion.div 
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           className="overflow-hidden"
                         >
                           <p className="text-xs text-slate-400 leading-relaxed pt-2 pb-1">
                             {tab.desc}
                           </p>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                </div>
              ))}
            </div>
            <div className="md:col-span-8 relative w-full aspect-square md:aspect-[16/10]">
               <AnimatePresence>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.97, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.02, y: -16 }}
                    transition={{ duration: 0.6, ease: slowEase }}
                    className="absolute inset-0 rounded-3xl border border-white/[0.05] bg-[#070707] p-2 md:p-3 overflow-hidden shadow-2xl flex items-center justify-center"
                  >
                     <img src={tabs[activeTab].img} alt={tabs[activeTab].title} loading="lazy" decoding="async" className="w-full h-full object-contain rounded-2xl opacity-90" />
                  </motion.div>
               </AnimatePresence>
            </div>
         </div>
       </motion.div>
    </section>
  );
}



// ─── Extension Install Step Card ──────────────────────────────────────────
function StepCard({ step, index }: { step: { num: string; title: string; desc: string; icon: any }; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-5%' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <HoverCard className="relative flex flex-col items-center text-center p-8 rounded-3xl bg-[#050505] border border-white/[0.05] hover:border-white/[0.1] transition-colors shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden group">
        {/* Subtle top edge shimmer */}
        <div className="absolute top-0 left-[25%] right-[25%] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Step number watermark */}
        <div className="absolute top-5 right-6 font-mono text-[42px] font-black text-white/[0.025] select-none leading-none">{step.num}</div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#080808] border border-white/[0.06] flex items-center justify-center mb-6 relative shadow-inner group-hover:border-white/[0.1] transition-colors duration-500">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <step.icon size={26} className="text-slate-400 group-hover:text-slate-200 relative z-10 transition-colors duration-500" stroke={1.5} />
        </div>

        {/* Step label */}
        <span className="text-[9px] font-mono text-slate-600 font-semibold tracking-[0.25em] uppercase mb-3">STEP {step.num}</span>

        <h3 className="text-base font-display font-semibold text-white mb-2 leading-snug">{step.title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed font-light">{step.desc}</p>
      </HoverCard>
    </motion.div>
  );
}

// ─── Live Extension Preview Card ───────────────────────────────────────────
function ExtensionPreviewCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  const logs = [
    { label: 'tab_url', value: '"youtube.com/shorts/abc"', color: 'text-slate-300' },
    { label: 'analyzing', value: 'semantic vectors...', color: 'text-slate-500' },
    { label: 'goal_match', value: 'false', color: 'text-slate-400' },
    { label: 'drift_score', value: '0.92  HIGH', color: 'text-slate-300' },
    { label: 'action', value: 'INTERCEPT triggered', color: 'text-white' },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="mt-16 md:mt-24 relative"
    >
      {/* Ambient glow */}
      <div className="absolute inset-x-[15%] top-[10%] bottom-0 blur-[100px] bg-slate-500/[0.06] rounded-full pointer-events-none" />

      <div className="relative max-w-2xl mx-auto">
        {/* Label pill */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.07] bg-white/[0.025] text-[10px] font-semibold text-slate-400 tracking-[0.15em] uppercase backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            Live Intercept Preview
          </div>
        </motion.div>

        {/* Browser chrome */}
        <motion.div
          className="rounded-2xl border border-white/[0.06] bg-[#050505] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 200, damping: 28 }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] bg-[#030303]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
            </div>
            <div className="flex-1 mx-3 h-6 rounded-md bg-white/[0.03] border border-white/[0.04] flex items-center px-3 gap-2">
              <IconShieldLock size={9} className="text-slate-700" />
              <span className="text-[10px] font-mono text-slate-600">youtube.com/shorts/xH2z...</span>
            </div>
            <div className="w-5 h-5 rounded flex items-center justify-center bg-white/[0.03] border border-white/[0.05]">
              <IconPuzzle size={10} className="text-slate-600" />
            </div>
          </div>

          {/* Two-pane */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: blurred distraction */}
            <div className="relative p-5 border-r border-white/[0.03] min-h-[180px] overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mb-2.5 rounded-full bg-white/[0.04] h-2" style={{ width: `${50 + Math.sin(i * 1.1) * 38}%`, opacity: 0.5 - i * 0.05 }} />
              ))}
              <div className="mt-4 w-full h-16 rounded-lg bg-white/[0.02] border border-white/[0.03]" />
              <div className="absolute inset-0 backdrop-blur-[2px] bg-black/40 flex items-center justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] text-[10px] font-mono text-slate-400">
                  DRIFT DETECTED
                </div>
              </div>
            </div>

            {/* Right: cognify panel */}
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-white/40"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-[9px] font-mono text-slate-600 tracking-[0.2em] font-semibold uppercase">Cognify Active</span>
              </div>

              <div className="font-mono text-[10px] leading-loose space-y-0.5">
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.6 + i * 0.15, duration: 0.5 }}
                    className="flex gap-2"
                  >
                    <span className="text-slate-700">{log.label}:</span>
                    <span className={log.color}>{log.value}</span>
                  </motion.div>
                ))}
              </div>

              {/* Intervention — matches existing Socratic card */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.4, duration: 0.6 }}
                className="mt-1 p-3 rounded-xl bg-[#080808] border border-white/[0.07]"
              >
                <div className="text-[11px] font-medium text-slate-200 mb-2.5 leading-relaxed">
                  Wait. Is this aligned with your goal to "Ship v1.0"?
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-7 rounded-md bg-white text-black flex items-center justify-center text-[10px] font-bold cursor-pointer hover:bg-slate-100 transition-colors">Reflect</div>
                  <div className="flex-1 h-7 rounded-md bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[10px] text-slate-500 cursor-pointer">Continue</div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-2 border-t border-white/[0.04] bg-[#030303]">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-white/[0.15]" />
              <span className="text-[9px] font-mono text-slate-700">Local-first · Zero data leaves your device</span>
            </div>
            <span className="text-[9px] font-mono text-slate-800">cognify v1.0.0</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Extension Section ─────────────────────────────────────────────────────
function ExtensionSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const steps = [
    { num: '01', title: 'Download & Extract', desc: 'Download the cognify.zip file below and extract it to a permanent folder on your computer.', icon: IconFileZip },
    { num: '02', title: 'Developer Mode', desc: 'Open a new tab to chrome://extensions and toggle "Developer mode" on in the top right.', icon: IconSettings },
    { num: '03', title: 'Load Unpacked', desc: 'Click "Load unpacked", select your extracted folder, and pin the Cognify puzzle icon.', icon: IconPuzzle },
  ];

  return (
    <section id="extension" ref={containerRef} className="-mt-8 md:-mt-12 pt-12 md:pt-16 pb-16 px-6 relative z-10 overflow-hidden">

      {/* Perspective grid + data nodes background */}
      <ArchitectureBackground />

      <motion.div style={{ y }} className="max-w-6xl mx-auto relative z-10 transform-gpu">

        {/* Header */}
        <Reveal className="flex flex-col items-center text-center mb-16 md:mb-20" yOffset={40}>
          <Pill icon={IconBrandChrome} label="Browser Extension" />

          <h2
            className="font-display font-semibold text-white tracking-tight mt-5 mb-4 leading-tight"
            style={{ fontSize: 'clamp(2rem, 3vw, 3rem)' }}
          >
            Your cognitive{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500">
              firewall.
            </span>
          </h2>

          <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
            Activate real-time semantic drift analysis across your browser. Download the extension to intercept distractions before they derail your focus.
          </p>

          {/* White CTA — matches hero & feature sections */}
          <a
            href="/cognify-extension.zip"
            download="cognify-extension.zip"
            className="group/btn relative h-14 px-10 bg-white text-black font-bold text-[14px] rounded-full flex items-center justify-center gap-3 hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.12)] mt-8"
          >
            <IconBrandChrome size={20} className="group-hover/btn:rotate-12 transition-transform duration-300" />
            Download for Chrome
            <div className="absolute inset-0 rounded-full border border-white/30 scale-105 opacity-0 group-hover/btn:opacity-100 group-hover/btn:scale-[1.1] transition-all duration-500" />
          </a>
        </Reveal>

        {/* Install Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          <div className="hidden md:block absolute top-8 left-[calc(16.66%+40px)] right-[calc(16.66%+40px)] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent z-0" />
          {steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>

      </motion.div>
    </section>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  // Scroll logic for Nav
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 36));

  // Parallax for Hero
  const heroY = useTransform(scrollY, [0, 1000], [0, 300]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } });
      if (error) throw error;
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDemo = async () => {
    const id = toast.loading('Preparing demo...');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: 'demo@example.com', password: 'password123' });
      if (error) throw error;
      try { await api.post('/user/reset-demo'); } catch (err) { console.error(err); }
      toast.success('Welcome to Cognify', { id });
      navigate('/dashboard');
    } catch (e: any) { toast.error(e.message, { id }); }
  };

  return (
    <SmoothScroll>
      <div className="bg-[#050505] text-white min-h-screen overflow-hidden font-sans no-cursor selection:bg-slate-800 selection:text-white">
        <CustomCursor />

        {/* Global Noise */}
        <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'1.2\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px' }} />

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <motion.header
          className="fixed top-0 left-0 right-0 z-[100]"
          initial={{ y: '-100%' }} animate={{ y: 0 }} transition={{ duration: 1, ease: slowEase, delay: 0.2 }}
        >
          <div className={cn(
            'mx-auto transition-all duration-500 ease-out flex items-center justify-between h-14',
            scrolled ? 'max-w-[900px] mt-4 px-5 rounded-full border border-white/[0.08] bg-[#050505]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]' : 'max-w-7xl px-6 border-b border-white/[0.03] bg-transparent'
          )}>
            <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <Logo className="w-4 h-4 text-white" />
              <span className="font-display text-[13px] font-bold tracking-tight text-white">Cognify</span>
            </div>
            <nav className="hidden md:flex items-center gap-1 p-1 bg-white/[0.02] border border-white/[0.05] rounded-full shadow-[inset_0_0_20px_rgba(255,255,255,0.01)] backdrop-blur-sm">
              {[['Engine', '#features'], ['Method', '#methodology'], ['Extension', '#extension']].map(([l, h]) => (
                <a 
                  key={l} 
                  href={h} 
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector(h)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="px-4 py-1.5 text-[12px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.08] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] rounded-full transition-all duration-300"
                >
                  {l}
                </a>
              ))}
            </nav>
            <div className="hidden md:flex items-center gap-2.5">
              <a href="/cognify-extension.zip" download="cognify-extension.zip" className="h-8 px-3.5 bg-white/[0.03] border border-white/[0.08] text-white text-[12px] font-medium rounded-full hover:bg-white/[0.08] transition-colors flex items-center gap-1.5 interactive">
                <IconBrandChrome size={13} /> Download Extension
              </a>
              {user ? (
                <Link to="/dashboard" className="h-8 px-4 bg-white text-black text-[12px] font-bold rounded-full flex items-center gap-1.5 hover:bg-slate-200 transition-all interactive hover:scale-105 active:scale-95">
                  Dashboard <IconArrowRight size={13} />
                </Link>
              ) : (
                <>
                  <button onClick={handleDemo} aria-label="View Demo" className="h-8 px-3.5 text-[12px] font-medium text-slate-400 hover:text-white transition-colors interactive">Demo</button>
                  <button onClick={handleLogin} aria-label="Launch App" className="h-8 px-4 bg-white text-black text-[12px] font-bold rounded-full flex items-center gap-1.5 hover:bg-slate-200 transition-all shadow-[0_0_16px_rgba(255,255,255,0.1)] interactive hover:scale-105 active:scale-95">
                    Launch <IconArrowRight size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.header>

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="relative pt-[18vh] pb-0 flex flex-col items-center justify-center min-h-[100vh] px-6 z-40">
          
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 z-0 opacity-100 mix-blend-screen pointer-events-none">
            <NeuralBackground />
          </motion.div>
          <div 
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] z-10 pointer-events-none"
            style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
          />

          <div className="relative z-20 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1, ease: slowEase, delay: 0.1 }}>
               <Pill icon={IconCpu} label="Cognitive Alignment Engine" />
            </motion.div>

            <div className="overflow-hidden mt-10 mb-8 flex flex-col items-center">
              <div className="overflow-hidden">
                <motion.h1 initial={{ y: '120%', rotate: 2 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: 1.2, ease: slowEase, delay: 0.2 }} className="font-display font-semibold leading-[1.1] tracking-tighter text-white pb-2 text-center" style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)' }}>
                  Align Every Scroll
                </motion.h1>
              </div>
              <div className="overflow-hidden mt-[-5px] pb-4">
                <motion.h1 
                  initial={{ y: '120%', rotate: -2 }} 
                  animate={{ y: 0, rotate: 0 }} 
                  transition={{ duration: 1.2, ease: slowEase, delay: 0.3 }} 
                  className="font-display font-semibold leading-[1.1] tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-300 to-slate-600 text-center" 
                  style={{ 
                    fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)',
                    filter: 'drop-shadow(0px 10px 30px rgba(255,255,255,0.1))'
                  }}
                >
                  With Your Life Goals
                </motion.h1>
              </div>
            </div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: slowEase, delay: 0.5 }} className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-12 font-light">
              Cognify analyzes your digital consumption, detects attention drift, and delivers AI-powered reality checks to keep you focused on what matters.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: slowEase, delay: 0.6 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <button onClick={user ? () => navigate('/dashboard') : handleLogin} className="w-full sm:w-auto h-12 px-8 bg-white text-black font-bold text-[13px] rounded-full flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 interactive">
                {user ? 'Open Dashboard' : 'Get started now'} <IconArrowRight size={15} />
              </button>
              <button onClick={handleDemo} className="w-full sm:w-auto h-12 px-8 border border-white/[0.12] text-white text-[13px] font-medium rounded-full hover:bg-white/[0.06] transition-colors interactive">
                View demo
              </button>
            </motion.div>

            {/* Zenvix Badges */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1.5 }} className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mt-16 mb-8 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
               <div className="flex items-center gap-2"><IconStar size={14} className="text-slate-400"/> 4.9/5 Rating</div>
               <div className="hidden md:block w-1 h-1 rounded-full bg-slate-800" />
               <div className="flex items-center gap-2"><IconShieldLock size={14} className="text-slate-400"/> Local-first processing</div>
               <div className="hidden md:block w-1 h-1 rounded-full bg-slate-800" />
               <div className="flex items-center gap-2"><IconBrain size={14} className="text-slate-400"/> Live drift tracking</div>
            </motion.div>
          </div>

          {/* Dashboard Mockup Asset - Scales and rotates on scroll */}
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1.5, ease: slowEase }} className="w-full relative px-4 md:px-0 mt-8 h-[360px] sm:h-[500px] md:h-[600px] flex justify-center" style={{ perspective: '2000px' }}>
             <div className="absolute inset-0 bg-slate-500/[0.15] blur-[120px] rounded-[3rem] pointer-events-none h-[360px] sm:h-[500px] md:h-[600px] max-w-6xl mx-auto" />
             <motion.div 
               style={{ 
                 y: useTransform(scrollY, [0, 800], [0, -50]),
                 rotateX: useTransform(scrollY, [0, 800], [0, 25]),
                 scale: useTransform(scrollY, [0, 800], [1.02, 0.9]),
                 transformOrigin: "top center"
               }} 
               className="absolute top-0 z-20 max-w-6xl mx-auto w-full group cursor-pointer px-4 transform-gpu"
             >
               <div className="relative w-full transition-transform duration-700 hover:scale-[1.01] rounded-[2rem] border border-white/[0.05] overflow-hidden shadow-[0_20px_100px_rgba(0,0,0,0.8)]">
                 <div className="relative z-10 rounded-[2rem] overflow-hidden bg-[#050505] h-[360px] sm:h-[500px] md:h-[600px] w-full">
                    {/* Gradient mask to blend the bottom of the image seamlessly into the page background */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-10 pointer-events-none h-full" style={{ background: 'linear-gradient(to top, #050505 2%, transparent 30%)' }} />
                   <img 
                     src="/dashboard-hero.png?v=8" 
                     alt="Cognify Premium Dashboard"
                     fetchPriority="high"
                     loading="eager"
                     decoding="sync"
                     className="relative w-full h-full object-cover object-top opacity-100 transform-gpu" 
                   />
                 </div>
               </div>
             </motion.div>
          </motion.div>
        </section>

        {/* ── FEATURES SHOWCASE ─────────────────────────────────────────────── */}
        <FeatureShowcase />

        {/* ── OVERVIEW TABS ──────────────────────────────────────────────── */}
        <OverviewSection />

        {/* ── EXTENSION SHOWCASE ─────────────────────────────────────────── */}
        <ExtensionSection />



        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer className="pt-24 pb-8 relative z-10 overflow-hidden">
          {/* Static Giant Background Text */}
          <div className="absolute bottom-0 left-0 right-0 w-full flex justify-center pointer-events-none select-none z-0">
            <h1 className="text-[22vw] font-display font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white/[0.03] to-transparent translate-y-[20%]">
              COGNIFY
            </h1>
          </div>

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-24">
              <div className="md:col-span-5 flex flex-col items-start">
                <div className="flex items-center gap-2 mb-6 group cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                  <Logo className="w-5 h-5 text-slate-300" />
                  <span className="font-display text-lg font-semibold text-white tracking-tight">Cognify</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed max-w-sm mb-8 font-light">
                  A digital consciousness layer that quantifies your content diet. We build tools for high-performers to regain alignment with their core goals.
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-white/[0.05] bg-white/[0.02] flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer" title="Chrome Extension">
                    <IconBrandChrome size={14} className="text-slate-400" />
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
                {[
                  { title: 'Product', items: ['Features', 'Dashboard', 'Extension', 'API'] },
                  { title: 'Company', items: ['About', 'Blog', 'Careers', 'Manifesto'] },
                  { title: 'Legal', items: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
                ].map(col => (
                  <div key={col.title}>
                    <div className="text-xs text-white font-medium mb-6">{col.title}</div>
                    <ul className="space-y-4">
                      {col.items.map(l => (
                        <li key={l}>
                          <a href="#" className="text-slate-500 text-sm hover:text-white transition-colors duration-200">
                            {l}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/[0.06]">
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-600 font-medium">© {new Date().getFullYear()} Cognify Systems Inc.</span>
                <span className="hidden md:inline-block w-1 h-1 rounded-full bg-slate-800" />
                <span className="text-xs text-slate-600 font-medium hidden md:inline-block">All rights reserved.</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.05] bg-white/[0.02] text-xs text-slate-400 font-medium">
                <IconShieldCheck size={14} className="text-emerald-500/70" />
                Local-first · Zero telemetry
              </div>
            </div>
          </div>
        </footer>
      </div>
    </SmoothScroll>
  );
}
