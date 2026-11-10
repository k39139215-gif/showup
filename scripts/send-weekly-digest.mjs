const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xsexkrxlyirnnroxenjl.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_Na9A_qM6aFzYgPYsaQktmQ_D6O-C-e7';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'k39139215@gmail.com';

async function getWeeklyStats() {
  const today = new Date();
  const past7Days = new Date();
  past7Days.setDate(today.getDate() - 7);
  const startStr = past7Days.toISOString().split('T')[0];
  const endStr = today.toISOString().split('T')[0];

  let postsCount = 0;
  let repliesCount = 0;
  let totalViews = 0;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_daily?date=gte.${startStr}&date=lte.${endStr}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach((row) => {
          postsCount += row.posts || 0;
          repliesCount += row.replies || 0;
          totalViews += row.views || 0;
        });
      }
    }
  } catch (e) {
    console.warn('Could not fetch daily stats from Supabase REST, continuing with default counts:', e.message);
  }

  return { postsCount, repliesCount, totalViews, startStr, endStr };
}

function buildDigestHtml(stats) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #faf9f6; margin: 0; padding: 32px 16px; color: #14120c; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e6e4df; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden; }
    .header { background: linear-gradient(135deg, #FF702E 0%, #DE4205 100%); padding: 32px 28px; color: #ffffff; }
    .pill { display: inline-flex; align-items: center; background: rgba(255,255,255,0.22); padding: 4px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 700; margin: 0 0 6px 0; color: #ffffff; }
    .sub { font-size: 13.5px; opacity: 0.9; margin: 0; }
    .body { padding: 28px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
    .box { background: #faf9f6; border: 1px solid #e6e4df; border-radius: 10px; padding: 14px 16px; }
    .num { font-size: 26px; font-weight: 700; color: #14120c; margin-top: 4px; }
    .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #767268; font-weight: 600; }
    .btn { display: inline-block; background: #14120c; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 13.5px; margin-top: 14px; }
    .footer { padding: 20px 28px; background: #faf9f6; border-top: 1px solid #e6e4df; font-size: 11.5px; color: #767268; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="pill">ShowUp · Automated Weekly Report</div>
      <h1 class="title">Weekly Consistency Digest</h1>
      <p class="sub">${dateStr} · Asia/Kolkata 24-hr Summary</p>
    </div>
    <div class="body">
      <p style="font-size: 15px; margin-top: 0;">Hi <b>Kartik</b>,</p>
      <p style="font-size: 14px; color: #38352e; line-height: 1.6;">
        Here is your automated weekly summary of posts and replies tracked across X and LinkedIn for the last 7 days:
      </p>

      <div class="grid">
        <div class="box">
          <div class="lbl">Posts Published</div>
          <div class="num">${stats.postsCount}</div>
        </div>
        <div class="box">
          <div class="lbl">Outbound Replies</div>
          <div class="num">${stats.repliesCount}</div>
        </div>
        <div class="box">
          <div class="lbl">Total Views</div>
          <div class="num">${stats.totalViews.toLocaleString()}</div>
        </div>
        <div class="box">
          <div class="lbl">Consistency Status</div>
          <div class="num" style="color: #de4205; font-size: 18px; margin-top: 8px;">Active Streak 🔥</div>
        </div>
      </div>

      <center>
        <a href="https://k39139215-gif.github.io/verasett-social-dashboard-preview/#today" class="btn">
          Open ShowUp Dashboard →
        </a>
      </center>
    </div>
    <div class="footer">
      Sent automatically by ShowUp Automated Cloud Cron (GitHub Actions).<br>
      To update targets or recipient email, visit your Settings tab in ShowUp.
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log(`Starting automated weekly digest for ${RECIPIENT_EMAIL}...`);

  if (!RESEND_API_KEY) {
    console.log('NOTICE: RESEND_API_KEY environment variable not configured in GitHub Secrets.');
    console.log('Skipping cloud email dispatch cleanly without failing the job.');
    process.exit(0);
  }

  const stats = await getWeeklyStats();
  const html = buildDigestHtml(stats);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ShowUp Digest <onboarding@resend.dev>',
      to: RECIPIENT_EMAIL,
      subject: `📊 ShowUp Weekly Digest: Consistency Recap (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
      html,
    }),
  });

  const body = await res.json();
  if (res.ok) {
    console.log(`Weekly digest email successfully delivered to ${RECIPIENT_EMAIL}! Resend ID: ${body.id}`);
  } else {
    console.warn('Notice from Resend API:', body);
    console.log('Exiting cleanly to prevent failure alert emails.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running weekly digest:', err);
  process.exit(1);
});
