import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, BookOpen, Monitor, Newspaper, Users, Zap } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { PageTransition } from '../components/PageTransition';
import { Logo } from '../components/Logo';

const Onboarding = () => {
    const [step, setStep] = useState(1);
    const [focusAreas, setFocusAreas] = useState<string[]>([]);
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else handleComplete();
    };

    const handleComplete = async () => {
        navigate('/dashboard');
    };

    const toggleArea = (area: string) => {
        if (focusAreas.includes(area)) {
            setFocusAreas(focusAreas.filter(a => a !== area));
        } else {
            setFocusAreas([...focusAreas, area]);
        }
    };

    const areas = [
      { id: 'Productivity', icon: <Zap className="w-5 h-5" /> },
      { id: 'Learning', icon: <BookOpen className="w-5 h-5" /> },
      { id: 'Entertainment', icon: <Monitor className="w-5 h-5" /> },
      { id: 'News', icon: <Newspaper className="w-5 h-5" /> },
      { id: 'Social', icon: <Users className="w-5 h-5" /> }
    ];

    return (
        <PageTransition>
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-6 relative overflow-hidden">
                 <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-accent/20 blur-[100px] pointer-events-none" />

                <div className="w-full max-w-2xl relative z-10">
                    <div className="flex justify-center mb-12">
                        <Logo className="w-16 h-16" />
                    </div>

                    <div className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden min-h-[400px]">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col"
                                >
                                    <h2 className="text-3xl font-bold mb-4">Welcome to Cognify, {user?.user_metadata?.full_name?.split(' ')[0] || 'Explorer'}</h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">Let's calibrate your intelligence engine.</p>
                                    
                                    <div className="mt-auto flex justify-end">
                                        <button onClick={handleNext} className="btn-primary flex items-center gap-2 group">
                                            Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                                    <h2 className="text-2xl font-bold mb-6">What are your focus areas?</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                        {areas.map(area => {
                                            const isSelected = focusAreas.includes(area.id);
                                            return (
                                                <button 
                                                    key={area.id}
                                                    onClick={() => toggleArea(area.id)}
                                                    className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                                                        isSelected 
                                                        ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/40'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <motion.div 
                                                          initial={{ scale: 0 }} 
                                                          animate={{ scale: 1 }} 
                                                          className="absolute top-2 right-2 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </motion.div>
                                                    )}
                                                    <div className={`mb-2 p-3 rounded-full ${isSelected ? 'bg-primary/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                      {area.icon}
                                                    </div>
                                                    <span className="font-medium text-sm">{area.id}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="mt-auto flex justify-between items-center">
                                        <span className="text-sm text-slate-500 font-medium">Step 2 of 3</span>
                                        <button onClick={handleNext} className="btn-primary flex items-center gap-2 group" disabled={focusAreas.length === 0}>
                                            Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col items-center justify-center text-center"
                                >
                                    <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: "spring", bounce: 0.5 }}
                                      className="w-20 h-20 rounded-full bg-accent/20 text-accent flex items-center justify-center mb-6"
                                    >
                                        <Check className="w-10 h-10" />
                                    </motion.div>
                                    <h2 className="text-3xl font-bold mb-4">You're All Set!</h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md leading-relaxed">
                                        Your profile is calibrated. We will now begin analyzing your content consumption to help you maintain focus.
                                    </p>
                                    
                                    <button onClick={handleComplete} className="btn-primary w-full max-w-xs text-lg py-3 relative overflow-hidden">
                                        Enter Dashboard
                                    </button>
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
