import React, { useRef } from 'react';
import {
  D,
  N,
  dayAt,
  pick,
  sum,
} from '../data';
import {
  fmtK,
  fmtD,
  dots,
  smooth,
  Tray,
} from '../utils';

interface LineChartProps {
  vals: number[];
  labels: string[];
  color: string;
  unit: string;
}

export const LineChart: React.FC<LineChartProps> = ({ vals, labels, color, unit }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const clRef = useRef<SVGLineElement>(null);
  const cdRef = useRef<SVGCircleElement>(null);

  const W = 720;
  const H = 250;
  const pl = 42;
  const pr = 12;
  const pt = 14;
  const pb = 28;
  const max = Math.max(...vals, 1) * 1.15;
  const m = Math.max(vals.length - 1, 1);

  const x = (i: number) => pl + (i * (W - pl - pr)) / m;
  const y = (v: number) => H - pb - (v / max) * (H - pt - pb);
  const pts: [number, number][] = vals.map((v, i) => [x(i), y(v)]);

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const yy = pt + (i * (H - pt - pb)) / 4;
    return (
      <React.Fragment key={i}>
        <line
          x1={pl}
          x2={W - pr}
          y1={yy}
          y2={yy}
          stroke="#e9e7e1"
          strokeDasharray="2 5"
        />
        <text
          x={pl - 8}
          y={yy + 4}
          textAnchor="end"
          fontSize="10.5"
          fill="#9b988f"
        >
          {fmtK(max * (1 - i / 4))}
        </text>
      </React.Fragment>
    );
  });

  const d = smooth(pts);
  const lx = [0, Math.floor(m / 2), m];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const tip = tipRef.current;
    const cl = clRef.current;
    const cd = cdRef.current;
    if (!svg || !tip || !cl || !cd) return;

    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(vals.length - 1, Math.round((px - pl) / ((W - pl - pr) / m))));

    cl.setAttribute('x1', String(x(i)));
    cl.setAttribute('x2', String(x(i)));
    cd.setAttribute('cx', String(x(i)));
    cd.setAttribute('cy', String(y(vals[i])));
    cl.style.opacity = cd.style.opacity = '1';
    tip.style.opacity = '1';
    tip.style.left = `${(x(i) / W) * 100}%`;
    tip.style.top = `${(y(vals[i]) / H) * 100}%`;
    tip.textContent = `${labels[i]} · ${vals[i].toLocaleString()} ${unit}`;
  };

  const handleMouseLeave = () => {
    if (clRef.current) clRef.current.style.opacity = '0';
    if (cdRef.current) cdRef.current.style.opacity = '0';
    if (tipRef.current) tipRef.current.style.opacity = '0';
  };

  return (
    <div className="lc">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="lgf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".12" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines}
        <path
          d={`${d}L${x(m)},${H - pb}L${pl},${H - pb}Z`}
          fill="url(#lgf)"
        />
        <path d={d} fill="none" stroke={color} strokeWidth="2" />
        <line
          id="lcl"
          ref={clRef}
          y1={pt}
          y2={H - pb}
          stroke="#bdb9ae"
          strokeDasharray="3 4"
          opacity="0"
        />
        <circle
          id="lcd"
          ref={cdRef}
          r="4.5"
          fill="#fff"
          stroke={color}
          strokeWidth="2"
          opacity="0"
        />
        {lx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? 'start' : i === m ? 'end' : 'middle'}
            fontSize="10.5"
            fill="#9b988f"
          >
            {labels[i]}
          </text>
        ))}
      </svg>
      <div className="tip mono" id="tip" ref={tipRef}></div>
    </div>
  );
};

