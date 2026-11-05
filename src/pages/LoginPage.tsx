import React from 'react';
import { LG_DOTS, streak } from '../data';

export const LoginPage: React.FC = () => {
  return (
    <section className="login" id="login">
      <div className="lf">
        <div className="brand">
          <div className="logo">V</div>
          <div>
            <b>Verasett</b>
            <small>Social Radar</small>
          </div>
        </div>
        <form
          className="lform"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.hash = '#today';
          }}
        >
          <h2>Sign in to your workspace</h2>
          <label className="fld">
            Email
            <input type="email" placeholder="you@company.com" />
          </label>
          <label className="fld">
            Password
            <input type="password" placeholder="Enter your password" />
          </label>
          <button className="btn">Sign in</button>
          <div className="or2">OR</div>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              window.location.hash = '#today';
            }}
          >
            Enter preview workspace
          </button>
          <p className="muted" style={{ fontSize: '12px', textAlign: 'center' }}>
            Frontend preview only. Nothing is sent anywhere.
          </p>
        </form>
      </div>
      <div className="lr">
        <div className="b1"></div>
        <div className="b2"></div>
        <div className="b3"></div>
        <div className="b4">
          <small>Daily target pacing</small>
          <div className="dg" id="lg">
            {LG_DOTS.map((s, i) => (
              <i
                key={i}
                style={
                  s === 'background:#161616'
                    ? { background: '#161616' }
                    : s === 'background:#f26a1b'
                    ? { background: '#f26a1b' }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
        <div className="tagl">Show up daily. Compound quietly.</div>
        <div className="b5">
          <b id="ls">{streak()}</b>
          <span>day streak</span>
        </div>
      </div>
    </section>
  );
};
