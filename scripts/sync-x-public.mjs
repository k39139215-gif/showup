import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xsexkrxlyirnnroxenjl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_Na9A_qM6aFzYgPYsaQktmQ_D6O-C-e7';
const HANDLE = process.env.X_HANDLE || 'kartikBhosaleHQ';

export async function syncXPublicProfile(handle = HANDLE) {
  console.log(`Starting Zero-Ban X Sync for @${handle}...`);

  const url = `https://x.com/${handle}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load x.com/${handle}: HTTP ${res.status}`);
  }

  const html = await res.text();
  console.log(`Loaded ${html.length} bytes from x.com`);

  // Search for the Relay payload script containing profile_user_originals_timeline
  const scriptRegex = /<script[^>]*>(.*?)<\/script>/gs;
  let match;
  let targetScript = null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const s = match[1];
    if (s.includes('profile_user_originals_timeline') && s.includes('value:"')) {
      targetScript = s;
      break;
    }
  }

  if (!targetScript) {
    throw new Error('Could not find public timeline SSR payload in x.com page.');
  }

  const valIdx = targetScript.indexOf('value:"');
  let endIdx = targetScript.lastIndexOf('"}}))($R');
  if (endIdx === -1) endIdx = targetScript.lastIndexOf('"}))');

  const valStr = targetScript.slice(valIdx + 7, endIdx);
  const unescaped = JSON.parse(`"${valStr}"`);
  const data = JSON.parse(unescaped);

  const timeline =
    data?.data?.user_result_by_screen_name?.result?.profile_user_originals_timeline?.timeline;
  const instructions = timeline?.instructions || [];

  const addEntries = instructions.find((i) => i.__typename === 'TimelineAddEntries');
  const entries = addEntries?.entries || [];

  console.log(`Found ${entries.length} raw timeline entries for @${handle}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const postsToUpsert = [];
  const dailyMap = new Map();

  let totalViews = 0;
  let totalLikes = 0;
  let totalReplies = 0;

  for (const entry of entries) {
    const result = entry?.content?.content?.tweet_results?.result;
    if (!result) continue;

    const restId = result.rest_id;
    const views = parseInt(result.views?.count || '0', 10);
    const counts = result.counts || {};
    const likes = counts.favorite_count || 0;
    const replies = counts.reply_count || 0;
    const details = result.details || {};
    const text = details.full_text || '';
    const createdMs = details.created_at_ms || Date.now();
    const dateObj = new Date(createdMs);
    const dateStr = dateObj.toISOString().split('T')[0];

    totalViews += views;
    totalLikes += likes;
    totalReplies += replies;

    postsToUpsert.push({
      platform: 'x',
      platform_post_id: restId,
      content: text,
      published_at: dateObj.toISOString(),
      views,
      likes,
      replies,
      url: `https://x.com/${handle}/status/${restId}`,
      updated_at: new Date().toISOString(),
    });

    const cur = dailyMap.get(dateStr) || { posts: 0, replies: 0, views: 0, likes: 0 };
    cur.posts += 1;
    cur.views += views;
    cur.likes += likes;
    cur.replies += replies;
    dailyMap.set(dateStr, cur);
  }

  if (postsToUpsert.length > 0) {
    console.log(`Upserting ${postsToUpsert.length} posts to Supabase 'posts' table...`);
    const { error: pErr } = await supabase.from('posts').upsert(postsToUpsert, {
      onConflict: 'platform_post_id',
    });
    if (pErr) console.error('Error upserting posts:', pErr);

    console.log(`Upserting ${dailyMap.size} daily aggregates to 'activity_daily' table...`);
    for (const [date, m] of dailyMap.entries()) {
      await supabase.from('activity_daily').upsert(
        {
          date,
          platform: 'x',
          posts: m.posts,
          replies: m.replies,
          views: m.views,
          likes: m.likes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'date,platform' }
      );
    }
  }

  console.log(`Successfully synced ${postsToUpsert.length} real tweets!`);
  console.log(`Metrics: ${totalViews} Views, ${totalLikes} Likes, ${totalReplies} Replies.`);

  return {
    success: true,
    count: postsToUpsert.length,
    totalViews,
    totalLikes,
    totalReplies,
    posts: postsToUpsert,
  };
}

// Run standalone if executed directly
if (process.argv[1]?.endsWith('sync-x-public.mjs')) {
  syncXPublicProfile()
    .then((res) => {
      console.log('Sync completed successfully!', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}
