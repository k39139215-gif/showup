import { supabase, DbDailyActivity, DbPost, DbGoal } from '../lib/supabase';
import { D, N, dayAt, CT, ContentItem } from '../data';
import { formatLocalDate } from '../utils/dateMath';
import { isPreviewEnvironment } from '../utils/env';
import { seedSyntheticData } from './syntheticData';

export interface DayRecord {
  date: string;
  xp: number;
  xr: number;
  lp: number;
  lr: number;
  xv: number;
  li: number;
  xl: number;
  ll: number;
}

/**
 * Fetch daily aggregated activity between startDate and endDate (inclusive, 'YYYY-MM-DD')
 */
export async function fetchDailyActivityRange(
  startDate: string,
  endDate: string
): Promise<{ data: DayRecord[]; hasData: boolean }> {
  try {
    if (isPreviewEnvironment()) {
      const records: DayRecord[] = [];
      let hasAny = false;
      for (let i = 0; i < N; i++) {
        const dStr = formatLocalDate(dayAt(i));
        if (dStr >= startDate && dStr <= endDate) {
          records.push({
            date: dStr,
            ...D[i],
          });
          if (D[i].xp > 0 || D[i].xr > 0 || D[i].lp > 0 || D[i].lr > 0) hasAny = true;
        }
      }
      return { data: records, hasData: hasAny };
    }

    const { data, error } = await supabase
      .from('activity_daily')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.warn('Supabase fetchDailyActivityRange warning:', error.message);
      return { data: [], hasData: false };
    }

    if (!data || data.length === 0) {
      return { data: [], hasData: false };
    }

    // Pivot platform rows ('x' and 'li') into unified DayRecord per date
    const dayMap = new Map<string, DayRecord>();

    data.forEach((row: DbDailyActivity) => {
      const existing = dayMap.get(row.date) || {
        date: row.date,
        xp: 0,
        xr: 0,
        lp: 0,
        lr: 0,
        xv: 0,
        li: 0,
        xl: 0,
        ll: 0,
      };

      if (row.platform === 'x') {
        existing.xp += row.posts || 0;
        existing.xr += row.replies || 0;
        existing.xv += row.views || 0;
        existing.xl += row.likes || 0;
      } else if (row.platform === 'li') {
        existing.lp += row.posts || 0;
        existing.lr += row.replies || 0;
        existing.li += row.views || 0;
        existing.ll += row.likes || 0;
      }

      dayMap.set(row.date, existing);
    });

    const records = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return { data: records, hasData: records.length > 0 };
  } catch (err) {
    console.error('Error fetching activity range from Supabase:', err);
    return { data: [], hasData: false };
  }
}

/**
 * Insert or update daily activity entry
 */
