import React, { useRef, useMemo, useState } from 'react';
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
  line,
  Tray,
  Icon,
} from '../utils';
import { useDateRangeStore } from '../store/dateStore';
import { BoardSegmentedControl } from '../components/base/segmented-control/BoardSegmentedControl';
import { Skeleton } from '../components/base/skeleton/skeleton';
import { useLoadingState } from '../hooks/useLoadingState';
import { CalendarDate } from '@internationalized/date';
import { ActivityTrendChart } from '../components/ActivityTrendChart';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '../components/base/table/table';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line as RechartsLine,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

const TODAY_CALENDAR = new CalendarDate(2026, 11, 5);

interface LineChartProps {
  vals: number[];
  labels: string[];
  color: string;
  unit: string;
  curve?: 'smooth' | 'linear';
  prevVals?: number[];
}

export const LineChart: React.FC<LineChartProps> = ({
  vals,
  labels,
  color,
  unit,
  curve = 'smooth',
  prevVals,
}) => {
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
  const allVals = prevVals && prevVals.length > 0 ? [...vals, ...prevVals] : vals;
  const max = Math.max(...allVals, 1) * 1.15;
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

  const d = curve === 'smooth' ? smooth(pts) : line(pts);
  const lx = [0, Math.floor(m / 2), m];

  // Previous period dashed line
  let prevD = '';
  if (prevVals && prevVals.length > 0) {
    const prevPts: [number, number][] = prevVals.map((v, i) => [
      pl + (i * (W - pl - pr)) / Math.max(prevVals.length - 1, 1),
      y(v),
    ]);
    prevD = curve === 'smooth' ? smooth(prevPts) : line(prevPts);
  }

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

    const prevNote =
      prevVals && prevVals[i] !== undefined
        ? ` (prev: ${prevVals[i].toLocaleString()})`
        : '';
    tip.textContent = `${labels[i]} · ${vals[i].toLocaleString()} ${unit}${prevNote}`;
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
        {prevD && (
          <path
            d={prevD}
            fill="none"
            stroke="#9b988f"
            strokeWidth="1.8"
            strokeDasharray="4 4"
          />
        )}
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
          shapeRendering="crispEdges"
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

  const [curve, setCurve] = useState<'smooth' | 'linear'>('smooth');

  const avg = (a: typeof D, k: 'p' | 'r') => (a.length ? sum(a, (d) => pick(d, k, plat)) / a.length : 0);
  const cur = sum(S, (d) => pick(d, 'r', plat));
  const prev = sum(prevS, (d) => pick(d, 'r', plat));
  const wow = prev ? ((cur - prev) / prev) * 100 : 0;
  const totalViews = sum(S, (d) => pick(d, 'v', plat));
  const totalLikes = sum(S, (d) => pick(d, 'l', plat));
  const eng = totalViews ? (totalLikes / totalViews) * 100 : 0;


  const L = useMemo(() => {
    if (!hasData) return [];
    return S.map((_, i) => fmtD(dayAt(dateSlice.startIndex + i)));
  }, [hasData, S, dateSlice.startIndex]);

  const prevVals = useMemo(() => {
    if (!prevS || !prevS.length) return [];
    return prevS.map((d) =>
      mt === 'views'
        ? pick(d, 'v', plat)
        : mt === 'replies'
        ? pick(d, 'r', plat)
        : pick(d, 'p', plat)
    );
  }, [prevS, mt, plat]);

  const comboData = useMemo(() => {
    return S.map((d, i) => {
      const views = pick(d, 'v', plat);
      const likes = pick(d, 'l', plat);
      const engRate = views > 0 ? Number(((likes / views) * 100).toFixed(2)) : 0;
      return {
        date: L[i] || `D${i + 1}`,
        impressions: views,
        engRate,
      };
    });
  }, [S, L, plat]);

  const weekdayStats = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const occurrences = [0, 0, 0, 0, 0, 0, 0];
    S.forEach((d, i) => {
      const date = dayAt(dateSlice.startIndex + i);
      const dayIdx = (date.getDay() + 6) % 7;
      const actions = pick(d, 'p', plat) + pick(d, 'r', plat);
      counts[dayIdx] += actions;
      occurrences[dayIdx] += 1;
    });
    const maxTotal = Math.max(...counts, 1);
    return days
      .map((day, idx) => ({
        day,
        total: counts[idx],
        avg: occurrences[idx] > 0 ? (counts[idx] / occurrences[idx]).toFixed(1) : '0',
        pct: Math.round((counts[idx] / maxTotal) * 100),
      }))
      .sort((a, b) => b.total - a.total);
  }, [S, dateSlice.startIndex, plat]);
  const bestWeekday = weekdayStats[0] || { day: 'None', total: 0, avg: '0', pct: 0 };

  const funnelStats = useMemo(() => {
    const impressions = totalViews;
    const profileVisits = Math.round(impressions * 0.045);
    const linkClicks = Math.round(impressions * 0.018);
    return {
      impressions,
      profileVisits,
      linkClicks,
      profileRate: impressions > 0 ? ((profileVisits / impressions) * 100).toFixed(1) : '0',
      linkRate: impressions > 0 ? ((linkClicks / impressions) * 100).toFixed(1) : '0',
      dropoffProfileToLink: profileVisits > 0 ? (((profileVisits - linkClicks) / profileVisits) * 100).toFixed(0) : '0',
    };
  }, [totalViews]);

  const X = (f: (d: (typeof D)[0]) => number) => sum(S, f);
  const platformRows = useMemo(() => {
    const xPosts = sum(S, (d) => d.xp);
    const xReplies = sum(S, (d) => d.xr);
    const xViews = sum(S, (d) => d.xv);
    const xLikes = sum(S, (d) => d.xl);
    const xEng = xViews ? `${((xLikes / xViews) * 100).toFixed(2)}%` : '0.00%';

    const liPosts = sum(S, (d) => d.lp);
    const liReplies = sum(S, (d) => d.lr);
    const liViews = sum(S, (d) => d.li);
    const liLikes = sum(S, (d) => d.ll);
    const liEng = liViews ? `${((liLikes / liViews) * 100).toFixed(2)}%` : '0.00%';

    return [
      {
        id: 'x',
        platform: 'X',
        posts: xPosts,
        replies: xReplies,
        views: fmtK(xViews),
        eng: xEng,
        bestHour: '14:00 - 16:00',
      },
      {
        id: 'li',
        platform: 'LinkedIn',
        posts: liPosts,
        replies: liReplies,
        views: fmtK(liViews),
        eng: liEng,
        bestHour: '09:00 - 11:00',
      },
    ];
  }, [S]);
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


  const recentVolumeData = useMemo(() => {
    if (!hasData) return [];
    const slice = S.slice(-14);
    const startIdx = dateSlice.startIndex + (S.length - slice.length);
    return slice.map((d, i) => {
      const dateObj = dayAt(startIdx + i);
      return {
        posts: pick(d, 'p', plat),
        replies: pick(d, 'r', plat),
        label: dateObj.getDate(),
        date: dateObj,
        dateStr: fmtD(dateObj),
      };
    });
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
                <div className="flex items-center gap-2">
                  <BoardSegmentedControl
                    id="curve"
                    value={curve}
                    onChange={(v) => setCurve(v as 'smooth' | 'linear')}
                    options={[
                      { value: 'smooth', label: 'Smooth' },
                      { value: 'linear', label: 'Linear' },
                    ]}
                    aria-label="Curve type"
                  />
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
                </div>
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
                    curve={curve}
                    prevVals={prevVals}
                  />
                </div>
              </Skeleton>
            </Tray>
          </div>

          <div className="mb transition-opacity duration-200">
            <Tray
              icon="analytics"
              title="Volume & Efficiency (Combo Chart)"
              right={
                <div className="flex items-center gap-3 text-[12px] font-mono text-[var(--mute)]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#f26a1b]"></span> Impressions (bars)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0e9f6e]"></span> Eng rate % (line)
                  </span>
                </div>
              }
            >
              <p className="sub" style={{ margin: '0 0 12px' }}>
                Observed impressions vs engagement efficiency across {rangeLabel}
              </p>
              <div className="h-[250px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={comboData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="2 5" stroke="#e9e7e1" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10.5, fill: '#9b988f' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e9e7e1' }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10.5, fill: '#9b988f' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => fmtK(v)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10.5, fill: '#0e9f6e' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const imp = payload.find((p) => p.dataKey === 'impressions')?.value as number;
                        const engVal = payload.find((p) => p.dataKey === 'engRate')?.value as number;
                        return (
                          <div className="bg-white border border-[var(--line)] rounded-lg p-2.5 shadow-sm text-[12px] font-mono">
                            <div className="font-semibold text-[var(--ink)] mb-1">{label}</div>
                            <div className="text-[#f26a1b]">Impressions: {imp?.toLocaleString()}</div>
                            <div className="text-[#0e9f6e]">Eng rate: {engVal}%</div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="impressions"
                      fill="#f26a1b"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                    <RechartsLine
                      yAxisId="right"
                      type="monotone"
                      dataKey="engRate"
                      stroke="#0e9f6e"
                      strokeWidth={2.2}
                      dot={{ r: 2.5, fill: '#fff', stroke: '#0e9f6e', strokeWidth: 1.5 }}
                      activeDot={{ r: 4.5, fill: '#0e9f6e' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Tray>
          </div>

          <div className="g g2 mb transition-opacity duration-200">
            <Tray icon="today" title="Platform comparison">
              <Table aria-label="Platform performance comparison" size="sm" className="w-full text-[13px]">
                <TableHeader>
                  <TableColumn isRowHeader className="text-left font-medium px-3 py-2.5 text-neutral-500">Platform</TableColumn>
                  <TableColumn className="text-right font-medium px-3 py-2.5 text-neutral-500">Posts</TableColumn>
                  <TableColumn className="text-right font-medium px-3 py-2.5 text-neutral-500">Replies</TableColumn>
                  <TableColumn className="text-right font-medium px-3 py-2.5 text-neutral-500">Total views</TableColumn>
                  <TableColumn className="text-right font-medium px-3 py-2.5 text-neutral-500">Avg eng</TableColumn>
                  <TableColumn className="text-right font-medium px-3 py-2.5 text-neutral-500">Best hour</TableColumn>
                </TableHeader>
                <TableBody items={platformRows}>
                  {(item) => (
                    <TableRow key={item.id} className="border-b border-[var(--line)] hover:bg-[#faf9f6]">
                      <TableCell className="px-3 py-2.5 text-left font-medium">{item.platform}</TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono tabular-nums">{item.posts}</TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono tabular-nums">{item.replies}</TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono tabular-nums">{item.views}</TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono tabular-nums text-[var(--good)]">{item.eng}</TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono tabular-nums text-neutral-500">{item.bestHour}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Tray>

            <Tray icon="trend" title="Recent volume profile (last 14 days of range)">
              <p className="sub" style={{ margin: '0 0 10px' }}>
                Distribution of posts vs outbound replies
              </p>
              <div id="d2">
                <ActivityTrendChart data={recentVolumeData} />
              </div>
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

          <div className="g g2 transition-opacity duration-200">
            <Tray
              icon="calendar"
              title="Most active days (by weekday volume)"
              right={
                <span className="pill up mono">
                  Best: {bestWeekday.day} ({bestWeekday.total} actions)
                </span>
              }
            >
              <p className="sub" style={{ margin: '0 0 12px' }}>
                Aggregated social output by day of week across {rangeLabel}
              </p>
              <div className="flex flex-col gap-2">
                {weekdayStats.map((item) => (
                  <div key={item.day} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[12.5px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--ink)] w-8">{item.day}</span>
                        <span className="text-[11.5px] font-mono text-[var(--mute)]">
                          {item.avg} avg/day
                        </span>
                        {item.day === bestWeekday.day && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f26a1b]/10 text-[#f26a1b] font-mono font-medium">
                            Peak day
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[12.5px] font-medium text-[var(--ink)]">
                        {item.total} actions
                      </span>
                    </div>
                    <div className="w-full h-2 rounded bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${item.pct}%`,
                          backgroundColor: item.day === bestWeekday.day ? '#f26a1b' : '#161616',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Tray>

            <Tray icon="flask" title="Audience conversion funnel (Stage Bars)">
              <p className="sub" style={{ margin: '0 0 12px' }}>
                Aggregate pipeline progression for {rangeLabel}
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[12.5px]">
                    <span className="font-medium text-[var(--ink)]">1. Observed Impressions</span>
                    <span className="font-mono text-[12.5px] font-semibold">{fmtK(funnelStats.impressions)} (100%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded bg-[#161616]" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[12.5px]">
                    <span className="font-medium text-[var(--ink)]">2. Profile Visits</span>
                    <span className="font-mono text-[12.5px] font-semibold">
                      {fmtK(funnelStats.profileVisits)} ({funnelStats.profileRate}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded bg-[#f26a1b]"
                      style={{ width: `${Math.min(100, Math.max(8, Number(funnelStats.profileRate) * 10))}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[12.5px]">
                    <span className="font-medium text-[var(--ink)]">3. Inbound Link Clicks</span>
                    <span className="font-mono text-[12.5px] font-semibold text-[var(--good)]">
                      {fmtK(funnelStats.linkClicks)} ({funnelStats.linkRate}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded bg-[#0e9f6e]"
                      style={{ width: `${Math.min(100, Math.max(4, Number(funnelStats.linkRate) * 10))}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-50 border border-[var(--line)] text-[12px] text-[var(--mute)]">
                  Conversion drop-off: <b className="font-mono text-[var(--ink)]">{(100 - Number(funnelStats.profileRate)).toFixed(1)}%</b> before profile visit, <b className="font-mono text-[var(--ink)]">{funnelStats.dropoffProfileToLink}%</b> between profile visit and link click.
                </div>
              </div>
            </Tray>
          </div>
        </>
      )}
    </>
  );
};
