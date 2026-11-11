import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-load .env if available
try {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach((l) => {
      const idx = l.indexOf('=');
      if (idx !== -1) {
        const k = l.slice(0, idx).trim();
        const v = l.slice(idx + 1).trim();
        if (k && !process.env[k]) process.env[k] = v;
      }
    });
  }
} catch (e) {}

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://xsexkrxlyirnnroxenjl.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_Na9A_qM6aFzYgPYsaQktmQ_D6O-C-e7';
const APIFY_TOKEN =
  process.env.APIFY_TOKEN ||
  '';
const PROFILE_URL =
  process.env.LINKEDIN_PROFILE_URL ||
  'https://www.linkedin.com/in/kartik-bhosale/';

const POST_SEARCH_ACTOR = 'buIWk2uOUzTmcLsuB'; // harvestapi/linkedin-post-search
const COMMENTS_ACTOR = 'harvestapi~linkedin-profile-comments';

/**
 * Helper to execute an Apify actor synchronously and fetch dataset items
 */
async function runApifyActor(actorId, input, label = 'Actor') {
  console.log(`📡 [Apify] Running ${label} (${actorId})...`);
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Apify error for ${label} (HTTP ${res.status}): ${errText}`);
  }

  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

/**
 * Main function: Sync LinkedIn Posts and Outbound Comments into Supabase
 */
export async function syncLinkedInProfile() {
  console.log('====================================================');
  console.log(`🚀 Starting Live LinkedIn Sync for ${PROFILE_URL}`);
  console.log('====================================================');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const postsToUpsert = [];
  const dailyMap = new Map();

  let originalPostsCount = 0;
  let outboundRepliesCount = 0;
  let totalLikes = 0;
  let totalReplies = 0;
  let totalViews = 0;

  // 1. Fetch Original LinkedIn Posts via harvestapi/linkedin-post-search
  try {
    const postSearchInput = {
      authorUrls: [PROFILE_URL],
      sortBy: 'date',
      maxPosts: 10,
      scrapeComments: false,
      scrapeReactions: false,
    };

    const rawPosts = await runApifyActor(POST_SEARCH_ACTOR, postSearchInput, 'LinkedIn Posts');
    console.log(`✅ [Apify] Received ${rawPosts.length} post items from LinkedIn post search.`);

    for (const p of rawPosts) {
      if (p.type && p.type !== 'post') continue;

      const postId = p.id || p.shareUrn || p.entityId;
      if (!postId) continue;

      const content = p.content || p.text || 'LinkedIn Post';
      const publishedAt = p.postedAt?.date
        ? new Date(p.postedAt.date).toISOString()
        : p.postedAt?.timestamp
        ? new Date(p.postedAt.timestamp).toISOString()
        : new Date().toISOString();

      const dateStr = publishedAt.split('T')[0];
      const likes = p.engagement?.likes || p.numLikes || 0;
      const replies = p.engagement?.comments || p.numComments || 0;
      const views = p.engagement?.views || (likes > 0 ? likes * 10 : 0);
      const url = p.linkedinUrl || p.socialContent?.shareUrl || `https://www.linkedin.com/posts/activity-${postId}`;

      originalPostsCount++;
      totalLikes += likes;
      totalReplies += replies;
      totalViews += views;

      postsToUpsert.push({
        platform: 'li',
        platform_post_id: String(postId),
        content,
        published_at: publishedAt,
        views,
        likes,
        replies,
        url,
        updated_at: new Date().toISOString(),
      });

      const cur = dailyMap.get(dateStr) || { posts: 0, replies: 0, views: 0, likes: 0 };
      cur.posts += 1;
      cur.likes += likes;
      cur.replies += replies;
      cur.views += views;
      dailyMap.set(dateStr, cur);
    }
  } catch (err) {
    console.error('⚠️ Error fetching LinkedIn posts from Apify:', err.message);
  }

  // 2. Fetch Outbound Replies & Comments via harvestapi/linkedin-profile-comments
  try {
    const commentsInput = {
      profileUrls: [PROFILE_URL],
      maxComments: 15,
    };

    const rawComments = await runApifyActor(COMMENTS_ACTOR, commentsInput, 'LinkedIn Comments');
    console.log(`✅ [Apify] Received ${rawComments.length} outbound comment items.`);

    for (let i = 0; i < rawComments.length; i++) {
      const c = rawComments[i];
      const commentId = c.id || c.urn || `li-comment-${c.postId || 'post'}-${i}`;
      const content = c.text || c.commentText || c.content || 'Outbound comment on LinkedIn';
      const publishedAt = c.postedAt?.date
        ? new Date(c.postedAt.date).toISOString()
        : c.postedAt?.timestamp
        ? new Date(c.postedAt.timestamp).toISOString()
        : c.createdAt
        ? new Date(c.createdAt).toISOString()
        : new Date().toISOString();

      const dateStr = publishedAt.split('T')[0];
      const likes = c.likes || c.numLikes || c.reactionsCount || 0;
      const url = c.commentUrl || c.postUrl || PROFILE_URL;

      outboundRepliesCount++;
      totalLikes += likes;

      postsToUpsert.push({
        platform: 'li',
        platform_post_id: String(commentId),
        content,
        published_at: publishedAt,
        views: 0,
        likes,
        replies: 0,
        url,
        updated_at: new Date().toISOString(),
      });

      const cur = dailyMap.get(dateStr) || { posts: 0, replies: 0, views: 0, likes: 0 };
      cur.replies += 1;
      cur.likes += likes;
      dailyMap.set(dateStr, cur);
    }
  } catch (err) {
    console.error('⚠️ Error fetching LinkedIn comments from Apify:', err.message);
  }

  // 3. Upsert into Supabase tables
  if (postsToUpsert.length > 0) {
    console.log(`💾 Upserting ${postsToUpsert.length} LinkedIn items into 'posts' table...`);
    const { error: pErr } = await supabase.from('posts').upsert(postsToUpsert, {
      onConflict: 'platform_post_id',
    });
    if (pErr) {
      console.error('❌ Error upserting to posts table:', pErr);
    } else {
      console.log('✅ Successfully upserted LinkedIn items to posts table.');
    }
  }

  if (dailyMap.size > 0) {
    console.log(`📊 Upserting ${dailyMap.size} daily activity rows into 'activity_daily' table...`);
    for (const [date, m] of dailyMap.entries()) {
      const { error: dErr } = await supabase.from('activity_daily').upsert(
        {
          date,
          platform: 'li',
          posts: m.posts,
          replies: m.replies,
          views: m.views,
          likes: m.likes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'date,platform' }
      );
      if (dErr) console.error(`❌ Error upserting daily activity for ${date}:`, dErr);
      else console.log(`   - ${date}: ${m.posts} posts, ${m.replies} replies, ${m.likes} likes, ${m.views} views`);
    }
  }

  console.log('----------------------------------------------------');
  console.log('🎉 LinkedIn Live Sync Complete Summary:');
  console.log(`   - Original Posts Synced: ${originalPostsCount}`);
  console.log(`   - Outbound Replies Synced: ${outboundRepliesCount}`);
  console.log(`   - Total Likes Accumulated: ${totalLikes}`);
  console.log(`   - Total Comments/Replies: ${totalReplies}`);
  console.log(`   - Total Estimated Views: ${totalViews}`);
  console.log(`   - Dates Updated: ${Array.from(dailyMap.keys()).join(', ') || 'None'}`);
  console.log('====================================================');

  return {
    success: true,
    originalPostsCount,
    outboundRepliesCount,
    totalLikes,
    totalReplies,
    totalViews,
    dates: Array.from(dailyMap.keys()),
  };
}

// CLI execution check
if (process.argv[1]?.endsWith('sync-linkedin.mjs')) {
  syncLinkedInProfile()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal LinkedIn sync error:', err);
      process.exit(1);
    });
}
