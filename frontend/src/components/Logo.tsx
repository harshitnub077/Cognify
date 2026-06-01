import React from 'react';

export const Logo = ({ className = '' }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={`w-8 h-8 text-primary ${className}`}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer Arc 1 */}
    <path 
      d="M50 15A35 35 0 0 0 15 50C15 65.46 25 78.58 38 83" 
      stroke="currentColor" 
      strokeWidth="10" 
      strokeLinecap="round" 
    />
    {/* Outer Arc 2 */}
    <path 
      d="M71 22C81 30 85 43 82 56" 
      stroke="currentColor" 
      strokeWidth="10" 
      strokeLinecap="round" 
    />
    {/* Inner Spark/Brain Icon */}
    <circle cx="50" cy="50" r="8" fill="currentColor" />
    <path 
      d="M50 35L50 42M65 50L58 50M50 65L50 58M35 50L42 50" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
    />
  </svg>
);
