import { supabase } from '../lib/supabase';
import { formatLocalDate } from '../utils/dateMath';
import { syncSupabaseToMemory } from './activityService';

export interface XImportResult {
  success: boolean;
  importedPosts: number;
  totalViews: number;
  totalLikes: number;
  totalReplies: number;
  daysCount: number;
  message?: string;
}

/**
 * Parse an official X Analytics CSV file and upsert real data into Supabase
 */
export async function parseAndUploadXAnalyticsCsv(csvText: string): Promise<XImportResult> {
  try {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { success: false, importedPosts: 0, totalViews: 0, totalLikes: 0, totalReplies: 0, daysCount: 0, message: 'CSV file is empty or missing data rows.' };
    }

    // Parse header row
    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

    // Detect column indexes
    const tweetIdIdx = headers.findIndex((h) => h.includes('tweet id') || h === 'id');
    const timeIdx = headers.findIndex((h) => h.includes('time') || h.includes('date'));
    const textIdx = headers.findIndex((h) => h.includes('tweet text') || h.includes('text') || h.includes('content'));
    const impressionsIdx = headers.findIndex((h) => h.includes('impressions') || h.includes('views'));
    const repliesIdx = headers.findIndex((h) => h.includes('replies'));
    const likesIdx = headers.findIndex((h) => h.includes('likes') || h.includes('favorites'));
    const urlIdx = headers.findIndex((h) => h.includes('tweet permalink') || h.includes('url'));

    if (timeIdx === -1) {
      return { success: false, importedPosts: 0, totalViews: 0, totalLikes: 0, totalReplies: 0, daysCount: 0, message: 'Could not find a Date or Time column in this CSV file.' };
    }

    const dailyMap = new Map<
      string,
      { posts: number; replies: number; views: number; likes: number }
    >();

    const postsToUpsert: any[] = [];
    let importedPosts = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalReplies = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (!row || row.length <= timeIdx) continue;

      const rawTime = row[timeIdx];
      const parsedDate = new Date(rawTime);
      if (isNaN(parsedDate.getTime())) continue;

      const dateStr = formatLocalDate(parsedDate); // 'YYYY-MM-DD'
      const tweetId = tweetIdIdx !== -1 && row[tweetIdIdx] ? row[tweetIdIdx] : `x-${parsedDate.getTime()}-${i}`;
      const content = textIdx !== -1 && row[textIdx] ? row[textIdx] : '';
      const views = impressionsIdx !== -1 && row[impressionsIdx] ? parseInt(row[impressionsIdx].replace(/,/g, ''), 10) || 0 : 0;
      const replies = repliesIdx !== -1 && row[repliesIdx] ? parseInt(row[repliesIdx].replace(/,/g, ''), 10) || 0 : 0;
      const likes = likesIdx !== -1 && row[likesIdx] ? parseInt(row[likesIdx].replace(/,/g, ''), 10) || 0 : 0;
      const url = urlIdx !== -1 && row[urlIdx] ? row[urlIdx] : '';

      importedPosts += 1;
      totalViews += views;
      totalLikes += likes;
      totalReplies += replies;

      // Group by date for activity_daily
      const curDaily = dailyMap.get(dateStr) || { posts: 0, replies: 0, views: 0, likes: 0 };
      curDaily.posts += 1;
      curDaily.replies += replies;
      curDaily.views += views;
      curDaily.likes += likes;
      dailyMap.set(dateStr, curDaily);

      postsToUpsert.push({
        platform: 'x',
        platform_post_id: tweetId,
        content,
        published_at: parsedDate.toISOString(),
        views,
        replies,
        likes,
        url,
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert posts in batches of 50
    for (let i = 0; i < postsToUpsert.length; i += 50) {
      const batch = postsToUpsert.slice(i, i + 50);
      await supabase.from('posts').upsert(batch, { onConflict: 'platform_post_id' });
    }

    // Upsert aggregated daily records
    for (const [date, metrics] of dailyMap.entries()) {
      await supabase.from('activity_daily').upsert(
        {
          date,
          platform: 'x',
          posts: metrics.posts,
          replies: metrics.replies,
          views: metrics.views,
          likes: metrics.likes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'date,platform' }
      );
    }

    return {
      success: true,
      importedPosts,
      totalViews,
      totalLikes,
      totalReplies,
      daysCount: dailyMap.size,
    };
  } catch (err: any) {
    console.error('Error parsing X analytics CSV:', err);
    return {
      success: false,
      importedPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      totalReplies: 0,
      daysCount: 0,
      message: err.message || 'Failed to process CSV file.',
    };
  }
}

/**
 * Robust CSV line parser handling quoted values with commas
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}


/**
 * Trigger live zero-ban synchronization for the given X handle
 */
export async function triggerLiveXSync(handle: string): Promise<{
  success: boolean;
  count: number;
  views: number;
  message?: string;
}> {
  const clean = handle.replace(/^@/, '').trim();
  try {
    let localRes: any = null;
    try {
      const resp = await fetch(`/api/sync-x?handle=${clean}`, { method: 'GET' });
      if (resp.ok) {
        localRes = await resp.json();
      }
    } catch (e) {
      // Local server not running or offline
    }

    // Always sync database records into application memory
    await syncSupabaseToMemory();

    // Inspect records in Supabase
    const { data: posts } = await supabase.from('posts').select('*').eq('platform', 'x');
    const count = posts?.length || 0;
    const views = posts?.reduce((acc: number, p: any) => acc + (p.views || 0), 0) || 0;

    return {
      success: true,
      count: localRes?.count || count,
      views: localRes?.totalViews || views,
      message: `Synced ${count} posts and ${views} impressions from @${clean}.`,
    };
  } catch (err: any) {
    console.error('triggerLiveXSync error:', err);
    return {
      success: false,
      count: 0,
      views: 0,
      message: err.message || 'Sync failed',
    };
  }
}
