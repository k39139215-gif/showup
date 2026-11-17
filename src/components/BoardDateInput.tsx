import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  RiCalendarLine,
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from '@remixicon/react';

interface BoardDateInputProps {
  id?: string;
  value: string; // YYYY-MM-DD format
  onChange: (dateStr: string) => void;
  className?: string;
  placeholder?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const BoardDateInput: React.FC<BoardDateInputProps> = ({
  id,
  value,
  onChange,
  className = '',
  placeholder = 'Select date',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse initial value (YYYY-MM-DD)
  const parseDateString = (str: string): { year: number; month: number; day: number } => {
    if (!str) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
    }
    const parts = str.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return { year: parts[0], month: parts[1] - 1, day: parts[2] };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  };

  const parsed = parseDateString(value);
  const [viewYear, setViewYear] = useState<number>(parsed.year);
  const [viewMonth, setViewMonth] = useState<number>(parsed.month); // 0-indexed

  // Keep view in sync when value changes externally
  useEffect(() => {
    const p = parseDateString(value);
    setViewYear(p.year);
    setViewMonth(p.month);
  }, [value]);

  // Position calculation for portal
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 280 });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 280;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(12, left),
        width: rect.width,
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

  // Outside click handler
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!isOpen) return;
      if (
        triggerRef.current && triggerRef.current.contains(e.target as Node)
      ) {
        return;
      }
      if (
        popoverRef.current && popoverRef.current.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [isOpen]);

  // Calendar math
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const totalDays = daysInMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const newStr = `${viewYear}-${mm}-${dd}`;
    onChange(newStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const newStr = `${now.getFullYear()}-${mm}-${dd}`;
    onChange(newStr);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  // Format trigger label (e.g. "17 Nov 2026")
  const getDisplayLabel = () => {
    if (!value) return placeholder;
    const p = parseDateString(value);
    const d = new Date(p.year, p.month, p.day);
    if (isNaN(d.getTime())) return value;
    const now = new Date();
    const isToday =
      now.getFullYear() === p.year &&
      now.getMonth() === p.month &&
      now.getDate() === p.day;

    const formatted = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return isToday ? `${formatted} (Today)` : formatted;
  };

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

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
        className="w-full h-[40px] px-3 rounded-[10px] border border-[var(--line)] text-[13px] bg-white text-[var(--ink)] flex items-center justify-between hover:bg-[#faf9f6] transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none focus:border-[#18181b]"
      >
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <RiCalendarLine className="size-4 text-[var(--mute)] shrink-0" />
          <span className="font-medium text-[var(--ink)]">{getDisplayLabel()}</span>
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
            className="w-[280px] bg-white rounded-[14px] border border-[var(--line)] p-3 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.14)] select-none animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header: Month Year + Prev / Next */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
              <span className="text-[13px] font-semibold text-[var(--ink)]">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="size-7 rounded-lg flex items-center justify-center hover:bg-[#f2f1ed] text-[var(--ink)] transition-colors cursor-pointer border-0 outline-none"
                  aria-label="Previous month"
                >
                  <RiArrowLeftSLine className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="size-7 rounded-lg flex items-center justify-center hover:bg-[#f2f1ed] text-[var(--ink)] transition-colors cursor-pointer border-0 outline-none"
                  aria-label="Next month"
                >
                  <RiArrowRightSLine className="size-4" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-[11px] font-medium text-[var(--mute)] h-6 flex items-center justify-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading padding */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="size-8" />
              ))}

              {/* Day cells */}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const isSelected =
                  parsed.year === viewYear &&
                  parsed.month === viewMonth &&
                  parsed.day === day;
                const isToday =
                  todayYear === viewYear &&
                  todayMonth === viewMonth &&
                  todayDay === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`size-8 rounded-[8px] text-[12px] flex items-center justify-center transition-all cursor-pointer border-0 outline-none ${
                      isSelected
                        ? 'bg-[#18181b] text-white font-semibold shadow-sm'
                        : isToday
                        ? 'bg-[#f4f3ef] text-[var(--ink)] font-bold border border-[var(--line)]'
                        : 'text-[var(--ink)] hover:bg-[#f4f3ef]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-[12px] font-medium text-[#2563eb] hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[12px] text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-0 outline-none"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
