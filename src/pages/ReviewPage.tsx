import React from 'react';
import {
  G,
  CT,
  TOPICS,
  acts,
  sum,
} from '../data';
import { Icon, Segs, Tray, useCountTween } from '../utils';
import { useDateRangeStore } from '../store/dateStore';
import { Meter } from '../components/base/meter/meter';

export const ReviewPage: React.FC = () => {
  const { dateSlice, daysCount, rangeLabel, hasData } = useDateRangeStore();
  const W = dateSlice.days;

  const posts = sum(W, (d) => d.xp + d.lp);
  const reps = sum(W, (d) => d.xr + d.lr);
  const tp = (G.xp + G.lp) * Math.max(1, daysCount);
  const tr = (G.xr + G.lr) * Math.max(1, daysCount);
  const act = W.filter((d) => acts(d) > 0).length;

  const tweenPosts = useCountTween(posts);
  const tweenReps = useCountTween(reps);

  const topicRankings = TOPICS.map((topic) => {
    const items = CT.filter((c) => c.topic === topic);
    const n = items.length;
    const avgViews = n > 0 ? sum(items, (c) => c.views) / n : 0;
    const avgEng = n > 0 ? sum(items, (c) => c.eng) / n : 0;
    return {
      topic,
      n,
      avgViews,
      avgEng,
      isLowSample: n < 5,
    };
  }).sort((a, b) => b.avgEng - a.avgEng);

  const maxEng = Math.max(...topicRankings.map((t) => t.avgEng), 1);
  const by = topicRankings[0] || { topic: 'None', avgViews: 0, avgEng: 0, n: 0, isLowSample: false };

  const small = posts < 30;
  const pace = tp + tr > 0 ? Math.round(((posts + reps) / (tp + tr)) * 100) : 0;
  const postPct = tp > 0 ? Math.round((posts / tp) * 100) : 0;
  const repPct = tr > 0 ? Math.round((reps / tr) * 100) : 0;
  const postTone = postPct >= 90 ? 'success' : postPct >= 50 ? 'warning' : 'accent';
  const repTone = repPct >= 90 ? 'success' : repPct >= 50 ? 'warning' : 'accent';
  const tweenPace = useCountTween(pace);

  const ex = [
    [
      'Personal Brand',
      'Original post',
      'Technical Build-in-Public Architecture Thread',
      'Sharing concrete technical decisions and architecture breakdowns generates 3x more bookmarks and profile clicks.',
      'Developers and founders look for actionable implementation patterns, making technical depth a high-conversion follower trigger.',
    ],
    [
      'Audience Engagement',
      'Reply external',
      'High-Signal Niche Leader Comment Playbook',
      'Leaving 3 substantive, value-first replies on industry leaders’ posts daily drives steady inbound profile visits.',
      'Thoughtful contributions to trending industry discussions position your voice as an authority naturally.',
    ],
    [
      'Consistency & Growth',
      'Original post',
      'Weekly Progress & Wins Breakdown',
      'Transparent weekly progress retrospectives drive high engagement and organic retweets from peer creators.',
      'Consistent progress updates establish momentum and signal reliable long-term execution.',
    ],
  ];

  return (
    <>
      <div className="head">
        <div>
          <h1>Weekly executive review</h1>
          <p className="sub">Evidence-grounded observations and growth experiments</p>
        </div>
        <span className="chip font-medium text-[12.5px] text-[var(--ink-2)] bg-white border border-[var(--line)] shadow-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg"><span>{rangeLabel}</span><span className="text-[var(--mute)]">·</span><span className="font-semibold text-[var(--ink)]">{tweenPosts} {tweenPosts === 1 ? 'post' : 'posts'}</span><span className="text-[var(--mute)]">·</span><span className="font-semibold text-[var(--ink)]">{tweenReps} {tweenReps === 1 ? 'reply' : 'replies'}</span></span>
      </div>

      {!hasData ? (
        <div
          className="empty-state-card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: '#fff',
            border: '1px solid var(--line)',
            borderRadius: '14px',
            margin: '20px 0',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
            No activity for this period
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--sub)', marginTop: '6px' }}>
            Selected range ({rangeLabel}) has no recorded social actions or posts. Choose a date range within the active 90-day dataset to view executive review metrics.
          </p>
        </div>
      ) : (
        <>
          <div className="banner">
            <Icon name="info" size={18} />
            <div>
              <b style={{ fontWeight: 600 }}>
                {small ? 'Directional signal only' : 'Adequate sample'}
              </b>
              <div style={{ fontSize: '13px', marginTop: '2px' }}>
                {small
                  ? `${posts} posts in ${daysCount} ${daysCount === 1 ? 'day' : 'days'} is too few for statistical claims. Treat the patterns below as hypotheses to test, not findings.`
                  : `Sample of ${posts} posts across ${daysCount} ${daysCount === 1 ? 'day' : 'days'} is large enough for directional pattern recognition.`}
              </div>
            </div>
          </div>

          <div className="g g2 mb" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Tray
              icon="target"
              title="Activity vs target"
              right={
                <span className={`pill ${pace >= 85 ? 'up' : 'wn'}`}>{`${tweenPace}% goal pacing`}</span>
              }
            >
              <div className="gr flex flex-col gap-1.5">
                <Meter
                  label="Original posts published"
                  value={posts}
                  maxValue={tp}
                  valueLabel={`${tweenPosts} / ${tp} (${postPct}%)`}
                  tone={postTone}
                />
                <Segs f={tp > 0 ? posts / tp : 0} c={postPct >= 90 ? '#0e9f6e' : '#f26a1b'} />
              </div>
              <div className="gr flex flex-col gap-1.5 mt-3">
                <Meter
                  label="Outbound conversations & replies"
                  value={reps}
                  maxValue={tr}
                  valueLabel={`${tweenReps} / ${tr} (${repPct}%)`}
                  tone={repTone}
                />
                <Segs f={tr > 0 ? reps / tr : 0} c={repPct >= 90 ? '#0e9f6e' : '#161616'} />
              </div>
              <p className="muted mono" style={{ fontSize: '12px', marginTop: '16px' }}>
                {`Active days in period: ${act} of ${daysCount} · targets derived from daily goals`}
              </p>
            </Tray>

            <Tray
              icon="trend"
              title="Consistency vs volume"
              right={<span className="pill wn">Under-leveraged</span>}
            >
              <b style={{ fontWeight: 600 }}>
                {act === daysCount ? 'All days active' : 'Consistency baseline established'}
              </b>
              <p className="muted" style={{ marginTop: '6px', lineHeight: 1.5 }}>
                {`Activity is spread across ${posts} posts. High-intent conversations in key accounts (NetSuite and SAP AR) are the place to go deeper.`}
              </p>
              {'\n      '}
              <p className="muted" style={{ fontSize: '12.5px', marginTop: '14px' }}>
                Rule: steady daily consistency compounds more than burst posting.
              </p>
            </Tray>
          </div>
        </>
      )}

      <div style={{ marginBottom: '14px' }}>
        <Tray icon="review" title="Key recorded observation">
          {'Content tagged '}<b>{`“${by.topic}”`}</b>{` has the highest engagement in the library: `}<span className="mono">{Math.round(by.avgViews)}</span>{` avg impressions, `}<span className="mono">{`${by.avgEng.toFixed(2)}%`}</span>{` engagement (n=${by.n}). Computed over all ${CT.length} items, not just this range.`}
        </Tray>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <Tray icon="trend" title="Topic resonance ranking (Bar List)">
          <p className="sub" style={{ margin: '0 0 12px' }}>
            Average engagement rate across all {CT.length} content items by topic
          </p>
          <div className="flex flex-col gap-2.5">
            {topicRankings.map((item) => (
              <div
                key={item.topic}
                className={`flex flex-col gap-1 ${item.isLowSample ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-center text-[13px]">
                  <div className="flex items-center gap-2">
                    <b className="font-medium text-[var(--ink)]">#{item.topic}</b>
                    <span className="text-[11.5px] font-mono text-[var(--mute)]">
                      n={item.n}
                    </span>
                    {item.isLowSample && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 font-mono">
                        low sample
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[13px] font-medium text-[var(--ink)]">
                    {item.avgEng.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${Math.round((item.avgEng / maxEng) * 100)}%`,
                      backgroundColor: item.isLowSample ? '#bdb9ae' : '#f26a1b',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Tray>
      </div>

      <Tray icon="flask" title="Targeted growth experiments for ShowUp">
        <div className="g k3">
          {ex.map((e, idx) => (
            <div className="exp" key={idx}>
              <div className="kv">
                <span className="pill or">#{e[0]}</span>
                <span className="muted" style={{ fontSize: '12px' }}>
                  {e[1]}
                </span>
              </div>
              <h4>{e[2]}</h4>
              <p>
                <b style={{ fontWeight: 500 }}>Hypothesis:</b> {e[3]}
              </p>
              <p>
                <b style={{ fontWeight: 500 }}>Rationale:</b> {e[4]}
              </p>
            </div>
          ))}
        </div>
      </Tray>
    </>
  );
};
