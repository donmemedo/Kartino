"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Plus } from "lucide-react";
import { api, ApiError, onlyDigits, useApi, type Campaign, type Channel, type Dashboard, type NewCampaign, type Offer } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import {
  Aurora, Btn, BtnLink, CountUp, Field, LangToggle, Logo, Segmented, Sheet, Skeleton, Switch, ThemeToggle, spring, useToast,
} from "@/components/ui";
import { useAuthed } from "@/components/shell";
import { MerchantAvatar, OfferCard, usePct } from "@/components/offer";

export default function MerchantPage() {
  const { t } = useT();
  const ok = useAuthed();
  return (
    <div className="min-h-dvh">
      <Aurora />
      <header className="pt-safe sticky top-0 z-30 px-3 pt-3">
        <div className="glass edge-fade mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full ps-4 pe-2">
          <Logo href="/app" />
          <span className="hidden rounded-full bg-fill px-2.5 py-1 text-[12px] font-semibold text-fg-2 sm:inline">{t.merchant.title}</span>
          <div className="ms-auto flex items-center gap-0.5">
            <LangToggle className="hidden sm:inline-flex" />
            <ThemeToggle />
            <BtnLink href="/app" variant="fill" size="sm" className="ms-1">
              <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /><span className="hidden sm:inline">{t.merchant.back}</span>
            </BtnLink>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-16">{ok && <Panel />}</main>
    </div>
  );
}

