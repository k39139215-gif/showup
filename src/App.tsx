import React, { useState, useEffect, useRef } from 'react';
import { CalendarDate } from '@internationalized/date';
import { D, N, CT, streak, TOPICS } from './data';
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
import { Breadcrumb, BreadcrumbItem } from './components/base/breadcrumb/breadcrumb';
import { Avatar } from './components/base/avatar/avatar';
import { Badge } from './components/base/badges/badge';
import {
  CommandPalette,
  CommandPaletteSection,
  CommandPaletteItem,
} from './components/base/command-palette/command-palette';
import { Drawer } from './components/base/drawer/drawer';
import { Modal } from './components/base/modal/modal';
import { NumberField } from './components/base/number-field/number-field';
import { DateStoreProvider, useDateRangeStore } from './store/dateStore';
import { ImportXModal } from './components/ImportXModal';
import { XImportResult } from './services/xSyncService';
import {
  upsertDailyActivity,
  syncSupabaseToMemory,
  subscribeToDailyActivity,
} from './services/activityService';

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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const viewRef = useRef<HTMLDivElement>(null);
  const { scheduledAt, setRange, setSingleDate } = useDateRangeStore();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isImportXOpen, setIsImportXOpen] = useState<boolean>(false);
  const [dialogPlat, setDialogPlat] = useState<string>('x');
  const [dialogType, setDialogType] = useState<string>('p');
  const [dialogCount, setDialogCount] = useState<number>(1);

  useEffect(() => {
    // Initial fetch from Supabase
    syncSupabaseToMemory().then((hasData) => {
      if (hasData) setTick((t) => t + 1);
    });

    // Realtime WebSocket listener: triggers live UI update on any insert/update
    const unsubscribe = subscribeToDailyActivity(() => {
      syncSupabaseToMemory().then(() => setTick((t) => t + 1));
    });

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
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [route]);

  const handleSearchClick = () => {
    setIsCommandPaletteOpen(true);
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleAddActivity = async () => {
    const p = dialogPlat as 'x' | 'li';
    const t = dialogType;
    const n = Math.max(1, dialogCount);
    const key = p === 'x' ? (t === 'p' ? 'xp' : 'xr') : (t === 'p' ? 'lp' : 'lr');
    D[N - 1][key] += n;
    setIsDialogOpen(false);
    setTick((prev) => prev + 1);

    // Save real activity into Supabase
    const todayStr = new Date().toISOString().slice(0, 10);
    await upsertDailyActivity({
      date: todayStr,
      platform: p,
      posts: t === 'p' ? n : 0,
      replies: t === 'r' ? n : 0,
    });

    toast.success('Activity saved', {
      description: `Recorded ${n} ${t === 'p' ? 'post' : 'reply'}${n > 1 ? 's' : ''} on ${p === 'x' ? 'X' : 'LinkedIn'}.`,
      duration: 4000,
    });
  };

  const handleImportXSuccess = (result: XImportResult) => {
    setTick((prev) => prev + 1);
    toast.success('X Analytics Imported', {
      description: `Imported ${result.importedPosts} real posts across ${result.daysCount} days (${result.totalViews.toLocaleString()} views, ${result.totalReplies.toLocaleString()} replies).`,
      duration: 5000,
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
                {k === 'content' && (
                  <Badge color={route === 'content' ? 'primary' : 'neutral'} className="cnt mono">
                    {CT.length}
                  </Badge>
                )}
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
        <div className="user flex items-center gap-2.5">
          <Avatar size="md" initials="KS" color="neutral" className="av" />
          <div className="flex-1 min-w-0">
            <b style={{ fontWeight: 500 }} className="truncate block">Kartik Sharma</b>
            <small className="truncate block">Asia/Kolkata</small>
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

        <Drawer
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
          placement="start"
          isDismissable
          aria-label="Navigation drawer"
          className="p-0 border-none shadow-none bg-transparent w-[260px] h-full"
          overlayClassName="z-[110]"
        >
          {() =>
            isSidebarOpen ? (
              <div className="relative h-full">
                <div
                  className="drawer-backdrop fixed inset-0 bg-black/40"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-hidden="true"
                />
                {renderSidebar(true)}
              </div>
            ) : null
          }
        </Drawer>

        <main>
          <div className="top">
            <div className="crumb flex items-center gap-2">
              <button
                className="menu-btn"
                aria-label="Toggle navigation menu"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Icon name="menu" size={18} />
              </button>
              <Breadcrumb aria-label="Breadcrumb">
                <BreadcrumbItem href="#today">Verasett</BreadcrumbItem>
                <BreadcrumbItem current>
                  <b id="crumb">{activePageTitle}</b>
                </BreadcrumbItem>
              </Breadcrumb>
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
              <button
                className="btn btn-secondary flex items-center gap-1.5"
                id="btn-import-x"
                onClick={() => setIsImportXOpen(true)}
                title="Import real analytics from X (CSV)"
              >
                <Icon name="upload" size={15} />
                Import X
              </button>
              <button className="btn" id="add" onClick={handleOpenDialog}>
                <Icon name="plus" size={15} />
                Add activity
              </button>
            </div>
          </div>
          <div className="wrap" id="view" ref={viewRef} tabIndex={0} role="region" aria-label="Main content view">
            <div className="wrap-inner">{renderView()}</div>
          </div>
        </main>
      </div>

      <LoginPage />

      <Modal
        id="dlg"
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        aria-label="Add activity"
        className="p-6 rounded-2xl bg-white border border-[var(--line)] shadow-2xl max-w-md w-full flex flex-col gap-3"
      >
        <h3 style={{ fontSize: '18px', letterSpacing: '-.02em', fontWeight: 600 }}>Add activity</h3>
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
        <div className="fld">
          <NumberField
            id="a_n"
            label="Count"
            minValue={1}
            maxValue={999}
            value={dialogCount}
            onChange={(val) => setDialogCount(val || 1)}
            aria-label="Count"
          />
        </div>
        {scheduledAt && (
          <div
            style={{
              fontSize: '12px',
              padding: '8px 10px',
              background: 'var(--card-tray)',
              borderRadius: '8px',
              marginTop: '4px',
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
        <menu style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
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
      </Modal>

      <ImportXModal
        isOpen={isImportXOpen}
        onClose={() => setIsImportXOpen(false)}
        onSuccess={handleImportXSuccess}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        placeholder="Type a command or search…"
      >
        <CommandPaletteSection title="Pages">
          <CommandPaletteItem
            id="page-today"
            shortcut="1"
            onAction={() => {
              window.location.hash = '#today';
            }}
          >
            Today
          </CommandPaletteItem>
          <CommandPaletteItem
            id="page-analytics"
            shortcut="2"
            onAction={() => {
              window.location.hash = '#analytics';
            }}
          >
            Analytics
          </CommandPaletteItem>
          <CommandPaletteItem
            id="page-content"
            shortcut="3"
            onAction={() => {
              window.location.hash = '#content';
            }}
          >
            Content & reply library
          </CommandPaletteItem>
          <CommandPaletteItem
            id="page-review"
            shortcut="4"
            onAction={() => {
              window.location.hash = '#review';
            }}
          >
            Weekly review
          </CommandPaletteItem>
          <CommandPaletteItem
            id="page-settings"
            shortcut="5"
            onAction={() => {
              window.location.hash = '#settings';
            }}
          >
            Settings
          </CommandPaletteItem>
        </CommandPaletteSection>

        <CommandPaletteSection title="Date shortcuts">
          <CommandPaletteItem
            id="date-today"
            onAction={() => {
              setSingleDate(new CalendarDate(2026, 11, 5));
              toast.info('Date set to Today');
            }}
          >
            Today (5 Nov 2026)
          </CommandPaletteItem>
          <CommandPaletteItem
            id="date-7d"
            onAction={() => {
              setRange(new CalendarDate(2026, 10, 30), new CalendarDate(2026, 11, 5));
              toast.info('Date range set to Last 7 days');
            }}
          >
            Last 7 days (30 Oct - 5 Nov)
          </CommandPaletteItem>
          <CommandPaletteItem
            id="date-30d"
            onAction={() => {
              setRange(new CalendarDate(2026, 10, 7), new CalendarDate(2026, 11, 5));
              toast.info('Date range set to Last 30 days');
            }}
          >
            Last 30 days (7 Oct - 5 Nov)
          </CommandPaletteItem>
          <CommandPaletteItem
            id="date-all"
            onAction={() => {
              setRange(new CalendarDate(2026, 8, 8), new CalendarDate(2026, 11, 5));
              toast.info('Date range set to All time');
            }}
          >
            All time (8 Aug - 5 Nov)
          </CommandPaletteItem>
        </CommandPaletteSection>

        <CommandPaletteSection title="Topics">
          {TOPICS.map((topic) => (
            <CommandPaletteItem
              key={topic}
              id={`topic-${topic}`}
              onAction={() => {
                setCq(topic);
                window.location.hash = '#content';
                toast.info(`Filtered content by #${topic}`);
              }}
            >
              #{topic}
            </CommandPaletteItem>
          ))}
        </CommandPaletteSection>

        <CommandPaletteSection title="Actions">
          <CommandPaletteItem
            id="action-add"
            shortcut="A"
            onAction={() => handleOpenDialog()}
          >
            Add activity
          </CommandPaletteItem>
          <CommandPaletteItem
            id="action-plat"
            shortcut="P"
            onAction={() => {
              setPlat((prev) => (prev === 'all' ? 'x' : prev === 'x' ? 'li' : 'all'));
              toast.info('Platform filter toggled');
            }}
          >
            Toggle platform filter (All / X / LinkedIn)
          </CommandPaletteItem>
        </CommandPaletteSection>

        <CommandPaletteSection title="Recent content">
          {CT.slice(0, 5).map((item) => (
            <CommandPaletteItem
              key={item.id}
              id={`content-${item.id}`}
              description={`#${item.id} · ${item.p === 'li' ? 'LinkedIn' : 'X'} · #${item.topic}`}
              onAction={() => {
                setSel(item.id);
                window.location.hash = '#content';
              }}
            >
              {item.text.slice(0, 60)}
            </CommandPaletteItem>
          ))}
        </CommandPaletteSection>
      </CommandPalette>
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
