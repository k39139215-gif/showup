import { supabase } from '../lib/supabase';
import { formatLocalDate } from '../utils/dateMath';

const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID || '865mftbchcmlql';

/**
 * Generate LinkedIn OAuth 2.0 authorization URL
 */
export function getLinkedInAuthUrl(redirectUri: string): string {
  const scope = encodeURIComponent('openid profile email w_member_social');
  const state = Math.random().toString(36).substring(7);
  localStorage.setItem('linkedin_oauth_state', state);

  return (
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${LINKEDIN_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&scope=${scope}`
  );
}

/**
 * Sync real LinkedIn posts and reactions into Supabase
 */
export async function syncLinkedInPostsToSupabase(
  posts: Array<{
    id: string;
    text: string;
    publishedAt: string;
    views: number;
    replies: number;
    likes: number;
    url?: string;
  }>
) {
  const dailyMap = new Map<string, { posts: number; replies: number; views: number; likes: number }>();

  const postsToUpsert = posts.map((p) => {
    const dateStr = formatLocalDate(new Date(p.publishedAt));
    const cur = dailyMap.get(dateStr) || { posts: 0, replies: 0, views: 0, likes: 0 };
    cur.posts += 1;
    cur.replies += p.replies;
    cur.views += p.views;
    cur.likes += p.likes;
    dailyMap.set(dateStr, cur);

    return {
      platform: 'li' as const,
      platform_post_id: p.id,
      content: p.text,
      published_at: p.publishedAt,
      views: p.views,
      replies: p.replies,
      likes: p.likes,
      url: p.url || '',
      updated_at: new Date().toISOString(),
    };
  });

  if (postsToUpsert.length > 0) {
    await supabase.from('posts').upsert(postsToUpsert, { onConflict: 'platform_post_id' });
  }

  for (const [date, metrics] of dailyMap.entries()) {
    await supabase.from('activity_daily').upsert(
      {
        date,
        platform: 'li',
        posts: metrics.posts,
        replies: metrics.replies,
        views: metrics.views,
        likes: metrics.likes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date,platform' }
    );
  }
}
