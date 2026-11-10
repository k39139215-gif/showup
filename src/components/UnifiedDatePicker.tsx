import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CalendarDate } from '@internationalized/date';
import {
  RiCalendarLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiTimeLine,
} from '@remixicon/react';
import { useDateRangeStore, ScheduledAt } from '../store/dateStore';
import {
  daysInRange,
  swapIfReversed,
  calendarDateToJsDate,
  convertSlotTimezone,
  TIMEZONE_OPTIONS,
} from '../utils/dateMath';
import { BoardSelect } from './base/select/BoardSelect';
import { BoardSegmentedControl } from './base/segmented-control/BoardSegmentedControl';
import { Button } from './base/buttons/button';
import { CloseButton } from './base/buttons/close-button';
import { Tooltip, TooltipTrigger } from './base/tooltip/tooltip';
import { toast } from './base/toast/toast';
import { cx } from '../utils/cx';
import { getTodayCalendar } from '../data';

const TODAY_CALENDAR = getTodayCalendar();

interface PresetItem {
  id: string;
  label: string;
  getRange: () => { start: CalendarDate; end: CalendarDate };
}

const PRESETS: PresetItem[] = [
  { id: 'today', label: 'Today', getRange: () => ({ start: TODAY_CALENDAR, end: TODAY_CALENDAR }) },
  {
    id: 'yesterday',
    label: 'Yesterday',
    getRange: () => ({ start: TODAY_CALENDAR.subtract({ days: 1 }), end: TODAY_CALENDAR.subtract({ days: 1 }) }),
  },
  {
    id: 'last7',
    label: 'Last 7 days',
    getRange: () => ({ start: TODAY_CALENDAR.subtract({ days: 6 }), end: TODAY_CALENDAR }),
  },
  {
    id: 'last14',
    label: 'Last 14 days',
    getRange: () => ({ start: TODAY_CALENDAR.subtract({ days: 13 }), end: TODAY_CALENDAR }),
  },
  {
    id: 'last30',
    label: 'Last 30 days',
    getRange: () => ({ start: TODAY_CALENDAR.subtract({ days: 29 }), end: TODAY_CALENDAR }),
  },
  {
    id: 'last60',
    label: 'Last 60 days',
    getRange: () => ({ start: TODAY_CALENDAR.subtract({ days: 59 }), end: TODAY_CALENDAR }),
  },
  {
    id: 'thisWeek',
    label: 'This week',
    getRange: () => ({
      // Nov 5, 2026 is Thursday -> Monday is Nov 2
      start: new CalendarDate(2026, 11, 2),
      end: TODAY_CALENDAR,
    }),
  },
  {
    id: 'lastWeek',
    label: 'Last week',
    getRange: () => ({
      start: new CalendarDate(2026, 10, 26),
      end: new CalendarDate(2026, 11, 1),
    }),
  },
  {
    id: 'thisMonth',
    label: 'This month',
    getRange: () => ({
      start: new CalendarDate(2026, 11, 1),
      end: new CalendarDate(2026, 11, 30),
    }),
  },
  {
    id: 'lastMonth',
    label: 'Last month',
    getRange: () => ({
      start: new CalendarDate(2026, 10, 1),
      end: new CalendarDate(2026, 10, 31),
    }),
  },
  {
    id: 'thisYear',
    label: 'This year',
    getRange: () => ({
      start: new CalendarDate(2026, 1, 1),
      end: new CalendarDate(2026, 12, 31),
    }),
  },
  {
    id: 'lastYear',
    label: 'Last year',
    getRange: () => ({
      start: new CalendarDate(2025, 1, 1),
      end: new CalendarDate(2025, 12, 31),
    }),
  },
  {
    id: 'allTime',
    label: 'All time',
    getRange: () => ({
      start: TODAY_CALENDAR.subtract({ days: 89 }), // Aug 8, 2026 - Nov 5, 2026 (90 days)
      end: TODAY_CALENDAR,
    }),
  },
];

