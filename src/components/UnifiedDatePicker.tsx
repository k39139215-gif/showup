import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CalendarDate } from '@internationalized/date';
import {
  RiCalendarLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiTimeLine,
  RiCheckLine,
  RiCloseLine,
} from '@remixicon/react';
import { useDateRangeStore, ScheduledAt } from '../store/dateStore';
import {
  daysInRange,
  swapIfReversed,
  calendarDateToJsDate,
  jsDateToCalendarDate,
  convertSlotTimezone,
  TIMEZONE_OPTIONS,
} from '../utils/dateMath';
import { TODAY } from '../data';
import { SelectDropdown } from './base/dropdown/SelectDropdown';
import { cx } from '../utils/cx';

const TODAY_CALENDAR = new CalendarDate(2026, 11, 5); // Fixed app base: Nov 5, 2026

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
    setMode,
    setScheduledAt,
  } = useDateRangeStore();

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Draft state inside popover
  const [draftMode, setDraftMode] = useState<'single' | 'range'>(mode);
  const [draftStart, setDraftStart] = useState<CalendarDate>(start);
  const [draftEnd, setDraftEnd] = useState<CalendarDate>(end);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [hoverDate, setHoverDate] = useState<CalendarDate | null>(null);

  // Month navigation (offset 0 = month of start/end, dual-month has month 0 and month 1)
  const [visibleMonth, setVisibleMonth] = useState<CalendarDate>(new CalendarDate(start.year, start.month, 1));

  // Time slots sidebar
  const [addTimeOpen, setAddTimeOpen] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('Asia/Kolkata');
  const [is24Hour, setIs24Hour] = useState(false);
  const [selectedSlotMinutes, setSelectedSlotMinutes] = useState<number>(scheduledAt?.minutes ?? 540); // 09:00

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
      setStartInputText(`${String(start.day).padStart(2, '0')}/${String(start.month).padStart(2, '0')}/${start.year}`);
      setEndInputText(`${String(end.day).padStart(2, '0')}/${String(end.month).padStart(2, '0')}/${end.year}`);
      setAddTimeOpen(Boolean(scheduledAt));
      if (scheduledAt) {
        setSelectedTimezone(scheduledAt.timeZone);
        setSelectedSlotMinutes(scheduledAt.minutes);
      }
    }
  }, [isOpen, mode, start, end, scheduledAt]);

  // Keep manual text inputs in sync with draft dates
  useEffect(() => {
    setStartInputText(`${String(draftStart.day).padStart(2, '0')}/${String(draftStart.month).padStart(2, '0')}/${draftStart.year}`);
    setEndInputText(`${String(draftEnd.day).padStart(2, '0')}/${String(draftEnd.month).padStart(2, '0')}/${draftEnd.year}`);
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
      setStartInputText(`${String(draftStart.day).padStart(2, '0')}/${String(draftStart.month).padStart(2, '0')}/${draftStart.year}`);
    } else {
      setEndInputText(`${String(draftEnd.day).padStart(2, '0')}/${String(draftEnd.month).padStart(2, '0')}/${draftEnd.year}`);
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
    const dayOfWeek = (jsFirst.getDay() + 6) % 7; // Monday = 0

    // Number of days in month
    const jsNextMonth = new Date(year, month, 0);
    const totalDays = jsNextMonth.getDate();

    const cells: React.ReactNode[] = [];
    // Empty prefix cells
    for (let i = 0; i < dayOfWeek; i++) {
      cells.push(<div key={`empty-${i}`} className="size-8" />);
    }

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const cellDate = new CalendarDate(year, month, dayNum);
      const isFuture = cellDate.compare(TODAY_CALENDAR) > 0;
      const isStart = cellDate.compare(activeEffectiveRange.start) === 0;
      const isEnd = cellDate.compare(activeEffectiveRange.end) === 0;
      const isInRange =
        cellDate.compare(activeEffectiveRange.start) >= 0 && cellDate.compare(activeEffectiveRange.end) <= 0;
      const isEdge = isStart || isEnd;
      const isSingleDay = activeEffectiveRange.start.compare(activeEffectiveRange.end) === 0;

      cells.push(
        <div
          key={`day-${dayNum}`}
          className="relative size-8 flex items-center justify-center select-none"
          onMouseEnter={() => {
            if (pickingEnd && !isFuture) setHoverDate(cellDate);
          }}
        >
          {/* Light blue range connector */}
          {isInRange && !isSingleDay && draftMode === 'range' && (
            <span
              aria-hidden
              className={cx(
                'absolute inset-y-0 bg-[#dbeafe] z-0 transition-[border-radius] duration-100',
                isStart ? 'start-1/2 rounded-s-lg' : 'start-0',
                isEnd ? 'end-1/2 rounded-e-lg' : 'end-0'
              )}
            />
          )}

          {/* Cell button */}
          <button
            type="button"
            disabled={isFuture}
            onClick={() => handleDayClick(cellDate)}
            className={cx(
              'day-cell relative z-10 size-8 flex items-center justify-center rounded-lg text-[13px] font-medium outline-none transition-colors border-0',
              isFuture && 'opacity-25 cursor-not-allowed text-[#a9a69d]',
              !isFuture && !isInRange && 'hover:bg-[#f5f4ef] text-[var(--ink)] cursor-pointer',
              !isFuture && isInRange && !isEdge && 'text-[#1c1b18] cursor-pointer',
              isEdge && '!bg-[#2563eb] !text-white font-semibold cursor-pointer shadow-sm',
              isStart && !isSingleDay && 'rounded-s-lg',
              isEnd && !isSingleDay && 'rounded-e-lg',
              'focus-visible:ring-2 focus-visible:ring-[#2563eb]'
            )}
          >
            {dayNum}
          </button>
        </div>
      );
    }

    return cells;
  };

  const monthsTitle = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="relative inline-block" id="unified-date-picker">
      {/* Top Bar Single Date Trigger */}
      <button
        ref={triggerRef}
        type="button"
        id="dt"
        onClick={() => setIsOpen(!isOpen)}
        className={cx(
          'h-[40px] px-3.5 rounded-xl border border-[var(--line)] bg-white text-[13px] font-medium text-[var(--ink)]',
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
            'boardui-calendar-popover absolute z-[130] bg-white border border-[var(--line)] shadow-[var(--shadow-dropdown)] outline-none',
            // Desktop: anchored popover
            'top-full mt-2 right-0 rounded-2xl flex flex-col overflow-hidden',
            // Mobile: bottom sheet
            'max-[640px]:!fixed max-[640px]:!inset-x-0 max-[640px]:!bottom-0 max-[640px]:!top-auto max-[640px]:!mt-0 max-[640px]:!rounded-t-2xl max-[640px]:!rounded-b-none max-[640px]:max-h-[90vh]'
          )}
          style={{
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          {/* Top Row inside Popover: Segmented Control [ Single | Range ] */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[#fbfbfa]">
            <div className="seg" id="cal-mode-seg">
              <button
                type="button"
                className={cx(draftMode === 'single' ? 'on' : undefined)}
                onClick={() => {
                  setDraftMode('single');
                  setDraftEnd(draftStart);
                  setPickingEnd(false);
                }}
              >
                Single
              </button>
              <button
                type="button"
                className={cx(draftMode === 'range' ? 'on' : undefined)}
                onClick={() => {
                  setDraftMode('range');
                  if (draftStart.compare(draftEnd) === 0) {
                    setDraftEnd(draftStart.add({ days: 6 }));
                  }
                }}
              >
                Range
              </button>
            </div>
            <button
              type="button"
              className="size-8 rounded-lg flex items-center justify-center text-[var(--mute)] hover:bg-[#f5f4ef] border-0 cursor-pointer"
              onClick={handleCancel}
              aria-label="Close"
            >
              <RiCloseLine className="size-5" />
            </button>
          </div>

          {/* Main Body: Presets Left Column + Center Calendar + Optional Time Sidebar */}
          <div className="flex flex-row max-[640px]:flex-col flex-1 overflow-hidden">
            {/* Left Column: Problem 3B Presets */}
            <div
              className={cx(
                'w-[168px] shrink-0 border-r border-[var(--line)] p-2 flex flex-col overflow-y-auto',
                'max-[640px]:w-full max-[640px]:border-r-0 max-[640px]:border-b max-[640px]:flex-row max-[640px]:overflow-x-auto max-[640px]:gap-1'
              )}
              style={{ maxHeight: '360px' }}
              role="listbox"
              aria-label="Date presets"
            >
              <div className="hidden sm:block px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--mute)] select-none">
                QUICK SELECT
              </div>
              {PRESETS.map((preset, idx) => {
                const isSelected = activePresetId === preset.id;
                const isAllTime = preset.id === 'allTime';
                return (
                  <React.Fragment key={preset.id}>
                    {isAllTime && (
                      <div className="my-1.5 border-t border-[var(--line)] max-[640px]:hidden" />
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
                        'max-[640px]:shrink-0 max-[640px]:rounded-full max-[640px]:px-3 max-[640px]:h-[30px]',
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

            {/* Center: Dual-Month Calendar */}
            <div className="flex flex-col p-4 overflow-y-auto">
              <div className="flex items-center gap-6 max-[640px]:flex-col">
                {/* Month 1 */}
                <div className="w-[240px]">
                  <div className="flex items-center justify-between pb-3">
                    <button
                      type="button"
                      className="size-7 rounded-lg flex items-center justify-center text-[var(--mute)] hover:bg-[#f5f4ef] border-0 cursor-pointer"
                      onClick={() => setVisibleMonth(visibleMonth.subtract({ months: 1 }))}
                      aria-label="Previous month"
                    >
                      <RiArrowLeftSLine className="size-5" />
                    </button>
                    <span className="font-semibold text-[13.5px] text-[var(--ink)]">
                      {monthsTitle[visibleMonth.month - 1]} {visibleMonth.year}
                    </span>
                    <div className="size-7 sm:invisible">
                      <button
                        type="button"
                        className="size-7 rounded-lg flex items-center justify-center text-[var(--mute)] hover:bg-[#f5f4ef] border-0 cursor-pointer sm:hidden"
                        onClick={() => setVisibleMonth(visibleMonth.add({ months: 1 }))}
                        aria-label="Next month"
                      >
                        <RiArrowRightSLine className="size-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold text-[var(--mute)] pb-1">
                    <span>MO</span>
                    <span>TU</span>
                    <span>WE</span>
                    <span>TH</span>
                    <span>FR</span>
                    <span>SA</span>
                    <span>SU</span>
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                    {renderMonthDays(visibleMonth)}
                  </div>
                </div>

                {/* Month 2 (Desktop dual view) */}
                <div className="w-[240px] hidden sm:block">
                  <div className="flex items-center justify-between pb-3">
                    <div className="size-7 invisible" />
                    <span className="font-semibold text-[13.5px] text-[var(--ink)]">
                      {monthsTitle[nextMonth.month - 1]} {nextMonth.year}
                    </span>
                    <button
                      type="button"
                      className="size-7 rounded-lg flex items-center justify-center text-[var(--mute)] hover:bg-[#f5f4ef] border-0 cursor-pointer"
                      onClick={() => setVisibleMonth(visibleMonth.add({ months: 1 }))}
                      aria-label="Next month"
                    >
                      <RiArrowRightSLine className="size-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold text-[var(--mute)] pb-1">
                    <span>MO</span>
                    <span>TU</span>
                    <span>WE</span>
                    <span>TH</span>
                    <span>FR</span>
                    <span>SA</span>
                    <span>SU</span>
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                    {renderMonthDays(nextMonth)}
                  </div>
                </div>
              </div>
            </div>

            {/* Time Slots Sidebar (Single mode + Add Time toggled ON) */}
            {draftMode === 'single' && addTimeOpen && (
              <div className="w-[220px] shrink-0 border-l border-[var(--line)] p-3 flex flex-col bg-[#fbfbfa]">
                <div className="font-semibold text-[13px] text-[var(--ink)] pb-2">Schedule Time</div>
                <div className="mb-2">
                  <SelectDropdown
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

          {/* Footer: Date inputs + Days Selected pill + Add Time Toggle + Cancel / Apply */}
          <div className="flex items-center justify-between p-3.5 border-t border-[var(--line)] bg-[#fbfbfa] flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={startInputText}
                onChange={(e) => setStartInputText(e.target.value)}
                onBlur={(e) => handleDateInputCommit(true, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDateInputCommit(true, startInputText);
                }}
                className="w-[96px] h-[34px] px-2 rounded-lg border border-[var(--line)] bg-white text-[12.5px] font-mono text-[var(--ink)] text-center outline-none focus:border-[#2563eb]"
                placeholder="DD/MM/YYYY"
              />
              {draftMode === 'range' && (
                <>
                  <span className="text-[var(--mute)] font-mono text-[12px]">-</span>
                  <input
                    type="text"
                    value={endInputText}
                    onChange={(e) => setEndInputText(e.target.value)}
                    onBlur={(e) => handleDateInputCommit(false, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleDateInputCommit(false, endInputText);
                    }}
                    className="w-[96px] h-[34px] px-2 rounded-lg border border-[var(--line)] bg-white text-[12.5px] font-mono text-[var(--ink)] text-center outline-none focus:border-[#2563eb]"
                    placeholder="DD/MM/YYYY"
                  />
                </>
              )}
              <span className="pill nu text-[11.5px] font-mono">
                {draftDaysCount} {draftDaysCount === 1 ? 'day' : 'days'} selected
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {draftMode === 'single' && (
                <button
                  type="button"
                  onClick={() => setAddTimeOpen(!addTimeOpen)}
                  className={cx(
                    'h-[34px] px-2.5 rounded-lg border border-[var(--line)] text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer outline-none transition-colors',
                    addTimeOpen ? 'bg-[#dbeafe] text-[#1d4ed8] border-[#93c5fd]' : 'bg-white text-[var(--ink)] hover:bg-[#f5f4ef]'
                  )}
                >
                  <RiTimeLine className="size-4" />
                  <span>{addTimeOpen ? 'Time Added' : 'Add Time'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                className="h-[34px] px-3 rounded-lg text-[13px] font-medium text-[var(--mute)] hover:bg-[#f0efeb] border-0 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="h-[34px] px-4 rounded-lg bg-[#161616] text-white text-[13px] font-medium hover:bg-[#2e2e2e] border-0 cursor-pointer transition-colors shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
