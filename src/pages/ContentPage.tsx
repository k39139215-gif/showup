import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { SearchField } from '../components/base/search-field/search-field';
import { TagGroup, Tag } from '../components/base/tag-group/tag-group';
import { Chip } from '../components/base/badges/chip';
import { Pagination } from '../components/base/pagination/pagination';
import { Textarea } from '../components/base/textarea/textarea';
import { RiMoreLine, RiCloseLine } from '@remixicon/react';

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

  // Pagination: 25 items per page (Requirement 19)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(L.length / pageSize));
  const paginatedL = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return L.slice(start, start + pageSize);
  }, [L, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [plat, ct, cs, cq, rangeLabel]);

  const selectedItem = inRangeCT.find((x) => x.id === sel);

  // Note editor debounced save (Requirement 16)
  const [noteVal, setNoteVal] = useState(selectedItem?.note || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNoteVal(selectedItem?.note || '');
    setSaveStatus('idle');
  }, [selectedItem?.id]);

  const handleNoteChange = (text: string) => {
    setNoteVal(text);
    if (!selectedItem) return;
    setSaveStatus('saving');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      selectedItem.note = text;
      setSaveStatus('saved');
      toast.success('Strategic note saved');
    }, 500);
  };

  return (
    <>
      <div className="head">
        <div>
          <h1>Content & reply library</h1>
          <p className="sub">{`Searchable master-detail library for ${rangeLabel}`}</p>
        </div>
      </div>

      <Tray icon="content" title="Library">
        <div className="fbar flex items-center gap-3">
          <SearchField
            inputId="cq"
            aria-label="Search content keywords"
            placeholder="Search keywords (NetSuite, lockbox, unapplied cash)…"
            value={cq}
            onChange={setCq}
            shape="rounded"
            className="flex-1 min-w-[280px]"
            fieldClassName="h-[40px] rounded-xl border border-[var(--line)] bg-white text-[13px] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          />

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

        <div style={{ marginTop: '14px' }}>
          <TagGroup
            label="Filter by topic"
            aria-label="Topics"
            selectionMode="single"
            selectedKeys={cq ? [cq] : []}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0];
              setCq(selectedKey ? String(selectedKey) : '');
            }}
            items={TOPICS.map((t) => ({ id: t, name: t }))}
          >
            {(item: { id: string; name: string }) => (
              <Tag id={item.id} data-t={item.name} className="cursor-pointer">
                #{item.name}
              </Tag>
            )}
          </TagGroup>
        </div>

        {(plat !== 'all' || ct !== 'all' || cq) && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-2 border-t border-[var(--line)]">
            <span className="text-xs text-neutral-400 font-medium">Active filters:</span>
            {plat !== 'all' && (
              <Chip color="orange" className="gap-1 pr-1">
                <span>Platform: {plat === 'x' ? 'X' : 'LinkedIn'}</span>
              </Chip>
            )}
            {ct !== 'all' && (
              <Chip color="blue" className="gap-1 pr-1">
                <span>Type: {CONTENT_TYPE_OPTIONS.find((o) => o.value === ct)?.label || ct}</span>
                <button
                  type="button"
                  className="hover:opacity-75 cursor-pointer ml-1 inline-flex items-center"
                  onClick={() => setCt('all')}
                  aria-label="Clear content type filter"
                >
                  <RiCloseLine className="size-3.5" />
                </button>
              </Chip>
            )}
            {cq && (
              <Chip color="neutral" className="gap-1 pr-1">
                <span>Query: {cq}</span>
                <button
                  type="button"
                  className="hover:opacity-75 cursor-pointer ml-1 inline-flex items-center"
                  onClick={() => setCq('')}
                  aria-label="Clear query filter"
                >
                  <RiCloseLine className="size-3.5" />
                </button>
              </Chip>
            )}
          </div>
        )}

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
                {paginatedL.map((c) => (
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
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    onChange={setCurrentPage}
                  />
                </div>
              )}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>Strategic note</span>
                    <span style={{ fontSize: '11.5px', color: 'var(--mute)' }}>
                      {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : ''}
                    </span>
                  </div>
                  <Textarea
                    id="cn"
                    placeholder="Add qualitative observation or follow-up hook…"
                    value={noteVal}
                    onChange={(val) => handleNoteChange(val)}
                    autoResize
                    maxLength={500}
                    showCount
                    rows={3}
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
