import React, { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }, [theme]);

  // Disable system theme listener as we force dark mode
  useEffect(() => {
    return;
  }, [theme]);

  return <>{children}</>;
};
