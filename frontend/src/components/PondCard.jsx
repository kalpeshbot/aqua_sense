import { useNavigate } from 'react-router-dom';
import StatusPill from './StatusPill';

const SENSOR_LABELS = {
  pH: 'pH',
  dissolved_oxygen: 'DO',
  turbidity: 'Turb',
  ammonia: 'NH₃',
  temperature: 'Temp',
};

export default function PondCard({ pondId, pond, lastUpdated }) {
  const navigate = useNavigate();
  const critical = pond.risk_level === 'CRITICAL';

  return (
    <button
      type="button"
      onClick={() => navigate(`/pond/${pondId}`)}
      className={`w-full text-left rounded-xl border p-4 transition hover:border-accent dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0] ${
        critical ? 'border-danger animate-pulse' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg dark:text-white text-black">{pond.name}</h3>
          <span className="text-xs dark:text-[#999999] text-[#666666]">{pond.fish_species}</span>
        </div>
        <StatusPill status={pond.risk_level || 'SAFE'} />
      </div>
      <div className="grid grid-cols-5 gap-2 text-center">
        {Object.entries(pond.sensors || {}).map(([key, s]) => (
          <div key={key}>
            <div className="text-[10px] dark:text-[#999999] text-[#666666]">
              {SENSOR_LABELS[key] || key}
            </div>
            <div className="text-sm font-semibold dark:text-white text-black">
              {s.value}
              <span className="text-[10px] opacity-60 ml-0.5">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>
      {lastUpdated && (
        <p className="text-[10px] mt-3 dark:text-[#999999] text-[#666666]">
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </button>
  );
}
