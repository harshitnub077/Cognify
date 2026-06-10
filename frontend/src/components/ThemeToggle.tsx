import React from 'react';
import { motion } from 'framer-motion';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useThemeStore } from '../store/useThemeStore';

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#222] transition-colors"
      aria-label="Toggle theme"
    >
      <motion.div
        key={isDark ? 'moon' : 'sun'}
        initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
        transition={{ duration: 0.2 }}
      >
        {isDark
          ? <IconMoon size={18} />
          : <IconSun size={18} className="text-amber-500" />
        }
      </motion.div>
    </button>
  );
};
