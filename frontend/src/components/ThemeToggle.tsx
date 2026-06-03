import React from 'react';
import { motion } from 'framer-motion';
import { IconSun, IconMoonStars } from '@tabler/icons-react';
import { useThemeStore } from '../store/useThemeStore';

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();

  // For the toggle, we'll simplify to just light/dark to make it easy for the user
  // If it's system, we check the actual preference
  const isDark = 
    theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1A1A1A] rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#6C4FF6] outline-none overflow-hidden"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          y: isDark ? 0 : 30,
          opacity: isDark ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <IconMoonStars size={22} className="text-slate-400" aria-hidden="true" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          y: isDark ? -30 : 0,
          opacity: isDark ? 0 : 1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <IconSun size={22} className="text-amber-500" aria-hidden="true" />
      </motion.div>
    </button>
  );
};
