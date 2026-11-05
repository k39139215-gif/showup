import React from 'react';
import {
  D,
  N,
  G,
  CT,
  TOPICS,
  dayAt,
  acts,
  sum,
} from '../data';
import { fmtD, Icon, Segs, Tray } from '../utils';

export const ReviewPage: React.FC = () => {
  const W = D.slice(-7);
  const posts = sum(W, (d) => d.xp + d.lp);
  const reps = sum(W, (d) => d.xr + d.lr);
  const tp = (G.xp + G.lp) * 7;
  const tr = (G.xr + G.lr) * 7;
  const act = W.filter((d) => acts(d) > 0).length;

  const by = TOPICS.map((t) => {
    const a = CT.filter((c) => c.topic === t);
    return {
      t,
      v: sum(a, (c) => c.views) / a.length,
      e: sum(a, (c) => c.eng) / a.length,
    };
  }).sort((a, b) => b.e - a.e)[0];

  const small = posts < 30;
  const pace = Math.round(((posts + reps) / (tp + tr)) * 100);

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
        <span className="chip mono">{`${fmtD(dayAt(N - 7))} – ${fmtD(dayAt(N - 1))} · N=${posts} posts, N=${reps} replies`}</span>
      </div>

      <div className="banner">
        <Icon name="info" size={18} />
        <div>
          <b style={{ fontWeight: 600 }}>
            {small ? 'Directional signal only' : 'Adequate sample'}
          </b>
          <div style={{ fontSize: '13px', marginTop: '2px' }}>
            {small
              ? `${posts} posts in a week is too few for statistical claims. Treat the patterns below as hypotheses to test, not findings.`
              : 'Sample is large enough for directional pattern recognition.'}
          </div>
        </div>
      </div>

      <div className="g g2 mb" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Tray
          icon="target"
          title="Weekly activity vs target"
          right={
            <span className={`pill ${pace >= 85 ? 'up' : 'wn'}`}>{`${pace}% goal pacing`}</span>
          }
        >
          <div className="gr">
            <div className="r">
              <span>Original posts published</span>
              <span className="mono muted">{`${posts} / ${tp}`}</span>
            </div>
            <Segs f={posts / tp} c="#f26a1b" />
          </div>
          <div className="gr">
            <div className="r">
              <span>Outbound conversations & replies</span>
              <span className="mono muted">{`${reps} / ${tr}`}</span>
            </div>
            <Segs f={reps / tr} c="#161616" />
          </div>
          <p className="muted mono" style={{ fontSize: '12px', marginTop: '16px' }}>
            {`Active days this week: ${act} of 7 · targets derived from daily goals`}
          </p>
        </Tray>

        <Tray
          icon="trend"
          title="Consistency vs volume"
          right={<span className="pill wn">Under-leveraged</span>}
        >
          <b style={{ fontWeight: 600 }}>
            {act === 7 ? 'Seven for seven' : 'Consistency baseline established'}
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

      <div style={{ marginBottom: '14px' }}>
        <Tray icon="review" title="Key recorded observation">
          {'Content tagged '}<b>{`“${by.t}”`}</b>{` has the highest engagement in the library: `}<span className="mono">{Math.round(by.v)}</span>{` avg impressions, `}<span className="mono">{`${by.e.toFixed(2)}%`}</span>{` engagement. Computed over all ${CT.length} items, not just this week.`}
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
