import { supabase, DbDailyActivity, DbPost, DbGoal } from '../lib/supabase';
import { D, N, dayAt, CT } from '../data';
import { formatLocalDate } from '../utils/dateMath';

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
    const { data, error } = await supabase.from('activity_daily').select('*');
    if (error || !data || data.length === 0) return false;

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
