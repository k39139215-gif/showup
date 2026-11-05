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
        className="h-[40px] items-center p-1 bg-[var(--tray)] rounded-xl border border-[var(--line)] box-border"
      >
        {options.map((opt) => (
          <SegmentedControlItem
            key={opt.value}
            id={opt.value}
            data-n={opt.value}
            data-p={opt.value}
            data-m={opt.value}
            className={cx(
              'h-[32px] px-3 rounded-lg text-[13px] font-medium transition-colors cursor-pointer select-none',
              opt.value === value
                ? 'bg-white text-[var(--ink)] font-semibold shadow-xs on'
                : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
            )}
          >
            {opt.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </div>
  );
}
