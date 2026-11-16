import { ContentItem, DayData, N, dayAt, D, CT } from '../data';
import { formatLocalDate } from '../utils/dateMath';

const SYNTHETIC_POST_TEMPLATES: Array<{
  p: 'x' | 'li';
  type: string;
  topic: string;
  text: string;
  views: number;
  likes: number;
  replies: number;
  daysAgo: number;
}> = [
  {
    p: 'li',
    type: 'original post',
    topic: 'Habits',
    daysAgo: 0,
    views: 3140,
    likes: 86,
    replies: 19,
    text: `Most founders fail at social consistency not because they lack ideas, but because they track outcomes instead of inputs.

When you judge every day by likes or follower deltas, an algorithmic dry spell makes you want to quit.

The mental shift that changes everything:
1. Define non-negotiable daily inputs (e.g., 1 post + 5 thoughtful replies).
2. Measure execution rate, not reach volatility.
3. Keep the visual streak alive on a heatmap dashboard.
4. Let the compounding handle the follower growth.

Show up daily. The compounding takes care of the rest.`,
  },
  {
    p: 'x',
    type: 'original post',
    topic: 'Product',
    daysAgo: 0,
    views: 1820,
    likes: 42,
    replies: 7,
    text: `shipped v2.4 of the daily review flow today.

cutting out two redundant confirmation steps bumped our daily habit completion rate by 28%.

friction is the silent killer of consistency. make the right action the easiest one.`,
  },
  {
    p: 'x',
    type: 'original post',
    topic: 'Engineering',
    daysAgo: 1,
    views: 2450,
    likes: 65,
    replies: 12,
    text: `rule one when designing data pipelines: never assume upstream IDs are permanent or unique.

the moment you add defensive deduplication and a clean ledger, 90% of elusive sync bugs vanish overnight.`,
  },
  {
    p: 'li',
    type: 'original post',
    topic: 'Growth',
    daysAgo: 1,
    views: 2680,
    likes: 54,
    replies: 11,
    text: `The 10-Minute Daily Social Ritual that works without burnout:

- 3 minutes: Reply to 3 peers who posted something thoughtful in your space.
- 4 minutes: Draft 1 insight from something you actually fixed or learned today.
- 3 minutes: Respond to all incoming comments from yesterday's post.

Total time: 10 minutes.
No endless doomscrolling, no algorithm anxiety, just steady building in public.`,
  },
  {
    p: 'x',
    type: 'reply external',
    topic: 'Strategy',
    daysAgo: 2,
    views: 640,
    likes: 18,
    replies: 3,
    text: `100% this. the best distribution strategy is building something people actually use and documenting every edge case you encounter.`,
  },
  {
    p: 'li',
    type: 'original post',
    topic: 'Strategy',
    daysAgo: 3,
    views: 4120,
    likes: 112,
    replies: 24,
    text: `A hard lesson learned while building bootstrapped software:

Customers don't care how elegant your backend architecture is. They care whether it reliably solves their bottleneck without creating new headaches.

Before writing a single new module:
1. Interview 5 active users facing the issue manually.
2. Prototype the smallest surgical fix in a quick mock.
3. Validate if it reduces their time-to-value.

Code is a liability; solved problems are the asset.`,
  },
  {
    p: 'x',
    type: 'original post',
    topic: 'Habits',
    daysAgo: 4,
    views: 1380,
    likes: 39,
    replies: 5,
    text: `habits are easier to build when you decouple logging from perfectionism.

logged 4 replies and 1 post before 10 AM. momentum for the rest of the day unlocked.`,
  },
  {
    p: 'li',
    type: 'reply external',
    topic: 'Product',
    daysAgo: 5,
    views: 890,
    likes: 27,
    replies: 4,
    text: `Spot on. We found that giving operators a live heatmap of their unapplied items cut invoice cycle time by nearly 40%. Visibility drives accountability.`,
  },
  {
    p: 'x',
    type: 'original post',
    topic: 'Distribution',
    daysAgo: 6,
    views: 2100,
    likes: 58,
    replies: 9,
    text: `distribution isn't an afterthought you sprinkle on after building.

it's a feedback loop that dictates what you should build next. if you aren't talking to the market weekly, you're building blindfolded.`,
  },
  {
    p: 'li',
    type: 'original post',
    topic: 'Engineering',
    daysAgo: 7,
    views: 3450,
    likes: 95,
    replies: 16,
    text: `Why we moved away from brittle browser scraping to headless REST workers:

1. Scraping breaks with every minor DOM change.
2. Headless REST endpoints have 99.8% uptime.
3. Zero-cookie headless architecture eliminates ban risks.
4. Latency dropped from 14s to under 800ms.

Always pick stability over clever hacks when building background sync engines.`,
  },
  {
    p: 'x',
    type: 'original post',
    topic: 'Growth',
    daysAgo: 8,
    views: 1640,
    likes: 47,
    replies: 6,
    text: `consistency isn't about being motivated every morning.

it's about having a dashboard that reminds you of your streak so quitting hurts more than showing up.`,
  },
  {
    p: 'li',
    type: 'original post',
    topic: 'Product',
    daysAgo: 9,
    views: 2890,
    likes: 67,
    replies: 13,
    text: `The 3 user requests that usually disguise the real product problem:

1. "Can you add a custom export button?" (Translation: Your reporting view is missing the one metric they care about).
2. "Can we integrate with tool X?" (Translation: They don't want to double-enter data manually).
3. "Can we get email alerts for everything?" (Translation: They don't trust the app to do its job silently).

Dig two levels deeper before opening a feature branch.`,
  },
  {
    p: 'x',
    type: 'reply external',
    topic: 'Engineering',
    daysAgo: 10,
    views: 520,
    likes: 14,
    replies: 2,
    text: `strong agree. the moment you store currency as whole cents instead of float/double, an entire category of rounding nightmares disappears.`,
  },
  {
    p: 'li',
    type: 'original post',
    topic: 'Strategy',
    daysAgo: 12,
    views: 3780,
    likes: 104,
    replies: 21,
    text: `How we structure our B2B SaaS roadmap for Q4:

- 50% Core Workflow Polish: Making primary actions instant and effortless.
- 30% Automated Integrations: Removing manual sync steps between platforms.
- 20% Exploratory Bets: Testing high-leverage features requested by power users.

Balance keep-the-lights-on stability with deliberate growth swings.`,
  },
];

