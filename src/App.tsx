import React, { useState, useEffect, useRef } from 'react';
import { D, N, CT, TODAY, streak } from './data';
import { Icon } from './utils';
import { TodayPage } from './pages/TodayPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ContentPage } from './pages/ContentPage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { TopBarDateControl } from './components/TopBarDateControl';

const TITLES: Record<string, string> = {
  today: 'Today',
  analytics: 'Analytics',
  content: 'Content',
  review: 'Weekly review',
  settings: 'Settings',
};

const NAV1 = [
  ['today', 'Today'],
  ['analytics', 'Analytics'],
  ['content', 'Content'],
  ['review', 'Weekly review'],
];

export const App: React.FC = () => {
  const getHashRoute = () => {
    const h = (window.location.hash || '#today').slice(1);
    return ['today', 'analytics', 'content', 'review', 'settings', 'login'].includes(h)
      ? h
      : 'today';
  };

  const [route, setRoute] = useState<string>(getHashRoute);
  const [plat, setPlat] = useState<string>('all');
  const [rangeN, setRangeN] = useState<number>(30);
  const [mt, setMt] = useState<string>('views');
  const [cq, setCq] = useState<string>('');
  const [ct, setCt] = useState<string>('all');
  const [cs, setCs] = useState<string>('recent');
  const [sel, setSel] = useState<number>(1);
  const [settingsTab, setSettingsTab] = useState<string>('profile');
  const [, setTick] = useState<number>(0);

  // Dialog state
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogPlat, setDialogPlat] = useState<string>('x');
  const [dialogType, setDialogType] = useState<string>('p');
  const [dialogCount, setDialogCount] = useState<number>(1);

  useEffect(() => {
    const handleHashChange = () => {
      const newRoute = getHashRoute();
      setRoute(newRoute);
      document.body.classList.toggle('is-login', newRoute === 'login');
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial class setting
    document.body.classList.toggle('is-login', route === 'login');

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.location.hash = '#content';
        setTimeout(() => {
          const cqInput = document.getElementById('cq') as HTMLInputElement | null;
          if (cqInput) cqInput.focus();
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [route]);

  const handleSearchClick = () => {
    window.location.hash = '#content';
  };

  const handleOpenDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  };

  const handleCloseDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  };

  const handleAddActivity = () => {
    const p = dialogPlat;
    const t = dialogType;
    const n = Math.max(1, dialogCount);
    D[N - 1][p === 'x' ? (t === 'p' ? 'xp' : 'xr') : (t === 'p' ? 'lp' : 'lr')] += n;
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    setTick((prev) => prev + 1);
  };

  const renderView = () => {
    switch (route) {
      case 'analytics':
        return (
          <AnalyticsPage
            plat={plat}
            rangeN={rangeN}
            setRangeN={setRangeN}
            mt={mt}
            setMt={setMt}
          />
        );
      case 'content':
        return (
          <ContentPage
            plat={plat}
            cq={cq}
            setCq={setCq}
            ct={ct}
            setCt={setCt}
            cs={cs}
            setCs={setCs}
            sel={sel}
            setSel={setSel}
          />
        );
      case 'review':
        return <ReviewPage />;
      case 'settings':
        return (
          <SettingsPage
            tab={settingsTab}
            setTab={setSettingsTab}
            onSaveTargets={() => setTick((prev) => prev + 1)}
          />
        );
      case 'today':
      default:
        return <TodayPage plat={plat} />;
    }
  };

  const activePageTitle = TITLES[route] || 'Today';

  return (
    <>
      <div className="shell">
        <aside>
          <div className="brand">
            <div className="logo">V</div>
            <div>
              <b>Verasett</b>
              <small>Social Activity</small>
            </div>
          </div>
          <div className="search" id="gs" onClick={handleSearchClick}>
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
            </svg>Search<kbd>⌘ K</kbd>
          </div>
          <div>
            <div className="gl">Workspace</div>
            <nav id="nav1">
              {NAV1.map(([k, t]) => (
                <a
                  key={k}
                  href={`#${k}`}
                  data-k={k}
                  className={route === k ? 'on' : undefined}
                ><Icon name={k === 'today' ? 'today' : k} size={17} />{t}{k === 'content' && <span className="cnt mono">{CT.length}</span>}</a>
              ))}
            </nav>
          </div>
          <div>
            <div className="gl">System</div>
            <nav id="nav2">
              <a
                href="#settings"
                data-k="settings"
                className={route === 'settings' ? 'on' : undefined}
              ><Icon name="settings" size={17} />Settings</a>
            </nav>
          </div>
          <div className="me">
            <div className="tray">
              <div className="tb" style={{ padding: '12px 14px' }}>
                <div className="kv">
                  <span className="muted" style={{ fontSize: '12.5px' }}>
                    Current streak
                  </span>
                  <span className="pill or" id="sk"><Icon name="flame" size={12} />{`${streak()} days`}</span>
                </div>
                <div className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>
                  Asia/Kolkata day boundary
                </div>
              </div>
            </div>
            <div className="user">
              <div className="av"></div>
              <div>
                <b style={{ fontWeight: 500 }}>Kartik Sharma</b>
                <small>Asia/Kolkata</small>
              </div>
              <button
                id="lo"
                title="Sign out"
                onClick={() => {
                  window.location.hash = '#login';
                }}
              >
                <Icon name="out" size={16} />
              </button>
            </div>
          </div>
        </aside>
        <main>
          <div className="top">
            <div className="crumb">
              Verasett &nbsp;›&nbsp; <b id="crumb">{activePageTitle}</b>
            </div>
            <div className="tools">
              <TopBarDateControl />
              <div className="seg" id="ps">
                <button
                  data-p="all"
                  className={plat === 'all' ? 'on' : undefined}
                  onClick={() => setPlat('all')}
                >
                  All
                </button>
                <button
                  data-p="x"
                  className={plat === 'x' ? 'on' : undefined}
                  onClick={() => setPlat('x')}
                >
                  X
                </button>
                <button
                  data-p="li"
                  className={plat === 'li' ? 'on' : undefined}
                  onClick={() => setPlat('li')}
                >
                  LinkedIn
                </button>
              </div>
              <button className="btn" id="add" onClick={handleOpenDialog}><Icon name="plus" size={15} />Add activity</button>
            </div>
          </div>
          <div className="wrap" id="view">
            {renderView()}
          </div>
        </main>
      </div>

      <LoginPage />

      <dialog id="dlg" ref={dialogRef}>
        <h3 style={{ fontSize: '18px', letterSpacing: '-.02em' }}>Add activity</h3>
        <label className="fld">
          Platform
          <select
            id="a_p"
            value={dialogPlat}
            onChange={(e) => setDialogPlat(e.target.value)}
          >
            <option value="x">X</option>
            <option value="li">LinkedIn</option>
          </select>
        </label>
        <label className="fld">
          Type
          <select
            id="a_t"
            value={dialogType}
            onChange={(e) => setDialogType(e.target.value)}
          >
            <option value="p">Original post</option>
            <option value="r">Outbound reply</option>
          </select>
        </label>
        <label className="fld">
          Count
          <input
            id="a_n"
            type="number"
            min="1"
            value={dialogCount}
            onChange={(e) =>
              setDialogCount(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
          />
        </label>
        <menu>
          <button
            className="btn ghost"
            id="a_c"
            type="button"
            onClick={handleCloseDialog}
          >
            Cancel
          </button>
          <button
            className="btn"
            id="a_s"
            type="button"
            onClick={handleAddActivity}
          >
            Add to today
          </button>
        </menu>
      </dialog>
    </>
  );
};
