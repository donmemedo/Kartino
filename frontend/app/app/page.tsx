"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, LayoutGrid, Search, X } from "lucide-react";
import { useApi, type Category, type Offer, type User, type Wallet } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { CountUp, Skeleton, spring } from "@/components/ui";
import { OfferCard, OfferSheet, categoryIcons, useActivate } from "@/components/offer";

const norm = (s: string) => s.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ").trim();

export default function OffersHome() {
  const { t, pick, money } = useT();
  const me = useApi<User>("/me");
  const wallet = useApi<Wallet>("/wallet");
  const cats = useApi<Category[]>("/categories");
  const offers = useApi<Offer[]>("/offers");
  const toggle = useActivate(offers.setData);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const list = useMemo(() => {
    const nq = norm(q);
    return (offers.data ?? []).filter((o) =>
      (cat === "all" || o.merchant.category === cat) &&
      (!nq || [o.title_fa, o.title_en, o.merchant.name_fa, o.merchant.name_en].some((s) => norm(s).includes(nq))));
  }, [offers.data, cat, q]);
  const featured = (offers.data ?? []).filter((o) => o.featured);
  const open = offers.data?.find((o) => o.id === openId) ?? null;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="tight text-3xl font-extrabold md:text-4xl">{me.data?.name ? t.app.hello(me.data.name) : t.app.helloAnon}</h1>
          <p className="mt-1 text-fg-2">{t.app.helloSub}</p>
        </div>
        <Link href="/app/wallet" className="glass group flex items-center gap-4 rounded-[24px] p-4 md:min-w-80">
          <span className="money-grad grid size-12 place-items-center rounded-2xl text-2xl" aria-hidden>💸</span>
          <span className="flex-1">
            <span className="block text-[13px] text-fg-3">{t.app.balance}</span>
            <span className="block text-xl font-extrabold">
              {wallet.data ? <CountUp value={wallet.data.balance} format={money} /> : <Skeleton className="h-6 w-32 rounded-lg" />}
            </span>
            {!!wallet.data?.pending && <span className="block text-[12.5px] text-money">{t.app.pendingShort(money(wallet.data.pending))}</span>}
          </span>
          <ChevronLeft className="size-5 text-fg-3 ltr:rotate-180" aria-hidden />
        </Link>
      </section>

      {(featured.length > 0 || offers.loading) && (
        <section aria-labelledby="featured-h">
          <h2 id="featured-h" className="tight mb-3 text-xl font-bold">{t.app.featured}</h2>
          <div className="no-scrollbar snap-x-start -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2">
            {offers.loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-[82%] shrink-0 sm:w-80" />)}
            {featured.map((o) => (
              <div key={o.id} className="w-[82%] shrink-0 sm:w-80">
                <OfferCard o={o} wide onOpen={() => setOpenId(o.id)} onActivate={() => toggle(o, true)} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="all-h" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="all-h" className="tight text-xl font-bold">{t.app.allOffers}</h2>
          <label className="relative block sm:w-72">
            <span className="sr-only">{t.common.search}</span>
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fg-3" aria-hidden />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.app.searchPh}
              className="glass-thin h-11 w-full rounded-full ps-10 pe-10 text-[15px] outline-none focus:ring-2 focus:ring-[var(--ring)] [&::-webkit-search-cancel-button]:appearance-none" />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label={t.common.close}
                className="absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-fill-2">
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </label>
        </div>

        <div role="radiogroup" aria-label={t.common.all} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[{ slug: "all", name_fa: t.common.all, name_en: t.common.all, icon: "" }, ...(cats.data ?? [])].map((c) => {
            const Icon = categoryIcons[c.icon] ?? LayoutGrid;
            const on = cat === c.slug;
            return (
              <motion.button key={c.slug} type="button" role="radio" aria-checked={on} onClick={() => setCat(c.slug)} whileTap={{ scale: 0.95 }}
                className={`relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors ${on ? "text-white" : "glass-thin text-fg-2"}`}>
                {on && <motion.span layoutId="cat-pill" transition={spring} className="brand-grad absolute inset-0 rounded-full shadow-[0_6px_20px_-8px_var(--violet)]" />}
                <Icon className="relative size-4" aria-hidden />
                <span className="relative">{pick(c, "name")}</span>
              </motion.button>
            );
          })}
        </div>

        {offers.loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-60" />)}</div>
        ) : (
          <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {list.map((o) => (
                <motion.div key={o.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={spring}>
                  <OfferCard o={o} onOpen={() => setOpenId(o.id)} onActivate={() => toggle(o, true)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        {!offers.loading && list.length === 0 && (
          <p className="glass-thin rounded-3xl p-8 text-center text-fg-2">{offers.error ? t.errors.network : t.app.empty}</p>
        )}
      </section>

      <OfferSheet o={open} onClose={() => setOpenId(null)} onToggle={toggle} />
    </div>
  );
}

