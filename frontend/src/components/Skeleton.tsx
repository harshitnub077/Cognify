import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={cn(
      'animate-pulse bg-slate-100 dark:bg-surface-hover rounded-xl',
      className
    )}
  />
);
