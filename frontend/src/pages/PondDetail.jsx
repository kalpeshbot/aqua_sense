import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import usePolling from '../hooks/usePolling';
import LiveChart from '../components/LiveChart';
import SensorGauge from '../components/SensorGauge';
import StatusPill from '../components/StatusPill';
import { SkeletonCard } from '../components/Skeleton';

const PROFILE = {
  pH: { min: 6.5, max: 8.5 },
  dissolved_oxygen: { min: 5, max: 9 },
  turbidity: { min: 5, max: 15 },
  ammonia: { min: 0, max: 1.5 },
  temperature: { min: 26, max: 32 },
};

export default function PondDetail() {
  const { pond_id } = useParams();

  const { data: pond } = usePolling(
    useCallback(async () => (await api.get(`/api/ponds/${pond_id}`)).data, [pond_id]),
    5000
  );
  const { data: watchdog } = usePolling(
    useCallback(async () => (await api.get(`/api/watchdog/${pond_id}`)).data, [pond_id]),
    10000
  );
  const { data: prediction } = usePolling(
    useCallback(async () => (await api.get(`/api/predictions/${pond_id}`)).data, [pond_id]),
    10000
  );
  const [doseHistory, setDoseHistory] = useState([]);
  const [chartData, setChartData] = useState({});

  useEffect(() => {
    api.get('/api/approvals/history').then((res) => {
      setDoseHistory(
        (res.data || []).filter((e) => e.pond_id === pond_id)
      );
    });
  }, [pond_id]);

  useEffect(() => {
    if (!pond?.sensors) return;
    const now = new Date().toLocaleTimeString();
    const next = { ...chartData };
    Object.entries(pond.sensors).forEach(([name, s]) => {
      if (!next[name]) next[name] = [];
      next[name] = [...next[name], { time: now, value: s.value }].slice(-20);
    });
    setChartData(next);
  }, [pond]);

  if (!pond) {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} className="w-32 h-40 p-4" />
        ))}
      </div>
    );
  }

  const urgency = prediction?.urgency_score || 0;
  const urgencyColor =
    urgency > 80 ? 'bg-danger' : urgency > 60 ? 'bg-warning' : 'bg-success';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-black">{pond.name}</h1>
          <p className="dark:text-[#999999] text-[#666666]">
            {pond.fish_species} · {pond.capacity_liters?.toLocaleString()} L
          </p>
        </div>
        <StatusPill status={prediction?.risk_level || pond.risk_level} large />
        <div className="text-sm dark:text-[#999999]">
          ML Confidence: {prediction?.confidence_percent ?? '—'}%
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1 dark:text-[#999999]">
          <span>Urgency Score</span>
          <span>{urgency}/100</span>
        </div>
        <div className="h-2 rounded-full dark:bg-[#222222] bg-[#E0E0E0]">
          <div className={`h-full rounded-full ${urgencyColor}`} style={{ width: `${urgency}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {Object.entries(pond.sensors).map(([name, s]) => {
          const wd = watchdog?.sensors?.[name];
          const prof = PROFILE[name];
          return (
            <div key={name} className="text-center">
              <SensorGauge
                name={name}
                value={s.value}
                unit={s.unit}
                min={prof.min}
                max={prof.max}
                status={wd?.status || s.status}
              />
              <div className="text-xs mt-1">
                {wd?.status === 'VALID' && <span className="text-success">✓ VALID</span>}
                {wd?.status === 'SUSPICIOUS' && <span className="text-warning">⚠ SUSPICIOUS</span>}
                {wd?.status === 'FAULTY' && (
                  <span className="text-danger">
                    ✗ FAULTY ({wd.estimated_value})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <h2 className="font-bold dark:text-white text-black">Sensor Trends</h2>
        {Object.entries(pond.sensors).map(([name, s]) => (
          <div
            key={name}
            className="rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
          >
            <p className="text-sm font-semibold mb-2 dark:text-white text-black capitalize">
              {name.replace(/_/g, ' ')} — {s.value} {s.unit}
            </p>
            <LiveChart data={chartData[name] || []} label={name} unit={s.unit} />
          </div>
        ))}
      </div>

      {prediction?.sensor_forecasts && (
        <div>
          <h2 className="font-bold mb-3 dark:text-white text-black">30-Minute Forecast</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(prediction.sensor_forecasts).map(([name, vals]) => (
              <div
                key={name}
                className="rounded-xl border p-3 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
              >
                <p className="text-xs font-semibold capitalize mb-2">{name.replace(/_/g, ' ')}</p>
                <LiveChart
                  data={vals.map((v, i) => ({ time: `+${(i + 1) * 5}m`, value: v }))}
                  color="#FFB300"
                  unit=""
                />
                <p className="text-[10px] mt-1 dark:text-[#999999]">{vals.join(' → ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-bold mb-3 dark:text-white text-black">Chemical Dose History</h2>
        <div className="overflow-x-auto rounded-xl border dark:border-[#222222] border-[#E0E0E0]">
          <table className="w-full text-sm">
            <thead className="dark:bg-[#111111] bg-[#F8F8F8]">
              <tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Chemical</th>
                <th className="p-2 text-left">Dose</th>
                <th className="p-2 text-left">Approved By</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {doseHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center dark:text-[#999999]">
                    No dose history
                  </td>
                </tr>
              ) : (
                doseHistory.map((row) => (
                  <tr key={row.event_id} className="border-t dark:border-[#222222] border-[#E0E0E0]">
                    <td className="p-2">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="p-2">{row.recommended_action?.chemical}</td>
                    <td className="p-2">
                      {row.recommended_action?.dose_amount} {row.recommended_action?.dose_unit}
                    </td>
                    <td className="p-2">{row.resolved_by || '—'}</td>
                    <td className="p-2">{row.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
