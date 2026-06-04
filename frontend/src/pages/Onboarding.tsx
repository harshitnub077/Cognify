import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IconCheck, IconArrowRight, IconLoader2, IconAlertCircle } from '@tabler/icons-react';
import { useAuthStore } from '../store/useAuthStore';
import { PageTransition } from '../components/PageTransition';
import { Logo } from '../components/Logo';
import api from '../lib/api';
import { cn } from '../lib/utils';

const IDENTITIES = [
  "Focused Developer", "Calm Thinker", "Creative Creator",
  "Disciplined Achiever", "Mindful Human", "Career Builder",
  "Deep Learner", "Healthy Lifestyle", "Entrepreneur",
  "Critical Thinker", "Empathetic Leader", "Digital Minimalist"
];

const REDUCE_GOALS = [
  "Rage bait", "Mindless scrolling", "Toxic content",
  "Negative comparisons", "Fake news", "Sexist content",
  "Doom scrolling", "Addictive shorts"
];

const PLATFORMS = [
  "YouTube", "Instagram", "Twitter/X", "Reddit",
  "LinkedIn", "TikTok", "News sites"
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [identities, setIdentities] = useState<string[]>([]);
  const [reduceGoals, setReduceGoals] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleNext = () => {
    setError(null);
    if (step === 1 && identities.length === 0) {
      setError("Please select at least one identity."); return;
    }
    if (step === 2 && reduceGoals.length === 0) {
      setError("Please select at least one goal."); return;
    }
    if (step < 3) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = async () => {
    if (platforms.length === 0) {
      setError("Please select at least one platform."); return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/user/onboarding', { identities, reduceGoals, platforms });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save preferences.");
      setLoading(false);
    }
  };

  const toggleItem = (item: string, list: string[], setList: (l: string[]) => void, max?: number) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      if (max && list.length >= max) {
        setError(`Select up to ${max} items.`); return;
      }
      setError(null);
      setList([...list, item]);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 dark:bg-[#050505] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl relative z-10">
          <div className="flex justify-center mb-8">
            <Logo className="w-10 h-10" />
          </div>

          <div className="card p-6 sm:p-10 min-h-[480px] flex flex-col relative overflow-hidden">
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn("w-2 h-2 rounded-full transition-colors", step >= i ? "bg-primary" : "bg-slate-200 dark:bg-surface-border")} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <StepContent key="1"
                  title={`Welcome, ${user?.user_metadata?.full_name?.split(' ')[0] || 'Explorer'} 👋`}
                  subtitle="Who are you striving to be? (Pick up to 3)"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                    {IDENTITIES.map(id => (
                      <Chip key={id} active={identities.includes(id)} onClick={() => toggleItem(id, identities, setIdentities, 3)}>
                        {id}
                      </Chip>
                    ))}
                  </div>
                </StepContent>
              )}

              {step === 2 && (
                <StepContent key="2" title="Cleanse Your Feed" subtitle="What type of content do you want to reduce?">
                  <div className="flex flex-wrap gap-2 mb-8">
                    {REDUCE_GOALS.map(goal => (
                      <Chip key={goal} active={reduceGoals.includes(goal)} onClick={() => toggleItem(goal, reduceGoals, setReduceGoals)}>
                        {goal}
                      </Chip>
                    ))}
                  </div>
                </StepContent>
              )}

              {step === 3 && (
                <StepContent key="3" title="Connect Platforms" subtitle="Which platforms do you want Cognify to monitor?">
                  <div className="flex flex-wrap gap-2 mb-8">
                    {PLATFORMS.map(platform => (
                      <Chip key={platform} active={platforms.includes(platform)} onClick={() => toggleItem(platform, platforms, setPlatforms)}>
                        {platforms.includes(platform) && <IconCheck size={14} className="mr-1 inline" />} {platform}
                      </Chip>
                    ))}
                  </div>
                </StepContent>
              )}
            </AnimatePresence>

            {error && (
              <div className="mt-auto mb-4 flex items-center gap-2 text-red-500 text-sm font-medium">
                <IconAlertCircle size={16} /> <span>{error}</span>
              </div>
            )}

            <div className={cn("mt-auto flex items-center gap-3", step === 1 ? "justify-end" : "justify-between")}>
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} disabled={loading} className="btn-secondary px-6">Back</button>
              )}
              <button onClick={handleNext} disabled={loading} className="btn-primary flex items-center gap-2 px-8">
                {loading ? <IconLoader2 size={18} className="animate-spin" /> : step === 3 ? 'Complete' : 'Continue'}
                {!loading && step < 3 && <IconArrowRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

const StepContent = ({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 flex flex-col">
    <h2 className="section-title mb-2 text-center">{title}</h2>
    <p className="section-subtitle text-center mb-8">{subtitle}</p>
    {children}
  </motion.div>
);

const Chip = ({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-4 py-2.5 rounded-xl border text-sm font-medium transition-all text-left",
      active
        ? "bg-slate-900 dark:bg-white text-white dark:text-black border-transparent shadow-sm"
        : "bg-slate-50 dark:bg-surface-hover border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-[#444]"
    )}
  >
    {children}
  </button>
);

export default Onboarding;
