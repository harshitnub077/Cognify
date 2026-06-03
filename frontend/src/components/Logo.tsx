import React from 'react';
import { motion } from 'framer-motion';

export const Logo = ({ className = '' }: { className?: string }) => (
  <motion.svg 
    viewBox="0 0 100 100" 
    className={`w-10 h-10 ${className}`}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    initial="hidden"
    animate="visible"
    whileHover="hover"
  >
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#38BDF8" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <motion.path 
      d="M30 50 C 30 25, 70 25, 70 50 C 70 75, 30 75, 30 50 Z" 
      stroke="url(#logo-gradient)" 
      strokeWidth="6" 
      strokeLinecap="round" 
      filter="url(#glow)"
      variants={{
        hidden: { pathLength: 0, opacity: 0 },
        visible: { 
          pathLength: 1, 
          opacity: 1,
          transition: { duration: 2, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
        },
        hover: { scale: 1.1, rotate: 90, transition: { duration: 0.5 } }
      }}
    />
    
    <motion.circle 
      cx="50" cy="50" r="8" 
      fill="#38BDF8" 
      variants={{
        hidden: { scale: 0 },
        visible: { 
          scale: [1, 1.3, 1],
          transition: { duration: 2, repeat: Infinity }
        }
      }}
    />
  </motion.svg>
);
