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

  // URL-synced tab state (?tab=goals)
  useEffect(() => {
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab && ['profile', 'goals', 'acct'].includes(urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
  }, []);

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
            <>
              <div className="acct">
                <span>{badge('x')}X profile</span>
                <span className="pill nu">Connected (@kartik)</span>
              </div>
              <div className="acct">
                <span>{badge('li')}LinkedIn profile</span>
                <span className="pill nu">Connected (/in/kartik)</span>
              </div>
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  Bulk import activities (CSV)
                </h4>
                <p className="muted" style={{ fontSize: '12.5px', marginBottom: '12px' }}>
                  Import external posts and engagement metrics in CSV format to populate activity history.
                </p>
                <FileUpload
                  allowedExtensions={['csv']}
                  onUploadComplete={(file) => {
                    toast.success(`Imported ${file.name}`, {
                      description: 'Parsed 42 activities successfully from CSV.',
                    });
                  }}
                />
              </div>
            </>
          )}
        </Tray>
      </div>
    </>
  );
};
