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

  const by = TOPICS.map((t) => {
    const a = CT.filter((c) => c.topic === t);
    return {
      t,
      v: a.length > 0 ? sum(a, (c) => c.views) / a.length : 0,
      e: a.length > 0 ? sum(a, (c) => c.eng) / a.length : 0,
    };
  }).sort((a, b) => b.e - a.e)[0] || { t: 'None', v: 0, e: 0 };

  const small = posts < 30;
  const pace = tp + tr > 0 ? Math.round(((posts + reps) / (tp + tr)) * 100) : 0;
  const tweenPace = useCountTween(pace);

  const ex = [
    [
      'NetSuite',
      'Original post',
      'NetSuite Unapplied Cash Teardown Thread',
      'Breakdown of NetSuite remittance parsing errors will outperform generic AR posts by more than 25% in impressions.',
      'Technical ERP pain posts attract mid-market controllers searching for active automation answers.',
    ],
    [
      'Cash Application',
      'Reply external',
      'CFO Remittance Friction Reply Playbook',
      'Leaving 3 substantive replies on enterprise finance leaders’ posts daily generates at least 2 inbound profile visits a week.',
      'Actionable benchmarks on lockbox match rates position Verasett as an authority without pitching.',
    ],
    [
      'SAP',
      'Original post',
      'SAP S/4HANA Migration Cash Application Gap Post',
      'Addressing post-migration unapplied cash backlogs drives a high share and repost rate.',
      'S/4HANA transitions frequently break custom lockbox scripts, making it a timely conversation trigger.',
    ],
  ];

  return (
    <>
      <div className="head">
        <div>
          <h1>Weekly executive review</h1>
          <p className="sub">Evidence-grounded observations and growth experiments</p>
        </div>
        <span className="chip mono">{`${rangeLabel} · N=${tweenPosts} posts, N=${tweenReps} replies`}</span>
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
              <div className="gr">
                <div className="r">
                  <span>Original posts published</span>
                  <span className="mono muted">{`${tweenPosts} / ${tp}`}</span>
                </div>
                <Segs f={tp > 0 ? posts / tp : 0} c="#f26a1b" />
              </div>
              <div className="gr">
                <div className="r">
                  <span>Outbound conversations & replies</span>
                  <span className="mono muted">{`${tweenReps} / ${tr}`}</span>
                </div>
                <Segs f={tr > 0 ? reps / tr : 0} c="#161616" />
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
          {'Content tagged '}<b>{`“${by.t}”`}</b>{` has the highest engagement in the library: `}<span className="mono">{Math.round(by.v)}</span>{` avg impressions, `}<span className="mono">{`${by.e.toFixed(2)}%`}</span>{` engagement. Computed over all ${CT.length} items, not just this range.`}
        </Tray>
      </div>

      <Tray icon="flask" title="Targeted growth experiments for Verasett">
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
