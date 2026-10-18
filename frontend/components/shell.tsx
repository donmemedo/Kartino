"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "motion/react";
import { CreditCard, LayoutDashboard, Tag, UserRound, Wallet } from "lucide-react";
import { getToken } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Aurora, LangToggle, Logo, ThemeToggle, spring, useMounted } from "@/components/ui";

/** Client-side guard: no token -> /login. Returns true once it is safe to render. */
export function useAuthed() {
  const mounted = useMounted();
  const router = useRouter();
  const ok = mounted && !!getToken();
  useEffect(() => { if (mounted && !getToken()) router.replace("/login"); }, [mounted, router]);
  return ok;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const path = usePathname();
  const ok = useAuthed();
  const tabs = [
    { href: "/app", label: t.app.tabs.offers, Icon: Tag },
    { href: "/app/wallet", label: t.app.tabs.wallet, Icon: Wallet },
    { href: "/app/cards", label: t.app.tabs.cards, Icon: CreditCard },
    { href: "/app/settings", label: t.app.tabs.account, Icon: UserRound },
  ];
  const current = tabs.find((x) => x.href === path)?.href ?? "/app";

  return (
    <>
      <Aurora />
      {/* desktop sidebar */}
      <aside className="glass-thick fixed inset-y-3 start-3 z-40 hidden w-64 flex-col rounded-[28px] p-4 md:flex">
        <div className="px-2 py-1"><Logo href="/app" /></div>
        <nav className="mt-6 flex flex-col gap-1" aria-label={t.common.menu}>
          {tabs.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={current === href ? "page" : undefined}
              className={`relative flex h-11 items-center gap-3 rounded-2xl px-3 font-medium transition-colors ${current === href ? "text-fg" : "text-fg-2 hover:text-fg"}`}>
              {current === href && <motion.span layoutId="side-pill" transition={spring} className="absolute inset-0 rounded-2xl bg-fill-2" />}
              <Icon className="relative size-5" aria-hidden /><span className="relative">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <Link href="/merchant" className="glass-thin flex items-center gap-3 rounded-2xl p-3 text-sm font-medium">
            <span className="brand-grad grid size-9 place-items-center rounded-xl text-white"><LayoutDashboard className="size-[18px]" aria-hidden /></span>
            {t.app.merchantPanel}
          </Link>
          <div className="flex items-center justify-between"><LangToggle /><ThemeToggle /></div>
        </div>
      </aside>

      {/* mobile header */}
      <header className="edge-fade pt-safe sticky top-0 z-30 md:hidden" style={{ background: "color-mix(in srgb, var(--canvas) 70%, transparent)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)" }}>
        <div className="flex h-14 items-center justify-between px-4">
          <Logo href="/app" />
          <div className="flex items-center"><LangToggle /><ThemeToggle /></div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-32 md:ps-[18.5rem] md:pe-8 md:pt-8 md:pb-12 md:max-w-none">
        <div className="mx-auto max-w-5xl">{ok ? children : null}</div>
      </main>

      {/* mobile floating tab bar */}
      <nav aria-label={t.common.menu} className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),14px)] md:hidden">
        <div className="glass-thick mx-auto flex max-w-md rounded-[26px] bg-[color-mix(in_srgb,var(--canvas)_88%,transparent)] p-1.5">
          {tabs.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={current === href ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-[20px] py-2 text-[11px] font-medium transition-colors ${current === href ? "text-fg" : "text-fg-3"}`}>
              {current === href && <motion.span layoutId="tab-pill" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} className="absolute inset-0 rounded-[20px] bg-fill-2" />}
              <Icon className="relative size-[22px]" aria-hidden strokeWidth={current === href ? 2.4 : 2} />
              <span className="relative">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
