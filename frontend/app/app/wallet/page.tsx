"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, CreditCard, Info, Nfc, Receipt, Sparkles } from "lucide-react";
import {
  api, ApiError, onlyDigits, useApi,
  type Card, type Merchant, type Offer, type Purchase, type Reward, type Wallet,
} from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { Btn, BtnLink, CountUp, Field, Sheet, Skeleton, bouncy, spring, useToast } from "@/components/ui";
import { MerchantAvatar } from "@/components/offer";
import { shade } from "@/components/bank-card";

const dayKey = (iso: string) => new Date(iso).toDateString();

export default function WalletPage() {
  const { t, money, date, pick, d } = useT();
  const wallet = useApi<Wallet>("/wallet");
  const [sim, setSim] = useState(false);
  const hasPending = !!wallet.data?.rewards.some((r) => r.status === "pending");
  const { reload } = wallet;

  // pending rewards settle server-side after ~30s; poll while any exist
  useEffect(() => {
    if (!hasPending) return;
    const id = setInterval(reload, 10_000);
    return () => clearInterval(id);
  }, [hasPending, reload]);

  const groups = useMemo(() => {
    const m = new Map<string, Reward[]>();
    for (const r of wallet.data?.rewards ?? []) {
      const k = dayKey(r.created_at);
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()];
  }, [wallet.data]);

  const dayLabel = (iso: string) => {
    const k = dayKey(iso);
    if (k === dayKey(new Date().toISOString())) return t.wallet.today;
    if (k === dayKey(new Date(Date.now() - 864e5).toISOString())) return t.wallet.yesterday;
    return date(iso, { weekday: "long", day: "numeric", month: "long" });
  };

  const w = wallet.data;
  return (
    <div className="space-y-8">
      <h1 className="tight text-3xl font-extrabold md:text-4xl">{t.wallet.title}</h1>

      <section className="glass-thick relative overflow-hidden rounded-[32px] p-6 md:p-8">
        <span aria-hidden className="money-grad pointer-events-none absolute -top-24 -end-20 size-72 rounded-full opacity-30 blur-3xl" />
        <p className="relative text-sm font-medium text-fg-2">{t.wallet.balance}</p>
        <p className="tighter relative mt-2 text-[clamp(2.4rem,9vw,4rem)] leading-none font-black">
          {w ? <CountUp value={w.balance} format={money} className="text-money" /> : <Skeleton className="h-14 w-64 rounded-2xl" />}
        </p>
        <div className="relative mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-fill p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-fg-3"><Clock className="size-3.5" aria-hidden />{t.wallet.pending}</p>
            <p className="mt-1 text-lg font-bold">{w ? <CountUp value={w.pending} format={money} /> : "…"}</p>
          </div>
          <div className="rounded-2xl bg-fill p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-fg-3"><Sparkles className="size-3.5" aria-hidden />{t.wallet.lifetime}</p>
            <p className="mt-1 text-lg font-bold">{w ? <CountUp value={w.lifetime} format={money} /> : "…"}</p>
          </div>
        </div>
        <Btn variant="money" size="lg" className="relative mt-6 w-full sm:w-auto" onClick={() => setSim(true)}>
          <Receipt className="size-5" aria-hidden />{t.wallet.simulate}
        </Btn>
      </section>

      <section aria-labelledby="hist-h">
        <h2 id="hist-h" className="tight mb-3 text-xl font-bold">{t.wallet.history}</h2>
        {wallet.loading && <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
        {w && w.rewards.length === 0 && <p className="glass-thin rounded-3xl p-8 text-center text-fg-2">{t.wallet.empty}</p>}
        {wallet.error && !w && <p className="glass-thin rounded-3xl p-8 text-center text-fg-2">{errorText(t, wallet.error.code)}</p>}
        <div className="space-y-6">
          {groups.map(([k, items]) => (
            <div key={k}>
              <h3 className="mb-2 px-1 text-[13px] font-semibold text-fg-3">{dayLabel(items[0].created_at)}</h3>
              <ul className="glass overflow-hidden rounded-[26px]">
                <AnimatePresence initial={false}>
                  {items.map((r) => (
                    <motion.li key={r.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={spring}
                      className="border-b border-line last:border-0">
                      <div className="flex items-center gap-3 p-4">
                        <MerchantAvatar m={r.merchant} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{pick(r.merchant, "name")}</p>
                          <p className="text-[12.5px] leading-5 text-fg-3">
                            {t.wallet.purchase(money(r.amount))} · <bdi>{t.wallet.card(d(r.card_last4))}</bdi> · {date(r.created_at, { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="tabnum font-bold text-money">+{money(r.reward)}</p>
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span key={r.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={spring}
                              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${r.status === "pending" ? "bg-[color-mix(in_srgb,#f59e0b_16%,transparent)] text-[#b45309] dark:text-[#fbbf24]" : "bg-[color-mix(in_srgb,var(--emerald)_14%,transparent)] text-money"}`}>
                              {r.status === "pending" ? <Clock className="size-3" aria-hidden /> : <Check className="size-3" aria-hidden />}
                              {r.status === "pending" ? t.wallet.pending : t.wallet.settled}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Simulator open={sim} onClose={() => setSim(false)} onReward={reload} />
    </div>
  );
}

// ---------- purchase simulator ----------
const QUICK = [150_000, 350_000, 800_000, 1_500_000];

function Simulator({ open, onClose, onReward }: { open: boolean; onClose: () => void; onReward: () => void }) {
  const { t, n, money, pick } = useT();
  const toast = useToast();
  const cards = useApi<Card[]>(open ? "/cards" : null);
  const merchants = useApi<Merchant[]>(open ? "/merchants" : null);
  const offers = useApi<Offer[]>(open ? "/offers" : null);
  const [cardId, setCardId] = useState<number | null>(null);
  const [merchantId, setMerchantId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<"form" | "processing" | "result">("form");
  const [result, setResult] = useState<Purchase | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const card = cards.data?.find((c) => c.id === cardId) ?? cards.data?.[0] ?? null;
  const active = new Set((offers.data ?? []).filter((o) => o.activated).map((o) => o.merchant.id));
  // active merchants first so the happy path is one tap away
  const ms = [...(merchants.data ?? [])].sort((a, b) => +active.has(b.id) - +active.has(a.id));
  const merchant = ms.find((m) => m.id === merchantId) ?? null;
  const minFor = (mid: number) => (offers.data ?? []).find((o) => o.merchant.id === mid && o.activated)?.min_purchase;

  function reset() { setPhase("form"); setResult(null); setErr(null); }
  function close() { onClose(); setTimeout(reset, 400); }

  async function pay() {
    setErr(null);
    if (!card || !merchant) return setErr(t.sim.pickMerchant);
    if (!+amount) return setErr(t.errors.empty);
    setPhase("processing");
    try {
      const [r] = await Promise.all([
        api<Purchase>("/simulate/purchase", { method: "POST", body: { card_id: card.id, merchant_id: merchant.id, amount: +amount } }),
        new Promise((ok) => setTimeout(ok, 1600)), // let the POS moment breathe
      ]);
      if (!alive.current) return;
      setResult(r); setPhase("result");
      if (r.matched && r.reward) {
        toast({ title: t.sim.matchedTitle, body: t.sim.matchedBody(n(r.reward.reward), pick(r.reward.merchant, "name")), tone: "money" });
        onReward();
      }
    } catch (e) {
      setPhase("form");
      setErr(errorText(t, e instanceof ApiError ? e.code : "generic"));
    }
  }

  const noCards = cards.data && cards.data.length === 0;
  const footer = phase === "form" ? (
    noCards ? <BtnLink href="/app/cards" size="lg" className="w-full" onClick={close}><CreditCard className="size-5" aria-hidden />{t.sim.goCards}</BtnLink> : (
      <Btn size="lg" className="w-full" onClick={pay} disabled={!card || !merchant || !+amount}>
        {t.sim.pay(+amount ? money(+amount) : "")}
      </Btn>
    )
  ) : phase === "result" ? (
    <div className="flex gap-3">
      <Btn variant="fill" size="lg" className="flex-1" onClick={reset}>{t.sim.again}</Btn>
      <Btn size="lg" className="flex-1" onClick={close}>{t.sim.done}</Btn>
    </div>
  ) : null;

  return (
    <Sheet open={open} onClose={close} title={t.sim.title} footer={footer}>
      <AnimatePresence mode="wait" initial={false}>
        {phase === "form" && (
          <motion.div key="form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={spring} className="space-y-5">
            <p className="text-[15px] leading-7 text-fg-2">{t.sim.sub}</p>

            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-fg-2">{t.sim.card}</legend>
              {cards.loading && <Skeleton className="h-16" />}
              {noCards && <p className="rounded-2xl bg-fill p-4 text-sm text-fg-2">{t.sim.noCards}</p>}
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                {cards.data?.map((c) => {
                  const on = card?.id === c.id;
                  return (
                    <motion.button key={c.id} type="button" whileTap={{ scale: 0.96 }} aria-pressed={on} onClick={() => setCardId(c.id)}
                      className={`relative flex h-16 w-40 shrink-0 flex-col justify-between rounded-2xl p-2.5 text-start text-white transition-shadow ${on ? "ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--solid)]" : "opacity-75"}`}
                      style={{ background: `linear-gradient(135deg, ${shade(c.bank.color, 0.15)}, ${shade(c.bank.color, -0.45)})` }}>
                      <span className="text-[12px] font-semibold">{pick(c.bank, "name")}</span>
                      <span dir="ltr" className="tabnum text-start font-mono text-sm">•••• {c.last4}</span>
                    </motion.button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-fg-2">{t.sim.merchant}</legend>
              {merchants.loading && <Skeleton className="h-40" />}
              <div className="grid grid-cols-2 gap-2">
                {ms.map((m) => {
                  const on = merchantId === m.id;
                  return (
                    <motion.button key={m.id} type="button" whileTap={{ scale: 0.97 }} aria-pressed={on} onClick={() => setMerchantId(m.id)}
                      className={`relative flex items-center gap-2 rounded-2xl p-2 text-start transition-colors ${on ? "bg-fill-2" : "bg-fill"}`}>
                      {on && <motion.span layoutId="sim-m" transition={spring} className="absolute inset-0 rounded-2xl ring-2 ring-[var(--ring)]" />}
                      <MerchantAvatar m={m} size="size-9" text="text-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{pick(m, "name")}</span>
                        {active.has(m.id)
                          ? <span className="block truncate text-[11.5px] font-medium text-money">{t.sim.hasOffer}</span>
                          : <span className="block truncate text-[11.5px] text-fg-3">{pick(m, "city")}</span>}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <Field label={t.sim.amount} inputMode="numeric" dir="ltr" placeholder={t.sim.amountPh} value={amount ? n(+amount) : ""}
                onChange={(e) => { setAmount(onlyDigits(e.target.value).slice(0, 10)); setErr(null); }}
                error={err} hint={merchant && minFor(merchant.id) ? t.app.minPurchase(money(minFor(merchant.id)!)) : undefined}
                style={{ textAlign: "left", fontSize: 18 }} />
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <motion.button key={q} type="button" whileTap={{ scale: 0.95 }} onClick={() => setAmount(String(q))}
                    className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${+amount === q ? "brand-grad text-white" : "bg-fill text-fg-2"}`}>
                    {n(q)}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {phase === "processing" && (
          <motion.div key="proc" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={spring}
            className="flex flex-col items-center py-8" role="status" aria-live="polite">
            <div className="relative h-56 w-40">
              {/* POS terminal */}
              <div className="absolute inset-x-0 bottom-0 h-44 rounded-[26px] bg-[#16161d] p-3 shadow-[var(--shadow-lg)] ring-1 ring-white/10">
                <div className="grid h-16 place-items-center rounded-xl bg-[#0c1a14] font-mono text-sm text-[#6ee7b7]" dir="ltr">
                  {merchant && <span className="tabnum">{money(+amount)}</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 9 }, (_, i) => <span key={i} className="h-4 rounded-md bg-white/10" />)}
                </div>
              </div>
              <span className="absolute start-1/2 top-3 grid -translate-x-1/2 place-items-center rtl:translate-x-1/2">
                <span className="pulse-ring absolute size-16 rounded-full border-2 border-[var(--violet)]" />
                <Nfc className="size-7 text-violet" aria-hidden />
              </span>
              {card && (
                <motion.div initial={{ y: -90, rotate: -8, opacity: 0 }} animate={{ y: [-90, -30, -34], rotate: [-8, 0, 0], opacity: 1 }} transition={{ duration: 1, times: [0, 0.7, 1], ease: "easeOut" }}
                  className="absolute inset-x-2 top-0 h-20 rounded-xl shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${shade(card.bank.color, 0.15)}, ${shade(card.bank.color, -0.45)})` }} />
              )}
            </div>
            <p className="mt-6 font-semibold">{t.sim.processing}</p>
            <p className="mt-1 text-sm text-fg-3">{t.sim.tap}</p>
          </motion.div>
        )}

        {phase === "result" && result && (
          <motion.div key="res" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={bouncy} className="py-6 text-center">
            {result.matched && result.reward ? (
              <>
                <motion.span initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={bouncy}
                  className="money-grad mx-auto grid size-20 place-items-center rounded-[26px] text-[#04210f] shadow-[0_20px_50px_-15px_var(--emerald)]">
                  <svg viewBox="0 0 24 24" className="size-10" aria-hidden>
                    <motion.path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.15 }} />
                  </svg>
                </motion.span>
                <h3 className="tight mt-5 text-xl font-bold">{t.sim.matchedTitle}</h3>
                <p className="tighter text-money mt-2 text-4xl font-black">+{money(result.reward.reward)}</p>
                <p className="mt-2 text-sm text-fg-2">{pick(result.reward.merchant, "name")} · {t.wallet.purchase(money(result.transaction.amount))}</p>
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-[13px] text-fg-2"><Clock className="size-3.5" aria-hidden />{t.wallet.pending}</p>
              </>
            ) : (
              <>
                <span className="mx-auto grid size-20 place-items-center rounded-[26px] bg-fill text-violet"><Info className="size-9" aria-hidden /></span>
                <h3 className="tight mt-5 text-xl font-bold">{t.sim.notMatched}</h3>
                <p className="mx-auto mt-2 max-w-xs leading-7 text-fg-2">
                  {result.reason === "below_min_purchase"
                    ? t.sim.belowMin(money(minFor(result.transaction.merchant.id) ?? 0))
                    : t.sim.noOffer}
                </p>
                {result.reason === "no_active_offer" && (
                  <Link href="/app" onClick={close} className="mt-4 inline-flex rounded-full font-semibold text-indigo">{t.app.allOffers}</Link>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
