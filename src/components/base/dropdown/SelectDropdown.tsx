import React, { useState, useRef, useEffect } from 'react';
import { RiArrowDownSLine, RiCheckLine } from '@remixicon/react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownGroup,
  DropdownItem,
} from './dropdown';
import { cx } from '@/utils/cx';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SelectDropdownProps<T extends string = string> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  fixedWidth?: boolean | string;
  'aria-label'?: string;
}

export function SelectDropdown<T extends string = string>({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className,
  triggerClassName,
  fixedWidth,
  'aria-label': ariaLabel,
}: SelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [minPopoverWidth, setMinPopoverWidth] = useState<number | undefined>(undefined);

  const selectedOption = options.find((o) => o.value === value);

  // Sync popover min-width to trigger width
  useEffect(() => {
    if (triggerRef.current) {
      setMinPopoverWidth(triggerRef.current.offsetWidth);
    }
  }, [isOpen]);

  const isFixed = Boolean(fixedWidth);
  const widthClass = typeof fixedWidth === 'string' ? fixedWidth : isFixed ? 'w-[180px]' : '';

  return (
    <div className={cx('inline-block', className)}>
      <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
        <DropdownTrigger
          id={id}
          ref={triggerRef as any}
          aria-label={ariaLabel || selectedOption?.label || placeholder}
          className={cx(
            'h-[40px] rounded-xl border border-[var(--line)] bg-white text-[13px] font-medium text-[var(--ink)]',
            'inline-flex items-center cursor-pointer transition-colors hover:bg-[#faf9f6] outline-none',
            'box-border shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
            isFixed ? 'w-full justify-between px-3' : 'px-3 gap-2',
            widthClass,
            triggerClassName
          )}
        >
          <div className="inline-flex items-center gap-2 overflow-hidden text-left">
            {selectedOption?.icon && (
              <span className="inline-flex items-center shrink-0">{selectedOption.icon}</span>
            )}
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <RiArrowDownSLine
            className={cx(
              'size-4 text-[var(--mute)] shrink-0 transition-transform duration-150',
              isFixed && 'ml-auto',
              isOpen && 'rotate-180'
            )}
            aria-hidden
          />
        </DropdownTrigger>

        <DropdownPopover
          aria-label={ariaLabel || 'Options menu'}
          style={{ minWidth: minPopoverWidth ? `${minPopoverWidth}px` : undefined }}
          className="boardui-dropdown-popover z-[120] rounded-xl border border-[var(--line)] bg-white p-1.5 shadow-[var(--shadow-dropdown)] outline-none"
        >
          <DropdownGroup>
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <DropdownItem
                  key={opt.value}
                  selected={isSelected}
                  onSelect={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cx(
                    'h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
                    'inline-flex items-center justify-between gap-2 border-0 shadow-none outline-none',
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
                </DropdownItem>
              );
            })}
          </DropdownGroup>
        </DropdownPopover>
      </Dropdown>
    </div>
  );
}
