import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  RiTimeLine,
  RiArrowDownSLine,
} from '@remixicon/react';

interface BoardTimeInputProps {
  id?: string;
  value: string; // HH:mm (24-hour format)
  onChange: (timeStr: string) => void;
  className?: string;
  placeholder?: string;
}

const COMMON_PRESETS = [
  { label: 'Morning (09:00)', time: '09:00' },
  { label: 'Noon (12:00)', time: '12:00' },
  { label: 'Afternoon (15:00)', time: '15:00' },
  { label: 'Evening (18:00)', time: '18:00' },
  { label: 'Night (20:30)', time: '20:30' },
  { label: 'Late (22:00)', time: '22:00' },
];

export const BoardTimeInput: React.FC<BoardTimeInputProps> = ({
  id,
  value,
  onChange,
  className = '',
  placeholder = 'Select time',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Mode: 24h vs 12h
  const [is24Hour, setIs24Hour] = useState(true);

  // Parse HH:mm
  const parseTime = (str: string): { hour: number; minute: number } => {
    if (!str) {
      const now = new Date();
      return { hour: now.getHours(), minute: now.getMinutes() };
    }
    const parts = str.split(':').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { hour: Math.min(23, Math.max(0, parts[0])), minute: Math.min(59, Math.max(0, parts[1])) };
    }
    const now = new Date();
    return { hour: now.getHours(), minute: now.getMinutes() };
  };

  const parsed = parseTime(value);

  // Position calculation for portal
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 260;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(12, left),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  // Outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!isOpen) return;
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) {
        return;
      }
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [isOpen]);

  const setHour = (newHour: number) => {
    const hh = String(newHour).padStart(2, '0');
    const mm = String(parsed.minute).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  const setMinute = (newMinute: number) => {
    const hh = String(parsed.hour).padStart(2, '0');
    const mm = String(newMinute).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  const handleSetNow = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    onChange(`${hh}:${mm}`);
    setIsOpen(false);
  };

  // Display formatting
  const getDisplayTime = () => {
    if (!value) return placeholder;
    const { hour, minute } = parseTime(value);
    const mm = String(minute).padStart(2, '0');
    if (is24Hour) {
      return `${String(hour).padStart(2, '0')}:${mm}`;
    }
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(h12).padStart(2, '0')}:${mm} ${period}`;
  };

  // 12-hour calculation helpers
  const currentPeriod = parsed.hour >= 12 ? 'PM' : 'AM';
  const current12Hour = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;

  const handle12HourSelect = (h: number) => {
    let next24 = h;
    if (currentPeriod === 'PM' && h < 12) next24 = h + 12;
    if (currentPeriod === 'AM' && h === 12) next24 = 0;
    setHour(next24);
  };

  const handlePeriodToggle = (period: 'AM' | 'PM') => {
    if (period === 'AM' && parsed.hour >= 12) {
      setHour(parsed.hour - 12);
    } else if (period === 'PM' && parsed.hour < 12) {
      setHour(parsed.hour + 12);
    }
  };

  // Minutes list in 5-min intervals
  const minuteList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => {
          updatePosition();
          setIsOpen(!isOpen);
        }}
        className="w-full h-[40px] px-3 rounded-[10px] border border-[var(--line)] text-[13px] font-mono bg-white text-[var(--ink)] flex items-center justify-between hover:bg-[#faf9f6] transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none focus:border-[#18181b]"
      >
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <RiTimeLine className="size-4 text-[var(--mute)] shrink-0" />
          <span className="font-medium text-[var(--ink)]">{getDisplayTime()}</span>
        </div>
        <RiArrowDownSLine className={`size-4 text-[var(--mute)] shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            className="w-[260px] bg-white rounded-[14px] border border-[var(--line)] p-3 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.14)] select-none animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Top Bar: Title + 12h/24h toggle */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
              <span className="text-[13px] font-semibold text-[var(--ink)]">Select Time</span>
              <div className="flex items-center bg-[#f4f3ef] p-0.5 rounded-lg border border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setIs24Hour(false)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-[6px] transition-all cursor-pointer border-0 outline-none ${
                    !is24Hour ? 'bg-white text-[var(--ink)] shadow-xs font-semibold' : 'text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                >
                  12h
                </button>
                <button
                  type="button"
                  onClick={() => setIs24Hour(true)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-[6px] transition-all cursor-pointer border-0 outline-none ${
                    is24Hour ? 'bg-white text-[var(--ink)] shadow-xs font-semibold' : 'text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                >
                  24h
                </button>
              </div>
            </div>

            {/* If 12h mode: AM/PM segmented pills */}
            {!is24Hour && (
              <div className="grid grid-cols-2 gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => handlePeriodToggle('AM')}
                  className={`h-7 text-[12px] font-medium rounded-lg border transition-all cursor-pointer outline-none ${
                    currentPeriod === 'AM'
                      ? 'bg-[#18181b] text-white border-[#18181b]'
                      : 'bg-white text-[var(--ink)] border-[var(--line)] hover:bg-[#f4f3ef]'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodToggle('PM')}
                  className={`h-7 text-[12px] font-medium rounded-lg border transition-all cursor-pointer outline-none ${
                    currentPeriod === 'PM'
                      ? 'bg-[#18181b] text-white border-[#18181b]'
                      : 'bg-white text-[var(--ink)] border-[var(--line)] hover:bg-[#f4f3ef]'
                  }`}
                >
                  PM
                </button>
              </div>
            )}

            {/* Scrollable Column Pickers: Hours & Minutes */}
            <div className="grid grid-cols-2 gap-2 pb-2">
              {/* Hours Column */}
              <div>
                <div className="text-[11px] font-medium text-[var(--mute)] text-center mb-1">
                  Hour
                </div>
                <div className="h-[160px] overflow-y-auto rounded-lg border border-[var(--line)] bg-[#fbfbfa] p-1 flex flex-col gap-1">
                  {(is24Hour
                    ? Array.from({ length: 24 }, (_, i) => i)
                    : Array.from({ length: 12 }, (_, i) => i + 1)
                  ).map((h) => {
                    const isSelected = is24Hour ? parsed.hour === h : current12Hour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => (is24Hour ? setHour(h) : handle12HourSelect(h))}
                        className={`w-full h-7 rounded-md text-[12px] font-mono flex items-center justify-center transition-all cursor-pointer border-0 outline-none ${
                          isSelected
                            ? 'bg-[#18181b] text-white font-semibold shadow-xs'
                            : 'text-[var(--ink)] hover:bg-[#ecebe6]'
                        }`}
                      >
                        {String(h).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes Column */}
              <div>
                <div className="text-[11px] font-medium text-[var(--mute)] text-center mb-1">
                  Minute
                </div>
                <div className="h-[160px] overflow-y-auto rounded-lg border border-[var(--line)] bg-[#fbfbfa] p-1 flex flex-col gap-1">
                  {minuteList.map((m) => {
                    const isSelected = parsed.minute === m || (parsed.minute >= m && parsed.minute < m + 5 && !minuteList.includes(parsed.minute));
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMinute(m)}
                        className={`w-full h-7 rounded-md text-[12px] font-mono flex items-center justify-center transition-all cursor-pointer border-0 outline-none ${
                          isSelected
                            ? 'bg-[#18181b] text-white font-semibold shadow-xs'
                            : 'text-[var(--ink)] hover:bg-[#ecebe6]'
                        }`}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={handleSetNow}
                className="text-[12px] font-medium text-[#2563eb] hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
              >
                Set to Now
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 text-[12px] font-medium bg-[#18181b] text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer border-0 outline-none"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
