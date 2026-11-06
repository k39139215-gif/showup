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
export const TODAY = new Date(2026, 10, 5); // Fixed app baseline: Nov 5, 2026
TODAY.setHours(0, 0, 0, 0);

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

export const D: DayData[] = Array.from({ length: N }, (_, i) => {
  if (i === 14) return { xp: 0, xr: 0, lp: 0, lr: 0, xv: 0, li: 0, xl: 0, ll: 0 };
  const live = i > 14;
  const xp = live ? ri(1, 2) : (R() < 0.5 ? 0 : 1);
  const xr = live ? ri(2, 9) : (R() < 0.5 ? 0 : ri(1, 6));
  const lp = live ? (R() < 0.85 ? 1 : 0) : 0;
  const lr = live ? ri(2, 6) : 0;
  const xv = (xp + xr) * ri(40, 140);
  const li = (lp + lr) * ri(60, 200);
  return { xp, xr, lp, lr, xv, li, xl: Math.round(xv * ri(2, 5) / 100), ll: Math.round(li * ri(2, 5) / 100) };
});

Object.assign(D[N - 1], { xp: 1, xr: 4, lp: 1, lr: 4, xv: 2100, li: 3000, xl: 85, ll: 120 });

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

export const CT: ContentItem[] = Array.from({ length: 60 }, (_, i) => {
  const type = (['reply external', 'reply own_conversation', 'original post'] as const)[i % 3];
  const topic = TOPICS[ri(0, 4)];
  const p = (R() < 0.6 ? 'x' : 'li') as 'x' | 'li';
  const text =
    type === 'reply external'
      ? `@CFO_${ri(1, 9)}: Great point on ERP reconciliation. In our experience with ${topic}, remittance decoupling causes 70% of delays.`
      : type === 'reply own_conversation'
      ? 'Thread update: Also consider how lockbox BAI2 type 16 records truncate invoice identifiers to 30 chars.'
      : 'Most mid-market finance teams waste 18 hours/week during month-end closing simply chasing remittance advices detached from ACH payments.';
  const views = ri(90, 420);
  const likes = ri(1, 9);
  const replies = ri(0, 2);
  const d = new Date(TODAY);
  d.setDate(d.getDate() - Math.floor(i / 2));
  return { id: i + 1, p, type, topic, text, views, likes, replies, eng: ((likes + replies) / views) * 100, date: d, note: '' };
});

export const LG_DOTS = Array.from({ length: 28 }, () =>
  R() < 0.3 ? 'background:#161616' : R() < 0.25 ? 'background:#f26a1b' : ''
);
