import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function LiveChart({ data, color = '#1A73E8', label, unit }) {
  return (
    <div className="w-full h-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#666" />
          <YAxis tick={{ fontSize: 10 }} stroke="#666" width={35} />
          <Tooltip
            formatter={(v) => [`${v} ${unit || ''}`, label]}
            contentStyle={{
              background: '#111',
              border: '1px solid #222',
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