/**
 * Seed synthetic data into in-memory D (heatmap) and CT (content items)
 */
export function seedSyntheticData(): void {
  // 1. Seed D (Daily heatmap)
  for (let i = 0; i < N; i++) {
    const daysFromEnd = N - 1 - i;
    // Simulate active streak for the last 50 days
    if (daysFromEnd <= 50) {
      const isWeekend = (N - 1 - i) % 7 === 0 || (N - 1 - i) % 7 === 6;
      const xp = isWeekend ? (daysFromEnd % 3 === 0 ? 1 : 0) : 1 + (daysFromEnd % 2);
      const xr = isWeekend ? 3 + (daysFromEnd % 4) : 7 + (daysFromEnd % 6);
      const lp = isWeekend ? 0 : (daysFromEnd % 3 === 1 ? 2 : 1);
      const lr = isWeekend ? 2 : 4 + (daysFromEnd % 4);
      const xv = (xp * 800) + (xr * 80) + (daysFromEnd * 15);
      const li = (lp * 1100) + (lr * 95) + (daysFromEnd * 20);
      const xl = Math.round(xv * 0.035);
      const ll = Math.round(li * 0.04);

      D[i] = { xp, xr, lp, lr, xv, li, xl, ll };
    } else if (daysFromEnd <= 120) {
      // Intermittent historical activity
      const hasActivity = (i % 3 !== 0);
      if (hasActivity) {
        D[i] = {
          xp: 1,
          xr: 5 + (i % 4),
          lp: i % 2,
          lr: 3,
          xv: 650,
          li: 720,
          xl: 22,
          ll: 18,
        };
      } else {
        D[i] = { xp: 0, xr: 0, lp: 0, lr: 0, xv: 0, li: 0, xl: 0, ll: 0 };
      }
    } else {
      D[i] = { xp: 0, xr: 0, lp: 0, lr: 0, xv: 0, li: 0, xl: 0, ll: 0 };
    }
  }

  // 2. Seed CT (Content Library Items)
  CT.length = 0;
  const now = new Date();

  SYNTHETIC_POST_TEMPLATES.forEach((tpl, idx) => {
    const postDate = new Date(now);
    postDate.setDate(postDate.getDate() - tpl.daysAgo);
    postDate.setHours(10 + (idx % 8), 15 + (idx * 3) % 40, 0, 0);

    const eng = tpl.views > 0 ? parseFloat((((tpl.likes + tpl.replies) / tpl.views) * 100).toFixed(2)) : 0;

    CT.push({
      id: idx + 1,
      dbId: `demo-${idx + 1}`,
      platform_post_id: `synth-${idx + 1}`,
      p: tpl.p,
      type: tpl.type,
      topic: tpl.topic,
      text: tpl.text,
      views: tpl.views,
      likes: tpl.likes,
      replies: tpl.replies,
      eng,
      date: postDate,
      note: '',
    });
  });
}
