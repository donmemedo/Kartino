"use client";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore,
  type ReactNode, type InputHTMLAttributes,
} from "react";
import {
  AnimatePresence, MotionConfig, animate, motion, useDragControls, useInView, useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";
import { Check, CircleAlert, Monitor, Moon, Sun, X, Sparkles } from "lucide-react";
import { LocaleProvider, useT, type Locale } from "@/lib/i18n";

export const spring = { type: "spring", bounce: 0, duration: 0.45 } as const;
export const bouncy = { type: "spring", bounce: 0.25, duration: 0.6 } as const;
/** flip directional icons in RTL */
export const flip = "rtl:-scale-x-100";

// ---------- hooks ----------
export function useMedia(q: string) {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(q); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => matchMedia(q).matches,
    () => false,
  );
}
const noop = () => () => {};
export const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

// ---------- providers ----------
type Toast = { id: number; title: string; body?: string; tone?: "money" | "error" | "info" };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((l) => l.filter((x) => x.id !== id)), []);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [{ ...t, id }, ...l].slice(0, 3));
    setTimeout(() => dismiss(id), 4800);
  }, [dismiss]);
  return (
    <LocaleProvider initial={locale}>
      <MotionConfig reducedMotion="user">
        <ToastCtx.Provider value={push}>
          {children}
          <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),12px)]">
            <AnimatePresence initial={false}>
              {toasts.map((t) => (
                <motion.div
                  key={t.id} layout
                  initial={{ opacity: 0, y: -60, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -40, scale: 0.95 }}
                  transition={t.tone === "money" ? bouncy : spring}
                  drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 1, bottom: 0.1 }}
                  onDragEnd={(_, i) => { if (i.offset.y + i.velocity.y * 0.2 < -30) dismiss(t.id); }}
                  className="glass-thick pointer-events-auto flex w-full max-w-sm cursor-grab items-center gap-3 rounded-[22px] p-3 pe-4"
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${t.tone === "error" ? "bg-danger" : t.tone === "money" ? "money-grad" : "brand-grad"}`}>
                    {t.tone === "error" ? <CircleAlert className="size-5" /> : t.tone === "money" ? <Sparkles className="size-5" /> : <Check className="size-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{t.title}</span>
                    {t.body && <span className="block text-[13px] text-fg-2">{t.body}</span>}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ToastCtx.Provider>
      </MotionConfig>
    </LocaleProvider>
  );
}

// ---------- brand ----------
export function LogoMark({ className = "size-8" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B5BF7" /><stop offset=".55" stopColor="#A855F7" /><stop offset="1" stopColor="#F472B6" />
        </linearGradient>
      </defs>
      <rect x="2" y="6" width="28" height="20" rx="5.5" fill={`url(#${id})`} />
      <rect x="2.5" y="6.5" width="27" height="19" rx="5" fill="none" stroke="#fff" strokeOpacity=".35" />
      <path d="M8 20c4 0 7-1.8 9.2-5.4 1.1-1.8 2.7-2.8 4.8-2.8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M19.6 9.2l3 2.6-2.6 3" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  const { t } = useT();
  return (
    <Link href={href} className="flex items-center gap-2 rounded-xl font-extrabold">
      <LogoMark />
      <span className="tight text-lg">{t.brand}</span>
    </Link>
  );
}

export function Aurora() {
  return <div className="aurora" aria-hidden><i /><i /><i /><i /></div>;
}

// ---------- buttons ----------
const variants = {
  primary: "btn-primary",
  money: "money-grad text-[#04210f] shadow-[inset_0_1px_0_rgb(255_255_255/.4),0_8px_24px_-8px_rgb(16_185_129/.6)]",
  glass: "glass-thin text-fg",
  ghost: "text-fg hover:bg-fill",
  danger: "bg-danger text-white",
  fill: "bg-fill text-fg hover:bg-fill-2",
};
const sizes = { sm: "h-9 px-3.5 text-sm gap-1.5", md: "h-11 px-5 text-[15px] gap-2", lg: "h-14 px-7 text-base gap-2.5", icon: "size-10" };
type BtnStyle = { variant?: keyof typeof variants; size?: keyof typeof sizes };
const btnCls = ({ variant = "primary", size = "md" }: BtnStyle, extra = "") =>
  `inline-flex select-none items-center justify-center rounded-full font-semibold whitespace-nowrap transition-[background-color,opacity] disabled:opacity-45 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${extra}`;
const tap = { scale: 0.97 };
const tapT = { type: "spring", stiffness: 900, damping: 45 } as const;

export function Btn({ variant, size, className = "", ...p }: HTMLMotionProps<"button"> & BtnStyle) {
  return <motion.button type="button" whileTap={tap} transition={tapT} className={btnCls({ variant, size }, className)} {...p} />;
}
const MLink = motion.create(Link);
export function BtnLink({ variant, size, className = "", ...p }: React.ComponentProps<typeof MLink> & BtnStyle) {
  return <MLink whileTap={tap} transition={tapT} className={btnCls({ variant, size }, className)} {...p} />;
}

// ---------- theme / language ----------
export type ThemePref = "light" | "dark" | "system";
declare global { interface Window { __cbTheme?: () => void } }

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => {
    // keep every toggle on the page in sync (nav + settings)
    const read = () => { let v: string | null = null; try { v = localStorage.getItem("cb_theme"); } catch {} setPref(v === "light" || v === "dark" ? v : "system"); };
    read();
    window.addEventListener("cb-theme", read);
    return () => window.removeEventListener("cb-theme", read);
  }, []);
  const set = useCallback((p: ThemePref) => {
    try { if (p === "system") localStorage.removeItem("cb_theme"); else localStorage.setItem("cb_theme", p); } catch {}
    setPref(p);
    window.__cbTheme?.();
    window.dispatchEvent(new Event("cb-theme"));
  }, []);
  return [pref, set] as const;
}

