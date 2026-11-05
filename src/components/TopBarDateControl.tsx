import React, { useState } from 'react';
import { CalendarDate } from '@internationalized/date';
import { RiArrowDownSLine, RiCalendarScheduleLine, RiCalendarLine } from '@remixicon/react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownGroup,
  DropdownItem,
  DropdownDivider,
} from '@/components/base/dropdown/dropdown';
import { DateRangePicker, DateRangeValue } from '@/components/base/date-picker/date-range-picker';
import { DatePicker } from '@/components/base/date-picker/date-picker';

type DateMode = 'range' | 'single' | 'schedule';

const MODE_LABELS: Record<DateMode, string> = {
  range: 'Date Range',
  single: 'Single Date',
  schedule: 'Schedule',
};

export const TopBarDateControl: React.FC = () => {
  const [mode, setMode] = useState<DateMode>('range');
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');

  // Default date states for November 5, 2026
  const [rangeValue, setRangeValue] = useState<DateRangeValue | null>({
    start: new CalendarDate(2026, 10, 7),
    end: new CalendarDate(2026, 11, 5),
  });

  const [singleValue, setSingleValue] = useState<CalendarDate | null>(
    new CalendarDate(2026, 11, 5)
  );

  return (
    <div className="flex items-center gap-2.5" id="dt-control">
      {/* Mode Dropdown */}
      <Dropdown isOpen={isModeOpen} onOpenChange={setIsModeOpen}>
        <DropdownTrigger className="h-[40px] px-3 rounded-[10px] border border-[var(--line)] bg-white text-[13px] font-medium text-[var(--ink)] flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#faf9f6] transition-colors cursor-pointer outline-none">
          <RiCalendarLine className="size-4 text-[var(--mute)]" aria-hidden />
          <span className="text-[var(--mute)]">Mode:</span>
          <span>{MODE_LABELS[mode]}</span>
          <RiArrowDownSLine className="size-4 text-[var(--mute)]" aria-hidden />
        </DropdownTrigger>
        <DropdownPopover
          aria-label="Select date mode"
          className="z-[110] w-[180px] rounded-[14px] border border-[var(--line)] bg-white p-1.5 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12)]"
        >
          <DropdownGroup label="View Mode">
            <DropdownItem
              selected={mode === 'range'}
              onSelect={() => {
                setMode('range');
                setIsModeOpen(false);
              }}
              className="rounded-[8px] px-2.5 py-1.5 text-[13px]"
            >
              Date Range
            </DropdownItem>
            <DropdownItem
              selected={mode === 'single'}
              onSelect={() => {
                setMode('single');
                setIsModeOpen(false);
              }}
              className="rounded-[8px] px-2.5 py-1.5 text-[13px]"
            >
              Single Date
            </DropdownItem>
            <DropdownItem
              selected={mode === 'schedule'}
              onSelect={() => {
                setMode('schedule');
                setIsModeOpen(false);
              }}
              className="rounded-[8px] px-2.5 py-1.5 text-[13px]"
            >
              Schedule
            </DropdownItem>
          </DropdownGroup>
        </DropdownPopover>
      </Dropdown>

      {/* Mode View: DateRangePicker / DatePicker / Schedule Panel */}
      {mode === 'range' && (
        <DateRangePicker
          value={rangeValue}
          onChange={setRangeValue}
          className="!h-[40px] !rounded-[10px] !border-[var(--line)] !bg-white !px-3 text-[13px] font-medium text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:!bg-[#faf9f6]"
        />
      )}

      {mode === 'single' && (
        <DatePicker
          value={singleValue}
          onChange={setSingleValue}
          className="!h-[40px] !rounded-[10px] !border-[var(--line)] !bg-white !px-3 text-[13px] font-medium text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:!bg-[#faf9f6]"
        />
      )}

      {mode === 'schedule' && (
        <Dropdown isOpen={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DropdownTrigger className="h-[40px] px-3 rounded-[10px] border border-[var(--line)] bg-white text-[13px] font-medium text-[var(--ink)] flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#faf9f6] transition-colors cursor-pointer outline-none">
            <RiCalendarScheduleLine className="size-4 text-[var(--mute)]" aria-hidden />
            <span>Schedule: {scheduleFreq}</span>
            <span className="pill up" style={{ fontSize: '11px', padding: '1px 6px' }}>
              Active
            </span>
          </DropdownTrigger>
          <DropdownPopover
            aria-label="Schedule settings"
            className="z-[110] w-[240px] rounded-[14px] border border-[var(--line)] bg-white p-2.5 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12)]"
          >
            <DropdownGroup label="Frequency">
              <DropdownItem
                selected={scheduleFreq === 'Daily'}
                onSelect={() => {
                  setScheduleFreq('Daily');
                  setIsScheduleOpen(false);
                }}
                className="rounded-[8px] px-2.5 py-1.5 text-[13px]"
              >
                Daily (09:00 IST)
              </DropdownItem>
              <DropdownItem
                selected={scheduleFreq === 'Weekly'}
                onSelect={() => {
                  setScheduleFreq('Weekly');
                  setIsScheduleOpen(false);
                }}
                className="rounded-[8px] px-2.5 py-1.5 text-[13px]"
              >
                Weekly (Every Mon)
              </DropdownItem>
              <DropdownItem
                selected={scheduleFreq === 'Monthly'}
                onSelect={() => {
                  setScheduleFreq('Monthly');
                  setIsScheduleOpen(false);
                }}
                className="rounded-[8px] px-2.5 py-1.5 text-[13px]"
              >
                Monthly (1st of month)
              </DropdownItem>
            </DropdownGroup>
            <DropdownDivider />
            <div className="px-2 py-1 text-[11.5px] text-[var(--mute)]">
              Next digest: Mon, Nov 9 • Asia/Kolkata
            </div>
          </DropdownPopover>
        </Dropdown>
      )}
    </div>
  );
};
