import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/inter";
import "./globals.css";
import { Providers } from "@/components/ui";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { default: "کارت‌بک | CardBack", template: "%s · کارت‌بک" },
  description: "هر کارت بانکی، یک کارت باشگاه مشتریان — Every bank card is now a rewards card.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "کارت‌بک", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#06060A" },
  ],
};

// Runs before paint: resolves cb_theme (light/dark/system) onto <html data-theme> and syncs theme-color.
const themeScript = `(function(){var d=document.documentElement,q=matchMedia('(prefers-color-scheme: dark)');
window.__cbTheme=function(){var p=null;try{p=localStorage.getItem('cb_theme')}catch(e){}
var t=p==='light'||p==='dark'?p:(q.matches?'dark':'light');d.setAttribute('data-theme',t);
document.querySelectorAll('meta[name=theme-color]').forEach(function(m){m.setAttribute('content',t==='dark'?'#06060A':'#F5F5F7')})};
window.__cbTheme();q.addEventListener('change',window.__cbTheme);document.addEventListener('DOMContentLoaded',window.__cbTheme)})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale: Locale = (await cookies()).get("cb_locale")?.value === "en" ? "en" : "fa";
  return (
    <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