export async function upsertDailyActivity(entry: {
  date: string;
  platform: 'x' | 'li';
  posts?: number;
  replies?: number;
  views?: number;
  likes?: number;
}): Promise<boolean> {
  try {
    if (isPreviewEnvironment()) {
      for (let i = 0; i < N; i++) {
        if (formatLocalDate(dayAt(i)) === entry.date) {
          if (entry.platform === 'x') {
            D[i].xp += entry.posts || 0;
            D[i].xr += entry.replies || 0;
            D[i].xv += entry.views || 0;
            D[i].xl += entry.likes || 0;
          } else {
            D[i].lp += entry.posts || 0;
            D[i].lr += entry.replies || 0;
            D[i].li += entry.views || 0;
            D[i].ll += entry.likes || 0;
          }
          break;
        }
      }
      return true;
    }

    // Check if record exists to add/increment
    const { data: existing } = await supabase
      .from('activity_daily')
      .select('*')
      .eq('date', entry.date)
      .eq('platform', entry.platform)
      .maybeSingle();

    const payload = {
      date: entry.date,
      platform: entry.platform,
      posts: (existing?.posts || 0) + (entry.posts || 0),
      replies: (existing?.replies || 0) + (entry.replies || 0),
      views: (existing?.views || 0) + (entry.views || 0),
      likes: (existing?.likes || 0) + (entry.likes || 0),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('activity_daily').upsert(payload, {
      onConflict: 'date,platform',
    });

    if (error) {
      console.error('Error upserting daily activity:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in upsertDailyActivity:', err);
    return false;
  }
}

/**
 * Real-time subscription to changes in activity_daily table
 */
export function subscribeToDailyActivity(onChange: () => void) {
  if (isPreviewEnvironment()) {
    return () => {};
  }

  const channel = supabase
    .channel('public:activity_daily_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activity_daily' },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Sync real daily activity records from Supabase into memory
 */
export async function syncSupabaseToMemory(): Promise<boolean> {
  try {
    if (isPreviewEnvironment()) {
      seedSyntheticData();
      return true;
    }

    const { data, error } = await supabase.from('activity_daily').select('*');
    if (error || !data || data.length === 0) {
      for (let i = 0; i < N; i++) {
        D[i] = { xp: 0, xr: 0, lp: 0, lr: 0, xv: 0, li: 0, xl: 0, ll: 0 };
      }
      CT.length = 0;
      return false;
    }

    const map = new Map<string, any>();
    data.forEach((row: DbDailyActivity) => {
      const cur = map.get(row.date) || { xp: 0, xr: 0, lp: 0, lr: 0, xv: 0, li: 0, xl: 0, ll: 0 };
      if (row.platform === 'x') {
        cur.xp += row.posts || 0;
        cur.xr += row.replies || 0;
        cur.xv += row.views || 0;
        cur.xl += row.likes || 0;
      } else if (row.platform === 'li') {
        cur.lp += row.posts || 0;
        cur.lr += row.replies || 0;
        cur.li += row.views || 0;
        cur.ll += row.likes || 0;
      }
      map.set(row.date, cur);
    });

    let matched = 0;
    for (let i = 0; i < N; i++) {
      const dateStr = formatLocalDate(dayAt(i));
      if (map.has(dateStr)) {
        Object.assign(D[i], map.get(dateStr));
        matched++;
      }
    }

    // Sync posts into CT
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .order('published_at', { ascending: false });

    CT.length = 0;
    if (postsData && postsData.length > 0) {
      postsData.forEach((p: DbPost, idx: number) => {
        const pubDate = new Date(p.published_at);
        const eng = p.views > 0 ? ((p.likes + p.replies) / p.views) * 100 : 0;
        CT.push({
          id: idx + 1,
          dbId: p.id,
          platform_post_id: p.platform_post_id,
          p: p.platform,
          type: p.replies > 0 && p.views === 0 ? 'reply external' : 'original post',
          topic: 'General',
          text: p.content || (p.platform === 'x' ? 'X Post' : 'LinkedIn Post'),
          views: p.views || 0,
          likes: p.likes || 0,
          replies: p.replies || 0,
          eng: parseFloat(eng.toFixed(2)),
          date: isNaN(pubDate.getTime()) ? new Date() : pubDate,
          note: '',
        });
      });
    } else {
      // Synthesize content items from activity_daily so user sees their recorded activity
      data.forEach((row: DbDailyActivity, idx: number) => {
        if ((row.posts || 0) > 0 || (row.replies || 0) > 0) {
          const rowDate = new Date(row.date + 'T12:00:00');
          CT.push({
            id: idx + 1,
            p: row.platform,
            type: row.posts > 0 ? 'original post' : 'reply external',
            topic: 'General',
            text: `${row.posts > 0 ? `${row.posts} post${row.posts > 1 ? 's' : ''}` : ''}${row.posts > 0 && row.replies > 0 ? ', ' : ''}${row.replies > 0 ? `${row.replies} repl${row.replies > 1 ? 'ies' : 'y'}` : ''} on ${row.platform === 'x' ? 'X' : 'LinkedIn'}`,
            views: row.views || 0,
            likes: row.likes || 0,
            replies: row.replies || 0,
            eng: row.views > 0 ? parseFloat((((row.likes + row.replies) / row.views) * 100).toFixed(2)) : 0,
            date: rowDate,
            note: '',
          });
        }
      });
    }

    return matched > 0;
  } catch (e) {
    console.error('Error syncing Supabase to memory:', e);
    return false;
  }
}

/**
 * Delete a post/content item from Supabase and sync memory
 */
export async function deleteContentItem(item: ContentItem): Promise<boolean> {
  try {
    if (isPreviewEnvironment()) {
      const ctIdx = CT.findIndex((c) => c.id === item.id || (item.dbId && c.dbId === item.dbId));
      if (ctIdx !== -1) CT.splice(ctIdx, 1);
      return true;
    }

    // 1. Delete from Supabase 'posts' table
    if (item.dbId) {
      await supabase.from('posts').delete().eq('id', item.dbId);
    } else if (item.platform_post_id) {
      await supabase.from('posts').delete().eq('platform_post_id', item.platform_post_id);
    } else {
      await supabase
        .from('posts')
        .delete()
        .eq('content', item.text)
        .eq('platform', item.p);
    }

    // 2. Decrement counts in Supabase 'activity_daily' table
    const dateStr = formatLocalDate(item.date);
    const { data: dailyRow } = await supabase
      .from('activity_daily')
      .select('*')
      .eq('date', dateStr)
      .eq('platform', item.p)
      .maybeSingle();

    if (dailyRow) {
      let postsToDec = 0;
      let repliesToDec = 0;
      if (item.text) {
        const matchPosts = item.text.match(/^(\d+)\s+(?:X|LinkedIn)\s+original post/);
        if (matchPosts) postsToDec = parseInt(matchPosts[1], 10);
        else if (item.type === 'original post') postsToDec = 1;

        const matchReplies = item.text.match(/^(\d+)\s+(?:X|LinkedIn)\s+reply/);
        if (matchReplies) repliesToDec = parseInt(matchReplies[1], 10);
        else if (item.type.includes('reply')) repliesToDec = item.replies || 1;
      } else {
        postsToDec = item.type === 'original post' ? 1 : 0;
        repliesToDec = item.type.includes('reply') ? (item.replies || 1) : 0;
      }

      const newPosts = Math.max(0, (dailyRow.posts || 0) - postsToDec);
      const newReplies = Math.max(0, (dailyRow.replies || 0) - (repliesToDec || item.replies || 0));
      const newViews = Math.max(0, (dailyRow.views || 0) - (item.views || 0));
      const newLikes = Math.max(0, (dailyRow.likes || 0) - (item.likes || 0));

      if (newPosts === 0 && newReplies === 0 && newViews === 0 && newLikes === 0) {
        await supabase.from('activity_daily').delete().eq('id', dailyRow.id);
      } else {
        await supabase.from('activity_daily').update({
          posts: newPosts,
          replies: newReplies,
          views: newViews,
          likes: newLikes,
          updated_at: new Date().toISOString(),
        }).eq('id', dailyRow.id);
      }
    }

    // 3. Remove from memory CT
    const ctIdx = CT.findIndex((c) => c.id === item.id || (item.dbId && c.dbId === item.dbId));
    if (ctIdx !== -1) {
      CT.splice(ctIdx, 1);
    }

    // 4. Update memory D array
    const dIdx = D.findIndex((_, idx) => formatLocalDate(dayAt(idx)) === dateStr);
    if (dIdx !== -1) {
      const pKeyPost = item.p === 'x' ? 'xp' : 'lp';
      const pKeyReply = item.p === 'x' ? 'xr' : 'lr';
      const pKeyView = item.p === 'x' ? 'xv' : 'li';
      const pKeyLike = item.p === 'x' ? 'xl' : 'll';

      let postsToDec = item.type === 'original post' ? 1 : 0;
      let repliesToDec = item.type.includes('reply') ? (item.replies || 1) : 0;
      const match = item.text.match(/^(\d+)\s+(?:X|LinkedIn)\s+(original post|reply)/);
      if (match) {
        const count = parseInt(match[1], 10);
        if (match[2] === 'original post') postsToDec = count;
        else repliesToDec = count;
      }

      D[dIdx][pKeyPost] = Math.max(0, D[dIdx][pKeyPost] - postsToDec);
      D[dIdx][pKeyReply] = Math.max(0, D[dIdx][pKeyReply] - repliesToDec);
      D[dIdx][pKeyView] = Math.max(0, D[dIdx][pKeyView] - (item.views || 0));
      D[dIdx][pKeyLike] = Math.max(0, D[dIdx][pKeyLike] - (item.likes || 0));
    }

    return true;
  } catch (err) {
    console.error('Error in deleteContentItem:', err);
    return false;
  }
}

/**
 * Update an existing post/content item in Supabase and sync memory
 */
export async function updateContentItem(
  item: ContentItem,
  updates: {
    text: string;
    p: 'x' | 'li';
    type: string;
    topic: string;
    views: number;
    likes: number;
    replies: number;
    date?: Date;
  }
): Promise<boolean> {
  try {
    if (isPreviewEnvironment()) {
      item.text = updates.text;
      item.p = updates.p;
      item.type = updates.type;
      item.topic = updates.topic;
      item.views = updates.views;
      item.likes = updates.likes;
      item.replies = updates.replies;
      item.eng = updates.views > 0 ? parseFloat((((updates.likes + updates.replies) / updates.views) * 100).toFixed(2)) : 0;
      if (updates.date) {
        item.date = updates.date;
      }
      return true;
    }

    const oldViews = item.views || 0;
    const oldLikes = item.likes || 0;
    const oldReplies = item.replies || 0;

    // 1. Update in memory item
    item.text = updates.text;
    item.p = updates.p;
    item.type = updates.type;
    item.topic = updates.topic;
    item.views = updates.views;
    item.likes = updates.likes;
    item.replies = updates.replies;
    item.eng = updates.views > 0 ? parseFloat((((updates.likes + updates.replies) / updates.views) * 100).toFixed(2)) : 0;
    if (updates.date) {
      item.date = updates.date;
    }

    // 2. Update Supabase 'posts' table
    const postPayload = {
      content: updates.text,
      platform: updates.p,
      views: updates.views,
      likes: updates.likes,
      replies: updates.replies,
      published_at: (updates.date || item.date).toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (item.dbId) {
      await supabase.from('posts').update(postPayload).eq('id', item.dbId);
    } else if (item.platform_post_id) {
      await supabase.from('posts').update(postPayload).eq('platform_post_id', item.platform_post_id);
    } else {
      await supabase.from('posts').update(postPayload).eq('content', item.text);
    }

    // 3. Update Supabase 'activity_daily' with delta
    const dateStr = formatLocalDate(updates.date || item.date);
    const viewsDelta = updates.views - oldViews;
    const likesDelta = updates.likes - oldLikes;
    const repliesDelta = updates.replies - oldReplies;

    if (viewsDelta !== 0 || likesDelta !== 0 || repliesDelta !== 0) {
      const { data: dailyRow } = await supabase
        .from('activity_daily')
        .select('*')
        .eq('date', dateStr)
        .eq('platform', updates.p)
        .maybeSingle();

      if (dailyRow) {
        await supabase.from('activity_daily').update({
          views: Math.max(0, (dailyRow.views || 0) + viewsDelta),
          likes: Math.max(0, (dailyRow.likes || 0) + likesDelta),
          replies: Math.max(0, (dailyRow.replies || 0) + repliesDelta),
          updated_at: new Date().toISOString(),
        }).eq('id', dailyRow.id);
      }

      // Memory D delta
      const dIdx = D.findIndex((_, idx) => formatLocalDate(dayAt(idx)) === dateStr);
      if (dIdx !== -1) {
        const pKeyReply = updates.p === 'x' ? 'xr' : 'lr';
        const pKeyView = updates.p === 'x' ? 'xv' : 'li';
        const pKeyLike = updates.p === 'x' ? 'xl' : 'll';
        D[dIdx][pKeyView] = Math.max(0, D[dIdx][pKeyView] + viewsDelta);
        D[dIdx][pKeyLike] = Math.max(0, D[dIdx][pKeyLike] + likesDelta);
        D[dIdx][pKeyReply] = Math.max(0, D[dIdx][pKeyReply] + repliesDelta);
      }
    }

    return true;
  } catch (err) {
    console.error('Error in updateContentItem:', err);
    return false;
  }
}
