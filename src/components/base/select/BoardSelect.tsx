import React from 'react';
import { Select, SelectItem } from './select';
import { RiCheckLine } from '@remixicon/react';
import { cx } from '@/utils/cx';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface BoardSelectProps<T extends string = string> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  fixedWidth?: boolean | string;
  'aria-label'?: string;
  size?: 'sm' | 'md';
}

export function BoardSelect<T extends string = string>({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className,
  triggerClassName,
  fixedWidth,
  'aria-label': ariaLabel,
  size = 'md',
}: BoardSelectProps<T>) {
  const isFixed = Boolean(fixedWidth);
  const widthClass = typeof fixedWidth === 'string' ? fixedWidth : isFixed ? 'w-[180px]' : '';
  const selectedOption = options.find((o) => o.value === value);

  return (
    <Select
      triggerId={id}
      aria-label={ariaLabel || selectedOption?.label || placeholder}
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null && key !== undefined) {
          onChange(String(key) as T);
        }
      }}
      size={size}
      className={cx('inline-block', className)}
      triggerClassName={cx(
        'h-[34px] rounded-lg border border-[var(--line)] bg-white text-[12.5px] font-medium text-[var(--ink)]',
        'inline-flex items-center cursor-pointer transition-colors hover:bg-[#faf9f6] outline-none',
        'box-border shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        isFixed ? 'w-full justify-between px-3' : 'px-3 gap-2',
        widthClass,
        triggerClassName
      )}
      popoverClassName="boardui-dropdown-popover z-[120] rounded-xl border border-[var(--line)] bg-white p-1.5 shadow-[var(--shadow-dropdown)] outline-none min-w-[180px]"
      renderValue={() => (
        <div className="inline-flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="inline-flex items-center shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <SelectItem
            key={opt.value}
            id={opt.value}
            textValue={opt.label}
            className={cx(
              'h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
              'flex items-center justify-between gap-2 border-0 shadow-none outline-none',
              isSelected
                ? 'bg-[#f0efeb] text-[var(--ink)] font-semibold'
                : 'bg-transparent text-[var(--ink)] hover:bg-[#f5f4ef]'
            )}
          >
            <div className="inline-flex items-center gap-2 truncate">
              {opt.icon && <span className="inline-flex items-center shrink-0">{opt.icon}</span>}
              <span className="truncate">{opt.label}</span>
            </div>
            {isSelected && (
              <RiCheckLine className="size-4 text-[var(--ink)] shrink-0 ml-auto pr-3" aria-hidden />
            )}
          </SelectItem>
        );
      })}
    </Select>
  );
}
