"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, BarChart3, Check, CreditCard, Globe, Landmark, Plus, ShieldCheck, Sparkles, Store,
  TicketX, TrendingUp, Wallet, Zap,
} from "lucide-react";
import { api, setToken, type User } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Aurora, Btn, BtnLink, CountUp, LangToggle, Logo, LogoMark, Reveal, ThemeToggle, spring, bouncy } from "@/components/ui";
import { CardFace, Tilt } from "@/components/bank-card";
import { categoryIcons, usePct } from "@/components/offer";

const cats = [
  ["coffee", "کافه", "Cafés", "☕"], ["utensils", "رستوران", "Restaurants", "🍝"], ["cart", "سوپرمارکت", "Supermarkets", "🛒"],
  ["shirt", "پوشاک", "Fashion", "👗"], ["sparkles", "زیبایی", "Beauty", "💄"], ["pill", "داروخانه", "Pharmacy", "💊"],
  ["wrench", "خدمات", "Services", "🔧"], ["globe", "فروشگاه آنلاین", "Online stores", "🛍️"],
] as const;
const banks = [
  ["ملی", "Melli"], ["ملت", "Mellat"], ["سامان", "Saman"], ["پاسارگاد", "Pasargad"], ["تجارت", "Tejarat"], ["صادرات", "Saderat"],
  ["پارسیان", "Parsian"], ["سپه", "Sepah"], ["رفاه", "Refah"], ["اقتصاد نوین", "Eghtesad Novin"], ["شهر", "Shahr"], ["آینده", "Ayandeh"],
] as const;
// deterministic sample series for the dashboard preview
const series = Array.from({ length: 30 }, (_, i) => 40 + Math.sin(i / 3) * 12 + i * 1.6 + ((i * 37) % 11));

function Nav() {
  const { t } = useT();
  return (
    <header className="pt-safe sticky top-0 z-50 px-3 pt-3">
      <nav className="glass edge-fade mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full ps-4 pe-2">
        <Logo />
        <div className="ms-6 hidden items-center gap-1 text-sm text-fg-2 md:flex">
          {([["#how", t.nav.how], ["#merchants", t.nav.merchants], ["#faq", t.nav.faq]] as const).map(([h, l]) => (
            <a key={h} href={h} className="rounded-full px-3 py-1.5 transition-colors hover:bg-fill hover:text-fg">{l}</a>
          ))}
        </div>
        <div className="ms-auto flex items-center gap-0.5">
          <LangToggle className="hidden sm:inline-flex" />
          <ThemeToggle />
          <BtnLink href="/login" size="sm" className="ms-1">{t.nav.login}</BtnLink>
        </div>
      </nav>
    </header>
  );
}

