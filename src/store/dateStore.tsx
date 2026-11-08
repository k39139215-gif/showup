import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarDate } from '@internationalized/date';
import {
  daysInRange,
  swapIfReversed,
  getPreviousPeriod,
  calendarDateToJsDate,
  jsDateToCalendarDate,
  formatRangeDisplay,
} from '../utils/dateMath';
import { D, N, TODAY, DayData, getTodayCalendar } from '../data';

export interface ScheduledAt {
  date: CalendarDate;
  minutes: number; // 0 to 1410 in Asia/Kolkata
  timeZone: string;
  timeString?: string;
}

export interface DateStoreContextValue {
  mode: 'single' | 'range';
  start: CalendarDate;
  end: CalendarDate;
  scheduledAt?: ScheduledAt;
  daysCount: number;
  isTodaySelected: boolean;
  hasData: boolean;
  previousPeriod: { start: CalendarDate; end: CalendarDate; days: number };
  rangeLabel: string;
  setRange: (start: CalendarDate, end: CalendarDate) => void;
  setSingleDate: (date: CalendarDate) => void;
  setMode: (mode: 'single' | 'range') => void;
  setScheduledAt: (scheduledAt?: ScheduledAt) => void;
  // Slicing utilities for D (the 90-day array)
  dateSlice: {
    days: DayData[];
    prevDays: DayData[];
    hasData: boolean;
    startIndex: number;
    endIndex: number;
  };
  refreshData: () => void;
  // Slicing utility for content items
  isDateInCurrentRange: (jsDate: Date) => boolean;
}

const DateStoreContext = createContext<DateStoreContextValue | null>(null);

// Default date range: 30 days up to today
const DEFAULT_END = getTodayCalendar();
const DEFAULT_START = DEFAULT_END.subtract({ days: 29 });

function parseCalendarDate(str: string | null): CalendarDate | null {
  if (!str) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new CalendarDate(y, m, d);
}

function getInitialState(): { mode: 'single' | 'range'; start: CalendarDate; end: CalendarDate } {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    let fromParam = searchParams.get('from');
    let toParam = searchParams.get('to');
    let modeParam = searchParams.get('mode');

    // Also inspect hash if search params were appended to hash e.g. #today?from=...
    if (!fromParam && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQuery);
      fromParam = hashParams.get('from');
      toParam = hashParams.get('to');
      modeParam = hashParams.get('mode');
    }

    const start = parseCalendarDate(fromParam);
    const end = parseCalendarDate(toParam);
    const mode = modeParam === 'single' ? 'single' : 'range';

    if (start && end) {
      const ordered = swapIfReversed(start, end);
      return { mode, start: ordered.start, end: ordered.end };
    }
  } catch (err) {
    console.error('Error parsing date params from URL:', err);
  }
  return { mode: 'range', start: DEFAULT_START, end: DEFAULT_END };
}

function syncUrlParams(start: CalendarDate, end: CalendarDate, mode: 'single' | 'range') {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('from', start.toString());
    url.searchParams.set('to', end.toString());
    if (mode === 'single') {
      url.searchParams.set('mode', 'single');
    } else {
      url.searchParams.delete('mode');
    }
    window.history.replaceState({}, '', url.toString());
  } catch (err) {
    console.error('Error updating URL params:', err);
  }
}