export function ThemeToggle() {
  const { t } = useT();
  const [pref, set] = useTheme();
  const next: Record<ThemePref, ThemePref> = { system: "light", light: "dark", dark: "system" };
  const Icon = pref === "light" ? Sun : pref === "dark" ? Moon : Monitor;
  return (
    <Btn variant="ghost" size="icon" onClick={() => set(next[pref])} aria-label={`${t.theme.toggle}: ${t.common[pref]}`} title={t.common[pref]}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={pref} initial={{ rotate: -90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.6 }} transition={spring}>
          <Icon className="size-[18px]" />
        </motion.span>
      </AnimatePresence>
    </Btn>
  );
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { t, locale, setLocale } = useT();
  return (
    <Btn variant="ghost" size="sm" className={className} onClick={() => setLocale(locale === "fa" ? "en" : "fa")} lang={locale === "fa" ? "en" : "fa"}>
      {t.theme.lang}
    </Btn>
  );
}

export function Segmented<T extends string>({ id, value, onChange, options, label }: {
  id: string; value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-fill p-1">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className="relative flex-1 rounded-full px-3 py-1.5 text-sm font-medium">
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-full bg-solid shadow-[var(--shadow-sm)]" />
          )}
          <span className={`relative flex items-center justify-center gap-1.5 ${value === o.value ? "text-fg" : "text-fg-2"}`}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- numbers ----------
export function CountUp({ value, format, className }: { value: number; format: (v: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) { ref.current.textContent = format(value); from.current = value; return; }
    const c = animate(from.current, value, {
      type: "spring", bounce: 0, duration: 1.4,
      onUpdate: (v) => { if (ref.current) ref.current.textContent = format(Math.round(v)); from.current = v; },
    });
    return () => c.stop();
  }, [value, inView, reduce, format]);
  return <span ref={ref} className={`tabnum ${className ?? ""}`}>{format(0)}</span>;
}

// ---------- reveal ----------
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ type: "spring", bounce: 0, duration: 0.9, delay }}>
      {children}
    </motion.div>
  );
}

// ---------- sheet (bottom sheet on mobile, modal on desktop) ----------
export function Sheet({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  const { t } = useT();
  const mounted = useMounted();
  const desktop = useMedia("(min-width: 768px)");
  const controls = useDragControls();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close.current(); } };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!mounted) return null;
  const hidden = desktop ? { opacity: 0, scale: 0.96, y: 16 } : { y: "100%" };
  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="sheet" className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
          <motion.div className="absolute inset-0 backdrop-blur-[2px]" style={{ background: "var(--scrim)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring} onClick={() => close.current()} />
          <motion.div
            ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
            className="glass-thick relative flex max-h-[92dvh] w-full flex-col rounded-t-[30px] outline-none md:max-w-lg md:rounded-[30px]"
            initial={hidden} animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }} exit={hidden}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            drag={desktop ? false : "y"} dragListener={false} dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.04, bottom: 1 }}
            onDragEnd={(_, i) => {
              // momentum projection: where would the sheet come to rest?
              const projected = i.offset.y + i.velocity.y * 0.2;
              if (projected > (panel.current?.offsetHeight ?? 500) * 0.35) close.current();
            }}
          >
            <div className="flex touch-none items-center gap-3 px-5 pt-2.5 pb-3 md:pt-5" onPointerDown={(e) => !desktop && controls.start(e)}>
              <span aria-hidden className="absolute inset-x-0 top-2 mx-auto h-1.5 w-10 rounded-full bg-fill-2 md:hidden" />
              <h2 id={titleId} className="tight mt-3 flex-1 text-lg font-bold md:mt-0">{title}</h2>
              <Btn variant="fill" size="icon" className="mt-3 !size-8 md:mt-0" onClick={() => close.current()} aria-label={t.common.close}>
                <X className="size-4" />
              </Btn>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && <div className="pb-safe border-t border-line px-5 pt-3 md:pb-5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------- form ----------
export function Field({ label, error, hint, className = "", ...p }: InputHTMLAttributes<HTMLInputElement> & {
  label: string; error?: string | null; hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-fg-2">{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-m` : undefined}
        className={`h-12 w-full rounded-2xl bg-fill px-4 text-[15px] outline-none ring-1 ring-transparent transition-shadow focus:ring-2 focus:ring-[var(--ring)] ${error ? "ring-2 !ring-danger" : ""}`}
        {...p} />
      <AnimatePresence initial={false} mode="wait">
        {(error || hint) && (
          <motion.p key={error ? "e" : "h"} id={`${id}-m`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`mt-1.5 text-[13px] ${error ? "text-danger" : "text-fg-3"}`} role={error ? "alert" : undefined}>
            {error || hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl bg-fill ${className}`} />;
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-300 disabled:opacity-40 ${checked ? "justify-end bg-[var(--emerald)]" : "justify-start bg-fill-2"}`}>
      <motion.span layout transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} className="size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/.15),0_1px_1px_rgb(0_0_0/.16)]" />
    </button>
  );
}