interface AnalyticsPageProps {
  plat: string;
  rangeN: number;
  setRangeN: (n: number) => void;
  mt: string;
  setMt: (m: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  plat,
  rangeN,
  setRangeN,
  mt,
  setMt,
}) => {
  const S = D.slice(-rangeN);
  const l7 = D.slice(-7);
  const p7 = D.slice(-14, -7);
  const b30 = D.slice(-30);

  const avg = (a: typeof D, k: 'p' | 'r') => sum(a, (d) => pick(d, k, plat)) / a.length;
  const cur = sum(l7, (d) => pick(d, 'r', plat));
  const prev = sum(p7, (d) => pick(d, 'r', plat));
  const wow = prev ? ((cur - prev) / prev) * 100 : 0;
  const eng =
    (sum(S, (d) => pick(d, 'l', plat)) / Math.max(sum(S, (d) => pick(d, 'v', plat)), 1)) * 100;

  const X = (f: (d: (typeof D)[0]) => number) => sum(S, f);
  const cmp: [string, string | number, string | number][] = [
    ['Original posts published', X((d) => d.xp), X((d) => d.lp)],
    ['Outbound replies / comments', X((d) => d.xr), X((d) => d.lr)],
    ['Observed views / impressions', fmtK(X((d) => d.xv)), fmtK(X((d) => d.li))],
    ['Interactions (likes)', X((d) => d.xl), X((d) => d.ll)],
    [
      'Engagement rate',
      `${((X((d) => d.xl) / Math.max(X((d) => d.xv), 1)) * 100).toFixed(2)}%`,
      `${((X((d) => d.ll) / Math.max(X((d) => d.li), 1)) * 100).toFixed(2)}%`,
    ],
  ];

  const L = S.map((_, i) => fmtD(dayAt(N - rangeN + i)));
  const T = D.slice(-14);
  const dvHtml = dots(
    T.map((d) => pick(d, 'p', plat)),
    T.map((d) => pick(d, 'r', plat)),
    T.map((_, i) => dayAt(N - 14 + i).getDate())
  );

  return (
    <>
      <div className="head">
        <div>
          <h1>Analytics</h1>
          <p className="sub">Volume efficiency, week-over-week trends and topic resonance</p>
        </div>
        <div className="seg" id="rg">
          {[7, 14, 30, 60].map((n) => (
            <button
              key={n}
              data-n={n}
              className={n === rangeN ? 'on' : undefined}
              onClick={() => setRangeN(n)}
            >
              {n}d
            </button>
          ))}
        </div>
      </div>

      <div className="g k4 mb">
        <Tray icon="analytics" title="7-day rolling posts">
          <div className="kv">
            <span className="num mono">
              {avg(l7, 'p').toFixed(1)}
              <small> / day</small>
            </span>
          </div>
          <div className="ks">{`30-day baseline: ${avg(b30, 'p').toFixed(1)}/day`}</div>
        </Tray>

        <Tray icon="analytics" title="7-day rolling replies">
          <div className="kv">
            <span className="num mono">
              {avg(l7, 'r').toFixed(1)}
              <small> / day</small>
            </span>
          </div>
          <div className="ks">{`30-day baseline: ${avg(b30, 'r').toFixed(1)}/day`}</div>
        </Tray>

        <Tray icon="analytics" title="WoW reply activity">
          <div className="kv">
            <span className="num mono">{cur}</span>
            <span className={`pill ${wow >= 0 ? 'up' : 'dn'} mono`}>
              {`${wow >= 0 ? '+' : ''}${wow.toFixed(0)}%`}
            </span>
          </div>
          <div className="ks">{`Prior week: ${prev} replies`}</div>
        </Tray>

        <Tray icon="analytics" title="Avg engagement rate">
          <div className="kv">
            <span className="num mono">{`${eng.toFixed(2)}%`}</span>
          </div>
          <div className="ks">(Likes + replies) / views</div>
        </Tray>
      </div>

      <div className="g g2 mb">
        <Tray icon="trend" title="Outcome trend">
          <div className="seg" id="mt" style={{ marginBottom: '10px' }}>
            {[
              ['views', 'Views / Imp'],
              ['inter', 'Interactions'],
              ['fol', 'Followers'],
            ].map(([k, t]) => (
              <button
                key={k}
                data-m={k}
                className={mt === k ? 'on' : undefined}
                onClick={() => setMt(k)}
              >
                {t}
              </button>
            ))}
          </div>
          <div id="lch">
            {mt === 'fol' ? (
              <div className="empty">
                Follower history needs a connected account.
                <br />
                Connect X or LinkedIn in Settings to track it.
              </div>
            ) : (
              <LineChart
                vals={S.map((d) => pick(d, mt === 'views' ? 'v' : 'l', plat))}
                labels={L}
                color="#161616"
                unit={mt === 'views' ? 'views' : 'interactions'}
              />
            )}
          </div>
        </Tray>

        <Tray icon="analytics" title="Daily execution volume">
          <p className="sub" style={{ margin: '0 0 8px' }}>
            Posts and replies, past 14 days
          </p>
          <div id="dv" dangerouslySetInnerHTML={{ __html: dvHtml }} />
          <div className="legend">
            <span>
              <i style={{ background: '#f26a1b' }}></i>Posts
            </span>
            <span>
              <i style={{ background: '#161616' }}></i>Replies
            </span>
          </div>
        </Tray>
      </div>

      <Tray
        icon="content"
        title="Platform direct comparison"
        right={
          <span className="muted mono" style={{ fontSize: '12px' }}>
            last {rangeN} days
          </span>
        }
      >
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>X</th>
              <th>LinkedIn</th>
            </tr>
          </thead>
          <tbody>
            {cmp.map((r, idx) => (
              <tr key={idx}>
                <td>{r[0]}</td>
                <td className="mono">{r[1]}</td>
                <td className="mono">{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: '12px', marginTop: '10px' }}>
          X views and LinkedIn impressions are not identical definitions. Compare trends within a
          platform before comparing across.
        </p>
      </Tray>
    </>
  );
};
