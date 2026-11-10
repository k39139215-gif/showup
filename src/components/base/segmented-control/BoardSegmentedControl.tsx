import React from 'react';
import { SegmentedControl, SegmentedControlItem } from './segmented-control';
import { cx } from '@/utils/cx';

export interface BoardSegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
}

export interface BoardSegmentedControlProps<T extends string = string> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: BoardSegmentedOption<T>[];
  className?: string;
  'aria-label'?: string;
}

export function BoardSegmentedControl<T extends string = string>({
  id,
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
}: BoardSegmentedControlProps<T>) {
  return (
    <div id={id} className={cx('inline-flex', className)}>
      <SegmentedControl
        aria-label={ariaLabel}
        selectedKeys={new Set([value])}
        onSelectionChange={(keys) => {
          const first = Array.from(keys)[0];
          if (first !== undefined && first !== null) {
            onChange(String(first) as T);
          }
        }}
        className="h-[34px] p-[3px] bg-[var(--tray)] rounded-[10px] border border-[var(--line)] inline-flex items-center gap-1 box-border"
      >
        {options.map((opt) => (
          <SegmentedControlItem
            key={opt.value}
            id={opt.value}
            data-n={opt.value}
            data-p={opt.value}
            data-m={opt.value}
            className={cx(
              'h-[26px] px-3 rounded-[7px] text-[12px] font-medium flex items-center justify-center transition-all cursor-pointer select-none border-0 outline-none',
              opt.value === value
                ? 'bg-white text-[var(--ink)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)] on'
                : 'text-[var(--mute)] hover:text-[var(--ink)] bg-transparent'
            )}
          >
            {opt.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </div>
  );
}
