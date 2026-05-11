'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export function PredictiveAnalytics3D() {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
    setMousePosition({ x, y });
  };

  return (
    <div 
      className="relative w-full h-full perspective-1000"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{
          rotateX: isHovered ? mousePosition.y : 0,
          rotateY: isHovered ? mousePosition.x : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 150,
          damping: 15,
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* 3D Chart Container with Glassmorphism */}
        <div className="relative w-full h-80 bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl overflow-hidden">
          {/* Animated Background Gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
          
          {/* Chart Bars - 3D Effect */}
          <div className="relative z-10 flex items-end justify-center gap-4 h-full">
            {[
              { height: 80, color: 'from-blue-500 to-cyan-500', delay: 0 },
              { height: 60, color: 'from-indigo-500 to-purple-500', delay: 0.1 },
              { height: 90, color: 'from-purple-500 to-pink-500', delay: 0.2 },
              { height: 70, color: 'from-pink-500 to-red-500', delay: 0.3 },
              { height: 85, color: 'from-red-500 to-orange-500', delay: 0.4 },
            ].map((bar, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-2 cursor-pointer"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: bar.delay }}
                whileHover={{ scale: 1.1, y: -5 }}
              >
                <motion.div
                  className={`w-14 bg-gradient-to-t ${bar.color} rounded-t-xl shadow-2xl relative preserve-3d`}
                  style={{ 
                    height: `${bar.height}%`,
                    transformStyle: 'preserve-3d',
                  }}
                  animate={{
                    height: [`${bar.height}%`, `${bar.height + 15}%`, `${bar.height}%`],
                    boxShadow: [
                      '0 10px 25px rgba(0,0,0,0.1), inset 0 -2px 0 rgba(255,255,255,0.2)',
                      '0 20px 40px rgba(59, 130, 246, 0.4), inset 0 -2px 0 rgba(255,255,255,0.3)',
                      '0 10px 25px rgba(0,0,0,0.1), inset 0 -2px 0 rgba(255,255,255,0.2)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                >
                  {/* 3D Top Face with shine */}
                  <motion.div
                    className="absolute -top-2 left-0 right-0 h-3 bg-gradient-to-b from-white/60 via-white/30 to-transparent rounded-t-xl"
                    animate={{
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                  {/* 3D Side Face */}
                  <div className="absolute -right-1 top-0 bottom-0 w-2 bg-gradient-to-l from-black/20 to-transparent rounded-r-xl" />
                </motion.div>
                
                {/* Data Points */}
                <motion.div
                  className="text-xs font-semibold text-gray-700"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                >
                  {bar.height}%
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Floating Data Particles */}
          {[...Array(15)].map((_, i) => {
            const baseX = (i % 5) * 20 + 10;
            const baseY = Math.floor(i / 5) * 30 + 20;
            return (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-blue-400 rounded-full"
                style={{
                  left: `${baseX}%`,
                  top: `${baseY}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  x: [0, Math.sin(i) * 10, 0],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            );
          })}

          {/* Prediction Lines with Animation */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {[0, 1, 2, 3].map((i) => (
              <motion.path
                key={i}
                d={`M ${40 + i * 80} ${220} Q ${80 + i * 80} ${120 - i * 15} ${120 + i * 80} ${220}`}
                stroke={`url(#gradient-${i})`}
                strokeWidth="3"
                fill="none"
                strokeDasharray="8,4"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.4 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: i * 0.2 }}
                animate={{
                  strokeDashoffset: [0, -20],
                }}
                style={{
                  filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))',
                }}
              />
            ))}
            <defs>
              {[0, 1, 2, 3].map((i) => (
                <linearGradient key={i} id={`gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.4" />
                </linearGradient>
              ))}
            </defs>
          </svg>

          {/* AI Brain Icon - Floating */}
          <motion.div
            className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg z-20 cursor-pointer"
            whileHover={{ scale: 1.2, rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </motion.div>
        </div>

        {/* Glow Effect */}
        <motion.div
          className="absolute -inset-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur-2xl opacity-20"
          animate={{
            opacity: isHovered ? [0.2, 0.4, 0.2] : [0.2, 0.3, 0.2],
            scale: isHovered ? [1, 1.2, 1] : [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>
    </div>
  );
}