export const UnifiedDatePicker: React.FC = () => {
  const {
    mode,
    start,
    end,
    scheduledAt,
    rangeLabel,
    setRange,
    setSingleDate,
    setScheduledAt,
  } = useDateRangeStore();

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Track viewport width and geometry for popover clamping & collision prevention
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePopoverGeometry = useCallback(() => {
    const vWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    setViewportWidth(vWidth);

    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isSidebarVisible = vWidth >= 1100;
    const minLeft = (isSidebarVisible ? 260 : 0) + 16;
    const maxRight = vWidth - 16;
    const availableContentWidth = Math.max(300, maxRight - minLeft);

    const showDual = availableContentWidth >= 880;
    const popoverW = showDual ? 880 : Math.min(520, availableContentWidth);

    const top = Math.min(rect.bottom + 8, vHeight - 80);
    // Align to the right edge of the trigger button, but clamp strictly so:
    // left is NEVER less than minLeft (sidebar boundary),
    // and right is NEVER greater than maxRight (window right edge)!
    let targetLeft = rect.right - popoverW;
    if (targetLeft < minLeft) {
      targetLeft = minLeft;
    }
    if (targetLeft + popoverW > maxRight) {
      targetLeft = maxRight - popoverW;
    }
    targetLeft = Math.max(minLeft, targetLeft);

    setPopoverPos({
      top: Math.round(top),
      left: Math.round(targetLeft),
      width: Math.round(popoverW),
    });
  }, []);

  useEffect(() => {
    const handleResize = () => updatePopoverGeometry();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePopoverGeometry]);

  useEffect(() => {
    if (isOpen) {
      updatePopoverGeometry();
      window.addEventListener('scroll', updatePopoverGeometry, true);
      return () => {
        window.removeEventListener('scroll', updatePopoverGeometry, true);
      };
    }
  }, [isOpen, updatePopoverGeometry]);

  const isSidebarVisible = viewportWidth >= 1100;
  const availableContentWidth = Math.max(300, viewportWidth - (isSidebarVisible ? 260 : 0) - 32);
  const isMobile = viewportWidth < 640 || availableContentWidth < 460;
  const isDualMonth = availableContentWidth >= 880;
  const showPresetColumn = !isMobile && availableContentWidth >= 500;

  // Draft state inside popover
  const [draftMode, setDraftMode] = useState<'single' | 'range'>(mode);
  const [draftStart, setDraftStart] = useState<CalendarDate>(start);
  const [draftEnd, setDraftEnd] = useState<CalendarDate>(end);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [hoverDate, setHoverDate] = useState<CalendarDate | null>(null);

  // Month navigation
  const [visibleMonth, setVisibleMonth] = useState<CalendarDate>(
    new CalendarDate(start.year, start.month, 1)
  );

  // Time slots sidebar
  const [addTimeOpen, setAddTimeOpen] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('Asia/Kolkata');
  const [is24Hour, setIs24Hour] = useState(false);
  const [selectedSlotMinutes, setSelectedSlotMinutes] = useState<number>(
    scheduledAt?.minutes ?? 540
  );

  // Manual inputs
  const [startInputText, setStartInputText] = useState('');
  const [endInputText, setEndInputText] = useState('');

  // Sync draft states when popover opens
  useEffect(() => {
    if (isOpen) {
      setDraftMode(mode);
      setDraftStart(start);
      setDraftEnd(end);
      setPickingEnd(false);
      setHoverDate(null);
      setVisibleMonth(new CalendarDate(start.year, start.month, 1));
      setStartInputText(
        `${String(start.day).padStart(2, '0')}/${String(start.month).padStart(2, '0')}/${start.year}`
      );
      setEndInputText(
        `${String(end.day).padStart(2, '0')}/${String(end.month).padStart(2, '0')}/${end.year}`
      );
      setAddTimeOpen(Boolean(scheduledAt));
      if (scheduledAt) {
        setSelectedTimezone(scheduledAt.timeZone);
        setSelectedSlotMinutes(scheduledAt.minutes);
      }
    }
  }, [isOpen, mode, start, end, scheduledAt]);

  // Keep manual text inputs in sync with draft dates
  useEffect(() => {
    setStartInputText(
      `${String(draftStart.day).padStart(2, '0')}/${String(draftStart.month).padStart(2, '0')}/${draftStart.year}`
    );
    setEndInputText(
      `${String(draftEnd.day).padStart(2, '0')}/${String(draftEnd.month).padStart(2, '0')}/${draftEnd.year}`
    );
  }, [draftStart, draftEnd]);

  // Detect which preset matches draft range
  const activePresetId = useMemo(() => {
    for (const p of PRESETS) {
      const r = p.getRange();
      if (draftStart.compare(r.start) === 0 && draftEnd.compare(r.end) === 0) {
        return p.id;
      }
    }
    return null;
  }, [draftStart, draftEnd]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleApply = () => {
    if (draftMode === 'single') {
      setSingleDate(draftStart);
      if (addTimeOpen) {
        const converted = convertSlotTimezone(
          draftStart,
          selectedSlotMinutes,
          selectedTimezone,
          is24Hour
        );
        setScheduledAt({
          date: draftStart,
          minutes: selectedSlotMinutes,
          timeZone: selectedTimezone,
          timeString: converted.timeString,
        });
      } else {
        setScheduledAt(undefined);
      }
    } else {
      setRange(draftStart, draftEnd);
      setScheduledAt(undefined);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handlePresetSelect = (preset: PresetItem) => {
    const r = preset.getRange();
    setDraftStart(r.start);
    setDraftEnd(r.end);
    setPickingEnd(false);
    setVisibleMonth(new CalendarDate(r.start.year, r.start.month, 1));
    
  };

  const handleDayClick = (day: CalendarDate) => {
    // Future days disabled
    if (day.compare(TODAY_CALENDAR) > 0) return;

    if (draftMode === 'single') {
      setDraftStart(day);
      setDraftEnd(day);
      setPickingEnd(false);
      return;
    }

    // Range mode
    if (!pickingEnd) {
      setDraftStart(day);
      setDraftEnd(day);
      setPickingEnd(true);
    } else {
      const ordered = swapIfReversed(draftStart, day);
      setDraftStart(ordered.start);
      setDraftEnd(ordered.end);
      setPickingEnd(false);
      setHoverDate(null);
    }
  };

  const handleDateInputCommit = (isStart: boolean, text: string) => {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const newD = new CalendarDate(y, m, d);
        if (newD.compare(TODAY_CALENDAR) <= 0) {
          if (isStart) {
            if (newD.compare(draftEnd) > 0) {
              setDraftStart(newD);
              setDraftEnd(newD);
            } else {
              setDraftStart(newD);
            }
          } else {
            if (newD.compare(draftStart) < 0) {
              setDraftStart(newD);
              setDraftEnd(newD);
            } else {
              setDraftEnd(newD);
            }
          }
          return;
        }
      }
    }
    // Revert if invalid
    if (isStart) {
      setStartInputText(
        `${String(draftStart.day).padStart(2, '0')}/${String(draftStart.month).padStart(2, '0')}/${draftStart.year}`
      );
    } else {
      setEndInputText(
        `${String(draftEnd.day).padStart(2, '0')}/${String(draftEnd.month).padStart(2, '0')}/${draftEnd.year}`
      );
    }
  };

  // Compute prospective range during hover
  const activeEffectiveRange = useMemo(() => {
    if (pickingEnd && hoverDate) {
      return swapIfReversed(draftStart, hoverDate);
    }
    return { start: draftStart, end: draftEnd };
  }, [pickingEnd, hoverDate, draftStart, draftEnd]);

  const draftDaysCount = useMemo(() => {
    return daysInRange(activeEffectiveRange.start, activeEffectiveRange.end);
  }, [activeEffectiveRange]);

  // Month navigation helpers
  const nextMonth = visibleMonth.add({ months: 1 });

  const renderMonthDays = (monthDate: CalendarDate) => {
    const year = monthDate.year;
    const month = monthDate.month;
    const firstDay = new CalendarDate(year, month, 1);
    const jsFirst = calendarDateToJsDate(firstDay);
    const dayOfWeek = (jsFirst.getDay() + 6) % 7; // Monday = 0, Sunday = 6

    // Number of days in month
    const jsNextMonth = new Date(year, month, 0);
    const totalDays = jsNextMonth.getDate();

    const cells: React.ReactNode[] = [];

    // Prefix empty cells
    for (let i = 0; i < dayOfWeek; i++) {
      cells.push(<div key={`empty-pre-${i}`} className="size-[40px]" />);
    }

    // Days of month
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const cellDate = new CalendarDate(year, month, dayNum);
      const isFuture = cellDate.compare(TODAY_CALENDAR) > 0;
      const isStart = cellDate.compare(activeEffectiveRange.start) === 0;
      const isEnd = cellDate.compare(activeEffectiveRange.end) === 0;
      const isInRange =
        cellDate.compare(activeEffectiveRange.start) >= 0 &&
        cellDate.compare(activeEffectiveRange.end) <= 0;
      const isEdge = isStart || isEnd;
      const isSingleDay = activeEffectiveRange.start.compare(activeEffectiveRange.end) === 0;

      const cellIndex = dayOfWeek + dayNum - 1;
      const isRowStart = cellIndex % 7 === 0;
      const isRowEnd = cellIndex % 7 === 6;

      cells.push(
        <div
          key={`day-${dayNum}`}
          className="relative size-[40px] flex items-center justify-center select-none"
          onMouseEnter={() => {
            if (pickingEnd && !isFuture) setHoverDate(cellDate);
          }}
        >
          {/* Continuous light blue range fill across cells (no gaps inside band) */}
          {isInRange && !isSingleDay && draftMode === 'range' && (
            <>
              {isStart && !isEnd && (
                <span
                  aria-hidden
                  className={cx(
                    'absolute inset-y-0 left-1/2 bg-[#dbeafe] z-0 rounded-l-[10px]',
                    isRowEnd ? 'right-0 rounded-r-[10px]' : '-right-[2px]'
                  )}
                />
              )}
              {isEnd && !isStart && (
                <span
                  aria-hidden
                  className={cx(
                    'absolute inset-y-0 right-1/2 bg-[#dbeafe] z-0 rounded-r-[10px]',
                    isRowStart ? 'left-0 rounded-l-[10px]' : '-left-[2px]'
                  )}
                />
              )}
              {isInRange && !isEdge && (
                <span
                  aria-hidden
                  className={cx(
                    'absolute inset-y-0 bg-[#dbeafe] z-0',
                    isRowStart ? 'left-0 rounded-l-[10px]' : '-left-[2px]',
                    isRowEnd ? 'right-0 rounded-r-[10px]' : '-right-[2px]'
                  )}
                />
              )}
            </>
          )}

          {/* Cell button */}
          {isFuture ? (
            <TooltipTrigger delay={100}>
              <button
                type="button"
                disabled
                tabIndex={-1}
                className="day-cell relative z-10 size-[40px] flex items-center justify-center rounded-[10px] text-[14px] font-medium font-sans tabular-nums border-0 opacity-40 cursor-not-allowed text-[#a9a69d] hover:bg-transparent pointer-events-none"
              >
                {dayNum}
              </button>
              <Tooltip size="sm">Future dates cannot be selected</Tooltip>
            </TooltipTrigger>
          ) : (
            <button
              type="button"
              onClick={() => handleDayClick(cellDate)}
              className={cx(
                'day-cell relative z-10 size-[40px] flex items-center justify-center rounded-[10px] text-[14px] font-medium font-sans tabular-nums outline-none transition-colors border-0 cursor-pointer',
                isEdge
                  ? 'bg-[#2563eb] text-white font-semibold shadow-sm'
                  : isInRange
                  ? 'text-[#1c1b18] hover:bg-[#bfdbfe]'
                  : 'text-[var(--ink)] hover:bg-[#f5f4ef]',
                'focus-visible:ring-2 focus-visible:ring-[#2563eb]'
              )}
            >
              {dayNum}
            </button>
          )}
        </div>
      );
    }

    // Pad with empty suffix cells to ensure exactly 6 rows (42 cells total)
    const totalFilled = dayOfWeek + totalDays;
    const suffixCount = 42 - totalFilled;
    for (let i = 0; i < suffixCount; i++) {
      cells.push(<div key={`empty-post-${i}`} className="size-[40px]" />);
    }

    return cells;
  };

  const monthsTitle = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="relative inline-block" id="unified-date-picker">
      {/* Top Bar Single Date Trigger */}
      <button
        ref={triggerRef}
        type="button"
        id="dt"
        onClick={() => setIsOpen(!isOpen)}
        className={cx(
          'h-[34px] px-3 rounded-lg border border-[var(--line)] bg-white text-[12.5px] font-medium text-[var(--ink)]',
          'inline-flex items-center gap-2 cursor-pointer transition-colors hover:bg-[#faf9f6] outline-none',
          'box-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] select-none',
          isOpen && 'ring-2 ring-[var(--line)]'
        )}
      >
        <RiCalendarLine className="size-4 text-[var(--ink)] shrink-0" aria-hidden />
        <span className="font-medium">{rangeLabel}</span>
      </button>

      {/* Popover Surface */}
      {isOpen && (
        <div
          ref={popoverRef}
          id="cal-popover"
          role="dialog"
          aria-label="Date range calendar"
          className={cx(
            'boardui-calendar-popover z-[130] bg-white border border-[var(--line)] shadow-[var(--shadow-dropdown)] outline-none',
            isMobile
              ? '!fixed !inset-x-0 !bottom-0 !top-auto !mt-0 !rounded-t-2xl !rounded-b-none !w-full max-h-[90dvh] overflow-y-auto'
              : 'fixed rounded-2xl flex flex-col overflow-hidden'
          )}
          style={
            isMobile
              ? undefined
              : {
                  top: `${popoverPos?.top ?? 64}px`,
                  left: `${popoverPos?.left ?? (isSidebarVisible ? 276 : 16)}px`,
                  width: `${popoverPos?.width ?? (isDualMonth ? 880 : 520)}px`,
                  maxHeight: 'min(640px, calc(100dvh - 80px))',
                  maxWidth: 'calc(100vw - 32px)',
                }
          }
        >
          {/* Header (56px high, Single/Range segmented control left, close button right) */}
          <div className="h-[56px] px-4 border-b border-[var(--line)] bg-[#fbfbfa] flex items-center justify-between shrink-0">
            <BoardSegmentedControl
              id="cal-mode-seg"
              value={draftMode}
              onChange={(val) => {
                if (val === 'single') {
                  setDraftMode('single');
                  setDraftEnd(draftStart);
                  setPickingEnd(false);
                } else {
                  setDraftMode('range');
                  if (draftStart.compare(draftEnd) === 0) {
                    setDraftEnd(draftStart.add({ days: 6 }));
                  }
                }
              }}
              options={[
                { value: 'single', label: 'Single' },
                { value: 'range', label: 'Range' },
              ]}
              aria-label="Calendar mode selection"
            />
            <CloseButton size="md" aria-label="Close calendar" onClick={handleCancel} />
          </div>

          {/* If tablet/mobile or compact mode where preset column cannot fit: Presets as horizontal chip row */}
          {!showPresetColumn && (
            <div
              className="px-4 py-2 border-b border-[var(--line)] flex flex-row items-center gap-1.5 overflow-x-auto shrink-0 bg-[#fbfbfa]"
              role="listbox"
              aria-label="Date presets"
            >
              {PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handlePresetSelect(preset)}
                    className={cx(
                      'h-[30px] px-3 rounded-full text-[12px] font-medium shrink-0 cursor-pointer select-none transition-colors border-0 outline-none whitespace-nowrap',
                      isSelected
                        ? 'bg-[#dbeafe] text-[#1d4ed8] font-semibold'
                        : 'bg-white text-[var(--ink)] hover:bg-[#f5f4ef] border border-[var(--line)]',
                      'focus-visible:ring-2 focus-visible:ring-[#2563eb]'
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Body: Presets Left Column (Desktop & Compact) + Calendar Area + Optional Time Sidebar */}
          <div className="flex flex-row flex-1 overflow-hidden min-h-0">
            {/* Presets Left Column (Desktop & Compact Desktop): 176px Preset Column */}
            {showPresetColumn && (
              <div
                className="w-[176px] shrink-0 border-r border-[var(--line)] p-3 flex flex-col overflow-y-auto"
                style={{ maxHeight: '420px' }}
                role="listbox"
                aria-label="Date presets"
              >
                <div className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--mute)] select-none">
                  QUICK SELECT
                </div>
                <div className="flex flex-col gap-[2px]">
                  {PRESETS.map((preset) => {
                    const isSelected = activePresetId === preset.id;
                    const isAllTime = preset.id === 'allTime';
                    return (
                      <React.Fragment key={preset.id}>
                        {isAllTime && (
                          <div className="my-2 border-t border-[var(--line)]" />
                        )}
                        <div
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={0}
                          onClick={() => handlePresetSelect(preset)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handlePresetSelect(preset);
                            }
                          }}
                          className={cx(
                            'preset-row h-[36px] px-3 rounded-lg text-[13px] flex items-center cursor-pointer select-none transition-colors border-0 outline-none',
                            isSelected
                              ? 'bg-[#dbeafe] text-[#1d4ed8] font-semibold'
                              : 'bg-transparent text-[var(--ink)] hover:bg-[#f5f4ef] font-medium',
                            'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563eb]'
                          )}
                        >
                          {preset.label}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calendar Area: 16px padding around */}
            <div className="flex-1 p-4 overflow-y-auto flex items-start justify-center">
              <div className="flex items-start gap-6">
                {/* Month 1: 308px */}
                <div className="w-[308px] shrink-0 flex flex-col">
                  {/* Month 1 Header: 40px row */}
                  <div className="h-[40px] relative flex items-center justify-center mb-1">
                    <button
                      type="button"
                      className="size-8 absolute left-0 top-1 rounded-lg flex items-center justify-center text-[var(--mute)] hover:bg-[#f5f4ef] border-0 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                      onClick={() => setVisibleMonth(visibleMonth.subtract({ months: 1 }))}
                      aria-label="Previous month"
                    >
                      <RiArrowLeftSLine className="size-5" />
                    </button>
                    <span className="font-semibold text-[14px] text-[var(--ink)] select-none">
                      {monthsTitle[visibleMonth.month - 1]} {visibleMonth.year}
                    </span>
                    {/* If single month view, show Next button here */}
                    {!isDualMonth && (
                      <button
                        type="button"
                        className="size-8 absolute right-0 top-1 rounded-lg flex items-center justify-center text-[var(--mute)] hover:bg-[#f5f4ef] border-0 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                        onClick={() => setVisibleMonth(visibleMonth.add({ months: 1 }))}
                        aria-label="Next month"
                      >
                        <RiArrowRightSLine className="size-5" />
                      </button>
                    )}
                  </div>

                  {/* Weekday Row: 32px high */}
                  <div className="h-[32px] grid grid-cols-7 gap-x-[2px] items-center text-center text-[11px] font-semibold text-[var(--mute)] uppercase tracking-wider select-none mb-1">
                    <span>MO</span>
                    <span>TU</span>
                    <span>WE</span>
                    <span>TH</span>
                    <span>FR</span>
                    <span>SA</span>
                    <span>SU</span>
                  </div>

                  {/* Day Grid: 40x40 cells with 2px gap, always 6 rows (42 cells) */}
                  <div className="grid grid-cols-7 gap-[2px] justify-items-center">
                    {renderMonthDays(visibleMonth)}
                  </div>
                </div>

                {/* 1px Vertical Divider between months on Dual View */}
                {isDualMonth && (
                  <div className="w-[1px] bg-[var(--line)] self-stretch" />
                )}

                {/* Month 2: 308px (Dual view only) */}
                {isDualMonth && (
                  <div className="w-[308px] shrink-0 flex flex-col">
                    {/* Month 2 Header: IDENTICAL 40px row */}
                    <div className="h-[40px] relative flex items-center justify-center mb-1">
                      <span className="font-semibold text-[14px] text-[var(--ink)] select-none">
                        {monthsTitle[nextMonth.month - 1]} {nextMonth.year}
                      </span>
                      <button
                        type="button"
                        className="size-8 absolute right-0 top-1 rounded-lg flex items-center justify-center text-[var(--mute)] hover:bg-[#f5f4ef] border-0 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                        onClick={() => setVisibleMonth(visibleMonth.add({ months: 1 }))}
                        aria-label="Next month"
                      >
                        <RiArrowRightSLine className="size-5" />
                      </button>
                    </div>

                    {/* Weekday Row: 32px high */}
                    <div className="h-[32px] grid grid-cols-7 gap-x-[2px] items-center text-center text-[11px] font-semibold text-[var(--mute)] uppercase tracking-wider select-none mb-1">
                      <span>MO</span>
                      <span>TU</span>
                      <span>WE</span>
                      <span>TH</span>
                      <span>FR</span>
                      <span>SA</span>
                      <span>SU</span>
                    </div>

                    {/* Day Grid: 40x40 cells with 2px gap, always 6 rows (42 cells) */}
                    <div className="grid grid-cols-7 gap-[2px] justify-items-center">
                      {renderMonthDays(nextMonth)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Time Slots Sidebar (Single mode + Add Time toggled ON) */}
            {draftMode === 'single' && addTimeOpen && (
              <div className="w-[220px] shrink-0 border-l border-[var(--line)] p-3 flex flex-col bg-[#fbfbfa]">
                <div className="font-semibold text-[13px] text-[var(--ink)] pb-2">Schedule Time</div>
                <div className="mb-2">
                  <BoardSelect
                    value={selectedTimezone}
                    onChange={(tz) => setSelectedTimezone(tz)}
                    options={TIMEZONE_OPTIONS}
                    fixedWidth="w-full"
                    className="w-full"
                    aria-label="Timezone"
                  />
                </div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-[12px] text-[var(--mute)]">Format</span>
                  <div className="seg" style={{ height: '32px' }}>
                    <button
                      type="button"
                      className={cx(!is24Hour && 'on')}
                      onClick={() => setIs24Hour(false)}
                      style={{ padding: '2px 8px', fontSize: '11.5px' }}
                    >
                      12h
                    </button>
                    <button
                      type="button"
                      className={cx(is24Hour && 'on')}
                      onClick={() => setIs24Hour(true)}
                      style={{ padding: '2px 8px', fontSize: '11.5px' }}
                    >
                      24h
                    </button>
                  </div>
                </div>
                <div
                  className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1"
                  style={{ maxHeight: '240px' }}
                >
                  {Array.from({ length: 48 }, (_, i) => i * 30).map((minutes) => {
                    const converted = convertSlotTimezone(
                      draftStart,
                      minutes,
                      selectedTimezone,
                      is24Hour
                    );
                    const isSelected = selectedSlotMinutes === minutes;
                    return (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setSelectedSlotMinutes(minutes)}
                        className={cx(
                          'time-slot-btn h-[32px] px-2.5 rounded-lg text-[12.5px] flex items-center justify-between cursor-pointer border-0 outline-none transition-colors',
                          isSelected
                            ? 'bg-[#2563eb] text-white font-semibold'
                            : 'bg-white hover:bg-[#f0efeb] text-[var(--ink)]'
                        )}
                      >
                        <span>{converted.timeString}</span>
                        {converted.isCrossDateLine && (
                          <span
                            className={cx(
                              'text-[10px] px-1 py-0.5 rounded font-mono',
                              isSelected ? 'bg-white/20 text-white' : 'bg-[#e5e3dd] text-[var(--mute)]'
                            )}
                          >
                            {converted.displayDateString.slice(0, 5)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer: 72px high, padding 16px 20px, top border 1px */}
          <div
            className={cx(
              'border-t border-[var(--line)] bg-[#fbfbfa] shrink-0',
              isMobile
                ? 'p-4 flex flex-col gap-3'
                : 'h-[72px] px-5 py-4 flex items-center justify-between flex-nowrap'
            )}
          >
            {/* Left: start input - end input (>= 132px wide), pill */}
            <div className={cx('flex items-center gap-2.5', isMobile && 'w-full justify-between')}>
              <input
                type="text"
                value={startInputText}
                onChange={(e) => setStartInputText(e.target.value)}
                onBlur={(e) => handleDateInputCommit(true, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDateInputCommit(true, startInputText);
                }}
                className={cx(
                  'h-[38px] px-2.5 rounded-lg border border-[var(--line)] bg-white text-[14px] font-mono tabular-nums text-center text-[var(--ink)] outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]',
                  isMobile ? 'flex-1 min-w-[110px]' : 'w-[136px] min-w-[132px]'
                )}
                placeholder="DD/MM/YYYY"
              />
              {draftMode === 'range' && (
                <>
                  <span className="text-[var(--mute)] font-mono text-[14px] select-none">-</span>
                  <input
                    type="text"
                    value={endInputText}
                    onChange={(e) => setEndInputText(e.target.value)}
                    onBlur={(e) => handleDateInputCommit(false, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleDateInputCommit(false, endInputText);
                    }}
                    className={cx(
                      'h-[38px] px-2.5 rounded-lg border border-[var(--line)] bg-white text-[14px] font-mono tabular-nums text-center text-[var(--ink)] outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]',
                      isMobile ? 'flex-1 min-w-[110px]' : 'w-[136px] min-w-[132px]'
                    )}
                    placeholder="DD/MM/YYYY"
                  />
                </>
              )}
              <span className={cx('pill nu text-[12px] font-mono whitespace-nowrap', !isDualMonth && 'hidden sm:inline-flex')}>
                {draftDaysCount} {draftDaysCount === 1 ? 'day' : 'days'} selected
              </span>
            </div>

            {/* Right: Add Time toggle + Cancel + Apply */}
            <div
              className={cx(
                'flex items-center gap-2 shrink-0',
                isMobile && 'w-full justify-end'
              )}
            >
              {draftMode === 'single' && (
                <button
                  type="button"
                  onClick={() => setAddTimeOpen(!addTimeOpen)}
                  className={cx(
                    'h-[36px] px-3 rounded-lg border border-[var(--line)] text-[13px] font-medium flex items-center gap-1.5 cursor-pointer outline-none transition-colors',
                    addTimeOpen
                      ? 'bg-[#dbeafe] text-[#1d4ed8] border-[#93c5fd]'
                      : 'bg-white text-[var(--ink)] hover:bg-[#f5f4ef]'
                  )}
                >
                  <RiTimeLine className="size-4" />
                  <span>{addTimeOpen ? 'Time Added' : 'Add Time'}</span>
                </button>
              )}
              <Button
                variant="ghost"
                size="medium"
                onClick={handleCancel}
                className={cx(isMobile && 'flex-1')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="medium"
                onClick={handleApply}
                className={cx(isMobile && 'flex-1')}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
