'use client';

import { useEffect, useRef } from 'react';
import Lottie, { AnimationItem } from 'lottie-web';
import { motion } from 'framer-motion';

interface LottieIconProps {
  animationData?: any;
  path?: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

export function LottieIcon({ 
  animationData, 
  path, 
  className = 'w-16 h-16',
  loop = true,
  autoplay = true 
}: LottieIconProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // If no animation data or path, show a placeholder
    if (!animationData && !path) {
      return;
    }

    try {
      animationRef.current = Lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop,
        autoplay,
        animationData: animationData || undefined,
        path: path || undefined,
      });

      return () => {
        if (animationRef.current) {
          animationRef.current.destroy();
        }
      };
    } catch (error) {
      console.error('Lottie animation error:', error);
    }
  }, [animationData, path, loop, autoplay]);

  // Fallback if Lottie fails or no animation provided - use animated SVG icons
  if (!animationData && !path) {
    return (
      <motion.div
        className={`${className} flex items-center justify-center`}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ duration: 0.2 }}
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            fill="url(#iconGradient)"
            initial={{ scale: 0.8 }}
            animate={{ scale: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <defs>
            <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className={className}
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.2 }}
    />
  );
}

