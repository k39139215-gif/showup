import { ShowUpLogo } from './components/ShowUpLogo';
import React, { useState, useEffect, useRef } from 'react';
import { CalendarDate } from '@internationalized/date';
import { D, N, CT, dayAt, streak, TOPICS, getTodayCalendar } from './data';
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
import { formatLocalDate, calendarDateToJsDate } from './utils/dateMath';
import { supabase } from './lib/supabase';

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

export const isApple =
  typeof navigator !== 'undefined' &&
  (/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent) ||
    /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || ''));

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
  const [currentUser, setCurrentUser] = useState<any>(null);

  const viewRef = useRef<HTMLDivElement>(null);
  const { scheduledAt, setRange, setSingleDate, refreshData } = useDateRangeStore();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isImportXOpen, setIsImportXOpen] = useState<boolean>(false);
  const [dialogPlat, setDialogPlat] = useState<string>('x');
  const [dialogType, setDialogType] = useState<string>('p');
  const [dialogCount, setDialogCount] = useState<number>(1);
  const getCurrentTimeString = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const getCurrentDateString = () => {
    return formatLocalDate(new Date());
  };

  const [dialogDate, setDialogDate] = useState<string>(getCurrentDateString);
  const [dialogTime, setDialogTime] = useState<string>(getCurrentTimeString);


  // Supabase Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
      }
    });

    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
      if (event === 'SIGNED_IN' && session?.user) {
        if (window.location.hash === '#login' || !window.location.hash) {
          window.location.hash = '#today';
        }
      }
    });

    return () => {
      authListener.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Initial fetch from Supabase
    syncSupabaseToMemory().then(() => {
      setTick((t) => t + 1);
      refreshData();
    });

    // Realtime WebSocket listener: triggers live UI update on any insert/update
    const unsubscribe = subscribeToDailyActivity(() => {
      syncSupabaseToMemory().then(() => {
        setTick((t) => t + 1);
        refreshData();
      });
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

    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [route]);

  // Dedicated cross-platform keyboard shortcut system (Windows, Mac, Linux, iPad)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      const isInput =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          Boolean(target.closest('input, textarea, select, [contenteditable="true"]')));

      // Escape always closes any open modal, dialog, palette, or drawer
      if (e.key === 'Escape' || e.code === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsDialogOpen(false);
        setIsImportXOpen(false);
        setIsSidebarOpen(false);
        return;
      }

      // Universal Command Palette shortcut: Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      // Works from anywhere, even if focused inside an input field
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isKeyK = e.key.toLowerCase() === 'k' || e.code === 'KeyK';
      if (isCmdOrCtrl && isKeyK) {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // If user is currently typing in an input field, do not trigger single-key page jumps
      if (isInput) return;

      // If a modal or palette is currently open, do not trigger single-key page jumps
      if (isDialogOpen || isImportXOpen || isCommandPaletteOpen) return;

      // Ignore single-key navigation if modifier keys (Ctrl, Alt, Meta) are pressed
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Quick slash '/' or '?' opens Command Palette
      if (e.key === '/' || e.code === 'Slash' || e.key === '?') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Quick Navigation numbers 1 to 5
      if (e.key === '1' || e.code === 'Digit1') {
        e.preventDefault();
        window.location.hash = '#today';
                return;
      }
      if (e.key === '2' || e.code === 'Digit2') {
        e.preventDefault();
        window.location.hash = '#analytics';
                return;
      }
      if (e.key === '3' || e.code === 'Digit3') {
        e.preventDefault();
        window.location.hash = '#content';
                return;
      }
      if (e.key === '4' || e.code === 'Digit4') {
        e.preventDefault();
        window.location.hash = '#review';
                return;
      }
      if (e.key === '5' || e.code === 'Digit5') {
        e.preventDefault();
        window.location.hash = '#settings';
                return;
      }

      // 'A' opens Add Activity modal
      if (e.key.toLowerCase() === 'a' || e.code === 'KeyA') {
        e.preventDefault();
        handleOpenDialog();
        return;
      }

      // 'P' toggles Platform filter (All -> X -> LinkedIn)
      if (e.key.toLowerCase() === 'p' || e.code === 'KeyP') {
        e.preventDefault();
        setPlat((prev) => {
          const next = prev === 'all' ? 'x' : prev === 'x' ? 'li' : 'all';
                    return next;
        });
        return;
      }

      // 'I' opens Import X modal
      if (e.key.toLowerCase() === 'i' || e.code === 'KeyI') {
        e.preventDefault();
        setIsImportXOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isDialogOpen, isImportXOpen, isCommandPaletteOpen]);

  const handleSearchClick = () => {
    setIsCommandPaletteOpen(true);
  };

  const handlePaletteAction = (key: any) => {
    setIsCommandPaletteOpen(false);
    const k = String(key);
    if (k === 'page-today') {
      window.location.hash = '#today';
          } else if (k === 'page-analytics') {
      window.location.hash = '#analytics';
          } else if (k === 'page-content') {
      window.location.hash = '#content';
          } else if (k === 'page-review') {
      window.location.hash = '#review';
          } else if (k === 'page-settings') {
      window.location.hash = '#settings';
          } else if (k === 'action-add') {
      handleOpenDialog();
    } else if (k === 'action-plat') {
      setPlat((prev) => {
        const next = prev === 'all' ? 'x' : prev === 'x' ? 'li' : 'all';
                return next;
      });
    } else if (k === 'action-import-x') {
      setIsImportXOpen(true);
    } else if (k.startsWith('topic-')) {
      const topic = k.replace('topic-', '');
      setCq(topic);
      window.location.hash = '#content';
          } else if (k.startsWith('content-')) {
      const id = parseInt(k.replace('content-', ''), 10);
      setSel(id);
      window.location.hash = '#content';
    } else if (k === 'date-today') {
      setSingleDate(getTodayCalendar());
          } else if (k === 'date-7d') {
      const end = getTodayCalendar();
      setRange(end.subtract({ days: 6 }), end);
          } else if (k === 'date-30d') {
      const end = getTodayCalendar();
      setRange(end.subtract({ days: 29 }), end);
          } else if (k === 'date-all') {
      const end = getTodayCalendar();
      setRange(end.subtract({ days: N - 1 }), end);
          }
  };

  const handleOpenDialog = () => {
    setDialogDate(scheduledAt ? formatLocalDate(calendarDateToJsDate(scheduledAt.date)) : getCurrentDateString());
    setDialogTime(getCurrentTimeString());
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

    // Target date: scheduled date or today in local time
    let targetDate = new Date();
    if (scheduledAt) {
      targetDate = calendarDateToJsDate(scheduledAt.date);
    } else if (dialogDate) {
      const parts = dialogDate.split('-').map(Number);
      if (parts.length === 3) {
        targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    if (dialogTime) {
      const tParts = dialogTime.split(':').map(Number);
      if (tParts.length >= 2) {
        targetDate.setHours(tParts[0] || 0, tParts[1] || 0, 0, 0);
      }
    }
    const targetDateStr = formatLocalDate(targetDate);

    // Update in-memory D array at matching date index
    const targetIdx = D.findIndex((_, idx) => formatLocalDate(dayAt(idx)) === targetDateStr);
    if (targetIdx !== -1) {
      D[targetIdx][key] += n;
    } else {
      D[N - 1][key] += n;
    }

    setIsDialogOpen(false);
    setTick((prev) => prev + 1);

    // Save real activity into Supabase activity_daily
    await upsertDailyActivity({
      date: targetDateStr,
      platform: p,
      posts: t === 'p' ? n : 0,
      replies: t === 'r' ? n : 0,
    });

    // Also record real post in Supabase 'posts' table so it appears in Content Library
    const postRecord = {
      platform: p,
      platform_post_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content: `${n} ${p === 'x' ? 'X' : 'LinkedIn'} ${t === 'p' ? 'original post' : 'reply'}${n > 1 ? 's' : ''} recorded`,
      published_at: targetDate.toISOString(),
      views: 0,
      replies: t === 'r' ? n : 0,
      likes: 0,
      updated_at: new Date().toISOString(),
    };
    const { data: insertedPost } = await supabase.from('posts').insert(postRecord).select().single();

    // Push into memory CT
    CT.unshift({
      id: CT.length + 1,
      p,
      type: t === 'p' ? 'original post' : 'reply external',
      topic: 'General',
      text: postRecord.content,
      views: 0,
      likes: 0,
      replies: t === 'r' ? n : 0,
      eng: 0,
      date: targetDate,
      note: '',
    });

    toast.success('Activity saved', {
      description: `Recorded ${n} ${t === 'p' ? 'post' : 'reply'}${n > 1 ? 's' : ''} on ${p === 'x' ? 'X' : 'LinkedIn'}.`,
      duration: 4000,
    });
    refreshData();
  };

  const handleImportXSuccess = (result: XImportResult) => {
    syncSupabaseToMemory().then(() => {
      setTick((prev) => prev + 1);
      refreshData();
    });
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
            onDataChange={() => setTick((prev) => prev + 1)}
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
          <ShowUpLogo size={32} />
          <div>
            <b>ShowUp</b>
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
        Search<kbd>{isApple ? '⌘K' : 'Ctrl+K'}</kbd>
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
          <Avatar
            size="md"
            src={currentUser?.user_metadata?.avatar_url}
            initials={
              currentUser?.user_metadata?.full_name
                ? currentUser.user_metadata.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : currentUser?.email
                ? currentUser.email.slice(0, 2).toUpperCase()
                : 'KB'
            }
            color="neutral"
            className="av"
          />
          <div className="flex-1 min-w-0">
            <b style={{ fontWeight: 500 }} className="truncate block">
              {currentUser?.user_metadata?.full_name ||
                currentUser?.user_metadata?.name ||
                (currentUser?.email ? currentUser.email.split('@')[0] : 'Kartik Bhosale')}
            </b>
            <small className="truncate block text-[11px] text-[#6b7280]">
              {currentUser?.email || '@kartikBhosaleHQ'}
            </small>
          </div>
          <TooltipTrigger delay={100}>
            <button
              id={isDrawer ? 'lo-drawer' : 'lo'}
              title="Sign out"
              onClick={async () => {
                await supabase.auth.signOut();
                setCurrentUser(null);
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
                <BreadcrumbItem href="#today">ShowUp</BreadcrumbItem>
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
          <div className="wrap outline-none focus:outline-none focus-visible:outline-none" id="view" ref={viewRef} role="region" aria-label="Main content view">
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
        <div className="grid grid-cols-2 gap-3">
          <label className="fld">
            Date
            <input
              type="date"
              id="a_date"
              value={dialogDate}
              onChange={(e) => setDialogDate(e.target.value)}
              className="w-full h-[40px] px-3 rounded-[10px] border border-[var(--line)] text-[13px] bg-white text-[var(--ink)]"
            />
          </label>
          <label className="fld">
            Post Time (when published)
            <input
              type="time"
              id="a_time"
              value={dialogTime}
              onChange={(e) => setDialogTime(e.target.value)}
              className="w-full h-[40px] px-3 rounded-[10px] border border-[var(--line)] text-[13px] font-mono bg-white text-[var(--ink)]"
            />
          </label>
        </div>
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
        shortcut={false}
        placeholder="Type a command or search…"
        onAction={handlePaletteAction}
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
              setSingleDate(getTodayCalendar());
                          }}
          >
            Today
          </CommandPaletteItem>
          <CommandPaletteItem
            id="date-7d"
            onAction={() => {
              const end = getTodayCalendar();
              setRange(end.subtract({ days: 6 }), end);
                          }}
          >
            Last 7 days
          </CommandPaletteItem>
          <CommandPaletteItem
            id="date-30d"
            onAction={() => {
              const end = getTodayCalendar();
              setRange(end.subtract({ days: 29 }), end);
                          }}
          >
            Last 30 days
          </CommandPaletteItem>
          <CommandPaletteItem
            id="date-all"
            onAction={() => {
              const end = getTodayCalendar();
              setRange(end.subtract({ days: N - 1 }), end);
                          }}
          >
            All time
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
                          }}
          >
            Toggle platform filter (All / X / LinkedIn)
          </CommandPaletteItem>
          <CommandPaletteItem
            id="action-import-x"
            shortcut="I"
            onAction={() => setIsImportXOpen(true)}
          >
            Import real X (Twitter) analytics CSV
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
