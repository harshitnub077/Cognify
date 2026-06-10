import React from 'react';
import { motion } from 'framer-motion';

export const Logo = ({ className = '' }: { className?: string }) => (
  <div className="relative">
    <div className="absolute inset-0 bg-white/20 blur-md rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <motion.svg
      viewBox="0 0 40 40"
      className={`relative z-10 w-6 h-6 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial="hidden"
      animate="visible"
    >
      <defs>
        <linearGradient id="logo-premium-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>
      <motion.rect
        x="4" y="4" width="32" height="32" rx="6"
        stroke="url(#logo-premium-grad)"
        strokeWidth="2.5"
        variants={{
          hidden: { opacity: 0, scale: 0.9 },
          visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
        }}
      />
      <motion.path
        d="M24 16L16 24M16 16L24 24"
        stroke="url(#logo-premium-grad)"
        strokeWidth="2.5"
        strokeLinecap="square"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 0.5, delay: 0.1 } },
        }}
      />
    </motion.svg>
  </div>
);
