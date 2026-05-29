export default function SensorGauge({ name, value, unit, min, max, status }) {
  const range = max - min || 1;
  const pct = Math.min(1, Math.max(0, (value - min) / range));
  const angle = pct * 180;

  const color =
    status === 'CRITICAL' || status === 'FAULTY'
      ? '#D32F2F'
      : status === 'WARNING' || status === 'SUSPICIOUS'
        ? '#FFB300'
        : '#00C853';

  const label = name.replace(/_/g, ' ');

  return (
    <div className="flex flex-col items-center w-[120px]">
      <svg viewBox="0 0 120 70" className="w-full max-w-[120px]">
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke="#333"
          strokeWidth="8"
          className="dark:stroke-[#333] stroke-[#E0E0E0]"
        />
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${(angle / 180) * 157} 157`}
        />
        <text x="60" y="52" textAnchor="middle" className="fill-current text-sm font-bold">
          {value}
        </text>
        <text x="60" y="66" textAnchor="middle" className="fill-current text-[10px] opacity-60">
          {unit}
        </text>
      </svg>
      <span className="text-xs mt-1 capitalize dark:text-[#999999] text-[#666666]">{label}</span>
    </div>
  );
}
