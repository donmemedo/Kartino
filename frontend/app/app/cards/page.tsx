"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, CircleAlert, Plus, ShieldCheck, Trash2, Wand2 } from "lucide-react";
import { api, ApiError, findBank, groupPan, luhn, makePan, onlyDigits, useApi, type Bank, type Card } from "@/lib/api";
import { errorText, useT } from "@/lib/i18n";
import { Btn, Sheet, Skeleton, spring, useToast } from "@/components/ui";
import { CardFace, Tilt } from "@/components/bank-card";

export default function CardsPage() {
  const { t, pick } = useT();
  const toast = useToast();
  const cards = useApi<Card[]>("/cards");
  const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const list = cards.data ?? [];
  // expanded card: the tapped one, else the front (last) card
  const open = sel ?? list[list.length - 1]?.id;

  async function remove(c: Card) {
    setBusy(true);
    try {
      await api(`/cards/${c.id}`, { method: "DELETE" });
      cards.setData((l) => l?.filter((x) => x.id !== c.id) ?? l);
      toast({ title: t.cards.deleted });
      setDel(null);
    } catch (e) {
      toast({ title: errorText(t, e instanceof ApiError ? e.code : "generic"), tone: "error" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="tight text-3xl font-extrabold md:text-4xl">{t.cards.title}</h1>
          <p className="mt-1 text-fg-2">{t.cards.sub}</p>
        </div>
        <Btn onClick={() => setAdding(true)}><Plus className="size-5" aria-hidden />{t.cards.add}</Btn>
      </div>

      {cards.loading && <Skeleton className="mx-auto aspect-[1.586] w-full max-w-md" />}
      {cards.data && list.length === 0 && (
        <button type="button" onClick={() => setAdding(true)}
          className="mx-auto grid aspect-[1.586] w-full max-w-md place-items-center rounded-[22px] border-2 border-dashed border-line text-fg-3 transition-colors hover:text-fg">
          <span className="flex flex-col items-center gap-2"><Plus className="size-8" aria-hidden />{t.cards.empty}</span>
        </button>
      )}

      <ul className="mx-auto flex w-full max-w-md flex-col pb-4">
        <AnimatePresence initial={false}>
          {list.map((c, i) => {
            const prevOpen = i > 0 && list[i - 1].id === open;
            return (
              <motion.li key={c.id} layout transition={spring}
                initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                // stacked: each card overlaps the previous one, showing only its header strip
                className={`relative ${i === 0 ? "" : prevOpen ? "mt-4" : "-mt-[47%]"}`}>
                <Tilt max={8}>
                  <button type="button" onClick={() => setSel(c.id)} aria-expanded={open === c.id} className="block w-full rounded-[22px] text-start"
                    aria-label={`${pick(c.bank, "name")} ${c.last4}`}>
                    <CardFace color={c.bank.color} bank={pick(c.bank, "name")} number={c.masked} />
                  </button>
                </Tilt>
                <Btn variant="glass" size="icon" onClick={() => setDel(c)} aria-label={t.cards.deleteAria(c.last4)}
                  className="absolute end-14 top-[4.5%] z-10 !size-8 !bg-black/20 !text-white backdrop-blur">
                  <Trash2 className="size-4" aria-hidden />
                </Btn>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <p className="glass-thin mx-auto flex max-w-md items-start gap-3 rounded-3xl p-4 text-sm leading-6 text-fg-2">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-money" aria-hidden />{t.cards.privacy}
      </p>

      <AddCard open={adding} onClose={() => setAdding(false)} onAdded={(c) => { cards.setData((l) => [...(l ?? []), c]); setSel(c.id); }} />

      <Sheet open={!!del} onClose={() => setDel(null)} title={t.cards.deleteTitle}
        footer={<div className="flex gap-3">
          <Btn variant="fill" size="lg" className="flex-1" onClick={() => setDel(null)}>{t.common.cancel}</Btn>
          <Btn variant="danger" size="lg" className="flex-1" disabled={busy} onClick={() => del && remove(del)}>{t.common.delete}</Btn>
        </div>}>
        {del && <p className="leading-7 text-fg-2">{t.cards.deleteBody(del.last4)}</p>}
      </Sheet>
    </div>
  );
}

function AddCard({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (c: Card) => void }) {
  const { t, d, pick } = useT();
  const toast = useToast();
  const banks = useApi<Bank[]>(open ? "/banks" : null);
  const [pan, setPan] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bank = findBank(banks.data, pan);
  const full = pan.length === 16;
  const valid = full && luhn(pan);

  function close() { onClose(); setTimeout(() => { setPan(""); setErr(null); }, 400); }

  function generate() {
    const list = banks.data ?? [];
    if (!list.length) return;
    const b = list[Math.floor(Math.random() * list.length)];
    setPan(makePan(b.bins[Math.floor(Math.random() * b.bins.length)]));
    setErr(null);
  }

  async function submit() {
    setErr(null);
    if (!pan) return setErr(t.errors.empty);
    if (!valid) return setErr(t.errors.invalid_pan);
    if (banks.data && !bank) return setErr(t.errors.unknown_bank);
    setBusy(true);
    try {
      const c = await api<Card>("/cards", { method: "POST", body: { pan } });
      onAdded(c);
      toast({ title: t.cards.added, body: `${pick(c.bank, "name")} •••• ${c.last4}` });
      close();
    } catch (e) {
      setErr(errorText(t, e instanceof ApiError ? e.code : "generic"));
    } finally { setBusy(false); }
  }

  const shown = (pan + "•".repeat(16 - pan.length)).replace(/(.{4})(?=.)/g, "$1 ");
  const status = pan.length >= 6 && (bank ? t.cards.detected(pick(bank, "name")) : banks.data ? t.cards.unknown : null);

  return (
    <Sheet open={open} onClose={close} title={t.cards.add}
      footer={<Btn size="lg" className="w-full" onClick={submit} disabled={busy}>{busy ? t.common.loading : t.cards.add}</Btn>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <motion.div key={bank?.code ?? "none"} initial={{ scale: 0.97, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}>
          <CardFace color={bank?.color ?? "#3a3a48"} bank={bank ? pick(bank, "name") : t.cards.pan} number={shown} />
        </motion.div>

        <div>
          <label htmlFor="pan" className="mb-1.5 block text-[13px] font-medium text-fg-2">{t.cards.pan}</label>
          <input id="pan" dir="ltr" inputMode="numeric" autoComplete="cc-number" placeholder={d("6037 9900 0000 0000")}
            value={d(groupPan(pan))} aria-invalid={!!err} aria-describedby="pan-m"
            onChange={(e) => { setPan(onlyDigits(e.target.value).slice(0, 16)); setErr(null); }}
            className={`tabnum h-14 w-full rounded-2xl bg-fill px-4 text-start font-mono text-xl outline-none ring-1 ring-transparent transition-shadow focus:ring-2 focus:ring-[var(--ring)] ${err ? "!ring-2 !ring-danger" : ""}`} />
          <div id="pan-m" className="mt-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-[13px]" aria-live="polite">
            {err ? <span role="alert" className="text-danger">{err}</span> : (
              <>
                {!pan && <span className="text-fg-3">{t.cards.panHint}</span>}
                {status && <span className={`inline-flex items-center gap-1 font-medium ${bank ? "text-fg" : "text-danger"}`}>
                  {bank && <span className="size-2.5 rounded-full" style={{ background: bank.color }} />}{status}
                </span>}
                {full && <span className={`inline-flex items-center gap-1 ${valid ? "text-money" : "text-danger"}`}>
                  {valid ? <Check className="size-3.5" aria-hidden /> : <CircleAlert className="size-3.5" aria-hidden />}
                  {valid ? t.cards.luhnOk : t.cards.luhnBad}
                </span>}
              </>
            )}
          </div>
        </div>

        <Btn variant="fill" size="sm" onClick={generate} disabled={!banks.data}><Wand2 className="size-4 text-violet" aria-hidden />{t.cards.generate}</Btn>

        <p className="flex items-start gap-2 rounded-2xl bg-fill p-3 text-[13px] leading-6 text-fg-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-money" aria-hidden />{t.cards.privacy}
        </p>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
