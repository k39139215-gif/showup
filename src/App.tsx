import React, { useState, useEffect, useRef } from 'react';
import { D, N, CT, streak } from './data';
import { Icon } from './utils';
import { TodayPage } from './pages/TodayPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ContentPage } from './pages/ContentPage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { UnifiedDatePicker } from './components/UnifiedDatePicker';
import { BoardSelect } from './components/base/select/BoardSelect';
import { BoardSegmentedControl } from './components/base/segmented-control/BoardSegmentedControl';
import { Toaster, toast } from './components/base/toast/toast';
import { Tooltip, TooltipTrigger } from './components/base/tooltip/tooltip';
import { DateStoreProvider, useDateRangeStore } from './store/dateStore';

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

const PLATFORM_OPTIONS = [
  { value: 'x', label: 'X' },
  { value: 'li', label: 'LinkedIn' },
];

const TYPE_OPTIONS = [
  { value: 'p', label: 'Original post' },
  { value: 'r', label: 'Outbound reply' },
];

const AppContent: React.FC = () => {
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const viewRef = useRef<HTMLDivElement>(null);
  const { scheduledAt } = useDateRangeStore();

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
      if (viewRef.current) {
        viewRef.current.scrollTop = 0;
      }
    };

    window.addEventListener('hashchange', handleHashChange);
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
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
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
    const key = p === 'x' ? (t === 'p' ? 'xp' : 'xr') : (t === 'p' ? 'lp' : 'lr');
    D[N - 1][key] += n;
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    setTick((prev) => prev + 1);

    toast.success('Activity added to today', {
      description: `Added ${n} ${t === 'p' ? 'post' : 'reply'}${n > 1 ? 's' : ''} on ${p === 'x' ? 'X' : 'LinkedIn'}.`,
      duration: 4000,
      actions: [
        {
          label: 'Undo',
          onClick: () => {
            D[N - 1][key] = Math.max(0, D[N - 1][key] - n);
            setTick((prev) => prev + 1);
            toast.info('Action undone');
          },
        },
      ],
    });
  };

  const renderView = () => {
    switch (route) {
      case 'analytics':
        return (
          <AnalyticsPage
            plat={plat}
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

  const renderSidebar = (isDrawer = false) => (
    <aside className={isDrawer ? 'drawer-aside' : 'desktop-sidebar'}>
      <div className="brand" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo">V</div>
          <div>
            <b>Verasett</b>
            <small>Social Activity</small>
          </div>
        </div>
        {isDrawer && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--mute)',
              display: 'grid',
              placeItems: 'center',
            }}
            aria-label="Close menu"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      <div
        className="search"
        id={isDrawer ? 'gs-drawer' : 'gs'}
        onClick={() => {
          handleSearchClick();
          if (isDrawer) setIsSidebarOpen(false);
        }}
      >
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
        Search<kbd>⌘ K</kbd>
      </div>
      <div className="sidebar-scroll">
        <div>
          <div className="gl">Workspace</div>
          <nav id={isDrawer ? 'nav1-drawer' : 'nav1'}>
            {NAV1.map(([k, t]) => (
              <a
                key={k}
                href={`#${k}`}
                data-k={k}
                className={route === k ? 'on' : undefined}
                onClick={() => {
                  if (isDrawer) setIsSidebarOpen(false);
                }}
              >
                <Icon name={k === 'today' ? 'today' : k} size={17} />
                {t}
                {k === 'content' && <span className="cnt mono">{CT.length}</span>}
              </a>
            ))}
          </nav>
        </div>
        <div>
          <div className="gl">System</div>
          <nav id={isDrawer ? 'nav2-drawer' : 'nav2'}>
            <a
              href="#settings"
              data-k="settings"
              className={route === 'settings' ? 'on' : undefined}
              onClick={() => {
                if (isDrawer) setIsSidebarOpen(false);
              }}
            >
              <Icon name="settings" size={17} />
              Settings
            </a>
          </nav>
        </div>
      </div>
      <div className="me">
        <div className="tray">
          <div className="tb" style={{ padding: '12px 14px' }}>
            <div className="kv">
              <span className="muted" style={{ fontSize: '12.5px' }}>
                Current streak
              </span>
              <span className="pill or" id={isDrawer ? 'sk-drawer' : 'sk'}>
                <Icon name="flame" size={12} />
                {`${streak()} days`}
              </span>
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
          <TooltipTrigger delay={100}>
            <button
              id={isDrawer ? 'lo-drawer' : 'lo'}
              title="Sign out"
              onClick={() => {
                window.location.hash = '#login';
                if (isDrawer) setIsSidebarOpen(false);
              }}
            >
              <Icon name="out" size={16} />
            </button>
            <Tooltip size="sm">Sign out</Tooltip>
          </TooltipTrigger>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="shell">
        {renderSidebar(false)}

        {isSidebarOpen && (
          <>
            <div
              className="drawer-backdrop"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
            {renderSidebar(true)}
          </>
        )}

        <main>
          <div className="top">
            <div className="crumb">
              <button
                className="menu-btn"
                aria-label="Toggle navigation menu"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Icon name="menu" size={18} />
              </button>
              <span>
                Verasett &nbsp;›&nbsp; <b id="crumb">{activePageTitle}</b>
              </span>
            </div>
            <div className="tools">
              <UnifiedDatePicker />
              <BoardSegmentedControl
                id="ps"
                value={plat}
                onChange={setPlat}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'x', label: 'X' },
                  { value: 'li', label: 'LinkedIn' },
                ]}
                aria-label="Filter by platform"
              />
              <button className="btn" id="add" onClick={handleOpenDialog}>
                <Icon name="plus" size={15} />
                Add activity
              </button>
            </div>
          </div>
          <div className="wrap" id="view" ref={viewRef}>
            <div className="wrap-inner">{renderView()}</div>
          </div>
        </main>
      </div>

      <LoginPage />

      <dialog id="dlg" ref={dialogRef}>
        <h3 style={{ fontSize: '18px', letterSpacing: '-.02em' }}>Add activity</h3>
        <label className="fld">
          Platform
          <BoardSelect
            id="a_p"
            value={dialogPlat}
            onChange={setDialogPlat}
            options={PLATFORM_OPTIONS}
            aria-label="Platform"
          />
        </label>
        <label className="fld">
          Type
          <BoardSelect
            id="a_t"
            value={dialogType}
            onChange={setDialogType}
            options={TYPE_OPTIONS}
            aria-label="Activity type"
          />
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
        {scheduledAt && (
          <div
            style={{
              fontSize: '12px',
              padding: '8px 10px',
              background: 'var(--card-tray)',
              borderRadius: '8px',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--ink-2)',
            }}
          >
            <Icon name="clock" size={14} />
            <span>
              Pre-filled time: <b>{scheduledAt.timeString}</b> ({scheduledAt.date.day}/{scheduledAt.date.month}/{scheduledAt.date.year} · {scheduledAt.timeZone})
            </span>
          </div>
        )}
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
            {scheduledAt ? 'Schedule activity' : 'Add to today'}
          </button>
        </menu>
      </dialog>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <DateStoreProvider>
      <AppContent />
      <Toaster position="bottom-end" duration={4000} />
    </DateStoreProvider>
  );
};
