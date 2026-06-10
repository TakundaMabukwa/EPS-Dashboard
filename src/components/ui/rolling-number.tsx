"use client";

import { useEffect, useRef, useState } from "react";

interface RollingNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function RollingNumber({ value, duration = 800, prefix = "", suffix = "", className }: RollingNumberProps) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromRef.current + (value - fromRef.current) * eased);
      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatted = display.toLocaleString("en-US");

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
