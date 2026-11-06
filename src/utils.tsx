import React from 'react';

export const I: Record<string, string> = {
  today: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>',
  analytics: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
  content: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  review: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17v4M17 19h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/>',
  flask: '<path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2l-6-10V3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>'
};

export const ic = (n: string, s: number = 16) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;

export const Icon: React.FC<{ name: string; size?: number }> = ({ name, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: I[name] }}
  />
);

export const fmtK = (n: number) => {
  if (n >= 1000) {
    const v = n / 1000;
    const formatted = v.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}k`;
  }
  return String(Math.round(n));
};

export function getNiceScale(rawMax: number, targetIntervals = 4, isInteger = false): {
  max: number;
  step: number;
  ticks: number[];
} {
  if (rawMax <= 0) {
    const max = isInteger ? 4 : 4;
    const step = 1;
    return { max, step, ticks: Array.from({ length: 5 }, (_, i) => max - i * step) };
  }

  const roughStep = rawMax / targetIntervals;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let niceFactor = 1;
  if (normalized <= 1) niceFactor = 1;
  else if (normalized <= 1.5) niceFactor = 1.5;
  else if (normalized <= 2) niceFactor = 2;
  else if (normalized <= 2.5) niceFactor = 2.5;
  else if (normalized <= 5) niceFactor = 5;
  else niceFactor = 10;

  let step = niceFactor * magnitude;
  if (isInteger && step < 1) step = 1;

  let max = step * targetIntervals;
  while (max < rawMax) {
    max += step;
  }

  // Generate descending ticks: [max, max - step, ..., 0]
  const tickCount = Math.round(max / step) + 1;
  const ticks = Array.from({ length: tickCount }, (_, i) => Math.round((max - i * step) * 1000) / 1000);

  return { max, step, ticks };
}

export const fmtD = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const wd = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' });
export const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const badge = (p: string) => (
  <span className={`plat ${p === 'li' ? 'li' : ''}`}>{p === 'li' ? 'in' : 'X'}</span>
);

export function dots(P: number[], Rr: number[], L: (string | number)[]) {
  const n = L.length,
    W = 600,
    H = 230,
    base = 196,
    ch = 13,
    rows = 15,
    step = (W - 40) / n;
  let s = '';
  const minLabelGap = 28;
  const skipInterval = step < minLabelGap ? Math.ceil(minLabelGap / step) : 1;

  for (let i = 0; i < n; i++) {
    const x = 20 + i * step + step / 2 - 5,
      p = Math.min(P[i], 3),
      r = Math.min(Rr[i], rows - p);
    for (let k = 0; k < rows; k++) {
      const y = base - (k + 1) * ch + 3;
      const c = k < r ? '#161616' : k < r + p ? '#f26a1b' : '#ebe9e3';
      s += `<rect x="${x}" y="${y}" width="10" height="10" rx="2.5" fill="${c}"/>`;
    }
    if (i % skipInterval === 0) {
      s += `<text x="${x + 5}" y="${H - 8}" text-anchor="middle" font-size="10.5" fill="#9b988f">${L[i]}</text>`;
    }
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${s}</svg>`;
}

export function line(p: [number, number][]) {
  return p.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0]},${pt[1]}`).join(' ');
}

export function smooth(p: [number, number][]) {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i],
      b = p[i],
      c = p[i + 1],
      e = p[i + 2] || c;
    d += `C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6},${c[1] - (e[1] - b[1]) / 6} ${c[0]},${c[1]}`;
  }
  return d;
}

export const Segs: React.FC<{ f: number; c: string }> = ({ f, c }) => (
  <div className="segbar">
    {Array.from({ length: 20 }, (_, i) => (
      <i key={i} style={i < Math.round(Math.min(f, 1) * 20) ? { background: c } : undefined} />
    ))}
  </div>
);

export const Tray: React.FC<{
  icon: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, right, children }) => (
  <div className="tray">
    <div className="th">
      <span className="ti">
        <Icon name={icon} size={15} />
        {title}
      </span>
      {right}
    </div>
    <div className="tb">{children}</div>
  </div>
);

export function useCountTween(target: number, duration = 200): number {
  const [val, setVal] = React.useState(target);
  const prevRef = React.useRef(target);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(target);
      prevRef.current = target;
      return;
    }
    const startVal = prevRef.current;
    const diff = target - startVal;
    if (diff === 0) return;

    const startTime = performance.now();
    let frameId: number;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(startVal + diff * ease));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        prevRef.current = target;
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return val;
}
