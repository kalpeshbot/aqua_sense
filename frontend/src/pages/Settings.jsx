import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import api from '../api/client';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';

const CHEMICALS = [
  'calcium_oxide_L',
  'sodium_thiosulfate_L',
  'potassium_permanganate_L',
  'aeration_pump_mins',
  'fish_feed_kg',
];

const POND_IDS = ['pond_1', 'pond_2', 'pond_3'];

export default function Settings() {
  const { pondData } = useData();
  const [tab, setTab] = useState('thresholds');
  const [thresholds, setThresholds] = useState(null);
  const [env, setEnv] = useState(null);
  const [activePond, setActivePond] = useState('pond_1');
  const { addToast } = useToast();
  const [notif, setNotif] = useState({
    dashboard: true,
    sms: false,
    email: true,
    whatsapp: false,
  });
  const [farmProfile, setFarmProfile] = useState({
    farmName: '',
    location: 'Chennai, IN',
    pond1Species: 'Tilapia',
    pond2Species: 'Catfish',
    pond3Species: 'Rohu',
    pond1Capacity: 50000,
    pond2Capacity: 75000,
    pond3Capacity: 60000,
  });

  useEffect(() => {
    api.get('/api/settings/thresholds').then((r) => setThresholds(r.data));
    api.get('/api/settings/env').then((r) => setEnv(r.data));
    const saved = localStorage.getItem('aquasense-farm-profile');
    if (saved) setFarmProfile(JSON.parse(saved));
    const user = localStorage.getItem('aquasense-user');
    if (user) {
      const u = JSON.parse(user);
      setFarmProfile((f) => ({ ...f, farmName: u.farmName || '' }));
    }
  }, []);

  useEffect(() => {
    if (pondData?.ponds) {
      const p1 = pondData.ponds.pond_1;
      const p2 = pondData.ponds.pond_2;
      const p3 = pondData.ponds.pond_3;
      setFarmProfile((f) => ({
        ...f,
        pond1Species: p1?.fish_species || f.pond1Species,
        pond2Species: p2?.fish_species || f.pond2Species,
        pond3Species: p3?.fish_species || f.pond3Species,
        pond1Capacity: p1?.capacity_liters || f.pond1Capacity,
        pond2Capacity: p2?.capacity_liters || f.pond2Capacity,
        pond3Capacity: p3?.capacity_liters || f.pond3Capacity,
      }));
    }
  }, [pondData]);

  const showToast = (msg) => {
    addToast(msg, 'success');
  };

  const saveThreshold = async (chemical, tier, value) => {
    try {
      await api.put(
        `/api/settings/thresholds/${activePond}/${chemical}/${tier}`,
        { value: parseFloat(value) }
      );
      const res = await api.get('/api/settings/thresholds');
      setThresholds(res.data);
      addToast('Threshold updated', 'success');
    } catch {
      addToast('Save failed', 'error');
    }
  };

  const saveFarmProfile = () => {
    localStorage.setItem('aquasense-farm-profile', JSON.stringify(farmProfile));
    showToast('Farm profile saved locally!');
  };

  const tabs = ['thresholds', 'notifications', 'farm', 'system'];

  return (
    <div className="space-y-4">

      <div className="flex flex-wrap gap-2 border-b dark:border-[#222222] border-[#E0E0E0]">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 -mb-px ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent dark:text-[#999999]'
            }`}
          >
            {t === 'farm' ? 'Farm Profile' : t === 'system' ? 'System Info' : t}
          </button>
        ))}
      </div>

      {tab === 'thresholds' && thresholds && (
        <div>
          <div className="flex gap-2 mb-4">
            {POND_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActivePond(id)}
                className={`px-3 py-1 rounded text-sm ${
                  activePond === id ? 'bg-accent text-white' : 'border dark:border-[#222222]'
                }`}
              >
                {id.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="space-y-6">
            {CHEMICALS.map((chem) => {
              const t = thresholds[activePond]?.[chem];
              if (!t) return null;
              return (
                <div
                  key={chem}
                  className="rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
                >
                  <h4 className="font-semibold text-sm mb-3 dark:text-white text-black">
                    {chem.replace(/_/g, ' ')}
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    {['auto_limit', 'owner_limit'].map((tier) => (
                      <div key={tier}>
                        <label className="text-xs dark:text-[#999999] capitalize">
                          {tier.replace('_', ' ')}
                        </label>
                        <input
                          type="number"
                          defaultValue={t[tier]}
                          className="w-full mt-1 px-2 py-1 rounded border dark:bg-black dark:border-[#222222] dark:text-white text-sm"
                          onBlur={(e) => saveThreshold(chem, tier, e.target.value)}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs dark:text-[#999999] flex items-center gap-1">
                        <Lock size={12} /> absolute max (locked)
                      </label>
                      <input
                        type="number"
                        value={t.absolute_max}
                        disabled
                        className="w-full mt-1 px-2 py-1 rounded border opacity-50 dark:bg-black text-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="max-w-md space-y-4">
          {Object.entries(notif).map(([key, val]) => (
            <label
              key={key}
              className="flex items-center justify-between p-3 rounded-xl border dark:bg-[#111111] dark:border-[#222222] border-[#E0E0E0]"
            >
              <span className="capitalize dark:text-white text-black">{key}</span>
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => setNotif((n) => ({ ...n, [key]: e.target.checked }))}
                className="w-5 h-5 accent-accent"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => showToast('Saved!')}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm"
          >
            Save Notifications
          </button>
        </div>
      )}

      {tab === 'farm' && (
        <div className="max-w-lg space-y-4">
          {[
            ['Farm Name', 'farmName'],
            ['Location', 'location'],
            ['Pond 1 Species', 'pond1Species'],
            ['Pond 2 Species', 'pond2Species'],
            ['Pond 3 Species', 'pond3Species'],
            ['Pond 1 Capacity (L)', 'pond1Capacity'],
            ['Pond 2 Capacity (L)', 'pond2Capacity'],
            ['Pond 3 Capacity (L)', 'pond3Capacity'],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-xs dark:text-[#999999]">{label}</label>
              <input
                className="w-full mt-1 px-3 py-2 rounded border dark:bg-[#111111] dark:border-[#222222] dark:text-white text-sm"
                value={farmProfile[key]}
                onChange={(e) =>
                  setFarmProfile((f) => ({ ...f, [key]: e.target.value }))
                }
              />
            </div>
          ))}
          <button
            type="button"
            onClick={saveFarmProfile}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm"
          >
            Save Farm Profile
          </button>
        </div>
      )}

      {tab === 'system' && (
        <div className="space-y-4 max-w-xl">
          {env && (
            <table className="w-full text-sm rounded-xl border dark:border-[#222222]">
              <tbody>
                {Object.entries(env).map(([k, v]) => (
                  <tr key={k} className="border-b dark:border-[#222222]">
                    <td className="p-2 font-semibold dark:text-white">{k}</td>
                    <td className="p-2 dark:text-[#999999]">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="rounded-xl border p-4 dark:bg-[#111111] dark:border-[#222222] border-[#E0E0E0] text-sm space-y-2">
            <p>
              <strong>Prediction ML:</strong> XGBoost v2.1.1 — 2000 training samples
            </p>
            <p>
              <strong>Watchdog ML:</strong> Isolation Forest — 5 models — 1000 samples each
            </p>
            <p>
              <strong>Ollama Model:</strong> {env?.OLLAMA_MODEL || '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
