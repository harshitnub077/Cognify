import React from 'react';
import { motion } from 'framer-motion';

export const Logo = ({ className = '' }: { className?: string }) => (
  <motion.svg
    viewBox="0 0 40 40"
    className={`w-6 h-6 ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    initial="hidden"
    animate="visible"
  >
    <motion.rect
      x="4" y="4" width="32" height="32" rx="6"
      stroke="currentColor"
      strokeWidth="2.5"
      className="text-primary"
      variants={{
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
      }}
    />
    <motion.path
      d="M24 16L16 24M16 16L24 24"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      className="text-primary"
      variants={{
        hidden: { pathLength: 0 },
        visible: { pathLength: 1, transition: { duration: 0.5, delay: 0.1 } },
      }}
    />
  </motion.svg>
);
