import { useState } from 'react';
import { useToast } from '../components/Toast';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const REPORT_TYPES = [
  'Farm Health Summary',
  'Sensor Performance',
  'Chemical Usage',
  'Alert Frequency',
];

const MOCK_HEALTH = [
  { day: 'Mon', safe: 2, watch: 1, warning: 0, critical: 0 },
  { day: 'Tue', safe: 3, watch: 0, warning: 0, critical: 0 },
  { day: 'Wed', safe: 2, watch: 1, warning: 0, critical: 0 },
  { day: 'Thu', safe: 1, watch: 1, warning: 1, critical: 0 },
  { day: 'Fri', safe: 2, watch: 0, warning: 1, critical: 0 },
  { day: 'Sat', safe: 3, watch: 0, warning: 0, critical: 0 },
  { day: 'Sun', safe: 2, watch: 1, warning: 0, critical: 0 },
];

const MOCK_SENSORS = [
  { sensor: 'pH', valid: 42, warning: 5, critical: 1 },
  { sensor: 'DO', valid: 38, warning: 8, critical: 2 },
  { sensor: 'Turbidity', valid: 45, warning: 3, critical: 0 },
  { sensor: 'Ammonia', valid: 40, warning: 6, critical: 2 },
  { sensor: 'Temp', valid: 44, warning: 4, critical: 0 },
];

const MOCK_CHEMICAL = [
  { chemical: 'CaO', qty: 12 },
  { chemical: 'Na₂S₂O₃', qty: 4 },
  { chemical: 'KMnO₄', qty: 2 },
  { chemical: 'Aeration', qty: 180 },
  { chemical: 'Feed', qty: 8 },
];

const MOCK_ALERTS = [
  { day: 'Mon', count: 2 },
  { day: 'Tue', count: 0 },
  { day: 'Wed', count: 1 },
  { day: 'Thu', count: 4 },
  { day: 'Fri', count: 2 },
  { day: 'Sat', count: 0 },
  { day: 'Sun', count: 1 },
];

export default function Reports() {
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [startDate, setStartDate] = useState('2026-05-22');
  const [endDate, setEndDate] = useState('2026-05-29');
  const { addToast } = useToast();

  const exportPdf = () => {
    addToast('PDF export coming in Phase 5', 'info');
  };

  const renderChart = () => {
    if (reportType === 'Farm Health Summary') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={MOCK_HEALTH}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="safe" stroke="#00C853" />
            <Line type="monotone" dataKey="warning" stroke="#FFB300" />
            <Line type="monotone" dataKey="critical" stroke="#D32F2F" />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (reportType === 'Sensor Performance') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={MOCK_SENSORS}>
            <XAxis dataKey="sensor" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="valid" fill="#00C853" />
            <Bar dataKey="warning" fill="#FFB300" />
            <Bar dataKey="critical" fill="#D32F2F" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (reportType === 'Chemical Usage') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={MOCK_CHEMICAL}>
            <XAxis dataKey="chemical" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="qty" fill="#1A73E8" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={MOCK_ALERTS}>
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#D32F2F" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setReportType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                reportType === t
                  ? 'bg-accent text-white'
                  : 'border dark:border-[#222222] border-[#E0E0E0] dark:text-white text-black'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportPdf}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold"
        >
          Export as PDF
        </button>
      </div>

      <div className="flex gap-4">
        <div>
          <label className="text-xs dark:text-[#999999]">Start</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block mt-1 px-3 py-2 rounded border dark:bg-[#111111] dark:border-[#222222] dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs dark:text-[#999999]">End</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="block mt-1 px-3 py-2 rounded border dark:bg-[#111111] dark:border-[#222222] dark:text-white text-sm"
          />
        </div>
      </div>

      <div className="rounded-xl border p-6 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]">
        <h3 className="font-bold mb-4 dark:text-white text-black">{reportType}</h3>
        {renderChart()}
      </div>
    </div>
  );
}
