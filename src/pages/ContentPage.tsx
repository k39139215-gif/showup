import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CT, TOPICS, ContentItem } from '../data';
import { Icon, Tray } from '../utils';
import { useDateRangeStore } from '../store/dateStore';
import { BoardSelect, SelectOption } from '../components/base/select/BoardSelect';
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
import { Modal } from '../components/base/modal/modal';
import {
  RiMoreLine,
  RiCloseLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiFileCopyLine,
} from '@remixicon/react';
import { deleteContentItem, updateContentItem } from '../services/activityService';

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
  onDataChange?: () => void;
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
  onDataChange,
}) => {
  const { isDateInCurrentRange, rangeLabel, dateSlice } = useDateRangeStore();
  const [refreshTick, setRefreshTick] = useState(0);

  const isLoaded = useLoadingState([plat, ct, cs, rangeLabel, refreshTick]);

  // Filter content items by current date range
  const inRangeCT = useMemo(() => {
    return CT.filter((c) => isDateInCurrentRange(c.date));
  }, [isDateInCurrentRange, dateSlice, refreshTick]);

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
  }, [inRangeCT, plat, ct, cq, cs, refreshTick]);

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

  // Strategic note editor debounced save (Requirement 16)
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
    }, 500);
  };

  // Inline Copy status (no toast!)
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const handleCopy = (item: ContentItem) => {
    if (item?.text && navigator.clipboard) {
      navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editForm, setEditForm] = useState<{
    text: string;
    p: 'x' | 'li';
    type: string;
    topic: string;
    views: number;
    likes: number;
    replies: number;
    date: string;
    time: string;
  }>({
    text: '',
    p: 'x',
    type: 'original post',
    topic: 'General',
    views: 0,
    likes: 0,
    replies: 0,
    date: '',
    time: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEdit = (item: ContentItem) => {
    setEditingItem(item);
    const d = item.date && !isNaN(item.date.getTime()) ? item.date : new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setEditForm({
      text: item.text,
      p: item.p,
      type: item.type,
      topic: item.topic || 'General',
      views: item.views,
      likes: item.likes,
      replies: item.replies,
      date: dateStr,
      time: timeStr,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);

    let updatedDate = editingItem.date && !isNaN(editingItem.date.getTime()) ? new Date(editingItem.date) : new Date();
    if (editForm.date) {
      const parts = editForm.date.split('-').map(Number);
      if (parts.length === 3) {
        updatedDate = new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    if (editForm.time) {
      const tParts = editForm.time.split(':').map(Number);
      if (tParts.length >= 2) {
        updatedDate.setHours(tParts[0] || 0, tParts[1] || 0, 0, 0);
      }
    }

    const success = await updateContentItem(editingItem, {
      text: editForm.text,
      p: editForm.p,
      type: editForm.type,
      topic: editForm.topic,
      views: editForm.views,
      likes: editForm.likes,
      replies: editForm.replies,
      date: updatedDate,
    });
    setIsSavingEdit(false);
    if (success) {
      toast.success('Post updated');
      setEditingItem(null);
      setRefreshTick((prev) => prev + 1);
      onDataChange?.();
    } else {
      toast.error('Failed to update post');
    }
  };

  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState<ContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (item: ContentItem) => {
    setIsDeleting(true);
    const success = await deleteContentItem(item);
    setIsDeleting(false);
    setDeletingItem(null);
    if (success) {
      toast.success('Post deleted');
      const remaining = CT.filter((c) => isDateInCurrentRange(c.date));
      if (remaining.length > 0) {
        setSel(remaining[0].id);
      } else {
        setSel(-1);
      }
      setRefreshTick((prev) => prev + 1);
      onDataChange?.();
    } else {
      toast.error('Failed to delete post');
    }
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
            fieldClassName="h-[40px] rounded-xl border border-[var(--line)] focus-within:border-transparent bg-white text-[13px] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
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
            <div className="w-full">
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
                          {c.date && !isNaN(c.date.getTime()) && (
                            <>
                              <span>·</span>
                              <span className="text-[11px] text-neutral-400 font-mono">
                                {c.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                        </div>
                        <Dropdown>
                          <DropdownTrigger
                            className="row-menu-btn h-6 w-6 rounded hover:bg-neutral-200 flex items-center justify-center text-neutral-500 cursor-pointer shrink-0"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            aria-label="Post actions"
                          >
                            <RiMoreLine className="size-4" />
                          </DropdownTrigger>
                          <DropdownPopover aria-label="Row actions" placement="bottom end" className="w-40 z-[120]">
                            <DropdownItem onSelect={() => handleOpenEdit(c)}>
                              <div className="flex items-center gap-2">
                                <RiEditLine className="size-4 text-neutral-500" />
                                <span>Edit</span>
                              </div>
                            </DropdownItem>
                            <DropdownItem
                              onSelect={() => {
                                handleCopy(c);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <RiFileCopyLine className="size-4 text-neutral-500" />
                                <span>Copy text</span>
                              </div>
                            </DropdownItem>
                            <DropdownItem
                              onSelect={() => setDeletingItem(c)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <div className="flex items-center gap-2">
                                <RiDeleteBinLine className="size-4 text-red-600" />
                                <span>Delete</span>
                              </div>
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
                        onAction={() => handleCopy(c)}
                      >
                        Copy text
                      </ContextMenuItem>
                      <ContextMenuItem id="edit" onAction={() => handleOpenEdit(c)}>
                        Edit
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        id="delete"
                        variant="danger"
                        onAction={() => setDeletingItem(c)}
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
            </div>

            {selectedItem && (
              <div className="tb" style={{ position: 'sticky', top: '10px' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <b style={{ fontWeight: 600 }}>Inspection</b>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="h-6 px-2 text-[11px] rounded border border-[var(--line)] bg-white hover:bg-neutral-100 flex items-center gap-1 cursor-pointer text-neutral-600 transition-colors"
                      onClick={() => handleCopy(selectedItem)}
                      title="Copy text"
                    >
                      {copiedId === selectedItem.id ? (
                        <>
                          <RiCheckLine className="size-3 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <RiFileCopyLine className="size-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="h-6 px-2 text-[11px] rounded border border-[var(--line)] bg-white hover:bg-neutral-100 flex items-center gap-1 cursor-pointer text-neutral-600 transition-colors"
                      onClick={() => handleOpenEdit(selectedItem)}
                      title="Edit post"
                    >
                      <RiEditLine className="size-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="h-6 px-2 text-[11px] rounded border border-red-200 bg-red-50 hover:bg-red-100 flex items-center gap-1 cursor-pointer text-red-600 transition-colors"
                      onClick={() => setDeletingItem(selectedItem)}
                      title="Delete post"
                    >
                      <RiDeleteBinLine className="size-3" />
                      <span>Delete</span>
                    </button>
                    <span className="muted mono ml-1" style={{ fontSize: '12px' }}>{`#${selectedItem.id}`}</span>
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span className="tag">{`${selectedItem.p === 'li' ? 'LinkedIn' : 'X'} · ${selectedItem.type}`}</span>{' '}
                    <span className="tag">{`#${selectedItem.topic}`}</span>
                    {selectedItem.date && !isNaN(selectedItem.date.getTime()) && (
                      <span className="text-[11.5px] text-neutral-500 font-mono ml-auto">
                        {selectedItem.date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {selectedItem.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p style={{ lineHeight: 1.55 }}>{selectedItem.text}</p>
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

                {/* Stage Bars Funnel */}
                {(() => {
                  const imp = selectedItem.views;
                  const prof = (selectedItem as any).profile_clicks ?? Math.max(1, Math.round(imp * 0.045));
                  const link = (selectedItem as any).link_clicks ?? Math.max(0, Math.round(imp * 0.018));
                  const profRate = imp > 0 ? ((prof / imp) * 100).toFixed(1) : '0';
                  const linkRate = imp > 0 ? ((link / imp) * 100).toFixed(1) : '0';
                  return (
                    <div className="mt-2.5 p-2.5 rounded-lg border border-[var(--line)] bg-[#faf9f6]">
                      <div className="flex justify-between items-center mb-1.5 text-[11px] font-mono text-[var(--mute)]">
                        <span className="font-sans font-semibold text-[var(--ink)]">Stage Bars Funnel</span>
                        <span>{imp} → {prof} → {link}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-[var(--mute)]">Impressions</span>
                            <span className="font-mono">{imp} (100%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded bg-neutral-200 overflow-hidden">
                            <div className="h-full rounded bg-[#161616]" style={{ width: '100%' }} />
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-[var(--mute)]">Profile visits</span>
                            <span className="font-mono">{prof} ({profRate}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded bg-neutral-200 overflow-hidden">
                            <div
                              className="h-full rounded bg-[#f26a1b]"
                              style={{ width: `${Math.min(100, Math.max(8, Number(profRate) * 10))}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-[var(--mute)]">Link clicks</span>
                            <span className="font-mono text-[var(--good)]">{link} ({linkRate}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded bg-neutral-200 overflow-hidden">
                            <div
                              className="h-full rounded bg-[#0e9f6e]"
                              style={{ width: `${Math.min(100, Math.max(4, Number(linkRate) * 10))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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

      {/* Edit Post Modal */}
      <Modal
        isOpen={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        aria-label="Edit post"
        className="p-6 rounded-2xl bg-white border border-[var(--line)] shadow-2xl max-w-lg w-full flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--ink)]">Edit post #{editingItem?.id}</h3>
          <button
            type="button"
            onClick={() => setEditingItem(null)}
            className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
            aria-label="Close"
          >
            <RiCloseLine className="size-5" />
          </button>
        </div>

        <label className="fld">
          Content / Text
          <Textarea
            id="edit_content_text"
            rows={3}
            value={editForm.text}
            onChange={(val) => setEditForm((prev) => ({ ...prev, text: val }))}
            placeholder="Post content..."
            className="w-full text-[13px]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="fld">
            Platform
            <BoardSelect
              id="edit_p"
              value={editForm.p}
              onChange={(val) => setEditForm((prev) => ({ ...prev, p: val as 'x' | 'li' }))}
              options={[
                { value: 'x', label: 'X (Twitter)' },
                { value: 'li', label: 'LinkedIn' },
              ]}
              aria-label="Platform"
            />
          </label>

          <label className="fld">
            Type
            <BoardSelect
              id="edit_t"
              value={editForm.type}
              onChange={(val) => setEditForm((prev) => ({ ...prev, type: val }))}
              options={[
                { value: 'original post', label: 'Original post' },
                { value: 'reply external', label: 'Reply external' },
                { value: 'reply own_conversation', label: 'Reply own conversation' },
              ]}
              aria-label="Type"
            />
          </label>
        </div>

        <label className="fld">
          Topic
          <BoardSelect
            id="edit_topic"
            value={editForm.topic}
            onChange={(val) => setEditForm((prev) => ({ ...prev, topic: val }))}
            options={[
              { value: 'General', label: 'General' },
              ...TOPICS.map((t) => ({ value: t, label: '#' + t })),
            ]}
            aria-label="Topic"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="fld">
            Date
            <input
              type="date"
              id="edit_date"
              value={editForm.date}
              onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full h-[40px] px-3 rounded-[10px] border border-[var(--line)] text-[13px] bg-white text-[var(--ink)]"
            />
          </label>
          <label className="fld">
            Post Time (when published)
            <input
              type="time"
              id="edit_time"
              value={editForm.time}
              onChange={(e) => setEditForm((prev) => ({ ...prev, time: e.target.value }))}
              className="w-full h-[40px] px-3 rounded-[10px] border border-[var(--line)] text-[13px] font-mono bg-white text-[var(--ink)]"
            />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="fld">
            <span className="text-[12px] font-medium text-neutral-600">Views</span>
            <input
              type="number"
              min={0}
              value={editForm.views}
              onChange={(e) => setEditForm((prev) => ({ ...prev, views: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] text-[13px] font-mono bg-white"
            />
          </div>
          <div className="fld">
            <span className="text-[12px] font-medium text-neutral-600">Likes</span>
            <input
              type="number"
              min={0}
              value={editForm.likes}
              onChange={(e) => setEditForm((prev) => ({ ...prev, likes: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] text-[13px] font-mono bg-white"
            />
          </div>
          <div className="fld">
            <span className="text-[12px] font-medium text-neutral-600">Replies</span>
            <input
              type="number"
              min={0}
              value={editForm.replies}
              onChange={(e) => setEditForm((prev) => ({ ...prev, replies: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] text-[13px] font-mono bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-[var(--line)]">
          <button
            type="button"
            className="btn ghost text-[13px] h-9 px-3"
            onClick={() => setEditingItem(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn text-[13px] h-9 px-4"
            onClick={handleSaveEdit}
            disabled={isSavingEdit}
          >
            {isSavingEdit ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingItem !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
        aria-label="Confirm delete"
        className="p-6 rounded-2xl bg-white border border-[var(--line)] shadow-2xl max-w-sm w-full flex flex-col gap-3"
      >
        <h3 className="text-base font-semibold text-neutral-900">Delete this post?</h3>
        <p className="text-[13px] text-neutral-500 leading-normal">
          This will permanently remove post #{deletingItem?.id} from your content library and update your daily totals in Supabase.
        </p>
        <div className="flex justify-end gap-2 mt-3 pt-2">
          <button
            type="button"
            className="btn ghost text-[13px] h-9 px-3"
            onClick={() => setDeletingItem(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn text-[13px] h-9 px-4 bg-red-600 hover:bg-red-700 text-white border-red-600"
            onClick={() => deletingItem && handleDelete(deletingItem)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </>
  );
};
