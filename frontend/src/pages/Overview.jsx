import { useEffect, useState } from 'react';
import { AlertTriangle, Droplets, Radio, Shield } from 'lucide-react';
import api from '../api/client';
import { useData } from '../context/DataContext';
import PondCard from '../components/PondCard';
import { SkeletonCard, SkeletonText } from '../components/Skeleton';

export default function Overview() {
  const { pondData, farmSummary, pendingApprovals, criticalSensors, loading, setFarmSummary } =
    useData();
  const [weather, setWeather] = useState(null);
  const [history, setHistory] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const refreshSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get('/api/agent/summary');
      setFarmSummary(res.data);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await api.get('/api/weather');
        setWeather(res.data);
      } catch {
        setWeather(null);
      }
    };
    const fetchHistory = async () => {
      try {
        const res = await api.get('/api/approvals/history');
        setHistory(res.data || []);
      } catch {
        setHistory([]);
      }
    };
    fetchWeather();
    fetchHistory();
    const w = setInterval(fetchWeather, 60000);
    return () => clearInterval(w);
  }, []);

  const ponds = pondData?.ponds || {};
  const lastAction = history[0];

  const stats = [
    { icon: Droplets, label: 'Total Ponds', value: 3 },
    { icon: AlertTriangle, label: 'Active Alerts', value: pendingApprovals?.length || 0 },
    { icon: Radio, label: 'Critical Sensors', value: criticalSensors?.length || 0 },
    {
      icon: Shield,
      label: 'Farm Status',
      value: farmSummary?.overall_status || 'LOADING',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
          >
            <Icon size={20} className="text-accent mb-2" />
            <div className="text-2xl font-bold dark:text-white text-black">{value}</div>
            <div className="text-xs dark:text-[#999999] text-[#666666]">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-5 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold tracking-wider dark:text-[#999999] text-[#666666]">
            AI FARM SUMMARY
          </span>
          <button
            type="button"
            onClick={refreshSummary}
            className="text-xs text-accent hover:underline"
          >
            Refresh
          </button>
        </div>
        {summaryLoading || !farmSummary ? (
          <div className="p-2">
            <SkeletonText lines={4} />
          </div>
        ) : (
          <>
            <p className="text-lg font-medium dark:text-white text-black mb-4">
              {farmSummary.summary_sentence}
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm dark:text-[#999999] text-[#666666]">
              {['pond_1', 'pond_2', 'pond_3'].map((id) => (
                <div key={id}>
                  <span className="font-semibold text-accent">{id.replace('_', ' ').toUpperCase()}</span>
                  <p className="mt-1">{farmSummary.pond_summaries?.[id] || '—'}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(ponds).map(([id, pond]) => (
          <PondCard
            key={id}
            pondId={id}
            pond={{ ...pond, risk_level: pond.risk_level }}
            lastUpdated={pondData?.last_updated}
          />
        ))}
        {loading && !pondData && (
          <>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="p-5 h-48" />
            ))}
          </>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]">
          <h3 className="text-sm font-bold mb-3 dark:text-white text-black">Weather</h3>
          {weather ? (
            <>
              <div className="text-3xl font-bold dark:text-white text-black">
                {weather.temperature_c}°C
              </div>
              <div className="text-lg capitalize mt-1">{weather.weather_condition}</div>
              <div className="mt-3 space-y-1 text-sm dark:text-[#999999] text-[#666666]">
                <p>Humidity: {weather.humidity_percent}%</p>
                <p>Wind: {weather.wind_speed_kmh} km/h</p>
                <p>Rainfall: {weather.rainfall_mm_hr} mm/hr</p>
              </div>
              <p className="text-xs mt-3 text-accent">Weather impact on ponds</p>
            </>
          ) : (
            <p className="text-sm dark:text-[#999999]">Loading weather...</p>
          )}
        </div>
        <div className="md:col-span-2 rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]">
          <h3 className="text-sm font-bold mb-3 dark:text-white text-black">Last Action</h3>
          {lastAction ? (
            <div className="text-sm dark:text-[#999999] text-[#666666]">
              <p>
                <span className="font-semibold dark:text-white text-black">
                  {lastAction.pond_id}
                </span>{' '}
                — {lastAction.recommended_action?.chemical || 'Action'} (
                {lastAction.status})
              </p>
              <p className="mt-1">
                By {lastAction.resolved_by || '—'} at{' '}
                {new Date(lastAction.created_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-sm dark:text-[#999999]">No actions taken yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
