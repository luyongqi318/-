"use client";

import { useEffect, useState } from "react";

const IMAGES = ["/bg/hotel-2.jpg", "/bg/hotel-6.jpg", "/bg/hotel-4.jpg", "/bg/hotel-5.jpg", "/bg/hotel-3.jpg", "/bg/hotel-1.jpg"];

export function HotelBackdrop({ variant = "subtle" }: { variant?: "subtle" | "login" }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % IMAGES.length), 11000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`hotel-backdrop ${variant}`} aria-hidden="true">
      {IMAGES.map((src, i) => (
        <div key={src} className={`hb-slide${i === index ? " on" : ""}`} style={{ backgroundImage: `url(${src})` }} />
      ))}
      <div className="hb-veil" />
      {variant === "login" ? <div className="hb-grain" /> : null}
    </div>
  );
}
