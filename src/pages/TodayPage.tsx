import React from 'react';
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
} from '../utils';

interface TodayPageProps {
  plat: string;
}

export const TodayPage: React.FC<TodayPageProps> = ({ plat }) => {
  const d = D[N - 1];
  const p = pick(d, 'p', plat);
  const r = pick(d, 'r', plat);
  const v = pick(d, 'v', plat);
  const e = v ? (pick(d, 'l', plat) / v) * 100 : 0;
  const gp = plat === 'x' ? G.xp : plat === 'li' ? G.lp : G.xp + G.lp;

  const rows: [string, string, number, number][] = [
    ['x', 'Original post', d.xp, G.xp],
    ['x', 'Outbound replies', d.xr, G.xr],
    ['li', 'LinkedIn post', d.lp, G.lp],
    ['li', 'LinkedIn replies', d.lr, G.lr],
  ].filter((x) => plat === 'all' || x[0] === plat) as [string, string, number, number][];

  const m = rows.filter((x) => x[2] >= x[3]).length;
  const last7 = D.slice(-7);
  const cells = D.slice(-84);
  const lead = cells[0] ? (dayAt(N - 84).getDay() + 6) % 7 : 0;
  const lvl = (a: number) => (a === 0 ? '' : a <= 3 ? 'l1' : a <= 7 ? 'l2' : a <= 11 ? 'l3' : 'l4');

  const dotsHtml = dots(
    last7.map((cd) => pick(cd, 'p', plat)),
    last7.map((cd) => pick(cd, 'r', plat)),
    last7.map((_, i) => wd(dayAt(N - 7 + i)))
  );

  return (
    <>
      <div className="head">
        <div>
          <h1>{`${greet()}, Kartik`}</h1>
          <p className="sub">Execution vs daily targets · Asia/Kolkata</p>
        </div>
      </div>

      <div className="g k4 mb">
        <Tray icon="pen" title="Posts published">
          <div className="kv">
            <span className="num mono">
              {p}
              <small>{` / ${gp}`}</small>
            </span>
            <span className={`pill ${p >= gp ? 'up' : 'nu'}`}>
              {p >= gp ? 'On target' : `${gp - p} to go`}
            </span>
          </div>
          <div className="ks">{`X ${d.xp} · LinkedIn ${d.lp}`}</div>
        </Tray>

        <Tray icon="msg" title="Replies & comments">
          <div className="kv">
            <span className="num mono">{r}</span>
            <span className="pill nu">Outbound</span>
          </div>
          <div className="ks">{`X ${d.xr} · LinkedIn ${d.lr}`}</div>
        </Tray>

        <Tray icon="eye" title="Impressions / views">
          <div className="kv">
            <span className="num mono">{fmtK(v)}</span>
            <span className="pill up mono">{`${e.toFixed(2)}% eng`}</span>
          </div>
          <div className="ks">{`X ${fmtK(d.xv)} views · LinkedIn ${fmtK(d.li)}`}</div>
        </Tray>

        <Tray icon="target" title="Goals reached">
          <div className="kv">
            <span className="num mono">
              {m}
              <small>{` of ${rows.length}`}</small>
            </span>
            <span className="pill or">
              <Icon name="flame" size={12} />
              {`${streak()}d streak`}
            </span>
          </div>
          <div className="ks">Today’s targets</div>
        </Tray>
      </div>

      <div className="g g2 mb">
        <Tray icon="trend" title="Activity trend">
          <p className="sub" style={{ margin: '0 0 8px' }}>
            Original posts and outbound replies, last 7 days
          </p>
          <div id="dc" dangerouslySetInnerHTML={{ __html: dotsHtml }} />
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
          title="Daily goals"
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
                      <span className="pill up" style={{ marginLeft: '6px' }}>
                        Met
                      </span>
                    </>
                  )}
                </span>
                <span className="mono muted">{`${x[2]} / ${x[3]}`}</span>
              </div>
              <Segs f={x[2] / x[3]} c={x[2] >= x[3] ? '#0e9f6e' : '#f26a1b'} />
            </div>
          ))}
          <div
            className="r"
            style={{ display: 'flex', justifyContent: 'space-between', margin: '22px 0 8px' }}
          >
            <b style={{ fontWeight: 500 }}>7-day consistency</b>
            <span className="muted mono">{`${streak()} day streak`}</span>
          </div>
          <div className="wk">
            {last7.map((c, i) => {
              const a = acts(c);
              const isMet = met(c);
              return (
                <div key={i}>
                  <b className={`mono ${isMet ? 'full' : a === 0 ? 'zero' : ''}`}>
                    {isMet ? '✓' : a}
                  </b>
                  {wd(dayAt(N - 7 + i))}
                </div>
              );
            })}
          </div>
        </Tray>
      </div>

      <div className="g g2">
        <Tray icon="today" title="Activity history">
          <p className="sub" style={{ margin: 0 }}>
            {`Last 12 weeks · ${cells.filter((c) => acts(c) > 0).length} active days`}
          </p>
          <div className="heat">
            {Array.from({ length: lead }, (_, i) => (
              <i key={`lead-${i}`} className="x"></i>
            ))}
            {cells.map((c, i) => {
              const a = pick(c, 'p', plat) + pick(c, 'r', plat);
              const cl = lvl(a);
              return (
                <i
                  key={`cell-${i}`}
                  className={cl}
                  title={`${fmtD(dayAt(N - 84 + i))}: ${a} actions`}
                ></i>
              );
            })}
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
          {CT.filter((c) => plat === 'all' || c.p === plat)
            .slice(0, 3)
            .map((c) => (
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
            ))}
        </Tray>
      </div>
    </>
  );
};
