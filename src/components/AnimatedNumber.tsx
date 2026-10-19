"use client";

import { useEffect, useState } from "react";

/** 数字滚动：首帧与服务端一致，挂载后再从 0 递增，避免水合闪烁。 */
export function AnimatedNumber({
  value,
  duration = 900,
}: {
  value: string | number;
  duration?: number;
}) {
  const raw = String(value);
  const numeric = /^-?\d+(\.\d+)?$/.test(raw.trim());
  const target = numeric ? Number(raw) : 0;
  const decimals = numeric && raw.includes(".") ? raw.split(".")[1].length : 0;
  const [display, setDisplay] = useState(raw);

  useEffect(() => {
    if (!numeric) {
      setDisplay(raw);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target.toFixed(decimals));
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay((target * eased).toFixed(decimals));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(target.toFixed(decimals));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric, target, decimals, duration, raw]);

  return <>{display}</>;
}
