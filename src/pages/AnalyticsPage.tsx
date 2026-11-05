import React, { useRef, useMemo } from 'react';
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
  Icon,
} from '../utils';
import { useDateRangeStore } from '../store/dateStore';
import { BoardSegmentedControl } from '../components/base/segmented-control/BoardSegmentedControl';
import { Skeleton } from '../components/base/skeleton/skeleton';
import { useLoadingState } from '../hooks/useLoadingState';
import { CalendarDate } from '@internationalized/date';

const TODAY_CALENDAR = new CalendarDate(2026, 11, 5);

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
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="gline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines}
        <path
          d={`${d} L ${x(m)} ${H - pb} L ${x(0)} ${H - pb} Z`}
          fill="url(#gline)"
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
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
  mt: string;
  setMt: (m: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  plat,
  mt,
  setMt,
}) => {
  const { end, daysCount, dateSlice, previousPeriod, setRange, rangeLabel } = useDateRangeStore();

  const isLoaded = useLoadingState([plat, mt, daysCount, rangeLabel]);

  const S = dateSlice.days;
  const prevS = dateSlice.prevDays;
  const hasData = dateSlice.hasData;

  const handleShortcutClick = (n: number) => {
    setRange(TODAY_CALENDAR.subtract({ days: n - 1 }), TODAY_CALENDAR);
  };

  const isShortcutActive = (n: number) => {
    return end.compare(TODAY_CALENDAR) === 0 && daysCount === n;
  };

  const avg = (a: typeof D, k: 'p' | 'r') => (a.length ? sum(a, (d) => pick(d, k, plat)) / a.length : 0);
  const cur = sum(S, (d) => pick(d, 'r', plat));
  const prev = sum(prevS, (d) => pick(d, 'r', plat));
  const wow = prev ? ((cur - prev) / prev) * 100 : 0;
  const totalViews = sum(S, (d) => pick(d, 'v', plat));
  const totalLikes = sum(S, (d) => pick(d, 'l', plat));
  const eng = totalViews ? (totalLikes / totalViews) * 100 : 0;

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

  const L = useMemo(() => {
    if (!hasData) return [];
    return S.map((_, i) => fmtD(dayAt(dateSlice.startIndex + i)));
  }, [hasData, S, dateSlice.startIndex]);

  const dvHtml = useMemo(() => {
    if (!hasData) return '';
    const slice = S.slice(-14);
    const startIdx = dateSlice.startIndex + (S.length - slice.length);
    return dots(
      slice.map((d) => pick(d, 'p', plat)),
      slice.map((d) => pick(d, 'r', plat)),
      slice.map((_, i) => dayAt(startIdx + i).getDate())
    );
  }, [hasData, S, dateSlice.startIndex, plat]);

  return (
    <>
      <div className="head">
        <div>
          <h1>Analytics</h1>
          <p className="sub">{`Volume efficiency and comparisons for ${rangeLabel}`}</p>
        </div>
        <BoardSegmentedControl
          id="rg"
          value={String([7, 14, 30, 60].find((n) => isShortcutActive(n)) || '30')}
          onChange={(val) => handleShortcutClick(parseInt(val, 10))}
          options={[
            { value: '7', label: '7d' },
            { value: '14', label: '14d' },
            { value: '30', label: '30d' },
            { value: '60', label: '60d' },
          ]}
          aria-label="Quick date range shortcuts"
        />
      </div>

      {!hasData ? (
        <div className="empty mb">
          <div style={{ padding: '32px 16px' }}>
            <Icon name="analytics" size={32} />
            <h3 style={{ marginTop: '10px', fontSize: '16px', fontWeight: 600 }}>
              No metrics recorded for this period
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--mute)', marginTop: '4px' }}>
              The selected range ({rangeLabel}) contains no logged performance data.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="g k4 mb transition-opacity duration-200">
            <Tray icon="analytics" title={`${daysCount}-day rolling posts`}>
              <div className="kv">
                <span className="num mono">
                  {avg(S, 'p').toFixed(1)}
                  <small> / day</small>
                </span>
              </div>
              <div className="ks">{`Prev period: ${avg(prevS, 'p').toFixed(1)}/day`}</div>
            </Tray>

            <Tray icon="analytics" title={`${daysCount}-day rolling replies`}>
              <div className="kv">
                <span className="num mono">
                  {avg(S, 'r').toFixed(1)}
                  <small> / day</small>
                </span>
              </div>
              <div className="ks">{`Prev period: ${avg(prevS, 'r').toFixed(1)}/day`}</div>
            </Tray>

            <Tray icon="analytics" title="Reply volume vs previous period">
              <div className="kv">
                <span className="num mono">{cur}</span>
                <span className={`pill ${wow >= 0 ? 'up' : 'dn'} mono`}>
                  {`${wow >= 0 ? '+' : ''}${wow.toFixed(0)}%`}
                </span>
              </div>
              <div className="ks">{`vs prev ${daysCount} days (${prev} replies)`}</div>
            </Tray>

            <Tray icon="analytics" title="Average engagement rate">
              <div className="kv">
                <span className="num mono">{`${eng.toFixed(2)}%`}</span>
                <span className="pill up mono">+0.4%</span>
              </div>
              <div className="ks">{`Period total: ${fmtK(totalLikes)} likes`}</div>
            </Tray>
          </div>

          <div className="mb transition-opacity duration-200">
            <Tray
              icon="trend"
              title="Metric trajectory"
              right={
                <BoardSegmentedControl
                  id="mt"
                  value={mt}
                  onChange={setMt}
                  options={[
                    { value: 'views', label: 'Views' },
                    { value: 'replies', label: 'Replies' },
                    { value: 'posts', label: 'Posts' },
                  ]}
                  aria-label="Metric tabs"
                />
              }
            >
              <Skeleton isLoaded={isLoaded} className="w-full">
                <div id="lch">
                  <LineChart
                    vals={S.map((d) =>
                      mt === 'views'
                        ? pick(d, 'v', plat)
                        : mt === 'replies'
                        ? pick(d, 'r', plat)
                        : pick(d, 'p', plat)
                    )}
                    labels={L}
                    color="#1a56db"
                    unit={mt}
                  />
                </div>
              </Skeleton>
            </Tray>
          </div>

          <div className="g g2 transition-opacity duration-200">
            <Tray icon="today" title="Platform comparison">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>X</th>
                    <th>LinkedIn</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.map((r, i) => (
                    <tr key={i}>
                      <td>{r[0]}</td>
                      <td className="mono">{r[1]}</td>
                      <td className="mono">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Tray>

            <Tray icon="trend" title="Recent volume profile (last 14 days of range)">
              <p className="sub" style={{ margin: '0 0 10px' }}>
                Distribution of posts vs outbound replies
              </p>
              <div id="d2" dangerouslySetInnerHTML={{ __html: dvHtml }} />
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
        </>
      )}
    </>
  );
};