function Notifications() {
  const { t, n, locale } = useT();
  const items = [
    { body: t.hero.notif1(n(25000)), money: true },
    { body: t.hero.notif3, money: false },
    { body: t.hero.notif2(n(48000)), money: true },
  ];
  const [tick, setTick] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 2800);
    return () => clearInterval(id);
  }, []);
  const shown = Array.from({ length: Math.min(tick, 3) }, (_, i) => tick - i).map((k) => ({ k, ...items[k % items.length] }));
  return (
    <div className="pointer-events-none flex w-full max-w-[330px] flex-col gap-2" aria-hidden>
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map((x, i) => (
          <motion.div key={`${x.k}-${locale}`} layout
            initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1 - i * 0.22, y: 0, scale: 1 - i * 0.04 }} exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={bouncy} className="glass-thick flex items-center gap-3 rounded-[20px] p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-[#0b0b12]"><LogoMark className="size-7" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2 text-[12px] text-fg-3">
                <span className="font-semibold text-fg-2">{t.brand}</span>{i === 0 ? t.hero.now : t.hero.ago}
              </span>
              <span className={`block truncate text-[13.5px] font-semibold ${x.money ? "text-money" : ""}`}>{x.body}</span>
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Hero() {
  const { t, locale } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function demo() {
    setBusy(true);
    try { const r = await api<{ token: string; user: User }>("/auth/demo", { method: "POST" }); setToken(r.token); router.push("/app"); }
    catch { router.push("/login"); }
  }
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 md:grid-cols-[1.1fr_1fr] md:pt-20 md:pb-28">
      <div>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}
          className="glass-thin inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-fg-2">
          <span className="relative grid size-2 place-items-center"><span className="pulse-ring absolute size-2 rounded-full bg-[var(--emerald)]" /><span className="size-2 rounded-full bg-[var(--emerald)]" /></span>
          {t.hero.eyebrow}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, duration: 0.9, delay: 0.05 }}
          className="tighter mt-5 text-[clamp(2.6rem,7.5vw,5.2rem)] leading-[1.08] font-black">
          <span className="block">{t.hero.title1}</span>
          <span className="text-grad block pb-2">{t.hero.title2}</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, duration: 0.9, delay: 0.12 }}
          className="mt-5 max-w-xl text-lg leading-8 text-fg-2">{t.hero.sub}</motion.p>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, duration: 0.9, delay: 0.2 }}
          className="mt-8 flex flex-wrap gap-3">
          <BtnLink href="/login" size="lg">{t.hero.cta}<ArrowLeft className="size-5 ltr:rotate-180" aria-hidden /></BtnLink>
          <Btn variant="glass" size="lg" onClick={demo} disabled={busy}><Sparkles className="size-5 text-violet" aria-hidden />{busy ? t.common.loading : t.hero.cta2}</Btn>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.9, rotateX: 25 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ ...spring, duration: 1.2, delay: 0.15 }}
        className="relative mx-auto flex w-full max-w-[440px] flex-col items-center gap-5">
        <span aria-hidden className="brand-grad absolute top-8 h-3/5 w-4/5 rounded-full opacity-50 blur-[70px]" />
        <Tilt className="float relative w-full">
          <CardFace color="#6045F0" bank={locale === "fa" ? "بانک سامان" : "Saman Bank"} number="6219 86•• •••• 4721" holder={t.hero.cardHolder} />
        </Tilt>
        <div className="w-full md:absolute md:-bottom-24 md:-end-12 md:w-auto"><Notifications /></div>
      </motion.div>
    </section>
  );
}

