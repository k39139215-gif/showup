import React, { useEffect, useMemo } from 'react';
import { CT, TOPICS } from '../data';
import { Icon, Tray } from '../utils';
import { useDateRangeStore } from '../store/dateStore';
import { BoardSelect, SelectOption } from '../components/base/select/BoardSelect';
import { Skeleton } from '../components/base/skeleton/skeleton';
import { Tooltip, TooltipTrigger } from '../components/base/tooltip/tooltip';
import { toast } from '../components/base/toast/toast';
import { useLoadingState } from '../hooks/useLoadingState';
import { Dropdown, DropdownTrigger, DropdownPopover, DropdownItem } from '../components/base/dropdown/dropdown';
import {
  ContextMenuTrigger,
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from '../components/base/context-menu/context-menu';
import { RiMoreLine } from '@remixicon/react';

interface ContentPageProps {
  plat: string;
  cq: string;
  setCq: (q: string) => void;
  ct: string;
  setCt: (t: string) => void;
  cs: string;
  setCs: (s: string) => void;
  sel: number;
  setSel: (id: number) => void;
}

const CONTENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All content types' },
  { value: 'original post', label: 'Original post' },
  { value: 'reply external', label: 'Reply external' },
  { value: 'reply own_conversation', label: 'Reply own conversation' },
];

const CONTENT_SORT_OPTIONS: SelectOption[] = [
  { value: 'recent', label: 'Sort: most recent' },
  { value: 'views', label: 'Sort: views' },
  { value: 'eng', label: 'Sort: engagement' },
];

