import React, { useMemo } from 'react';
import {
  D,
  N,
  G,
  CT,
  dayAt,
  acts,
  met,
  streak,
  pick,
  sum,
} from '../data';
import {
  fmtK,
  fmtD,
  wd,
  greet,
  Icon,
  badge,
  dots,
  Segs,
  Tray,
  useCountTween,
} from '../utils';
import { useDateRangeStore } from '../store/dateStore';
import { Skeleton } from '../components/base/skeleton/skeleton';
import { Tooltip, TooltipTrigger } from '../components/base/tooltip/tooltip';
import { Badge } from '../components/base/badges/badge';
import { useLoadingState } from '../hooks/useLoadingState';
import { ActivityTrendChart } from '../components/ActivityTrendChart';
import { cx } from '../utils/cx';

interface TodayPageProps {
  plat: string;
}

export const TodayPage: React.FC<TodayPageProps> = ({ plat }) => {
  const {
    mode,
    daysCount,
    isTodaySelected,
    rangeLabel,
    dateSlice,
    isDateInCurrentRange,
    start,
    end,
  } = useDateRangeStore();

  const isLoaded = useLoadingState([plat, rangeLabel, start, end]);

  const isSingle = mode === 'single' || daysCount === 1;
  const hasData = dateSlice.hasData;

  // Single day or range aggregation
  const p = useMemo(() => {
    if (!hasData) return 0;
    if (isSingle) return pick(dateSlice.days[0], 'p', plat);
    return sum(dateSlice.days, (d) => pick(d, 'p', plat));
  }, [hasData, isSingle, dateSlice.days, plat]);

  const r = useMemo(() => {
    if (!hasData) return 0;
    if (isSingle) return pick(dateSlice.days[0], 'r', plat);
    return sum(dateSlice.days, (d) => pick(d, 'r', plat));
  }, [hasData, isSingle, dateSlice.days, plat]);

  const v = useMemo(() => {
    if (!hasData) return 0;
    if (isSingle) return pick(dateSlice.days[0], 'v', plat);
    return sum(dateSlice.days, (d) => pick(d, 'v', plat));
  }, [hasData, isSingle, dateSlice.days, plat]);

  const l = useMemo(() => {
    if (!hasData) return 0;
    if (isSingle) return pick(dateSlice.days[0], 'l', plat);
    return sum(dateSlice.days, (d) => pick(d, 'l', plat));
  }, [hasData, isSingle, dateSlice.days, plat]);

  const e = v ? (l / v) * 100 : 0;

  const mult = isSingle ? 1 : daysCount;
  const gp = (plat === 'x' ? G.xp : plat === 'li' ? G.lp : G.xp + G.lp) * mult;

  // Animate numbers smoothly with <= 200ms tween
  const tweenP = useCountTween(p);
  const tweenR = useCountTween(r);
  const tweenV = useCountTween(v);

  const rows: [string, string, number, number][] = useMemo(() => {
    if (!hasData) return [];
    if (isSingle) {
      const d = dateSlice.days[0];
      return [
        ['x', 'Original post', d.xp, G.xp],
        ['x', 'Outbound replies', d.xr, G.xr],
        ['li', 'LinkedIn post', d.lp, G.lp],
        ['li', 'LinkedIn replies', d.lr, G.lr],
      ].filter((x) => plat === 'all' || x[0] === plat) as [string, string, number, number][];
    }
    return [
      ['x', 'Original post', sum(dateSlice.days, (d) => d.xp), G.xp * mult],
      ['x', 'Outbound replies', sum(dateSlice.days, (d) => d.xr), G.xr * mult],
      ['li', 'LinkedIn post', sum(dateSlice.days, (d) => d.lp), G.lp * mult],
      ['li', 'LinkedIn replies', sum(dateSlice.days, (d) => d.lr), G.lr * mult],
    ].filter((x) => plat === 'all' || x[0] === plat) as [string, string, number, number][];
  }, [hasData, isSingle, dateSlice.days, plat, mult]);

  // Goals reached
  const m = useMemo(() => {
    if (!hasData) return 0;
    if (isSingle) {
      return rows.filter((x) => x[2] >= x[3]).length;
    }
    // In range mode, count days that met all goals
    return dateSlice.days.filter((cd) => met(cd)).length;
  }, [hasData, isSingle, rows, dateSlice.days]);

  const tweenM = useCountTween(m);

  // 7-day consistency strip ending at the range end date
  const consistencyEndIdx = Math.max(0, Math.min(N - 1, dateSlice.endIndex));
  const consistency7 = useMemo(() => {
    const startIdx = Math.max(0, consistencyEndIdx - 6);
    return D.slice(startIdx, consistencyEndIdx + 1);
  }, [consistencyEndIdx]);

  // Heatmap: 84 days
  const cells = useMemo(() => D.slice(-84), []);
  const lead = cells[0] ? (dayAt(N - 84).getDay() + 6) % 7 : 0;
  const lvl = (a: number) => (a === 0 ? '' : a <= 3 ? 'l1' : a <= 7 ? 'l2' : a <= 11 ? 'l3' : 'l4');

  // Exact calendar month headers matching each column of the 12-week heatmap
  const monthHeaders = useMemo(() => {
    const numCols = Math.ceil((lead + cells.length) / 7);
    const headers: (string | null)[] = [];
    let lastMonth = -1;

    for (let col = 0; col < numCols; col++) {
      const cellIdx = col * 7 - lead;
      const sampleIdx = Math.max(0, Math.min(cells.length - 1, cellIdx >= 0 ? cellIdx : 0));
      const d = dayAt(N - 84 + sampleIdx);
      const m = d.getMonth();
      if (m !== lastMonth) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        headers.push(monthNames[m]);
        lastMonth = m;
      } else {
        headers.push(null);
      }
    }
    return headers;
  }, [lead, cells.length]);

  // Activity trend data with non-overlapping labels & interactive hover points
  const activityTrendData = useMemo(() => {
    if (!hasData) return [];
    const slice = dateSlice.days;
    if (slice.length <= 60) {
      return slice.map((cd, i) => {
        const d = dayAt(dateSlice.startIndex + i);
        return {
          posts: pick(cd, 'p', plat),
          replies: pick(cd, 'r', plat),
          label: wd(d),
          date: d,
          dateStr: fmtD(d),
        };
      });
    }
    // Aggregate by week (7-day buckets)
    const weeksCount = Math.ceil(slice.length / 7);
    const arr = [];
    for (let w = 0; w < weeksCount; w++) {
      const bucket = slice.slice(w * 7, (w + 1) * 7);
      const startD = dayAt(dateSlice.startIndex + w * 7);
      const endD = dayAt(Math.min(dateSlice.startIndex + (w + 1) * 7 - 1, dateSlice.endIndex));
      arr.push({
        posts: sum(bucket, (cd) => pick(cd, 'p', plat)),
        replies: sum(bucket, (cd) => pick(cd, 'r', plat)),
        label: `W${w + 1}`,
        dateStr: `${fmtD(startD)} - ${fmtD(endD)}`,
      });
    }
    return arr;
  }, [hasData, dateSlice.days, dateSlice.startIndex, dateSlice.endIndex, plat]);

  // Recent content filtered to current range
  const recentContent = useMemo(() => {
    return CT.filter((c) => (plat === 'all' || c.p === plat) && isDateInCurrentRange(c.date)).slice(0, 3);
  }, [plat, isDateInCurrentRange]);

  return (
    <>
      <div className="head">
        <div>
          <h1>{isTodaySelected ? 'Today' : rangeLabel}</h1>
          <p className="sub">
            {isTodaySelected
              ? 'Execution vs daily targets · Asia/Kolkata'
              : isSingle
              ? `Execution metrics for ${rangeLabel} · Asia/Kolkata`
              : `Execution totals over ${daysCount} days · Asia/Kolkata`}
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="empty-state-card empty mb">
          <div style={{ padding: '32px 16px' }}>
            <Icon name="today" size={32} />
            <h3 style={{ marginTop: '10px', fontSize: '16px', fontWeight: 600 }}>
              No activity recorded for this period
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--mute)', marginTop: '4px' }}>
              The selected range ({rangeLabel}) has no recorded metrics in the dataset.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Skeleton isLoaded={isLoaded} className="w-full">
            <div className="g k4 mb transition-opacity duration-200">
            <Tray icon="pen" title="Posts published">
              <div className="kv">
                <span className="num mono">
                  {tweenP}
                  <small>{` / ${gp}`}</small>
                </span>
                <span className={`pill ${p >= gp ? 'up' : 'nu'}`}>
                  {p >= gp ? 'On target' : `${gp - p} to go`}
                </span>
              </div>
              <div className="ks">
                {isSingle && dateSlice.days[0]
                  ? `X ${dateSlice.days[0].xp} · LinkedIn ${dateSlice.days[0].lp}`
                  : `Target: ${gp} across ${daysCount} days`}
              </div>
            </Tray>

            <Tray icon="msg" title="Replies & comments">
              <div className="kv">
                <span className="num mono">{tweenR}</span>
                <span className="pill nu">Outbound</span>
              </div>
              <div className="ks">
                {isSingle && dateSlice.days[0]
                  ? `X ${dateSlice.days[0].xr} · LinkedIn ${dateSlice.days[0].lr}`
                  : `Outbound totals (${daysCount} days)`}
              </div>
            </Tray>

            <Tray icon="eye" title="Impressions / views">
              <div className="kv">
                <span className="num mono">{fmtK(tweenV)}</span>
                <span className="pill up mono">{`${e.toFixed(2)}% eng`}</span>
              </div>
              <div className="ks">
                {isSingle && dateSlice.days[0]
                  ? `X ${fmtK(dateSlice.days[0].xv)} views · LinkedIn ${fmtK(dateSlice.days[0].li)}`
                  : `Total engagement: ${fmtK(l)} likes`}
              </div>
            </Tray>

            <Tray icon="target" title="Goals reached">
              <div className="kv">
                <span className="num mono">
                  {tweenM}
                  <small>{isSingle ? ` of ${rows.length}` : ` of ${dateSlice.days.length} days`}</small>
                </span>
                <span className="pill or">
                  <Icon name="flame" size={12} />
                  {`${streak()}d streak`}
                </span>
              </div>
              <div className="ks">{isSingle ? 'Day targets' : 'Days meeting targets'}</div>
            </Tray>
          </div>
          </Skeleton>

          <div className="g g2 mb transition-opacity duration-200">
            <Tray icon="trend" title="Activity trend">
              <p className="sub" style={{ margin: '0 0 8px' }}>
                {`Original posts and outbound replies (${daysCount} days)`}
              </p>
              <div id="dc">
                <ActivityTrendChart data={activityTrendData} />
              </div>
              <div className="legend">
                <span>
                  <i style={{ background: '#f26a1b' }}></i>Original posts
                </span>
                <span>
                  <i style={{ background: '#161616' }}></i>Replies
                </span>
              </div>
            </Tray>

            <Tray
              icon="target"
              title={isSingle ? 'Daily goals' : `Goals (${daysCount} days)`}
              right={
                <a href="#settings" className="muted" style={{ fontSize: '12.5px' }}>
                  Edit targets
                </a>
              }
            >
              {rows.map((x, idx) => (
                <div className="gr" key={idx}>
                  <div className="r">
                    <span>
                      {badge(x[0])}
                      {x[1]}
                      {x[2] >= x[3] && (
                        <>
                          {' '}
                          <Badge color="primary" className="pill up" style={{ marginLeft: '6px' }}>
                            Met
                          </Badge>
                        </>
                      )}
                    </span>
                    <span className="mono muted">{`${x[2]} / ${x[3]}`}</span>
                  </div>
                  <Segs f={x[3] > 0 ? x[2] / x[3] : 0} c={x[2] >= x[3] ? '#0e9f6e' : '#f26a1b'} />
                </div>
              ))}
              <div
                className="r"
                style={{ display: 'flex', justifyContent: 'space-between', margin: '22px 0 8px' }}
              >
                <b style={{ fontWeight: 500 }}>7-day consistency</b>
                <span className="muted mono">{`All-time streak: ${streak()} days`}</span>
              </div>
              <div className="wk">
                {consistency7.map((c, i) => {
                  const a = acts(c);
                  const isMet = met(c);
                  const dayOffset = consistencyEndIdx - (consistency7.length - 1) + i;
                  return (
                    <div key={i}>
                      <b className={`mono ${isMet ? 'full' : a === 0 ? 'zero' : ''}`}>
                        {isMet ? '✓' : a}
                      </b>
                      {wd(dayAt(dayOffset))}
                    </div>
                  );
                })}
              </div>
            </Tray>
          </div>
        </>
      )}

      {/* Heatmap & Recent Content */}
      <div className="g g2 transition-opacity duration-200">
        <Tray icon="today" title="Activity history">
          <p className="sub" style={{ margin: '0 0 10px' }}>
            {`Last 12 weeks · ${cells.filter((c) => acts(c) > 0).length} active days · selected range highlighted`}
          </p>
          <div className="flex gap-2 items-stretch mt-2">
            <div className="flex flex-col shrink-0 select-none">
              {/* Spacer matching month label header height */}
              <div className="h-[18px]" />
              {/* 7 rows matching the 7 rows of .heat */}
              <div
                className="grid gap-[4px] text-[10px] font-mono text-[var(--mute)] flex-1 pr-1"
                style={{ gridTemplateRows: 'repeat(7, 1fr)' }}
              >
                <span className="flex items-center leading-none">Mon</span>
                <span />
                <span className="flex items-center leading-none">Wed</span>
                <span />
                <span className="flex items-center leading-none">Fri</span>
                <span />
                <span />
              </div>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-0.5">
              <div
                className="grid gap-[4px] text-[10px] font-mono text-[var(--mute)] h-[18px] mb-1 select-none"
                style={{
                  gridTemplateColumns: `repeat(${monthHeaders.length}, 1fr)`,
                  padding: '0 2px',
                }}
              >
                {monthHeaders.map((m, idx) => (
                  <span key={idx} className="truncate leading-tight">
                    {m || ''}
                  </span>
                ))}
              </div>
              <div className="heat" style={{ marginTop: 0 }}>
                {Array.from({ length: lead }, (_, i) => (
                  <i key={`lead-${i}`} className="x"></i>
                ))}
                {cells.map((c, i) => {
                  const globalIdx = N - 84 + i;
                  const pCount = pick(c, 'p', plat);
                  const rCount = pick(c, 'r', plat);
                  const a = pCount + rCount;
                  const cl = lvl(a);
                  const isInRange =
                    globalIdx >= dateSlice.startIndex && globalIdx <= dateSlice.endIndex;

                  return (
                    <TooltipTrigger key={`cell-${i}`} delay={0}>
                      <button
                        type="button"
                        className={cx(cl, 'heat-cell block w-full h-full border-0 outline-none p-0 cursor-pointer')}
                        style={!isInRange ? { opacity: 0.22, filter: 'grayscale(0.8)' } : undefined}
                        aria-label={`${fmtD(dayAt(globalIdx))}: ${a} actions`}
                      />
                      <Tooltip size="sm">
                        <div className="font-mono text-[11.5px] text-center leading-tight">
                          <div className="font-semibold text-white">{fmtD(dayAt(globalIdx))}</div>
                          <div className="text-white/85 mt-0.5 font-medium">{pCount} posts · {rCount} replies</div>
                          <div className="text-white/60 text-[10.5px]">({a} total actions)</div>
                        </div>
                      </Tooltip>
                    </TooltipTrigger>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="hl">
            Less<i></i>
            <i style={{ background: '#fbdcc5' }}></i>
            <i style={{ background: '#f8b988' }}></i>
            <i style={{ background: '#f48a45' }}></i>
            <i style={{ background: '#d4560e' }}></i>More
          </div>
        </Tray>

        <Tray
          icon="content"
          title="Recent content"
          right={
            <a href="#content" className="muted" style={{ fontSize: '12.5px' }}>
              View all
            </a>
          }
        >
          {recentContent.length === 0 ? (
            <div className="empty" style={{ height: '140px' }}>
              <span className="muted" style={{ fontSize: '12.5px' }}>
                No published content inside this period
              </span>
            </div>
          ) : (
            recentContent.map((c) => (
              <div className="item" key={c.id}>
                <span className="tag">{`${c.p === 'li' ? 'LinkedIn' : 'X'} · ${c.type}`}</span>
                <div style={{ lineHeight: 1.5 }}>{c.text}</div>
                <div className="meta">
                  <span>
                    Views <b className="mono">{c.views}</b>
                  </span>
                  <span>
                    Likes <b className="mono">{c.likes}</b>
                  </span>
                  <span className="mono" style={{ color: 'var(--good)' }}>
                    {`${c.eng.toFixed(2)}%`}
                  </span>
                </div>
              </div>
            ))
          )}
        </Tray>
      </div>
    </>
  );
};
