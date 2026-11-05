import React, { useState } from 'react';
import { CT, TOPICS } from '../data';
import { fmtD, Icon, badge, Tray } from '../utils';

interface ContentPageProps {
  plat: string;
  cq: string;
  setCq: (q: string) => void;
  ct: string;
  setCt: (t: string) => void;
  cs: string;
  setCs: (s: string) => void;
  sel: number;
  setSel: (id: number) => void;
}

export const ContentPage: React.FC<ContentPageProps> = ({
  plat,
  cq,
  setCq,
  ct,
  setCt,
  cs,
  setCs,
  sel,
  setSel,
}) => {
  // force update when note changes
  const [, setTick] = useState(0);

  const L = CT.filter(
    (c) =>
      (plat === 'all' || c.p === plat) &&
      (ct === 'all' || c.type === ct) &&
      (c.text + c.topic).toLowerCase().includes(cq.toLowerCase())
  );

  L.sort((a, b) =>
    cs === 'views'
      ? b.views - a.views
      : cs === 'eng'
      ? b.eng - a.eng
      : b.date.getTime() - a.date.getTime() || a.id - b.id
  );

  const selectedItem = CT.find((x) => x.id === sel);

  return (
    <>
      <div className="head">
        <div>
          <h1>Content & reply library</h1>
          <p className="sub">Searchable master-detail library with performance breakdown</p>
        </div>
      </div>

      <Tray icon="content" title="Library">
        <div className="fbar">
          <div className="sbox">
            <Icon name="analytics" size={0} />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              id="cq"
              placeholder="Search keywords (NetSuite, lockbox, unapplied cash)…"
              value={cq}
              onChange={(e) => setCq(e.target.value)}
            />
          </div>
          <select id="ct" value={ct} onChange={(e) => setCt(e.target.value)}>
            {['all', 'original post', 'reply external', 'reply own_conversation'].map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All content types' : t}
              </option>
            ))}
          </select>
          <select id="cs" value={cs} onChange={(e) => setCs(e.target.value)}>
            {[
              ['recent', 'Sort: most recent'],
              ['views', 'Sort: views'],
              ['eng', 'Sort: engagement'],
            ].map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="fbar" style={{ marginTop: '12px' }}>
          {TOPICS.map((t) => (
            <span
              key={t}
              className="pill nu"
              style={{ cursor: 'pointer' }}
              data-t={t}
              onClick={() => setCq(t)}
            >
              #{t}
            </span>
          ))}
        </div>
      </Tray>

      <div className="g cm" style={{ marginTop: '14px' }}>
        <div>
          <div className="muted" id="cc" style={{ marginBottom: '8px', fontSize: '13px' }}>
            Showing {L.length} of {CT.length} items
          </div>
          <div className="clist" id="clist">
            {L.length > 0 ? (
              L.map((c) => (
                <div
                  key={c.id}
                  className={`cit ${c.id === sel ? 'on' : ''}`}
                  data-id={c.id}
                  onClick={() => setSel(c.id)}
                >
                  <div className="t">
                    {badge(c.p)}
                    {c.type}
                    <span>·</span>
                    {fmtD(c.date)}
                  </div>
                  <p>{c.text}</p>
                  <div className="meta">
                    <span>
                      Views <b className="mono">{c.views}</b>
                    </span>
                    <span>
                      Likes <b className="mono">{c.likes}</b>
                    </span>
                    <span>
                      Replies <b className="mono">{c.replies}</b>
                    </span>
                    <span className="mono" style={{ marginLeft: 'auto', color: 'var(--good)' }}>
                      {c.eng.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">No items match.</div>
            )}
          </div>
        </div>
        <div id="cdet">
          {selectedItem && (
            <Tray
              icon="eye"
              title="Performance observations"
              right={
                <span className="muted mono" style={{ fontSize: '12px' }}>
                  #{selectedItem.id}
                </span>
              }
            >
              <span className="tag">
                {selectedItem.p === 'li' ? 'LinkedIn' : 'X'} · {selectedItem.type}
              </span>{' '}
              <span className="tag">#{selectedItem.topic}</span>
              <p style={{ lineHeight: 1.55, marginTop: '6px' }}>{selectedItem.text}</p>
              <div className="pg">
                <div>
                  <small>Impressions</small>
                  <b className="mono">{selectedItem.views}</b>
                </div>
                <div>
                  <small>Likes</small>
                  <b className="mono">{selectedItem.likes}</b>
                </div>
                <div>
                  <small>Replies</small>
                  <b className="mono">{selectedItem.replies}</b>
                </div>
                <div>
                  <small>Engagement</small>
                  <b className="mono" style={{ color: 'var(--good)' }}>
                    {selectedItem.eng.toFixed(2)}%
                  </b>
                </div>
              </div>
              <label className="fld">
                Private founder notes
                <textarea
                  id="nt"
                  placeholder="What worked, what to repeat…"
                  value={selectedItem.note}
                  onChange={(e) => {
                    selectedItem.note = e.target.value;
                    setTick((t) => t + 1);
                  }}
                />
              </label>
            </Tray>
          )}
        </div>
      </div>
    </>
  );
};