export const DateStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initial] = useState(getInitialState);
  const [mode, setModeState] = useState<'single' | 'range'>(initial.mode);
  const [start, setStartState] = useState<CalendarDate>(initial.start);
  const [end, setEndState] = useState<CalendarDate>(initial.end);
  const [scheduledAt, setScheduledAt] = useState<ScheduledAt | undefined>(undefined);
  const [version, setVersion] = useState(0);

  const refreshData = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  // Sync to URL whenever state changes
  useEffect(() => {
    syncUrlParams(start, end, mode);
  }, [start, end, mode]);

  const setRange = useCallback((newStart: CalendarDate, newEnd: CalendarDate) => {
    const ordered = swapIfReversed(newStart, newEnd);
    setStartState(ordered.start);
    setEndState(ordered.end);
    setModeState('range');
  }, []);

  const setSingleDate = useCallback((date: CalendarDate) => {
    setStartState(date);
    setEndState(date);
    setModeState('single');
  }, []);

  const setMode = useCallback((newMode: 'single' | 'range') => {
    setModeState(newMode);
    if (newMode === 'single') {
      setEndState(start);
    }
  }, [start]);

  const daysCount = useMemo(() => daysInRange(start, end), [start, end]);

  const isTodaySelected = useMemo(() => {
    const todayCalendar = jsDateToCalendarDate(TODAY);
    return start.compare(todayCalendar) === 0 && end.compare(todayCalendar) === 0;
  }, [start, end]);

  const previousPeriod = useMemo(() => getPreviousPeriod(start, end), [start, end]);

  const rangeLabel = useMemo(() => formatRangeDisplay(start, end, mode), [start, end, mode]);

  // Compute indices and slices into D (the 90-day dataset)
  // Index N-1 = TODAY (2026-11-05). Index 0 = TODAY - 89 days (2026-08-08).
  const dateSlice = useMemo(() => {
    const todayCalendar = jsDateToCalendarDate(TODAY);
    // Diff from TODAY to end
    // E.g., if end is today, diffEnd = 0, so endIndex in D is N - 1
    const dToday = calendarDateToJsDate(todayCalendar).getTime();
    const dStart = calendarDateToJsDate(start).getTime();
    const dEnd = calendarDateToJsDate(end).getTime();

    const diffStartDays = Math.round((dToday - dStart) / 86400000);
    const diffEndDays = Math.round((dToday - dEnd) / 86400000);

    const startIndex = (N - 1) - diffStartDays;
    const endIndex = (N - 1) - diffEndDays;

    // Check if range has overlap with data array [0, N-1]
    const validStart = Math.max(0, startIndex);
    const validEnd = Math.min(N - 1, endIndex);

    let days: DayData[] = [];
    if (validStart <= validEnd && startIndex <= N - 1 && endIndex >= 0) {
      days = D.slice(validStart, validEnd + 1);
    }

    // Previous period slice
    const prevStart = previousPeriod.start;
    const prevEnd = previousPeriod.end;
    const dPrevStart = calendarDateToJsDate(prevStart).getTime();
    const dPrevEnd = calendarDateToJsDate(prevEnd).getTime();

    const diffPrevStartDays = Math.round((dToday - dPrevStart) / 86400000);
    const diffPrevEndDays = Math.round((dToday - dPrevEnd) / 86400000);

    const prevStartIndex = (N - 1) - diffPrevStartDays;
    const prevEndIndex = (N - 1) - diffPrevEndDays;

    const validPrevStart = Math.max(0, prevStartIndex);
    const validPrevEnd = Math.min(N - 1, prevEndIndex);

    let prevDays: DayData[] = [];
    if (validPrevStart <= validPrevEnd && prevStartIndex <= N - 1 && prevEndIndex >= 0) {
      prevDays = D.slice(validPrevStart, validPrevEnd + 1);
    }

    return {
      days,
      prevDays,
      hasData: days.length > 0,
      startIndex,
      endIndex,
    };
  }, [start, end, previousPeriod, version]);

  const isDateInCurrentRange = useCallback(
    (jsDate: Date) => {
      const d = jsDateToCalendarDate(jsDate);
      return d.compare(start) >= 0 && d.compare(end) <= 0;
    },
    [start, end]
  );

  const value: DateStoreContextValue = {
    mode,
    start,
    end,
    scheduledAt,
    daysCount,
    isTodaySelected,
    hasData: dateSlice.hasData,
    previousPeriod,
    rangeLabel,
    setRange,
    setSingleDate,
    setMode,
    setScheduledAt,
    dateSlice,
    refreshData,
    isDateInCurrentRange,
  };

  return <DateStoreContext.Provider value={value}>{children}</DateStoreContext.Provider>;
};

export const useDateRangeStore = (): DateStoreContextValue => {
  const context = useContext(DateStoreContext);
  if (!context) {
    throw new Error('useDateRangeStore must be used within a DateStoreProvider');
  }
  return context;
};
