import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { PageTransition } from '../components/PageTransition';
import { Logo } from '../components/Logo';
import api from '../lib/api';

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
            setError("Please select at least one identity to continue.");
            return;
        }
        if (step === 2 && reduceGoals.length === 0) {
            setError("Please select at least one goal to continue.");
            return;
        }
        
        if (step < 3) setStep(step + 1);
        else handleComplete();
    };

    const handleComplete = async () => {
        if (platforms.length === 0) {
            setError("Please select at least one platform to continue.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await api.post('/user/onboarding', {
                identities,
                reduceGoals,
                platforms
            });
            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || "Failed to save your preferences. Please try again.");
            setLoading(false);
        }
    };

    const toggleIdentity = (identity: string) => {
        if (identities.includes(identity)) {
            setIdentities(identities.filter(i => i !== identity));
        } else {
            if (identities.length >= 3) {
                setError("You can only select up to 3 identities.");
                return;
            }
            setError(null);
            setIdentities([...identities, identity]);
        }
    };

    const toggleReduceGoal = (goal: string) => {
        if (reduceGoals.includes(goal)) {
            setReduceGoals(reduceGoals.filter(g => g !== goal));
        } else {
            setError(null);
            setReduceGoals([...reduceGoals, goal]);
        }
    };

    const togglePlatform = (platform: string) => {
        if (platforms.includes(platform)) {
            setPlatforms(platforms.filter(p => p !== platform));
        } else {
            setError(null);
            setPlatforms([...platforms, platform]);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
                 <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-[#00C9A7]/20 blur-[100px] pointer-events-none" />
                 <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] rounded-full bg-[#6C4FF6]/20 blur-[100px] pointer-events-none" />

                <div className="w-full max-w-3xl relative z-10">
                    <div className="flex justify-center mb-12">
                        <Logo className="w-16 h-16" />
                    </div>

                    <div className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 p-8 md:p-12 rounded-3xl relative overflow-hidden min-h-[500px]">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col"
                                >
                                    <h2 className="text-3xl font-bold mb-2">Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'Explorer'} 👋</h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">Who are you striving to be? (Pick up to 3)</p>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                                        {IDENTITIES.map(identity => {
                                            const isSelected = identities.includes(identity);
                                            return (
                                                <button 
                                                    key={identity}
                                                    onClick={() => toggleIdentity(identity)}
                                                    className={`relative flex items-center p-4 rounded-xl border-2 transition-all duration-300 text-left font-medium ${
                                                        isSelected 
                                                        ? 'bg-[#6C4FF6]/10 border-[#6C4FF6] text-[#6C4FF6]' 
                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#6C4FF6]/40'
                                                    }`}
                                                >
                                                    {identity}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {error && (
                                        <div className="mb-4 flex items-center gap-2 text-red-500 font-medium">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="mt-auto flex justify-between items-center">
                                        <span className="text-sm text-slate-500 font-medium">Step 1 of 3</span>
                                        <button onClick={handleNext} className="bg-[#6C4FF6] hover:bg-[#5A3EE0] text-white px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2">
                                            Continue <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col"
                                >
                                    <h2 className="text-3xl font-bold mb-2">Cleanse Your Feed</h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">What type of content do you want to reduce?</p>
                                    
                                    <div className="flex flex-wrap gap-3 mb-8">
                                        {REDUCE_GOALS.map(goal => {
                                            const isSelected = reduceGoals.includes(goal);
                                            return (
                                                <button 
                                                    key={goal}
                                                    onClick={() => toggleReduceGoal(goal)}
                                                    className={`px-5 py-3 rounded-full border-2 transition-all font-medium ${
                                                        isSelected 
                                                        ? 'bg-[#00C9A7]/10 border-[#00C9A7] text-[#009E83] dark:text-[#00C9A7]' 
                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#00C9A7]/40'
                                                    }`}
                                                >
                                                    {goal}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {error && (
                                        <div className="mb-4 flex items-center gap-2 text-red-500 font-medium">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="mt-auto flex justify-between items-center">
                                        <span className="text-sm text-slate-500 font-medium">Step 2 of 3</span>
                                        <div className="flex gap-3">
                                            <button onClick={() => setStep(1)} className="px-6 py-3 rounded-full font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                                Back
                                            </button>
                                            <button onClick={handleNext} className="bg-[#6C4FF6] hover:bg-[#5A3EE0] text-white px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2">
                                                Continue <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col"
                                >
                                    <h2 className="text-3xl font-bold mb-2">Connect Your Digital Life</h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">Which platforms do you want Cognify to monitor?</p>
                                    
                                    <div className="flex flex-wrap gap-3 mb-8">
                                        {PLATFORMS.map(platform => {
                                            const isSelected = platforms.includes(platform);
                                            return (
                                                <button 
                                                    key={platform}
                                                    onClick={() => togglePlatform(platform)}
                                                    className={`px-5 py-3 rounded-full border-2 transition-all font-medium flex items-center gap-2 ${
                                                        isSelected 
                                                        ? 'bg-[#6C4FF6]/10 border-[#6C4FF6] text-[#6C4FF6]' 
                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#6C4FF6]/40'
                                                    }`}
                                                >
                                                    {isSelected && <Check className="w-4 h-4" />}
                                                    {platform}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {error && (
                                        <div className="mb-4 flex items-center gap-2 text-red-500 font-medium">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="mt-auto flex justify-between items-center">
                                        <span className="text-sm text-slate-500 font-medium">Step 3 of 3</span>
                                        <div className="flex gap-3">
                                            <button onClick={() => setStep(2)} disabled={loading} className="px-6 py-3 rounded-full font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                                                Back
                                            </button>
                                            <button onClick={handleComplete} disabled={loading} className="bg-[#6C4FF6] hover:bg-[#5A3EE0] text-white px-8 py-3 rounded-full font-medium transition-colors flex items-center gap-2 disabled:opacity-70 min-w-[160px] justify-center">
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default Onboarding;
