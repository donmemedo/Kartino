"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, LayoutDashboard, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { api, ApiError, setToken, useApi, type User } from "@/lib/api";
import { errorText, useT, type Locale } from "@/lib/i18n";
import { Btn, Field, Segmented, Skeleton, useTheme, useToast, type ThemePref } from "@/components/ui";

export default function Settings() {
  const { t, d, date, locale, setLocale } = useT();
  const router = useRouter();
  const toast = useToast();
  const me = useApi<User>("/me");
  const [theme, setTheme] = useTheme();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (me.data) setName(me.data.name ?? ""); }, [me.data]);

  async function save() {
    setErr(null);
    if (!name.trim()) return setErr(t.errors.empty);
    setBusy(true);
    try {
      me.setData(await api<User>("/me", { method: "PATCH", body: { name: name.trim() } }));
      toast({ title: t.settings.saved });
    } catch (e) { setErr(errorText(t, e instanceof ApiError ? e.code : "generic")); } finally { setBusy(false); }
  }

  function logout() { setToken(null); router.replace("/"); }

  const row = "glass rounded-[26px] p-5";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="tight mb-2 text-3xl font-extrabold md:text-4xl">{t.settings.title}</h1>

      <section className={row}>
        {me.data ? (
          <div className="mb-5 flex items-center gap-4">
            <span className="brand-grad grid size-14 place-items-center rounded-full text-xl font-bold text-white" aria-hidden>
              {(me.data.name ?? "؟").slice(0, 1)}
            </span>
            <div>
              <p dir="ltr" className="tabnum text-start font-semibold">{d(me.data.phone)}</p>
              <p className="text-[13px] text-fg-3">{t.settings.member(date(me.data.created_at, { month: "long", year: "numeric" }))}</p>
            </div>
          </div>
        ) : <Skeleton className="mb-5 h-14" />}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <Field className="flex-1" label={t.settings.name} placeholder={t.settings.namePh} value={name} maxLength={40} autoComplete="given-name"
            error={err} onChange={(e) => { setName(e.target.value); setErr(null); }} />
          <Btn type="submit" size="md" className={`h-12 ${err ? "mb-7" : ""}`} disabled={busy || name.trim() === (me.data?.name ?? "")}>{t.common.save}</Btn>
        </form>
      </section>

      <section className={`${row} space-y-5`}>
        <div>
          <p className="mb-2 text-[13px] font-medium text-fg-2">{t.common.language}</p>
          <Segmented<Locale> id="lang" label={t.common.language} value={locale} onChange={setLocale}
            options={[{ value: "fa", label: <span lang="fa">فارسی</span> }, { value: "en", label: <span lang="en">English</span> }]} />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium text-fg-2">{t.common.theme}</p>
          <Segmented<ThemePref> id="theme" label={t.common.theme} value={theme} onChange={setTheme}
            options={[
              { value: "light", label: <><Sun className="size-4" aria-hidden />{t.common.light}</> },
              { value: "dark", label: <><Moon className="size-4" aria-hidden />{t.common.dark}</> },
              { value: "system", label: <><Monitor className="size-4" aria-hidden />{t.common.system}</> },
            ]} />
        </div>
      </section>

      <Link href="/merchant" className={`${row} flex items-center gap-4 transition-transform active:scale-[.99]`}>
        <span className="brand-grad grid size-11 place-items-center rounded-2xl text-white"><LayoutDashboard className="size-5" aria-hidden /></span>
        <span className="flex-1">
          <span className="block font-semibold">{t.settings.merchant}</span>
          <span className="block text-[13px] text-fg-3">{t.settings.merchantSub}</span>
        </span>
        <ChevronLeft className="size-5 text-fg-3 ltr:rotate-180" aria-hidden />
      </Link>

      <Btn variant="glass" size="lg" className="w-full !text-danger" onClick={logout}>
        <LogOut className="size-5 rtl:-scale-x-100" aria-hidden />{t.settings.logout}
      </Btn>
    </div>
  );
}