export const ContentPage: React.FC<ContentPageProps> = ({
  plat,
  cq,
  setCq,
  ct,
  setCt,
  cs,
  setCs,
  sel,
  setSel,
}) => {
  const { isDateInCurrentRange, rangeLabel } = useDateRangeStore();

  const isLoaded = useLoadingState([plat, ct, cs, rangeLabel]);

  // Filter content items by current date range
  const inRangeCT = useMemo(() => {
    return CT.filter((c) => isDateInCurrentRange(c.date));
  }, [isDateInCurrentRange]);

  const L = useMemo(() => {
    const filtered = inRangeCT.filter(
      (c) =>
        (plat === 'all' || c.p === plat) &&
        (ct === 'all' || c.type === ct) &&
        (c.text + c.topic).toLowerCase().includes(cq.toLowerCase())
    );

    filtered.sort((a, b) =>
      cs === 'views'
        ? b.views - a.views
        : cs === 'eng'
        ? b.eng - a.eng
        : b.date.getTime() - a.date.getTime() || a.id - b.id
    );

    return filtered;
  }, [inRangeCT, plat, ct, cq, cs]);

  // Selected item resets if it falls outside current range
  useEffect(() => {
    const isCurrentSelInRange = inRangeCT.some((x) => x.id === sel);
    if (!isCurrentSelInRange) {
      if (L.length > 0) {
        setSel(L[0].id);
      } else {
        setSel(-1);
      }
    }
  }, [inRangeCT, sel, L, setSel]);

  const selectedItem = inRangeCT.find((x) => x.id === sel);

  return (
    <>
      <div className="head">
        <div>
          <h1>Content & reply library</h1>
          <p className="sub">{`Searchable master-detail library for ${rangeLabel}`}</p>
        </div>
      </div>

      <Tray icon="content" title="Library">
        <div className="fbar">
          <div className="sbox">
            <Icon name="analytics" size={0} />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              id="cq"
              type="text"
              placeholder="Search keywords (NetSuite, lockbox, unapplied cash)…"
              value={cq}
              onChange={(e) => setCq(e.target.value)}
            />
          </div>

          <BoardSelect
            id="ct"
            value={ct}
            onChange={(val) => setCt(val)}
            options={CONTENT_TYPE_OPTIONS}
            fixedWidth="w-[190px]"
            aria-label="Filter by content type"
          />

          <BoardSelect
            id="cs"
            value={cs}
            onChange={(val) => setCs(val)}
            options={CONTENT_SORT_OPTIONS}
            fixedWidth="w-[170px]"
            aria-label="Sort content by"
          />
        </div>

        <div className="fbar" style={{ marginTop: '12px' }}>
          {TOPICS.map((t) => (
            <span
              key={t}
              className="pill nu"
              style={{ cursor: 'pointer' }}
              data-t={t}
              onClick={() => setCq(t)}
            >{`#${t}`}</span>
          ))}
          {cq && (
            <span
              className="pill or"
              style={{ cursor: 'pointer' }}
              onClick={() => setCq('')}
            >
              Clear filter ✕
            </span>
          )}
        </div>

        <div className="muted" style={{ fontSize: '12.5px', margin: '14px 0 10px' }}>
          {`Showing ${L.length} of ${inRangeCT.length} items`}
        </div>

        {inRangeCT.length === 0 ? (
          <div className="empty" style={{ height: '220px' }}>
            <div>
              <Icon name="content" size={28} />
              <div style={{ marginTop: '8px', fontWeight: 600 }}>No content in selected date range</div>
              <p style={{ fontSize: '13px', color: 'var(--mute)', marginTop: '4px' }}>
                Try selecting a broader date range or clearing filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="cm g">
            <Skeleton isLoaded={isLoaded} className="w-full">
              <div className="clist">
                {L.map((c) => (
                  <ContextMenuTrigger key={c.id}>
                    <div
                      className={`cit ${c.id === sel ? 'on' : ''}`}
                      onClick={() => setSel(c.id)}
                    >
                      <div className="t flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="mono">{`#${c.id}`}</span>
                          <span>·</span>
                          <span>{`${c.p === 'li' ? 'LinkedIn' : 'X'} · ${c.type}`}</span>
                          <span>·</span>
                          <span>{`#${c.topic}`}</span>
                        </div>
                        <Dropdown>
                          <DropdownTrigger
                            className="row-menu-btn h-5 w-5 rounded hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer shrink-0"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            aria-label="Post actions"
                          >
                            <RiMoreLine className="size-4" />
                          </DropdownTrigger>
                          <DropdownPopover aria-label="Row actions" placement="bottom end" className="w-36 z-[120]">
                            <DropdownItem onSelect={() => toast.info(`Editing post #${c.id}`)}>
                              Edit
                            </DropdownItem>
                            <DropdownItem
                              onSelect={() => {
                                navigator.clipboard?.writeText(c.text);
                                toast.success('Copied link');
                              }}
                            >
                              Copy link
                            </DropdownItem>
                            <DropdownItem
                              onSelect={() => toast.info(`Deleted post #${c.id}`)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </DropdownItem>
                          </DropdownPopover>
                        </Dropdown>
                      </div>
                      <TooltipTrigger delay={200}>
                        <p className="line-clamp-2">{c.text}</p>
                        <Tooltip size="sm">{c.text}</Tooltip>
                      </TooltipTrigger>
                      <div className="meta">
                        <span>
                          Views <b className="mono">{c.views}</b>
                        </span>
                        <span>
                          Likes <b className="mono">{c.likes}</b>
                        </span>
                        <span>
                          Replies <b className="mono">{c.replies}</b>
                        </span>
                        <span className="mono" style={{ color: 'var(--good)' }}>
                          {`${c.eng.toFixed(2)}%`}
                        </span>
                      </div>
                    </div>
                    <ContextMenu aria-label="Post actions">
                      <ContextMenuItem id="open" onAction={() => setSel(c.id)}>
                        Open
                      </ContextMenuItem>
                      <ContextMenuItem
                        id="copy"
                        onAction={() => {
                          navigator.clipboard?.writeText(c.text);
                          toast.success('Copied link');
                        }}
                      >
                        Copy link
                      </ContextMenuItem>
                      <ContextMenuItem id="edit" onAction={() => toast.info(`Editing post #${c.id}`)}>
                        Edit
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        id="delete"
                        variant="danger"
                        onAction={() => toast.info(`Deleted post #${c.id}`)}
                      >
                        Delete
                      </ContextMenuItem>
                    </ContextMenu>
                  </ContextMenuTrigger>
                ))}
              </div>
            </Skeleton>

            {selectedItem && (
              <div className="tb" style={{ position: 'sticky', top: '10px' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <b style={{ fontWeight: 600 }}>Inspection</b>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TooltipTrigger delay={100}>
                      <button
                        type="button"
                        className="h-6 px-2 text-[11px] rounded border border-[var(--line)] bg-white hover:bg-neutral-100 flex items-center gap-1 cursor-pointer text-neutral-600"
                        onClick={() => {
                          if (selectedItem?.text) {
                            navigator.clipboard?.writeText(selectedItem.text);
                            toast.success('Copied to clipboard');
                          }
                        }}
                      >
                        Copy
                      </button>
                      <Tooltip size="sm">Copy post content to clipboard</Tooltip>
                    </TooltipTrigger>
                    <span className="muted mono" style={{ fontSize: '12px' }}>{`#${selectedItem.id}`}</span>
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <span className="tag">{`${selectedItem.p === 'li' ? 'LinkedIn' : 'X'} · ${selectedItem.type}`}</span>{' '}
                  <span className="tag">{`#${selectedItem.topic}`}</span>
                  <p style={{ lineHeight: 1.55, marginTop: '6px' }}>{selectedItem.text}</p>
                </div>
                <div className="pg">
                  <div>
                    <small>Impressions</small>
                    <b className="mono">{selectedItem.views}</b>
                  </div>
                  <div>
                    <small>Likes</small>
                    <b className="mono">{selectedItem.likes}</b>
                  </div>
                  <div>
                    <small>Replies</small>
                    <b className="mono">{selectedItem.replies}</b>
                  </div>
                  <div>
                    <small>Engagement</small>
                    <b className="mono" style={{ color: 'var(--good)' }}>{`${selectedItem.eng.toFixed(2)}%`}</b>
                  </div>
                </div>
                <div className="fld" style={{ marginTop: '10px' }}>
                  Strategic note
                  <textarea
                    id="cn"
                    placeholder="Add qualitative observation or follow-up hook…"
                    value={selectedItem.note}
                    onChange={(e) => {
                      selectedItem.note = e.target.value;
                    }}
                    onBlur={() => {
                      toast.success('Strategic note saved');
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Tray>
    </>
  );
};
