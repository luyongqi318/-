"use client";

import { useEffect, useState } from "react";

const FULL = ["/bg/full/hotel-2.webp", "/bg/full/hotel-6.webp", "/bg/full/hotel-4.webp", "/bg/full/hotel-5.webp", "/bg/full/hotel-3.webp", "/bg/full/hotel-1.webp"];
const SOFT = ["/bg/soft/hotel-2.webp", "/bg/soft/hotel-6.webp", "/bg/soft/hotel-4.webp", "/bg/soft/hotel-5.webp", "/bg/soft/hotel-3.webp", "/bg/soft/hotel-1.webp"];

export function HotelBackdrop({ variant = "subtle" }: { variant?: "subtle" | "login" }) {
  const list = variant === "login" ? FULL : SOFT;
  const [index, setIndex] = useState(0);
  // 登录页先只挂第一张，其余等首屏稳定后再加载；内部底纹很小（几 KB），一次挂完
  const [visibleCount, setVisibleCount] = useState(variant === "login" ? 1 : SOFT.length);

  useEffect(() => {
    if (variant !== "login") return;
    const timer = setTimeout(() => setVisibleCount(2), 1800);
    return () => clearTimeout(timer);
  }, [variant]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % list.length);
    }, variant === "login" ? 9000 : 24000);
    return () => clearInterval(timer);
  }, [list.length, variant]);

  return (
    <div className={`hotel-backdrop ${variant}`} aria-hidden="true">
      {list.slice(0, visibleCount).map((src, i) => (
        <div
          key={src}
          className={`hb-slide${i === index ? " on" : ""}${variant === "login" ? " kb" : ""}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="hb-veil" />
      {variant === "login" ? <div className="hb-grain" /> : null}
    </div>
  );
}
