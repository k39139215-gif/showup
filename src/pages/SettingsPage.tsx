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
  const [emailDigest, setEmailDigest] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);
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
    const redirectUri = `${window.location.origin}${window.location.pathname}?tab=acct#settings`;
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
              <div className="mt-5 flex flex-col gap-3">
                <b className="text-[13.5px] font-medium text-[var(--ink)]">Notification preferences</b>
                <div className="flex flex-col gap-2.5">
                  <Switch isSelected={emailDigest} onChange={setEmailDigest}>
                    Weekly email digest summary
                  </Switch>
                  <Switch isSelected={streakAlerts} onChange={setStreakAlerts}>
                    Real-time streak alerts (Asia/Kolkata boundary)
                  </Switch>
                </div>
              </div>
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
                    <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-2">
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
                    className="btn text-xs py-1.5 px-3 h-auto"
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
                    <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-2">
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
