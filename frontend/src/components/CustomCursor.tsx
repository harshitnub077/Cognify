import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { cn } from '../lib/utils';

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if device is touch
    if (window.matchMedia('(pointer: coarse)').matches) return;
    setTimeout(() => setIsVisible(true), 0);

    const onMouseMove = (e: MouseEvent) => {
      // Move dot instantly
      gsap.to(cursorRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0,
      });

      // Move follower with lag
      gsap.to(followerRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.6,
        ease: 'power3.out',
      });
    };

    const onMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'a' ||
        target.tagName.toLowerCase() === 'button' ||
        target.closest('a') ||
        target.closest('button') ||
        target.closest('.card-hover') ||
        target.closest('.interactive')
      ) {
        setIsHovering(true);
        gsap.to(followerRef.current, {
          scale: 1.5,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(255,255,255,0)',
          duration: 0.3,
        });
      }
    };

    const onMouseLeave = () => {
      setIsHovering(false);
      gsap.to(followerRef.current, {
        scale: 1,
        backgroundColor: 'transparent',
        borderColor: 'rgba(255,255,255,0.3)',
        duration: 0.3,
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseover', onMouseEnter);
    document.addEventListener('mouseout', onMouseLeave);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseEnter);
      document.removeEventListener('mouseout', onMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <div
        ref={followerRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-white/30 pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 will-change-transform hidden md:block"
        style={{ mixBlendMode: 'difference' }}
      />
      <div
        ref={cursorRef}
        className={cn(
          "fixed top-0 left-0 w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 will-change-transform hidden md:block transition-opacity duration-300",
          isHovering ? "opacity-0" : "opacity-100"
        )}
      />
    </>
  );
}
