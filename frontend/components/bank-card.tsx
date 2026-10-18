"use client";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Nfc } from "lucide-react";
import { LogoMark } from "@/components/ui";

/** Darken/lighten a #rrggbb color by amt (-1..1). */
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const f = (c: number) => Math.round(Math.min(255, Math.max(0, amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f);
  return `rgb(${r} ${g} ${b})`;
}

export function CardFace({ color = "#5B5BF7", bank, number, holder, className = "" }: {
  color?: string; bank: string; number: string; holder?: string; className?: string;
}) {
  return (
    <div
      className={`relative aspect-[1.586] w-full overflow-hidden [container-type:inline-size] rounded-[22px] text-white shadow-[0_1px_1px_rgb(0_0_0/.1),0_20px_50px_-18px_rgb(0_0_0/.55)] transition-[background] duration-500 ${className}`}
      style={{ background: `radial-gradient(120% 140% at 0% 0%, ${shade(color, 0.25)}, ${color} 45%, ${shade(color, -0.55)})` }}
    >
      <div className="card-sheen absolute inset-0" />
      <svg className="absolute -end-10 -bottom-16 size-64 opacity-25" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth=".6" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="#fff" strokeWidth=".6" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="#fff" strokeWidth=".6" />
      </svg>
      <div className="absolute inset-0 flex flex-col justify-between p-[6.5%]">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[clamp(12px,3.6cqw,16px)] font-bold drop-shadow-sm">{bank}</span>
          <LogoMark className="size-7 opacity-95" />
        </div>
        <div className="flex items-center gap-3">
          <span className="h-[18%] min-h-7 w-[13%] min-w-9 rounded-md bg-gradient-to-br from-[#f7e39b] via-[#d9b75a] to-[#b48a2c] shadow-inner" />
          <Nfc className="size-5 opacity-80" aria-hidden />
        </div>
        <div>
          <p dir="ltr" className="tabnum text-start font-mono text-[clamp(15px,5.2cqw,22px)] font-semibold drop-shadow" style={{ letterSpacing: "0.08em" }}>
            {number}
          </p>
          {holder && <p className="mt-1 text-xs opacity-80">{holder}</p>}
        </div>
      </div>
    </div>
  );
}

/** Pointer-tilting wrapper with spring physics and a holographic sheen that follows the tilt. */
export function Tilt({ children, className = "", max = 14 }: { children: React.ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const cfg = { stiffness: 170, damping: 18, mass: 0.6 };
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), cfg);
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), cfg);
  const mx = useTransform(px, (v) => v * 100);
  const my = useTransform(py, (v) => v * 100);
  const sheen = useMotionTemplate`radial-gradient(circle at ${mx}% ${my}%, rgb(255 255 255 / .55), transparent 45%), linear-gradient(115deg, transparent 25%, rgb(170 255 235 / .28) ${mx}%, rgb(255 180 250 / .28) calc(${mx}% + 12%), transparent 85%)`;
  return (
    <div
      className={`[perspective:1100px] ${className}`}
      onPointerMove={(e) => {
        if (reduce || e.pointerType === "touch") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { px.set(0.5); py.set(0.5); }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="relative rounded-[22px]">
        {children}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px] mix-blend-overlay" style={{ background: sheen }} />
      </motion.div>
    </div>
  );
}