function Marquee() {
  const { locale } = useT();
  const row = [...cats, ...cats];
  return (
    <div className="marquee overflow-hidden py-2" aria-hidden>
      <div className="flex gap-3">
        {row.map(([icon, fa, en, emoji], i) => {
          const Icon = categoryIcons[icon];
          return (
            <span key={i} className="glass-thin flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-medium" dir={locale === "fa" ? "rtl" : "ltr"}>
              <span>{emoji}</span><Icon className="size-4 text-violet" />{locale === "fa" ? fa : en}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ title, sub, id }: { title: string; sub?: string; id?: string }) {
  return (
    <Reveal className="mx-auto mb-10 max-w-2xl text-center">
      <h2 id={id} className="tighter text-[clamp(2rem,5vw,3.25rem)] leading-tight font-black">{title}</h2>
      {sub && <p className="mt-3 text-lg text-fg-2">{sub}</p>}
    </Reveal>
  );
}

function How() {
  const { t } = useT();
  const icons = [CreditCard, Zap, Wallet];
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
      <SectionTitle title={t.how.title} sub={t.how.sub} />
      <div className="grid gap-4 md:grid-cols-3">
        {t.how.steps.map(([title, body], i) => {
          const Icon = icons[i];
          return (
            <Reveal key={i} delay={i * 0.1} className="glass relative overflow-hidden rounded-[30px] p-6">
              <span aria-hidden className="tighter absolute -top-4 end-4 text-[120px] leading-none font-black text-fill-2">{i + 1}</span>
              <span className="brand-grad relative grid size-12 place-items-center rounded-2xl text-white shadow-[0_10px_30px_-10px_var(--violet)]"><Icon className="size-6" aria-hidden /></span>
              <h3 className="tight relative mt-5 text-xl font-bold">{title}</h3>
              <p className="relative mt-2 leading-7 text-fg-2">{body}</p>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Bento() {
  const { t, locale } = useT();
  const B = ({ k, Icon, className = "", children }: { k: keyof typeof t.bento; Icon: typeof Globe; className?: string; children?: React.ReactNode }) => {
    const v = t.bento[k];
    return (
      <div className={`glass relative flex flex-col overflow-hidden rounded-[30px] p-6 ${className}`}>
        <Icon className="size-7 text-violet" aria-hidden />
        <h3 className="tight mt-4 text-xl font-bold">{v[0]}</h3>
        <p className="mt-2 leading-7 text-fg-2">{v[1]}</p>
        {children}
      </div>
    );
  };
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <SectionTitle title={t.bento.title} />
      <Reveal className="grid gap-4 md:grid-cols-6">
        <B k="coupons" Icon={TicketX} className="md:col-span-4">
          <div className="mt-6 flex flex-wrap items-center gap-3" aria-hidden>
            {["🎟️", "🏷️", "📇"].map((e) => <span key={e} className="grid size-14 place-items-center rounded-2xl bg-fill text-2xl line-through opacity-50 grayscale">{e}</span>)}
            <ArrowLeft className="size-5 text-fg-3 ltr:rotate-180" />
            <span className="brand-grad grid h-14 w-20 place-items-center rounded-2xl text-white shadow-[0_10px_30px_-10px_var(--violet)]"><CreditCard className="size-6" /></span>
          </div>
        </B>
        <B k="shetab" Icon={Landmark} className="md:col-span-2">
          <div className="mt-5 flex flex-wrap gap-1.5" aria-hidden>
            {banks.map(([fa, en]) => <span key={en} className="rounded-full bg-fill px-2.5 py-1 text-[12px] text-fg-2">{locale === "fa" ? fa : en}</span>)}
          </div>
        </B>
        <B k="privacy" Icon={ShieldCheck} className="md:col-span-2">
          <p dir="ltr" className="mt-5 truncate rounded-2xl bg-fill px-3 py-2 font-mono text-[12px] text-fg-3">hmac: 9f2c…e41a · •••• 4721</p>
        </B>
        <B k="omni" Icon={Store} className="md:col-span-2">
          <div className="mt-5 flex gap-2" aria-hidden>
            <span className="flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-sm"><Globe className="size-4" />{t.channel.online}</span>
            <span className="flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-sm"><Store className="size-4" />{t.channel.in_store}</span>
          </div>
        </B>
        <B k="perf" Icon={TrendingUp} className="md:col-span-2" />
        <B k="analytics" Icon={BarChart3} className="md:col-span-6">
          <Spark className="mt-6 h-24 w-full" />
        </B>
      </Reveal>
    </section>
  );
}

function Spark({ className = "" }: { className?: string }) {
  const max = Math.max(...series);
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * 300},${100 - (v / max) * 90}`);
  const line = `M${pts.join(" L")}`;
  return (
    <svg viewBox="0 0 300 100" preserveAspectRatio="none" className={className} aria-hidden style={{ direction: "ltr" }}>
      <defs>
        <linearGradient id="spark-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--violet)" stopOpacity=".35" /><stop offset="1" stopColor="var(--violet)" stopOpacity="0" /></linearGradient>
        <linearGradient id="spark-s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--indigo)" /><stop offset=".6" stopColor="var(--violet)" /><stop offset="1" stopColor="var(--pink)" /></linearGradient>
      </defs>
      <motion.path d={`${line} L300,100 L0,100 Z`} fill="url(#spark-f)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.5 }} />
      <motion.path d={line} fill="none" stroke="url(#spark-s)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ type: "spring", bounce: 0, duration: 2 }} />
    </svg>
  );
}

function Merchants() {
  const { t, n, money } = useT();
  const pct = usePct();
  const kpis = [[t.merchant.sales, money(184_500_000)], [t.merchant.roi, `${n(9.4)}×`], [t.merchant.rate, pct(12)], [t.merchant.newCustomers, n(412)]];
  return (
    <section id="merchants" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-12 px-4 py-24 md:grid-cols-2">
      <Reveal>
        <p className="text-sm font-semibold text-violet">{t.biz.eyebrow}</p>
        <h2 className="tighter mt-3 text-[clamp(2rem,4.5vw,3rem)] leading-tight font-black">{t.biz.title}</h2>
        <p className="mt-4 text-lg leading-8 text-fg-2">{t.biz.sub}</p>
        <ul className="mt-6 space-y-3">
          {t.biz.points.map((p) => (
            <li key={p} className="flex items-center gap-3"><span className="money-grad grid size-6 place-items-center rounded-full text-[#04210f]"><Check className="size-4" aria-hidden /></span>{p}</li>
          ))}
        </ul>
        <BtnLink href="/merchant" variant="glass" size="lg" className="mt-8">{t.biz.cta}<ArrowLeft className="size-5 ltr:rotate-180" aria-hidden /></BtnLink>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="glass-thick rounded-[32px] p-5" aria-label={t.biz.preview}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#F97316] text-xl" aria-hidden>🍊</span>
            <p className="flex-1 font-bold">{t.biz.preview}</p>
            <span className="flex items-center gap-1.5 rounded-full bg-fill px-2.5 py-1 text-[12px] font-semibold text-money">
              <span className="relative grid size-2 place-items-center"><span className="pulse-ring absolute size-2 rounded-full bg-[var(--emerald)]" /><span className="size-2 rounded-full bg-[var(--emerald)]" /></span>{t.biz.live}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {kpis.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-fill p-3"><p className="text-[12px] text-fg-3">{k}</p><p className="tabnum mt-1 truncate text-lg font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl bg-fill p-3">
            <p className="text-[12px] text-fg-3">{t.merchant.chart} · {t.merchant.last30}</p>
            <Spark className="mt-2 h-28 w-full" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Stats() {
  const { t, n, locale } = useT();
  const plus = (v: number) => `${n(v)}+`;
  const items: [number, (v: number) => string, string][] = [
    [300, plus, t.stats.merchants], [500_000, plus, t.stats.users], [1_200_000, plus, t.stats.activations],
    [8, (v) => (locale === "fa" ? `${n(v)}٪+` : `${v}%+`), t.stats.rate],
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <SectionTitle title={t.stats.title} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map(([v, f, label], i) => (
          <Reveal key={label} delay={i * 0.08} className="glass rounded-[28px] p-6 text-center">
            <p className="tighter text-grad text-[clamp(1.8rem,4vw,2.75rem)] font-black"><CountUp value={v} format={f} /></p>
            <p className="mt-1 text-fg-2">{label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useT();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-24">
      <SectionTitle title={t.faq.title} />
      <div className="space-y-3">
        {t.faq.items.map(([q, a], i) => {
          const on = open === i;
          return (
            <Reveal key={i} delay={i * 0.05} className="glass overflow-hidden rounded-[24px]">
              <h3>
                <button type="button" aria-expanded={on} aria-controls={`faq-${i}`} onClick={() => setOpen(on ? null : i)}
                  className="flex w-full items-center gap-3 rounded-[24px] p-5 text-start font-semibold">
                  <span className="flex-1">{q}</span>
                  <motion.span animate={{ rotate: on ? 45 : 0 }} transition={spring} className="grid size-8 shrink-0 place-items-center rounded-full bg-fill"><Plus className="size-4" aria-hidden /></motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring}>
                    <p className="px-5 pb-5 leading-8 text-fg-2">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useT();
  return (
    <footer className="mx-auto max-w-6xl px-4 pt-10 pb-[max(env(safe-area-inset-bottom),2.5rem)]">
      <div className="glass-thin flex flex-col items-center justify-between gap-4 rounded-[28px] p-6 text-sm text-fg-2 md:flex-row">
        <div className="flex items-center gap-3"><Logo /><span className="text-fg-3">{t.tagline}</span></div>
        <p className="text-center text-fg-3">{t.footer.rights}</p>
        <div className="flex items-center gap-1"><LangToggle /><Link href="/login" className="rounded-full px-3 py-1.5 hover:bg-fill">{t.nav.login}</Link></div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <>
      <Aurora />
      <Nav />
      <main className="overflow-x-clip">
        <Hero />
        <Marquee />
        <How />
        <Bento />
        <Merchants />
        <Stats />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
