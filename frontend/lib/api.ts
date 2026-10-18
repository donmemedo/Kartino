"use client";
import { useCallback, useEffect, useState } from "react";

// ---- Contract types ----
export type User = { id: number; phone: string; name: string | null; created_at: string };
export type Bank = { code: string; bins: string[]; name_fa: string; name_en: string; color: string };
export type Card = { id: number; bank: Bank; last4: string; masked: string; created_at: string };
export type Category = { slug: string; name_fa: string; name_en: string; icon: string };
export type Merchant = {
  id: number; name_fa: string; name_en: string; category: string;
  city_fa: string; city_en: string; color: string; emoji: string;
};
export type Channel = "online" | "in_store" | "both";
export type Offer = {
  id: number; merchant: Merchant; title_fa: string; title_en: string;
  description_fa: string; description_en: string; cashback_percent: number;
  max_reward: number; min_purchase: number; channel: Channel; ends_at: string;
  featured: boolean; activated: boolean; redemptions: number;
};
export type Reward = {
  id: number; offer_id: number; merchant: Merchant; amount: number; reward: number;
  status: "pending" | "settled"; card_last4: string; created_at: string;
};
export type Wallet = { balance: number; pending: number; lifetime: number; rewards: Reward[] };
export type Purchase = {
  matched: boolean; reason: null | "no_active_offer" | "below_min_purchase"; reward: Reward | null;
  transaction: { id: number; amount: number; merchant: Merchant; card_last4: string; created_at: string };
};
export type Campaign = Offer & { status: "active" | "paused" | "ended"; budget: number; spent: number; activations: number };
export type Dashboard = {
  merchant: Merchant;
  kpis: {
    attributed_sales: number; rewards_paid: number; redemptions: number; activations: number;
    redemption_rate: number; roi: number; cac: number; new_customers: number;
  };
  series: { date: string; sales: number; redemptions: number }[];
  top_offers: { offer_id: number; title_fa: string; title_en: string; activations: number; redemptions: number }[];
};
export type NewCampaign = {
  title_fa: string; title_en: string; description_fa?: string; description_en?: string;
  cashback_percent: number; max_reward: number; min_purchase: number; budget: number;
  channel: Channel; days: number; featured?: boolean;
};

// ---- Client ----
const TOKEN = "cb_token";
export const getToken = () => { try { return localStorage.getItem(TOKEN); } catch { return null; } };
export const setToken = (t: string | null) => {
  try { if (t) localStorage.setItem(TOKEN, t); else localStorage.removeItem(TOKEN); } catch {}
};

export class ApiError extends Error {
  constructor(public code: string, public status = 0) { super(code); }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("network");
  }
  if (res.status === 401) {
    setToken(null);
    if (location.pathname.startsWith("/app") || location.pathname.startsWith("/merchant")) location.replace("/login");
    throw new ApiError("unauthorized", 401);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // FastAPI 422 sends detail as an array of validation errors
    const d = data?.detail;
    throw new ApiError(typeof d === "string" ? d : res.status >= 500 ? "server" : "invalid", res.status);
  }
  return data as T;
}

/** Tiny fetch hook. path=null skips. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!path);
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      const d = await api<T>(path);
      setData(d); setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("network"));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => { setLoading(!!path); reload(); }, [reload, path]);
  return { data, setData, error, loading, reload };
}

// ---- Domain helpers ----
export const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

export const onlyDigits = (s: string) => toLatinDigits(s).replace(/\D/g, "");

export function luhn(pan: string) {
  if (!/^\d{16}$/.test(pan)) return false;
  let sum = 0;
  for (let i = 0; i < 16; i++) {
    let d = +pan[15 - i];
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Luhn-valid 16-digit PAN starting with the given 6-digit BIN. */
export function makePan(bin: string) {
  let body = bin;
  while (body.length < 15) body += Math.floor(Math.random() * 10);
  for (let c = 0; c < 10; c++) if (luhn(body + c)) return body + c;
  return body + "0";
}

export const groupPan = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, "$1 ");

export const findBank = (banks: Bank[] | null, digits: string) =>
  digits.length >= 6 ? banks?.find((b) => b.bins.includes(digits.slice(0, 6))) ?? null : null;