function Panel() {
  const { t, pick, money, n, locale } = useT();
  const compact = (v: number) => `${new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v)} ${t.common.toman}`;
  const pct = usePct();
  const dash = useApi<Dashboard>("/merchant/dashboard");
  const camps = useApi<Campaign[]>("/merchant/campaigns");
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const k = dash.data?.kpis;

  async function setStatus(c: Campaign, on: boolean) {
    const status = on ? "active" : "paused";
    const patch = (s: Campaign["status"]) => camps.setData((l) => l?.map((x) => (x.id === c.id ? { ...x, status: s } : x)) ?? l);
    patch(status);
    try {
      const fresh = await api<Campaign>(`/merchant/campaigns/${c.id}`, { method: "PATCH", body: { status } });
      camps.setData((l) => l?.map((x) => (x.id === c.id ? fresh : x)) ?? l);
    } catch (e) {
      patch(c.status);
      toast({ title: errorText(t, e instanceof ApiError ? e.code : "generic"), tone: "error" });
    }
  }

  const tiles: [string, number | undefined, (v: number) => string][] = [
    [t.merchant.sales, k?.attributed_sales, compact],
    [t.merchant.rewards, k?.rewards_paid, compact],
    [t.merchant.roi, k && Math.round(k.roi * 10), (v) => `${n(v / 10)}×`],
    [t.merchant.rate, k && Math.round(k.redemption_rate * 1000), (v) => pct(v / 10)],
    [t.merchant.cac, k?.cac, money],
    [t.merchant.newCustomers, k?.new_customers, n],
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-4">
        {dash.data ? <MerchantAvatar m={dash.data.merchant} size="size-14" text="text-3xl" /> : <Skeleton className="size-14" />}
        <div className="flex-1">
          <h1 className="tight text-2xl font-extrabold md:text-3xl">{dash.data ? pick(dash.data.merchant, "name") : t.merchant.title}</h1>
          <p className="text-fg-2">{t.merchant.title} · {t.merchant.last30}</p>
        </div>
        <Btn onClick={() => setCreating(true)}><Plus className="size-5" aria-hidden />{t.merchant.newCampaign}</Btn>
      </section>

      {dash.error && !dash.data && <p className="glass-thin rounded-3xl p-6 text-center text-fg-2">{errorText(t, dash.error.code)}</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {tiles.map(([label, v, f], i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.05 }}
            className="glass rounded-[24px] p-4">
            <p className="text-[12.5px] text-fg-3">{label}</p>
            <p className="tight mt-1.5 truncate text-lg font-extrabold md:text-xl">
              {v === undefined ? <Skeleton className="h-7 w-24 rounded-lg" /> : <CountUp value={v} format={f} />}
            </p>
          </motion.div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass rounded-[28px] p-5 lg:col-span-2" aria-labelledby="chart-h">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="chart-h" className="font-bold">{t.merchant.chart}</h2>
            <span className="text-[13px] text-fg-3">{t.merchant.last30}</span>
          </div>
          {dash.data ? <AreaChart data={dash.data.series} /> : <Skeleton className="h-56" />}
        </section>

        <section className="glass rounded-[28px] p-5" aria-labelledby="funnel-h">
          <h2 id="funnel-h" className="mb-4 font-bold">{t.merchant.funnel}</h2>
          {k ? <Funnel steps={[[t.merchant.activations, k.activations], [t.merchant.redemptions, k.redemptions], [t.merchant.newCustomers, k.new_customers]]} /> : <Skeleton className="h-40" />}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass rounded-[28px] p-5" aria-labelledby="top-h">
          <h2 id="top-h" className="mb-3 font-bold">{t.merchant.topOffers}</h2>
          <ol className="space-y-2">
            {dash.data?.top_offers.map((o, i) => (
              <li key={o.offer_id} className="flex items-center gap-3 rounded-2xl bg-fill p-3">
                <span className="brand-grad grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold text-white">{n(i + 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{pick(o, "title")}</span>
                  <span className="block text-[12px] text-fg-3">{t.merchant.activations} {n(o.activations)} · {t.merchant.redemptions} {n(o.redemptions)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="glass rounded-[28px] p-5 lg:col-span-2" aria-labelledby="camp-h">
          <h2 id="camp-h" className="mb-3 font-bold">{t.merchant.campaigns}</h2>
          {camps.loading && <Skeleton className="h-40" />}
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {camps.data?.map((c) => {
                const used = c.budget ? Math.min(1, c.spent / c.budget) : 0;
                return (
                  <motion.li key={c.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={spring}
                    className="rounded-2xl bg-fill p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-grad tighter w-14 shrink-0 text-2xl font-black">{pct(c.cashback_percent)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{pick(c, "title")}</span>
                        <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-fg-3">
                          <StatusDot s={c.status} />{t.merchant.status[c.status]} · {t.channel[c.channel]} · {t.merchant.activations} {n(c.activations)}
                        </span>
                      </span>
                      <Switch checked={c.status === "active"} disabled={c.status === "ended"} onChange={(v) => setStatus(c, v)}
                        label={c.status === "active" ? t.merchant.pause : t.merchant.resume} />
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[12px] text-fg-3">
                        <span>{t.merchant.budget}</span><span className="tabnum">{t.merchant.spent(money(c.spent), money(c.budget))}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fill-2">
                        <motion.div className="brand-grad h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${used * 100}%` }} transition={{ type: "spring", bounce: 0, duration: 1 }} />
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>
      </div>

      <NewCampaignSheet open={creating} onClose={() => setCreating(false)} merchant={dash.data?.merchant}
        onCreated={(c) => { camps.setData((l) => [c, ...(l ?? [])]); dash.reload(); }} />
    </div>
  );
}

function StatusDot({ s }: { s: Campaign["status"] }) {
  const c = s === "active" ? "var(--emerald)" : s === "paused" ? "#f59e0b" : "var(--fg-3)";
  return <span className="inline-block size-2 rounded-full" style={{ background: c }} aria-hidden />;
}

// ---------- chart ----------
const W = 600, H = 220, PAD = 8;

function AreaChart({ data }: { data: Dashboard["series"] }) {
  const { money, n, date, locale } = useT();
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...data.map((p) => p.sales)) * 1.1;
  const x = (i: number) => (data.length < 2 ? W / 2 : (i / (data.length - 1)) * W);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  // smooth path: quadratic curves through midpoints
  const pts = data.map((p, i) => [x(i), y(p.sales)] as const);
  let line = pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  for (let i = 1; i < pts.length - 1; i++) line += ` Q${pts[i][0]},${pts[i][1]} ${(pts[i][0] + pts[i + 1][0]) / 2},${(pts[i][1] + pts[i + 1][1]) / 2}`;
  if (pts.length > 1) line += ` L${pts[pts.length - 1][0]},${pts[pts.length - 1][1]}`;
  const area = `${line} L${W},${H} L0,${H} Z`;
  const compact = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", { notation: "compact", maximumFractionDigits: 1 });

  function pick(clientX: number) {
    const r = box.current?.getBoundingClientRect();
    if (!r || !data.length) return;
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setHover(Math.round(f * (data.length - 1)));
  }

  const h = hover !== null ? data[hover] : null;
  return (
    <div dir="ltr" className="relative">
      <div className="pointer-events-none absolute inset-y-0 start-0 flex flex-col justify-between py-1 text-[11px] text-fg-3" aria-hidden>
        {[1, 0.5, 0].map((f) => <span key={f} className="tabnum">{compact.format((max / 1.1) * f)}</span>)}
      </div>
      <div ref={box} className="relative ms-12 h-56 touch-pan-y select-none"
        onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}
        role="img" aria-label={`${data.length} days`}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id="area-f" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--violet)" stopOpacity=".4" /><stop offset="1" stopColor="var(--violet)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="area-s" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--indigo)" /><stop offset=".6" stopColor="var(--violet)" /><stop offset="1" stopColor="var(--pink)" />
            </linearGradient>
          </defs>
          {[0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={y((max / 1.1) * f)} y2={y((max / 1.1) * f)} stroke="var(--line)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />)}
          <motion.path d={area} fill="url(#area-f)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path d={line} fill="none" stroke="url(#area-s)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ type: "spring", bounce: 0, duration: 1.6 }} />
        </svg>
        {h && hover !== null && (
          <>
            <span className="pointer-events-none absolute inset-y-0 w-px bg-fg-3/40" style={{ left: `${(x(hover) / W) * 100}%` }} />
            <motion.span layout transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--violet)] shadow"
              style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.sales) / H) * 100}%` }} />
            <div dir={locale === "fa" ? "rtl" : "ltr"}
              className="glass-thick pointer-events-none absolute top-0 z-10 rounded-2xl px-3 py-2 text-[12px] whitespace-nowrap"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? "calc(-100% - 10px)" : "10px"})` }}>
              <p className="text-fg-3">{date(h.date, { weekday: "short", day: "numeric", month: "long" })}</p>
              <p className="tabnum text-sm font-bold">{money(h.sales)}</p>
              <p className="text-fg-2">{n(h.redemptions)} ×</p>
            </div>
          </>
        )}
      </div>
      <div className="ms-12 mt-2 flex justify-between text-[11px] text-fg-3" aria-hidden>
        {data.length > 0 && [0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => <span key={i}>{date(data[i].date)}</span>)}
      </div>
    </div>
  );
}

function Funnel({ steps }: { steps: [string, number][] }) {
  const { n } = useT();
  const pct = usePct();
  const top = Math.max(1, steps[0][1]);
  return (
    <ol className="space-y-4">
      {steps.map(([label, v], i) => (
        <li key={label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{label}</span>
            <span className="tabnum font-bold">{n(v)}{i > 0 && <bdi className="ms-1.5 text-[12px] font-medium text-fg-3">{pct(Math.round((v / top) * 100))}</bdi>}</span>
          </div>
          <div className="mt-1.5 h-9 overflow-hidden rounded-xl bg-fill">
            <motion.div className="h-full rounded-xl" style={{ background: ["var(--indigo)", "var(--violet)", "var(--pink)"][i] }}
              initial={{ width: 0 }} animate={{ width: `${Math.max(2, (v / top) * 100)}%` }} transition={{ type: "spring", bounce: 0, duration: 1, delay: i * 0.12 }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- new campaign ----------
type Form = { title_fa: string; title_en: string; description_fa: string; description_en: string;
  cashback_percent: string; max_reward: string; min_purchase: string; budget: string; days: string; channel: Channel; featured: boolean };
const blank: Form = { title_fa: "", title_en: "", description_fa: "", description_en: "", cashback_percent: "10", max_reward: "50000",
  min_purchase: "0", budget: "5000000", days: "30", channel: "both", featured: false };

function NewCampaignSheet({ open, onClose, onCreated, merchant }: {
  open: boolean; onClose: () => void; onCreated: (c: Campaign) => void; merchant?: Dashboard["merchant"];
}) {
  const { t, n } = useT();
  const toast = useToast();
  const [f, setF] = useState<Form>(blank);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const num = (k: keyof Form) => +(f[k] as string || 0);
  const errors: Partial<Record<keyof Form, string>> = {};
  if (!f.title_fa.trim()) errors.title_fa = t.errors.empty;
  if (!f.title_en.trim()) errors.title_en = t.errors.empty;
  if (num("cashback_percent") < 1 || num("cashback_percent") > 50) errors.cashback_percent = t.merchant.form.range(n(1), n(50));
  if (num("max_reward") <= 0) errors.max_reward = t.merchant.form.positive;
  if (num("budget") <= 0) errors.budget = t.merchant.form.positive;
  if (num("days") < 1 || num("days") > 90) errors.days = t.merchant.form.range(n(1), n(90));
  const e = (k: keyof Form) => (tried ? errors[k] : undefined);

  function close() { onClose(); setTimeout(() => { setF(blank); setTried(false); setErr(null); }, 400); }

  async function submit() {
    setTried(true); setErr(null);
    if (Object.keys(errors).length) return;
    const body: NewCampaign = {
      title_fa: f.title_fa.trim(), title_en: f.title_en.trim(),
      description_fa: f.description_fa.trim() || undefined, description_en: f.description_en.trim() || undefined,
      cashback_percent: num("cashback_percent"), max_reward: num("max_reward"), min_purchase: num("min_purchase"),
      budget: num("budget"), days: num("days"), channel: f.channel, featured: f.featured,
    };
    setBusy(true);
    try {
      const c = await api<Campaign>("/merchant/campaigns", { method: "POST", body });
      onCreated(c);
      toast({ title: t.merchant.form.created, tone: "money" });
      close();
    } catch (x) { setErr(errorText(t, x instanceof ApiError ? x.code : "generic")); } finally { setBusy(false); }
  }

  const preview: Offer | null = merchant ? {
    id: 0, merchant, title_fa: f.title_fa || t.merchant.form.titleFa, title_en: f.title_en || t.merchant.form.titleEn,
    description_fa: f.description_fa, description_en: f.description_en, cashback_percent: num("cashback_percent"),
    max_reward: num("max_reward"), min_purchase: num("min_purchase"), channel: f.channel,
    ends_at: new Date(Date.now() + Math.max(1, num("days")) * 864e5).toISOString(), featured: f.featured, activated: false, redemptions: 0,
  } : null;

  const numField = (k: keyof Form, label: string, max = 12) => (
    <Field label={label} inputMode="numeric" dir="ltr" style={{ textAlign: "left" }} value={f[k] === "" ? "" : n(+(f[k] as string))} error={e(k)}
      onChange={(ev) => set(k, onlyDigits(ev.target.value).slice(0, max) as never)} />
  );

  return (
    <Sheet open={open} onClose={close} title={t.merchant.newCampaign}
      footer={<div className="space-y-2">
        {err && <p role="alert" className="text-center text-[13px] text-danger">{err}</p>}
        <Btn size="lg" className="w-full" onClick={submit} disabled={busy}>{busy ? t.common.loading : t.merchant.form.create}</Btn>
      </div>}>
      <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate>
        {preview && (
          <div>
            <p className="mb-2 text-[13px] font-medium text-fg-2">{t.merchant.form.preview}</p>
            <div className="pointer-events-none" aria-hidden><OfferCard o={preview} onOpen={() => {}} onActivate={() => {}} /></div>
          </div>
        )}
        <Field label={t.merchant.form.titleFa} dir="rtl" lang="fa" value={f.title_fa} error={e("title_fa")} maxLength={80} onChange={(ev) => set("title_fa", ev.target.value)} />
        <Field label={t.merchant.form.titleEn} dir="ltr" lang="en" value={f.title_en} error={e("title_en")} maxLength={80} onChange={(ev) => set("title_en", ev.target.value)} />
        <Field label={t.merchant.form.descFa} dir="rtl" lang="fa" value={f.description_fa} maxLength={200} onChange={(ev) => set("description_fa", ev.target.value)} />
        <Field label={t.merchant.form.descEn} dir="ltr" lang="en" value={f.description_en} maxLength={200} onChange={(ev) => set("description_en", ev.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          {numField("cashback_percent", t.merchant.form.percent, 2)}
          {numField("days", t.merchant.form.days, 2)}
          {numField("max_reward", t.merchant.form.maxReward)}
          {numField("min_purchase", t.merchant.form.minPurchase)}
        </div>
        {numField("budget", t.merchant.form.budget)}
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-fg-2">{t.merchant.form.channel}</p>
          <Segmented<Channel> id="channel" label={t.merchant.form.channel} value={f.channel} onChange={(v) => set("channel", v)}
            options={(["both", "in_store", "online"] as const).map((c) => ({ value: c, label: t.channel[c] }))} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-fill p-3">
          <span className="text-sm font-medium">{t.merchant.form.featured}</span>
          <Switch checked={f.featured} onChange={(v) => set("featured", v)} label={t.merchant.form.featured} />
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
