import { CalendarDate } from '@internationalized/date';

export function rng(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const R = rng(7);
export const ri = (a: number, b: number) => a + Math.floor(R() * (b - a + 1));

export const N = 240;
const _now = new Date();
export const TODAY = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());
TODAY.setHours(0, 0, 0, 0);

export function getTodayCalendar(): CalendarDate {
  return new CalendarDate(TODAY.getFullYear(), TODAY.getMonth() + 1, TODAY.getDate());
}

export const dayAt = (i: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - (N - 1 - i));
  return d;
};

export interface DayData {
  xp: number;
  xr: number;
  lp: number;
  lr: number;
  xv: number;
  li: number;
  xl: number;
  ll: number;
}

// 100% real data: initialized to 0 until loaded from Supabase or synced from platforms
export const D: DayData[] = Array.from({ length: N }, () => ({
  xp: 0,
  xr: 0,
  lp: 0,
  lr: 0,
  xv: 0,
  li: 0,
  xl: 0,
  ll: 0,
}));

export interface Goals {
  xp: number;
  xr: number;
  lp: number;
  lr: number;
}

export const G: Goals = { xp: 1, xr: 8, lp: 1, lr: 4 };

export const acts = (d: DayData) => d.xp + d.xr + d.lp + d.lr;
export const met = (d: DayData) => d.xp >= G.xp && d.xr >= G.xr && d.lp >= G.lp && d.lr >= G.lr;
export const streak = () => {
  let s = 0;
  for (let i = N - 1; i >= 0 && acts(D[i]) > 0; i--) s++;
  return s;
};
export const sum = <T>(S: T[], f: (d: T) => number) => S.reduce((s, d) => s + f(d), 0);

export const pick = (d: DayData, k: 'p' | 'r' | 'v' | 'l', plat: string) =>
  ({ p: [d.xp, d.lp], r: [d.xr, d.lr], v: [d.xv, d.li], l: [d.xl, d.ll] }[k]).reduce(
    (s, v, i) => s + (plat === 'all' || plat === (['x', 'li'] as const)[i] ? v : 0),
    0
  );

export const TOPICS = ['AR', 'Cash Application', 'Deductions', 'NetSuite', 'SAP'] as const;

export interface ContentItem {
  id: number;
  p: 'x' | 'li';
  type: string;
  topic: string;
  text: string;
  views: number;
  likes: number;
  replies: number;
  eng: number;
  date: Date;
  note: string;
}

// 100% real content items: populated when real posts are synced from X or LinkedIn
export const CT: ContentItem[] = [];

export const LG_DOTS = Array.from({ length: 28 }, () => '');
