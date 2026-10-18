"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { ArrowRight, FlaskConical, PenLine, Sparkles } from "lucide-react";
import { api, ApiError, getToken, onlyDigits, setToken, type User } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { Aurora, Btn, Field, LangToggle, Logo, ThemeToggle, spring } from "@/components/ui";

type Auth = { token: string; user: User };
const LEN = 5;

export default function Login() {
  const { t, d, n } = useT();
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string[]>(Array(LEN).fill(""));
  const [dev, setDev] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "verify" | "demo" | null>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const shake = useAnimationControls();

  useEffect(() => { if (getToken()) router.replace("/app"); }, [router]);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const done = (a: Auth) => { setToken(a.token); router.replace("/app"); };
  const fail = (e: unknown) => setErr(errorText(t, e instanceof ApiError ? (e.status === 422 ? "invalid_phone" : e.code) : "generic"));

  async function send() {
    setErr(null);
    if (!phone) return setErr(t.errors.empty);
    if (!/^09\d{9}$/.test(phone)) return setErr(t.errors.invalid_phone);
    setBusy("send");
    try {
      const r = await api<{ sent: boolean; dev_code?: string; expires_in: number }>("/auth/otp", { method: "POST", body: { phone } });
      setDev(r.dev_code ?? null);
      setLeft(Math.min(r.expires_in || 120, 120));
      setCode(Array(LEN).fill(""));
      setStep("code");
      setTimeout(() => boxes.current[0]?.focus(), 350);
    } catch (e) { fail(e); } finally { setBusy(null); }
  }

  async function verify(c: string) {
    setErr(null); setBusy("verify");
    try { done(await api<Auth>("/auth/verify", { method: "POST", body: { phone, code: c } })); }
    catch (e) {
      fail(e);
      setCode(Array(LEN).fill(""));
      setTimeout(() => boxes.current[0]?.focus(), 60);
      shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
    } finally { setBusy(null); }
  }

  async function demo() {
    setErr(null); setBusy("demo");
    try { done(await api<Auth>("/auth/demo", { method: "POST" })); } catch (e) { fail(e); setBusy(null); }
  }

  function fill(from: number, raw: string) {
    const digits = onlyDigits(raw);
    const next = [...code];
    if (!digits) { next[from] = ""; setCode(next); return; }
    digits.slice(0, LEN - from).split("").forEach((ch, i) => { next[from + i] = ch; });
    setCode(next);
    const idx = Math.min(from + digits.length, LEN - 1);
    boxes.current[idx]?.focus();
    if (next.every(Boolean)) verify(next.join(""));
  }

  const mmss = `${n(Math.floor(left / 60))}:${d(String(left % 60).padStart(2, "0"))}`;

  return (
    <div className="flex min-h-dvh flex-col">
      <Aurora />
      <header className="pt-safe mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center"><LangToggle /><ThemeToggle /></div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", bounce: 0, duration: 0.7 }}
          className="glass-thick w-full max-w-md overflow-hidden rounded-[32px] p-6 sm:p-8">
          <AnimatePresence mode="popLayout" initial={false}>
            {step === "phone" ? (
              <motion.form key="phone" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={spring}
                onSubmit={(e) => { e.preventDefault(); send(); }} noValidate>
                <h1 className="tight text-2xl font-extrabold">{t.login.title}</h1>
                <p className="mt-2 text-[15px] leading-7 text-fg-2">{t.login.sub}</p>
                <Field className="mt-6" label={t.login.phone} dir="ltr" inputMode="numeric" autoComplete="tel" name="phone"
                  placeholder={t.login.phonePh} value={d(phone)} maxLength={11} error={err}
                  onChange={(e) => { setPhone(onlyDigits(e.target.value).slice(0, 11)); setErr(null); }}
                  style={{ textAlign: "left", fontSize: 18 }} />
                <Btn type="submit" size="lg" className="mt-4 w-full" disabled={busy !== null}>
                  {busy === "send" ? t.common.loading : t.login.send}
                </Btn>
              </motion.form>
            ) : (
              <motion.form key="code" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={spring}
                onSubmit={(e) => { e.preventDefault(); if (code.every(Boolean)) verify(code.join("")); }}>
                <button type="button" onClick={() => { setStep("phone"); setErr(null); }} className="mb-4 inline-flex items-center gap-1 rounded-full text-sm font-medium text-fg-2 hover:text-fg">
                  <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />{t.common.back}
                </button>
                <h1 className="tight text-2xl font-extrabold">{t.login.codeTitle}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[15px] leading-7 text-fg-2">
                  <span>{t.login.codeSub(d(phone))}</span>
                  <button type="button" onClick={() => setStep("phone")} className="inline-flex items-center gap-1 rounded-full font-medium text-indigo">
                    <PenLine className="size-3.5" aria-hidden />{t.login.edit}
                  </button>
                </p>
                <motion.div animate={shake} dir="ltr" className="mt-6 flex justify-center gap-2 sm:gap-3" role="group" aria-label={t.login.codeTitle}>
                  {code.map((c, i) => (
                    <input key={i} ref={(el) => { boxes.current[i] = el; }} value={d(c)} inputMode="numeric" aria-label={t.login.digit(i + 1)}
                      autoComplete={i === 0 ? "one-time-code" : "off"} name={i === 0 ? "otp" : undefined} maxLength={i === 0 ? LEN : 1}
                      disabled={busy === "verify"}
                      onChange={(e) => fill(i, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onPaste={(e) => { e.preventDefault(); fill(0, e.clipboardData.getData("text")); }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !code[i] && i > 0) { e.preventDefault(); const nx = [...code]; nx[i - 1] = ""; setCode(nx); boxes.current[i - 1]?.focus(); }
                        if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
                        if (e.key === "ArrowRight" && i < LEN - 1) boxes.current[i + 1]?.focus();
                      }}
                      className={`tabnum size-12 rounded-2xl min-[380px]:size-14 bg-fill text-center text-2xl font-bold outline-none ring-1 ring-transparent transition-shadow focus:ring-2 focus:ring-[var(--ring)] sm:size-16 ${err ? "!ring-2 !ring-danger" : ""} ${c ? "bg-fill-2" : ""}`} />
                  ))}
                </motion.div>
                <AnimatePresence>
                  {err && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mt-3 text-center text-[13px] text-danger">{err}</motion.p>}
                </AnimatePresence>
                {dev && (
                  <motion.button type="button" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring, delay: 0.2 }} whileTap={{ scale: 0.96 }}
                    onClick={() => fill(0, dev)} title={t.login.devHint}
                    className="mx-auto mt-5 flex items-center gap-2 rounded-full border border-dashed border-[color-mix(in_srgb,var(--violet)_50%,transparent)] bg-[color-mix(in_srgb,var(--violet)_10%,transparent)] px-4 py-2 text-sm font-semibold text-violet">
                    <FlaskConical className="size-4" aria-hidden />
                    <span className="tabnum">{t.login.devCode(d(dev))}</span>
                    <span className="text-[12px] font-normal opacity-75">· {t.login.devHint}</span>
                  </motion.button>
                )}
                <Btn type="submit" size="lg" className="mt-5 w-full" disabled={busy !== null || !code.every(Boolean)}>
                  {busy === "verify" ? t.common.loading : t.login.verify}
                </Btn>
                <div className="mt-3 text-center text-sm text-fg-3">
                  {left > 0 ? <span className="tabnum">{t.login.resendIn(mmss)}</span> : (
                    <button type="button" onClick={send} className="rounded-full font-semibold text-indigo">{t.login.resend}</button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="my-6 flex items-center gap-3 text-[13px] text-fg-3">
            <span className="h-px flex-1 bg-line" />{t.login.or}<span className="h-px flex-1 bg-line" />
          </div>
          <Btn variant="glass" size="lg" className="w-full" onClick={demo} disabled={busy !== null}>
            <Sparkles className="size-5 text-violet" aria-hidden />
            {busy === "demo" ? t.common.loading : t.login.demo}
          </Btn>
          <p className="mt-2 text-center text-[13px] text-fg-3">{t.login.demoSub}</p>
          <p className="mt-6 text-center text-[12px] leading-5 text-fg-3">{t.login.terms}</p>
        </motion.div>
      </main>
    </div>
  );
}

