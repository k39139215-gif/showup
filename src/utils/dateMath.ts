import { CalendarDate, getLocalTimeZone } from '@internationalized/date';

/** Convert CalendarDate to JavaScript Date at 00:00:00 local time */
export function calendarDateToJsDate(d: CalendarDate): Date {
  return new Date(d.year, d.month - 1, d.day, 0, 0, 0, 0);
}

/** Convert JavaScript Date to CalendarDate */
export function jsDateToCalendarDate(d: Date): CalendarDate {
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Format a Date to 'YYYY-MM-DD' in local timezone without UTC offset shift */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Inclusive day count between two CalendarDates */
export function daysInRange(start: CalendarDate, end: CalendarDate): number {
  const d1 = calendarDateToJsDate(start);
  const d2 = calendarDateToJsDate(end);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffMs / 86400000) + 1;
}

/** Compare two CalendarDates: negative if a < b, 0 if equal, positive if a > b */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a.compare(b);
}

/** Swaps start and end if start is after end */
export function swapIfReversed(start: CalendarDate, end: CalendarDate): { start: CalendarDate; end: CalendarDate } {
  if (start.compare(end) > 0) {
    return { start: end, end: start };
  }
  return { start, end };
}

/**
 * Calculates equal-length previous period immediately preceding start.
 * If range is [start, end] with N days, previous period is [start - N days, start - 1 day].
 */
export function getPreviousPeriod(start: CalendarDate, end: CalendarDate): {
  start: CalendarDate;
  end: CalendarDate;
  days: number;
} {
  const ordered = swapIfReversed(start, end);
  const count = daysInRange(ordered.start, ordered.end);
  const prevEnd = ordered.start.subtract({ days: 1 });
  const prevStart = ordered.start.subtract({ days: count });
  return { start: prevStart, end: prevEnd, days: count };
}

/**
 * Week boundaries for Monday through Sunday around a given CalendarDate
 */
export function getWeekBoundaries(d: CalendarDate): { start: CalendarDate; end: CalendarDate } {
  const jsDate = calendarDateToJsDate(d);
  const dayOfWeek = jsDate.getDay(); // 0 is Sunday, 1 is Monday, ...
  // In ISO weeks, Monday is day 1, Sunday is day 7
  const distToMonday = (dayOfWeek + 6) % 7;
  const monday = d.subtract({ days: distToMonday });
  const sunday = monday.add({ days: 6 });
  return { start: monday, end: sunday };
}

/**
 * Timezone slot conversion across date lines:
 * Slots are authored in Asia/Kolkata (+05:30).
 * minutes: 0 to 1410 (every 30 mins from 00:00 to 23:30).
 */
export function convertSlotTimezone(
  date: CalendarDate,
  minutesFromMidnightKolkata: number,
  targetTimeZone: string,
  is24Hour: boolean
): {
  timeString: string;
  displayDateString: string;
  isCrossDateLine: boolean;
  utcDate: Date;
} {
  const hours = Math.floor(minutesFromMidnightKolkata / 60);
  const mins = minutesFromMidnightKolkata % 60;

  // Asia/Kolkata is UTC+5:30.
  // Construct UTC timestamp corresponding to this local Kolkata time:
  // year-month-day hours:mins in UTC - 5h30m = UTC time
  const kolkataOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const utcEquivalentMs = Date.UTC(date.year, date.month - 1, date.day, hours, mins, 0, 0) - kolkataOffsetMs;
  const utcDate = new Date(utcEquivalentMs);

  // Format in target timezone
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTimeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: !is24Hour,
  });

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTimeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const formattedTime = timeFormatter.format(utcDate);
  const formattedDate = dateFormatter.format(utcDate);

  // Check if date changed relative to original date
  const [mStr, dStr, yStr] = formattedDate.split('/');
  const targetYear = parseInt(yStr, 10);
  const targetMonth = parseInt(mStr, 10);
  const targetDay = parseInt(dStr, 10);

  const isCrossDateLine =
    targetYear !== date.year || targetMonth !== date.month || targetDay !== date.day;

  return {
    timeString: formattedTime,
    displayDateString: `${targetDay}/${targetMonth}/${targetYear}`,
    isCrossDateLine,
    utcDate,
  };
}

/** Formats date trigger display text */
export function formatRangeDisplay(start: CalendarDate, end: CalendarDate, mode: 'single' | 'range'): string {
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (mode === 'single' || (start.year === end.year && start.month === end.month && start.day === end.day)) {
    return `${start.day} ${monthsShort[start.month - 1]} ${start.year}`;
  }
  if (start.year === end.year) {
    if (start.month === end.month) {
      return `${start.day} - ${end.day} ${monthsShort[end.month - 1]} ${end.year}`;
    }
    return `${start.day} ${monthsShort[start.month - 1]} - ${end.day} ${monthsShort[end.month - 1]} ${end.year}`;
  }
  return `${start.day} ${monthsShort[start.month - 1]} ${start.year} - ${end.day} ${monthsShort[end.month - 1]} ${end.year}`;
}

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, +05:30)' },
  { value: 'America/New_York', label: 'America/New_York (EST, -05:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT, +00:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, +09:00)' },
];

