"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";

const animations = [
  "/animations/Inventory.json",
  "/animations/health_insurance.json",
  "/animations/drug_resistance.json",
  "/animations/DELIVERY.json",
];

interface LottieAnimationData {
  v?: string;
  fr?: number;
  ip?: number;
  op?: number;
  w?: number;
  h?: number;
  nm?: string;
  ddd?: number;
  assets?: unknown[];
  layers?: unknown[];
  [key: string]: unknown;
}

export function HeroAnimation() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationData, setAnimationData] = useState<LottieAnimationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load all animations
    const loadAnimations = async () => {
      try {
        const loadedAnimations = await Promise.all(
          animations.map(async (path) => {
            // Encode the path properly for files with spaces
            const encodedPath = path.includes(" ")
              ? path
                  .split("/")
                  .map((segment) =>
                    segment.includes(" ")
                      ? encodeURIComponent(segment)
                      : segment
                  )
                  .join("/")
              : path;

            const response = await fetch(encodedPath);
            if (!response.ok) {
              throw new Error(`Failed to load animation: ${path}`);
            }
            return response.json() as Promise<LottieAnimationData>;
          })
        );
        setAnimationData(loadedAnimations);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading animations:", error);
        // If some animations fail, try to load at least one
        try {
          const firstPath = animations[0].includes(" ")
            ? animations[0]
                .split("/")
                .map((segment) =>
                  segment.includes(" ") ? encodeURIComponent(segment) : segment
                )
                .join("/")
            : animations[0];
          const firstResponse = await fetch(firstPath);
          if (firstResponse.ok) {
            const firstAnimation =
              (await firstResponse.json()) as LottieAnimationData;
            setAnimationData([firstAnimation]);
          }
        } catch (fallbackError) {
          console.error("Failed to load fallback animation:", fallbackError);
        }
        setIsLoading(false);
      }
    };

    loadAnimations();
  }, []);

  useEffect(() => {
    if (animationData.length === 0 || animationData.length === 1) return;

    // First animation shows immediately (index 0), then cycle every 15 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animationData.length);
    }, 15000); // 15 seconds between transitions

    return () => clearInterval(interval);
  }, [animationData.length]);

  // Show loading state while animations are being loaded
  if (isLoading || animationData.length === 0) {
    return (
      <div className="relative w-full h-full flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show first animation immediately if available
  const displayData = animationData[currentIndex] || animationData[0];

  if (!displayData) {
    return (
      <div className="relative w-full h-full flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={`animation-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            duration: 1.5,
            ease: "easeInOut",
          }}
          className="absolute inset-0 flex items-center justify-center w-full h-full"
        >
          <Lottie
            animationData={displayData}
            loop={true}
            autoplay={true}
            className="w-full h-full"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "100%",
              height: "100%",
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
