import React, { useState } from 'react';
import { G, Goals } from '../data';
import { badge, Tray } from '../utils';

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

  const handleSave = () => {
    G.xp = Math.max(0, formG.xp || 0);
    G.xr = Math.max(0, formG.xr || 0);
    G.lp = Math.max(0, formG.lp || 0);
    G.lr = Math.max(0, formG.lr || 0);
    setSaveMsg('Saved. Today and Review now use the new targets.');
    onSaveTargets();
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

      <div className="seg tabs" id="tb">
        {tabs.map(([k, t]) => (
          <button
            key={k}
            data-k={k}
            className={tab === k ? 'on' : undefined}
            onClick={() => setTab(k)}
          >
            {t}
          </button>
        ))}
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
              <p className="muted" style={{ marginTop: '14px', fontSize: '13px' }}>
                Light theme only in this design pass.
              </p>
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
                  <label className="fld" key={k}>
                    {t}
                    <input
                      type="number"
                      min="0"
                      id={`g_${k}`}
                      value={formG[k]}
                      onChange={(e) =>
                        setFormG({
                          ...formG,
                          [k]: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                    />
                  </label>
                ))}
                <label className="fld">
                  Timezone
                  <select defaultValue="Asia/Kolkata">
                    <option>Asia/Kolkata</option>
                  </select>
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
                <span className="pill nu">Preview data</span>
              </div>
              <div className="acct">
                <span>{badge('li')}LinkedIn profile</span>
                <span className="pill nu">Preview data</span>
              </div>
              <p className="muted" style={{ fontSize: '13px', marginTop: '12px' }}>
                Everything shown is generated placeholder data until accounts are connected.
              </p>
            </>
          )}
        </Tray>
      </div>
    </>
  );
};
