"use client";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Coffee, UtensilsCrossed, ShoppingCart, Shirt, Sparkles, Pill, Wrench, Globe, Store, CalendarClock, MapPin,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError, type Merchant, type Offer } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { Btn, Sheet, bouncy, spring, useToast } from "@/components/ui";
import { shade } from "@/components/bank-card";

export const categoryIcons: Record<string, LucideIcon> = {
  coffee: Coffee, utensils: UtensilsCrossed, cart: ShoppingCart, shirt: Shirt,
  sparkles: Sparkles, pill: Pill, wrench: Wrench, globe: Globe,
};

export function usePct() {
  const { locale, n } = useT();
  return (v: number) => (locale === "fa" ? `${n(v)}٪` : `${v}%`);
}

export function MerchantAvatar({ m, size = "size-11", text = "text-xl" }: { m: Pick<Merchant, "color" | "emoji">; size?: string; text?: string }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-2xl ${size} ${text} shadow-[inset_0_1px_0_rgb(255_255_255/.35)]`}
      style={{ background: `linear-gradient(135deg, ${shade(m.color, 0.2)}, ${shade(m.color, -0.25)})` }}>
      {m.emoji}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: Offer["channel"] }) {
  const { t } = useT();
  const Icon = channel === "online" ? Globe : channel === "in_store" ? Store : Sparkles;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-fill px-2.5 py-1 text-[12px] font-medium text-fg-2">
      <Icon className="size-3.5" aria-hidden />{t.channel[channel]}
    </span>
  );
}

/** Optimistic activate/deactivate with rollback. */
export function useActivate(setOffers: (fn: (l: Offer[] | null) => Offer[] | null) => void) {
  const { t } = useT();
  const toast = useToast();
  return useCallback(async (o: Offer, on: boolean) => {
    const patch = (v: boolean) => setOffers((l) => l?.map((x) => (x.id === o.id ? { ...x, activated: v } : x)) ?? l);
    patch(on);
    try {
      const fresh = await api<Offer>(`/offers/${o.id}/activate`, { method: on ? "POST" : "DELETE" });
      setOffers((l) => l?.map((x) => (x.id === o.id ? fresh : x)) ?? l);
    } catch (e) {
      patch(!on);
      toast({ title: errorText(t, e instanceof ApiError ? e.code : "generic"), tone: "error" });
    }
  }, [setOffers, t, toast]);
}

const burst = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return { x: Math.cos(a) * 34, y: Math.sin(a) * 26, c: ["#10B981", "#A3E635", "#A855F7", "#F472B6", "#5B5BF7"][i % 5] };
});

export function ActivateButton({ active, onActivate, className = "" }: { active: boolean; onActivate: () => void; className?: string }) {
  const { t } = useT();
  const [pops, setPops] = useState(0);
  return (
    <div className={`relative ${className}`}>
      <motion.button
        type="button" layout transition={spring} whileTap={{ scale: 0.95 }}
        aria-pressed={active}
        onClick={() => { if (!active) { setPops((p) => p + 1); onActivate(); } }}
        className={`relative z-10 inline-flex h-10 items-center justify-center gap-1.5 overflow-hidden rounded-full px-4 text-sm font-semibold ${active ? "money-grad text-[#04210f] cursor-default" : "btn-primary"}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {active ? (
            <motion.span key="on" className="flex items-center gap-1.5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={spring}>
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <motion.path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.08 }} />
              </svg>
              {t.app.activated}
            </motion.span>
          ) : (
            <motion.span key="off" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={spring}>
              {t.app.activate}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <AnimatePresence>
        {active && pops > 0 && (
          <span key={pops} aria-hidden className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
            {burst.map((p, i) => (
              <motion.i key={i} className="absolute size-1.5 rounded-full" style={{ background: p.c }}
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }} animate={{ x: p.x * 1.6, y: p.y * 1.6, scale: 1, opacity: 0 }}
                transition={{ ...bouncy, opacity: { duration: 0.7, ease: "easeOut" } }} />
            ))}
          </span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function OfferCard({ o, onOpen, onActivate, wide = false }: { o: Offer; onOpen: () => void; onActivate: () => void; wide?: boolean }) {
  const { t, pick, money, date } = useT();
  const pct = usePct();
  return (
    <motion.article layout="position" transition={spring}
      className={`glass group relative flex flex-col gap-4 overflow-hidden rounded-[28px] p-4 ${wide ? "min-h-56" : ""}`}>
      <span aria-hidden className="pointer-events-none absolute -top-16 -end-16 size-44 rounded-full opacity-30 blur-3xl" style={{ background: o.merchant.color }} />
      <button type="button" onClick={onOpen} className="absolute inset-0 z-0 rounded-[28px]" aria-label={`${pick(o.merchant, "name")} — ${pick(o, "title")}`} />
      <div className="pointer-events-none relative flex items-center gap-3">
        <MerchantAvatar m={o.merchant} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{pick(o.merchant, "name")}</p>
          <p className="flex items-center gap-1 truncate text-[13px] text-fg-3"><MapPin className="size-3" aria-hidden />{pick(o.merchant, "city")}</p>
        </div>
        <ChannelBadge channel={o.channel} />
      </div>
      <div className="pointer-events-none relative">
        <p className="flex items-baseline gap-2">
          <span className="tighter text-grad text-5xl leading-none font-black">{pct(o.cashback_percent)}</span>
          <span className="text-sm font-medium text-fg-2">{t.app.cashback}</span>
        </p>
        <p className="mt-2 line-clamp-2 text-[15px] font-medium">{pick(o, "title")}</p>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-fg-3">
          <span>{t.app.upTo(money(o.max_reward))}</span>
          <span>{o.min_purchase ? t.app.minPurchase(money(o.min_purchase)) : t.app.noMin}</span>
        </p>
      </div>
      <div className="relative mt-auto flex items-center justify-between gap-2">
        <span className="pointer-events-none flex items-center gap-1 text-[12.5px] text-fg-3">
          <CalendarClock className="size-3.5" aria-hidden />{t.app.until(date(o.ends_at))}
        </span>
        <ActivateButton active={o.activated} onActivate={onActivate} />
      </div>
    </motion.article>
  );
}

export function OfferSheet({ o: current, onClose, onToggle }: { o: Offer | null; onClose: () => void; onToggle: (o: Offer, on: boolean) => void }) {
  const { t, pick, money, date, n } = useT();
  const pct = usePct();
  const last = useRef(current);
  if (current) last.current = current;
  const o = current ?? last.current; // keep content during exit animation
  return (
    <Sheet open={!!current} onClose={onClose} title={o ? pick(o.merchant, "name") : ""}
      footer={o && (o.activated ? (
        <div className="flex items-center gap-3">
          <ActivateButton active onActivate={() => {}} className="flex-1 [&>button]:w-full [&>button]:h-12" />
          <Btn variant="fill" size="md" onClick={() => onToggle(o, false)}>{t.app.deactivate}</Btn>
        </div>
      ) : (
        <ActivateButton active={false} onActivate={() => onToggle(o, true)} className="[&>button]:w-full [&>button]:h-12" />
      ))}>
      {o && (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-[24px] p-5 text-white"
            style={{ background: `radial-gradient(120% 120% at 0% 0%, ${shade(o.merchant.color, 0.2)}, ${o.merchant.color} 50%, ${shade(o.merchant.color, -0.5)})` }}>
            <span aria-hidden className="absolute -bottom-6 -end-4 text-[120px] leading-none opacity-30">{o.merchant.emoji}</span>
            <p className="text-sm opacity-85">{pick(o.merchant, "city")}</p>
            <p className="tighter mt-1 text-6xl font-black">{pct(o.cashback_percent)}</p>
            <p className="mt-1 max-w-[80%] text-lg font-semibold">{pick(o, "title")}</p>
          </div>
          {pick(o, "description") && <p className="leading-7 text-fg-2">{pick(o, "description")}</p>}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-fg-3">{t.app.conditions}</h3>
            <dl className="grid grid-cols-2 gap-2">
              {[
                [t.app.maxReward, money(o.max_reward)],
                [t.app.minBuy, o.min_purchase ? money(o.min_purchase) : t.app.noMin],
                [t.app.channelLabel, t.channel[o.channel]],
                [t.app.ends, date(o.ends_at, { day: "numeric", month: "long", year: "numeric" })],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-fill p-3">
                  <dt className="text-[12px] text-fg-3">{k}</dt>
                  <dd className="tabnum mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl bg-fill p-4">
            <p className="font-semibold">{t.app.howToUse}</p>
            <p className="mt-1 text-sm leading-6 text-fg-2">{t.app.howToUseBody}</p>
          </div>
          <p className="text-center text-[13px] text-fg-3">{t.app.redemptions(n(o.redemptions))}</p>
        </div>
      )}
    </Sheet>
  );
}
