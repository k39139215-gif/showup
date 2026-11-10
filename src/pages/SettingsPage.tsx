import {
  getNotificationSettings,
  saveNotificationSettings,
  requestDesktopNotificationPermission,
  sendDesktopNotification,
  dispatchEmail,
  getEmailLogs,
  EmailDispatchLog,
} from '../services/notificationService';
import React, { useState, useEffect } from 'react';
import { G, Goals } from '../data';
import { badge, Tray } from '../utils';
import { BoardSelect } from '../components/base/select/BoardSelect';
import { PillTabList, PillTab } from '../components/base/tabs/pill-tab';
import { toast } from '../components/base/toast/toast';
import { NumberField } from '../components/base/number-field/number-field';
import { Switch } from '../components/base/switch/switch';
import { FileUpload } from '../components/base/file-upload/file-upload';
import { TagGroup, Tag } from '../components/base/tag-group/tag-group';
import { TOPICS } from '../data';
import { TIMEZONE_OPTIONS } from '../utils/dateMath';
import { getLinkedInAuthUrl } from '../services/linkedinService';

interface SettingsPageProps {
  tab: string;
  setTab: (tab: string) => void;
  onSaveTargets: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ tab, setTab, onSaveTargets }) => {
  const tabs = [
    ['profile', 'Profile'],
    ['goals', 'Daily goals & timezone'],
    ['acct', 'Connected accounts & data'],
  ];

  const [formG, setFormG] = useState<Goals>({ ...G });
  const [saveMsg, setSaveMsg] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [notifSettings, setNotifSettings] = useState(() => getNotificationSettings());
  const [recipientEmail, setRecipientEmail] = useState(() => notifSettings.recipientEmail || 'k39139215@gmail.com');
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailLogs, setEmailLogs] = useState<EmailDispatchLog[]>(() => getEmailLogs());
  const [selectedPreviewLog, setSelectedPreviewLog] = useState<EmailDispatchLog | null>(null);
  const [showAdvancedEmail, setShowAdvancedEmail] = useState<boolean>(false);
  const [resendApiKey, setResendApiKey] = useState(() => notifSettings.resendApiKey || '');
  const [webhookUrl, setWebhookUrl] = useState(() => notifSettings.webhookUrl || '');

  const handleSaveEmail = () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    const updated = saveNotificationSettings({ recipientEmail });
    setNotifSettings(updated);
    toast.success('Alert recipient email saved', { description: recipientEmail });
  };

  const handleToggleDigest = (val: boolean) => {
    const updated = saveNotificationSettings({ emailDigest: val });
    setNotifSettings(updated);
  };

  const handleToggleStreakAlerts = (val: boolean) => {
    const updated = saveNotificationSettings({ streakAlerts: val });
    setNotifSettings(updated);
    if (val && desktopPermission !== 'granted') {
      handleRequestDesktop();
    }
  };

  const handleToggleDesktop = (val: boolean) => {
    const updated = saveNotificationSettings({ desktopAlerts: val });
    setNotifSettings(updated);
    if (val && desktopPermission !== 'granted') {
      handleRequestDesktop();
    }
  };

  const handleRequestDesktop = async () => {
    const perm = await requestDesktopNotificationPermission();
    setDesktopPermission(perm);
    if (perm === 'granted') {
      sendDesktopNotification('🔥 ShowUp Streak Alerts Enabled', 'You will receive real-time notifications for your daily goals.');
      toast.success('Desktop notifications enabled!');
    } else {
      toast.error('Desktop notifications permission denied in browser.');
    }
  };

  const handleSendTestStreakAlert = async () => {
    setIsSendingEmail(true);
    toast.info('Sending streak alert email...', { description: `Target: ${recipientEmail}` });
    try {
      const res = await dispatchEmail('streak_alert', recipientEmail);
      setIsSendingEmail(false);
      setEmailLogs(getEmailLogs());
      if (res.success) {
        toast.success('🔥 Streak alert email sent!', { description: res.message });
        if (notifSettings.desktopAlerts) {
          sendDesktopNotification('🔥 ShowUp Streak Alert', `Streak alert email successfully sent to ${recipientEmail}`);
        }
        setSelectedPreviewLog(res.log);
      } else {
        toast.error('Failed to send email', { description: res.message });
      }
    } catch (e: any) {
      setIsSendingEmail(false);
      toast.error('Error sending alert email', { description: e.message });
    }
  };

  const handleSendTestWeeklyDigest = async () => {
    setIsSendingEmail(true);
    toast.info('Sending weekly digest email...', { description: `Target: ${recipientEmail}` });
    try {
      const res = await dispatchEmail('weekly_digest', recipientEmail);
      setIsSendingEmail(false);
      setEmailLogs(getEmailLogs());
      if (res.success) {
        toast.success('📊 Weekly digest email sent!', { description: res.message });
        setSelectedPreviewLog(res.log);
      } else {
        toast.error('Failed to send digest', { description: res.message });
      }
    } catch (e: any) {
      setIsSendingEmail(false);
      toast.error('Error sending digest email', { description: e.message });
    }
  };

  const handleSaveAdvanced = () => {
    const updated = saveNotificationSettings({ resendApiKey, webhookUrl });
    setNotifSettings(updated);
    toast.success('Custom email API & Webhook settings saved!');
  };
  const [monitoredTopics, setMonitoredTopics] = useState<string[]>(() => [...TOPICS]);

  // Social account integration state
  const [xHandle, setXHandle] = useState<string>(() => localStorage.getItem('verasett_x_handle') || 'kartikBhosaleHQ');
  const [isXConnected, setIsXConnected] = useState<boolean>(() => localStorage.getItem('verasett_x_connected') !== 'false');
  const [isLinkedInConnected, setIsLinkedInConnected] = useState<boolean>(() => localStorage.getItem('verasett_li_connected') === 'true');
  const [isConnectingLi, setIsConnectingLi] = useState<boolean>(false);
  const [syncCooldown, setSyncCooldown] = useState<number>(0);

  useEffect(() => {
    if (syncCooldown <= 0) return;
    const timer = setInterval(() => {
      setSyncCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [syncCooldown]);

  // URL-synced tab state (?tab=goals) & LinkedIn OAuth callback detection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('tab');
    if (urlTab && ['profile', 'goals', 'acct'].includes(urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }

    // Check if returning from LinkedIn OAuth
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (code && state) {
      const savedState = localStorage.getItem('linkedin_oauth_state');
      if (state === savedState) {
        localStorage.setItem('verasett_li_connected', 'true');
        setIsLinkedInConnected(true);
        toast.success('LinkedIn Connected!', {
          description: 'Your LinkedIn account has been successfully linked to your workspace.',
        });
        // Clean URL query
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('code');
        cleanUrl.searchParams.delete('state');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    }
  }, []);

  const handleConnectLinkedIn = () => {
    setIsConnectingLi(true);
    let redirectUri = `${window.location.origin}${window.location.pathname}`;
    if (!redirectUri.endsWith('/')) {
      redirectUri += '/';
    }
    const authUrl = getLinkedInAuthUrl(redirectUri);
    window.location.href = authUrl;
  };

  const handleDisconnectLinkedIn = () => {
    localStorage.removeItem('verasett_li_connected');
    localStorage.removeItem('linkedin_oauth_state');
    setIsLinkedInConnected(false);
    toast.info('LinkedIn Disconnected', {
      description: 'Your LinkedIn account has been disconnected.',
    });
  };

  const handleSaveXHandle = () => {
    if (syncCooldown > 0) {
      toast.info('Rate limit active', {
        description: `Please wait ${syncCooldown}s before syncing again to respect Twitter API rate limits.`,
      });
      return;
    }
    const clean = xHandle.replace(/^@/, '').trim();
    localStorage.setItem('verasett_x_handle', clean);
    localStorage.setItem('verasett_x_connected', 'true');
    setIsXConnected(true);
    setSyncCooldown(60); // 60s cooldown to protect Twitter rate limits
    toast.success('X Profile Linked', {
      description: `Linked @${clean} to your workspace. Sync scheduled.`,
    });
  };

  const handleDisconnectX = () => {
    localStorage.setItem('verasett_x_connected', 'false');
    setIsXConnected(false);
    toast.info('X Profile Disconnected');
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  };

  const handleSave = () => {
    G.xp = Math.max(0, formG.xp || 0);
    G.xr = Math.max(0, formG.xr || 0);
    G.lp = Math.max(0, formG.lp || 0);
    G.lr = Math.max(0, formG.lr || 0);
    setSaveMsg('Saved. Today and Review now use the new targets.');
    onSaveTargets();

    toast.success('Targets saved', {
      description: 'Today and Review now use the new targets.',
      duration: 4000,
    });
  };

  const currentTabTitle = tabs.find((t) => t[0] === tab)?.[1] || 'Profile';

  return (
    <>
      <div className="head">
        <div>
          <h1>Settings & integrations</h1>
          <p className="sub">Account connections, daily targets and data privacy</p>
        </div>
      </div>

      <div id="tb" className="tabs mb-4">
        <PillTabList className="p-1 bg-[var(--tray)] rounded-xl border border-[var(--line)] inline-flex gap-1">
          {tabs.map(([k, t]) => (
            <PillTab
              key={k}
              variant="gray"
              isSelected={tab === k}
              onSelect={() => handleTabChange(k)}
              className={tab === k ? 'on font-semibold' : ''}
            >
              {t}
            </PillTab>
          ))}
        </PillTabList>
      </div>

      <div style={{ maxWidth: '820px' }}>
        <Tray icon="settings" title={currentTabTitle}>
          {tab === 'profile' && (
            <>
              <div className="fgrid">
                <label className="fld">
                  Full name
                  <input defaultValue="Kartik Sharma" />
                </label>
                <label className="fld">
                  Product focus
                  <input
                    defaultValue="Verasett (AR cash application & NetSuite/SAP reconciliations)"
                    readOnly
                  />
                </label>
              </div>
              <div className="mt-5 border border-[var(--line)] rounded-xl p-3.5 bg-[var(--app-bg)]/40">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px]">🔔</span>
                    <b className="text-[13.5px] font-semibold text-[var(--ink)]">Notifications & Automated Weekly Digest</b>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Active (Every Sun 10:00 AM)</span>
                  </span>
                </div>

                {/* Recipient Email Inline */}
                <div className="flex items-center justify-between py-2 border-b border-[var(--line)]/60 text-[12.5px]">
                  <span className="text-[var(--mute)]">Recipient</span>
                  <div className="flex items-center gap-2 font-medium text-[var(--ink)]">
                    <span>{recipientEmail}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newMail = prompt('Enter new recipient email:', recipientEmail);
                        if (newMail && newMail.includes('@')) {
                          setRecipientEmail(newMail);
                          saveNotificationSettings({ recipientEmail: newMail });
                          toast.success('Recipient updated', { description: newMail });
                        }
                      }}
                      className="text-[11.5px] text-[#FF702E] hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-col gap-2.5 py-3 border-b border-[var(--line)]/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12.5px] font-medium text-[var(--ink)]">Weekly email digest summary</div>
                      <div className="text-[11px] text-[var(--mute)]">Delivered automatically every Sunday at 10:00 AM IST</div>
                    </div>
                    <Switch isSelected={notifSettings.emailDigest} onChange={handleToggleDigest} aria-label="Weekly digest" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12.5px] font-medium text-[var(--ink)]">Real-time streak alerts</div>
                      <div className="text-[11px] text-[var(--mute)]">Email & system alerts before midnight boundary</div>
                    </div>
                    <Switch isSelected={notifSettings.streakAlerts} onChange={handleToggleStreakAlerts} aria-label="Streak alerts" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12.5px] font-medium text-[var(--ink)]">Desktop OS notifications</div>
                      <div className="text-[11px] text-[var(--mute)]">
                        {desktopPermission === 'granted' ? (
                          <span className="text-emerald-600 font-medium">Active (Granted)</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Click button to allow</span>
                        )}
                      </div>
                    </div>
                    {desktopPermission === 'granted' ? (
                      <Switch isSelected={notifSettings.desktopAlerts} onChange={handleToggleDesktop} aria-label="Desktop notifications" />
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestDesktop}
                        className="px-2 py-0.5 text-[11px] font-medium rounded bg-[#FF702E]/10 text-[#DE4205] border border-[#FF702E]/30 hover:bg-[#FF702E]/20 transition-all cursor-pointer"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions & Compact Key Config */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSendingEmail}
                      onClick={handleSendTestStreakAlert}
                      className="px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-gradient-to-r from-[#FF702E] to-[#DE4205] text-[#fff] shadow-xs hover:opacity-95 active:scale-98 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <span>🔥</span>
                      <span>{isSendingEmail ? 'Sending...' : 'Send Test Alert'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSendingEmail}
                      onClick={handleSendTestWeeklyDigest}
                      className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-[#fff] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--shell)] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <span>📊</span>
                      <span>Weekly Digest</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvancedEmail(!showAdvancedEmail)}
                    className="text-[11.5px] text-[var(--mute)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showAdvancedEmail ? 'Hide API Key' : 'Configure Key'}</span>
                    <span>⚙️</span>
                  </button>
                </div>

                {/* Collapsible Key Config */}
                {showAdvancedEmail && (
                  <div className="mt-3 p-3 rounded-lg bg-[#fff] border border-[var(--line)] flex flex-col gap-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-[11.5px] font-medium text-[var(--ink)]">
                        Resend API Key (<span className="font-mono text-[#de4205]">re_...</span>)
                      </label>
                      <a
                        href="https://resend.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#FF702E] hover:underline"
                      >
                        Resend Dashboard →
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={resendApiKey}
                        onChange={(e) => setResendApiKey(e.target.value)}
                        placeholder="re_..."
                        className="flex-1 px-2.5 py-1.5 text-[12px] rounded-md border border-[var(--line)] font-mono text-[var(--ink)] focus:outline-none focus:border-[#FF702E]"
                      />
                      <button
                        type="button"
                        onClick={handleSaveAdvanced}
                        className="px-3 py-1.5 text-[11.5px] font-medium rounded-md bg-[var(--ink)] text-[#fff] shrink-0 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Preview Modal */}
              {selectedPreviewLog && (
                <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
                  <div
                    className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
                    onClick={() => setSelectedPreviewLog(null)}
                  />
                  <div className="relative bg-[#fff] rounded-2xl border border-[var(--line)] shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-[620px] w-full max-h-[90vh] flex flex-col overflow-hidden z-[12001] animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--app-bg)]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📧</span>
                          <b className="text-[14px] text-[var(--ink)]">{selectedPreviewLog.subject}</b>
                        </div>
                        <div className="text-[11.5px] text-[var(--mute)] mt-0.5">
                          To: <b>{selectedPreviewLog.recipient}</b> · {new Date(selectedPreviewLog.timestamp).toLocaleTimeString()} ({selectedPreviewLog.method})
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewLog(null)}
                        className="w-7 h-7 rounded-md hover:bg-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] grid place-items-center cursor-pointer text-sm font-semibold"
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto bg-[#faf9f6]">
                      <div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[#fff] shadow-sm">
                        <iframe
                          title="Email Preview"
                          srcDoc={selectedPreviewLog.htmlContent}
                          className="w-full h-[420px] border-none"
                        />
                      </div>
                    </div>
                    <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--app-bg)] flex items-center justify-between">
                      <span className="text-[11.5px] text-emerald-600 font-medium flex items-center gap-1">
                        <span>✓</span> Dispatched & Delivered Successfully
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewLog(null)}
                        className="px-4 py-1.5 text-[12.5px] font-medium rounded-lg bg-[var(--ink)] text-[#fff] cursor-pointer"
                      >
                        Close Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-5">
                <TagGroup
                  label="Monitored topics"
                  hint="Topics prioritized across content scoring and recommendation engines"
                  items={monitoredTopics.map((t) => ({ id: t, name: t }))}
                  onRemove={(keys) => {
                    const toRemove = new Set(keys);
                    setMonitoredTopics((prev) => prev.filter((t) => !toRemove.has(t)));
                    toast.info('Topic removed');
                  }}
                >
                  {(item: { id: string; name: string }) => <Tag id={item.id}>#{item.name}</Tag>}
                </TagGroup>
              </div>
            </>
          )}

          {tab === 'goals' && (
            <>
              <div className="fgrid">
                {(
                  [
                    ['xp', 'X original posts / day'],
                    ['xr', 'X outbound replies / day'],
                    ['lp', 'LinkedIn posts / day'],
                    ['lr', 'LinkedIn replies / day'],
                  ] as const
                ).map(([k, t]) => (
                  <div className="fld" key={k}>
                    <NumberField
                      id={`g_${k}`}
                      label={t}
                      minValue={0}
                      maxValue={100}
                      value={formG[k]}
                      onChange={(val) =>
                        setFormG({
                          ...formG,
                          [k]: Math.max(0, val || 0),
                        })
                      }
                      aria-label={t}
                    />
                  </div>
                ))}
                <label className="fld">
                  Timezone
                  <BoardSelect
                    id="s_tz"
                    value={timezone}
                    onChange={setTimezone}
                    options={TIMEZONE_OPTIONS}
                    aria-label="Timezone"
                  />
                </label>
              </div>
              <div
                style={{
                  marginTop: '18px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <button className="btn" id="gs_save" onClick={handleSave}>
                  Save targets
                </button>
                <span className="muted" id="gs_ok">
                  {saveMsg}
                </span>
              </div>
            </>
          )}

          {tab === 'acct' && (
            <div className="flex flex-col gap-4">
              {/* X Profile Card */}
              <div className="p-4 rounded-xl border border-[var(--line)] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm">
                    𝕏
                  </div>
                  <div>
                    <div className="flex items-center gap-2 shrink-0">
                      <b className="text-[14px]">X (Twitter) Profile</b>
                      {isXConnected ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Disconnected
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] text-[#6b7280] mt-0.5">
                      Syncs public original posts, impressions, and metrics via Zero-Ban guest gateway.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">@</span>
                    <input
                      type="text"
                      className="pl-6 pr-3 py-1.5 text-xs rounded-lg border border-[var(--line)] w-[150px] font-mono"
                      value={xHandle}
                      onChange={(e) => setXHandle(e.target.value)}
                      placeholder="username"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn text-xs py-1.5 px-3 h-auto whitespace-nowrap shrink-0"
                    onClick={handleSaveXHandle}
                    disabled={syncCooldown > 0}
                  >
                    {syncCooldown > 0 ? `Wait ${syncCooldown}s` : 'Save & Sync'}
                  </button>
                  {isXConnected && (
                    <button
                      type="button"
                      className="btn ghost text-xs py-1.5 px-2.5 h-auto text-red-600 hover:bg-red-50"
                      onClick={handleDisconnectX}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>

              {/* LinkedIn OAuth Card */}
              <div className="p-4 rounded-xl border border-[var(--line)] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0077b5] text-white flex items-center justify-center font-bold text-sm">
                    in
                  </div>
                  <div>
                    <div className="flex items-center gap-2 shrink-0">
                      <b className="text-[14px]">LinkedIn Integration</b>
                      {isLinkedInConnected ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Not Connected
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] text-[#6b7280] mt-0.5">
                      Connect via official LinkedIn OAuth 2.0 to sync member posts, shares, and reactions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isLinkedInConnected ? (
                    <button
                      type="button"
                      className="btn ghost text-xs py-1.5 px-3 h-auto text-red-600 hover:bg-red-50 border border-red-200"
                      onClick={handleDisconnectLinkedIn}
                    >
                      Disconnect LinkedIn
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn text-xs py-1.5 px-3.5 h-auto bg-[#0077b5] hover:bg-[#006097] text-white border-0 flex items-center gap-1.5"
                      onClick={handleConnectLinkedIn}
                      disabled={isConnectingLi}
                    >
                      {isConnectingLi ? 'Redirecting...' : 'Connect with LinkedIn'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                  Bulk import activities (CSV)
                </h4>
                <p className="muted" style={{ fontSize: '12.5px', marginBottom: '12px' }}>
                  Import external posts and engagement metrics in CSV format to populate activity history.
                </p>
                <FileUpload
                  allowedExtensions={['csv']}
                  onUploadComplete={(file) => {
                    toast.success(`Imported ${file.name}`, {
                      description: 'Parsed activities successfully from CSV.',
                    });
                  }}
                />
              </div>
            </div>
          )}
        </Tray>
      </div>
    </>
  );
};
