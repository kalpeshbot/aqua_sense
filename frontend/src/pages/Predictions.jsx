import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/client';
import usePolling from '../hooks/usePolling';
import StatusPill from '../components/StatusPill';
import LiveChart from '../components/LiveChart';

const WARNING_THRESHOLDS = {
  pH: 8.0,
  dissolved_oxygen: 5.5,
  turbidity: 14,
  ammonia: 1.2,
  temperature: 31,
};

export default function Predictions() {
  const [expanded, setExpanded] = useState({ pond_1: true });

  const { data: predictions } = usePolling(
    useCallback(async () => (await api.get('/api/predictions')).data, []),
    10000
  );
  const { data: weatherImpact } = usePolling(
    useCallback(async () => (await api.get('/api/weather/pond-impact')).data, []),
    30000
  );

  const ponds = predictions
    ? Object.entries(predictions).sort((a, b) => b[1].urgency_score - a[1].urgency_score)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {ponds.map(([id, p]) => (
          <div
            key={id}
            className="rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
          >
            <h3 className="font-bold capitalize dark:text-white text-black">
              {id.replace('_', ' ')}
            </h3>
            <div className="mt-2 flex gap-2 items-center">
              <StatusPill status={p.risk_level} />
              <span className="text-sm dark:text-[#999999]">Urgency: {p.urgency_score}</span>
            </div>
            <p className="text-xs mt-2 dark:text-[#999999]">
              Confidence: {p.confidence_percent}%
            </p>
            {p.escalation_timer_mins && (
              <p className="text-xs text-warning mt-1">
                Escalation in {p.escalation_timer_mins} min
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]">
        <h3 className="font-bold mb-4 dark:text-white text-black">Urgency Ranking</h3>
        {ponds.map(([id, p]) => (
          <div key={id} className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="capitalize">{id.replace('_', ' ')}</span>
              <span>{p.urgency_score}</span>
            </div>
            <div className="h-3 rounded-full dark:bg-[#222222] bg-[#E0E0E0]">
              <div
                className={`h-full rounded-full ${
                  p.urgency_score > 80
                    ? 'bg-danger'
                    : p.urgency_score > 60
                      ? 'bg-warning'
                      : 'bg-success'
                }`}
                style={{ width: `${p.urgency_score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="font-bold dark:text-white text-black">Forecasts</h3>
        {ponds.map(([id, p]) => (
          <div
            key={id}
            className="rounded-xl border dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
          >
            <button
              type="button"
              className="w-full flex justify-between items-center p-4"
              onClick={() => setExpanded((e) => ({ ...e, [id]: !e[id] }))}
            >
              <span className="font-semibold capitalize dark:text-white text-black">
                {id.replace('_', ' ')}
              </span>
              {expanded[id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {expanded[id] && p.sensor_forecasts && (
              <div className="p-4 pt-0 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(p.sensor_forecasts).map(([sensor, vals]) => {
                  const warn = vals.some((v) => v >= (WARNING_THRESHOLDS[sensor] || 999));
                  return (
                    <div key={sensor}>
                      <p
                        className={`text-xs font-semibold capitalize mb-1 ${warn ? 'text-warning' : 'dark:text-white text-black'}`}
                      >
                        {sensor.replace(/_/g, ' ')}
                      </p>
                      <LiveChart
                        data={vals.map((v, i) => ({
                          time: `+${(i + 1) * 5}m`,
                          value: v,
                        }))}
                        color={warn ? '#FFB300' : '#1A73E8'}
                      />
                      <p className="text-[10px] mt-1 dark:text-[#999999]">{vals.join(', ')}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {weatherImpact && (
        <div className="rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]">
          <h3 className="font-bold mb-3 dark:text-white text-black">Weather Impact</h3>
          <p className="text-lg text-accent mb-3">
            Rain impact: {weatherImpact.rain_impact_level}
            {weatherImpact.is_raining ? ' 🌧' : ''}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm dark:text-[#999999]">
            <p>Rain intensity: {weatherImpact.rain_intensity}</p>
            <p>Air temp delta: {weatherImpact.air_temp_delta}</p>
            <p>Wind factor: {weatherImpact.wind_turbidity_factor?.toFixed(2)}</p>
            <p>Humidity factor: {weatherImpact.humidity_concentration_factor?.toFixed(2)}</p>
            <p>Cloud O₂ suppression: {weatherImpact.cloud_o2_suppression?.toFixed(2)}</p>
            <p>UV algae risk: {weatherImpact.uv_algae_risk?.toFixed(2)}</p>
          </div>
          <p className="text-xs mt-3 text-accent">
            Incoming weather will affect: turbidity, dissolved oxygen, temperature
          </p>
        </div>
      )}
    </div>
  );
}
