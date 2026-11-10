import React, { useRef, useEffect, useState } from 'react';

export interface FilterGroupData {
  k: string;
  label: string;
  defaultOpen?: boolean;
  opts: string[];
  sel: string[];
}

export interface BoardUIFilterPanelProps {
  groups: FilterGroupData[];
  onToggleOption: (groupKey: string, option: string) => void;
  onClearAll: () => void;
  onClose?: () => void;
  className?: string;
  chipLabelFormatter?: (groupKey: string, option: string) => string;
}

export const BoardUIFilterPanel: React.FC<BoardUIFilterPanelProps> = ({
  groups,
  onToggleOption,
  onClearAll,
  onClose,
  className = '',
  chipLabelFormatter,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Group accordion open state
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    return groups.filter((g) => g.defaultOpen !== false).map((g) => g.k);
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Keyboard navigation matching BoardUI specification
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!panelRef.current) return;
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          '.bui-filter-gh, .bui-filter-group.open .bui-filter-opt'
        )
      );
      if (items.length === 0) return;

      const activeIdx = items.indexOf(document.activeElement as HTMLElement);
      if (activeIdx < 0 && !panelRef.current.contains(document.activeElement)) return;

      e.preventDefault();
      let nextIdx =
        e.key === 'ArrowDown'
          ? Math.min(items.length - 1, activeIdx + 1)
          : Math.max(0, activeIdx - 1);
      if (activeIdx < 0) nextIdx = 0;
      items[nextIdx]?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Aggregate selected chips
  const allChips = groups.flatMap((g) =>
    g.sel.map((opt) => ({
      groupKey: g.k,
      opt,
      label: chipLabelFormatter ? chipLabelFormatter(g.k, opt) : `${g.label}: ${opt}`,
    }))
  );

  return (
    <div
      ref={panelRef}
      className={`bui-filter-panel ${className}`}
      id="bui-filter-panel"
      role="region"
      aria-label="Filter Panel"
    >
      <div className="bui-filter-sheet">
        <div className="bui-filter-top">
          <strong>Filters</strong>
          <button
            type="button"
            className="bui-filter-clear"
            id="clear"
            onClick={onClearAll}
            hidden={allChips.length === 0}
          >
            Clear all
          </button>
        </div>

        <div className="bui-filter-chips" id="chips" aria-live="polite">
          {allChips.length > 0 ? (
            allChips.map((c) => (
              <span key={`${c.groupKey}-${c.opt}`} className="bui-filter-chip">
                {c.label}
                <button
                  type="button"
                  aria-label={`Remove ${c.label}`}
                  onClick={() => onToggleOption(c.groupKey, c.opt)}
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      stroke="currentColor"
                      fill="none"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </span>
            ))
          ) : (
            <span className="bui-filter-empty">No filters applied</span>
          )}
        </div>

        <div id="groups">
          {groups.map((g) => {
            const isOpen = openGroups.includes(g.k);
            return (
              <div
                key={g.k}
                className={`bui-filter-group ${isOpen ? 'open' : ''}`}
                data-g={g.k}
              >
                <button
                  type="button"
                  className="bui-filter-gh"
                  aria-expanded={isOpen}
                  onClick={() => toggleGroup(g.k)}
                >
                  <svg className="chev" viewBox="0 0 24 24">
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      fill="none"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <b>{g.label}</b>
                  <span className="n">{g.opts.length}</span>
                  {g.sel.length > 0 && (
                    <span className="f">
                      {g.sel.length} {g.sel.length > 1 ? 'filters' : 'filter'}
                    </span>
                  )}
                </button>

                <div className="bui-filter-body">
                  <div className="bui-filter-inner">
                    {g.opts.map((o) => {
                      const isChecked = g.sel.includes(o);
                      return (
                        <button
                          key={o}
                          type="button"
                          className="bui-filter-opt"
                          role="checkbox"
                          aria-checked={isChecked}
                          data-g={g.k}
                          data-o={o}
                          tabIndex={isOpen ? 0 : -1}
                          onClick={() => onToggleOption(g.k, o)}
                        >
                          <span className="bui-filter-box">
                            <svg viewBox="0 0 24 24">
                              <path
                                d="m5 12 5 5 9-10"
                                stroke="currentColor"
                                fill="none"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          {o}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bui-filter-foot">
        <span>
          <kbd>↓</kbd>
          <kbd>↑</kbd> To navigate
        </span>
        <span>
          To select <kbd>↵</kbd>
        </span>
      </div>
    </div>
  );
};
