import { useCallback, useMemo } from 'react';
import api from '../api/client';
import usePolling from '../hooks/usePolling';
import StatusPill from '../components/StatusPill';

const ORDER = { FAULTY: 0, SUSPICIOUS: 1, CRITICAL: 2, WARNING: 3, VALID: 4, NORMAL: 5 };

export default function SensorHealth() {
  const { data: watchdog } = usePolling(
    useCallback(async () => (await api.get('/api/watchdog')).data, []),
    10000
  );
  const { data: critical } = usePolling(
    useCallback(async () => (await api.get('/api/sensors/critical')).data, []),
    10000
  );
  const { data: warnings } = usePolling(
    useCallback(async () => (await api.get('/api/sensors/warnings')).data, []),
    10000
  );

  const rows = useMemo(() => {
    if (!watchdog) return [];
    const list = [];
    Object.entries(watchdog).forEach(([pondId, pond]) => {
      Object.entries(pond.sensors || {}).forEach(([sensor, info]) => {
        const violations = (pond.physics_violations || []).filter(
          (v) => v.sensor === sensor
        );
        list.push({
          pondId,
          sensor,
          value: info.value,
          unit: '—',
          status: info.status,
          watchdog: info.status,
          confidence: info.confidence,
          violations: violations.map((v) => v.message).join('; ') || '—',
          crossScore: pond.cross_sensor_score,
          falseAlarm: pond.false_alarm_risk,
        });
      });
    });
    return list.sort(
      (a, b) => (ORDER[a.watchdog] ?? 9) - (ORDER[b.watchdog] ?? 9)
    );
  }, [watchdog]);

  const validCount = rows.filter((r) => r.watchdog === 'VALID').length;
  const faultyCount = rows.filter(
    (r) => r.watchdog === 'FAULTY' || r.watchdog === 'SUSPICIOUS'
  ).length;

  const allViolations = [];
  if (watchdog) {
    Object.entries(watchdog).forEach(([pondId, pond]) => {
      (pond.physics_violations || []).forEach((v) => {
        allViolations.push({ pondId, ...v });
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sensors', value: 15 },
          { label: 'VALID', value: validCount },
          { label: 'FAULTY / SUSPICIOUS', value: faultyCount },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0] text-center"
          >
            <div className="text-2xl font-bold dark:text-white text-black">{value}</div>
            <div className="text-xs dark:text-[#999999]">{label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border dark:border-[#222222] border-[#E0E0E0]">
        <table className="w-full text-sm">
          <thead className="dark:bg-[#111111] bg-[#F8F8F8]">
            <tr>
              <th className="p-2 text-left">Pond</th>
              <th className="p-2 text-left">Sensor</th>
              <th className="p-2 text-left">Value</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Watchdog</th>
              <th className="p-2 text-left">Confidence</th>
              <th className="p-2 text-left">Physics Violations</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.pondId}-${r.sensor}`} className="border-t dark:border-[#222222]">
                <td className="p-2">{r.pondId}</td>
                <td className="p-2 capitalize">{r.sensor.replace(/_/g, ' ')}</td>
                <td className="p-2">{r.value}</td>
                <td className="p-2">
                  <StatusPill status={r.status} />
                </td>
                <td className="p-2">
                  {r.watchdog === 'VALID' && <span className="text-success">✓ VALID</span>}
                  {r.watchdog === 'SUSPICIOUS' && (
                    <span className="text-warning">⚠ SUSPICIOUS</span>
                  )}
                  {r.watchdog === 'FAULTY' && <span className="text-danger">✗ FAULTY</span>}
                </td>
                <td className="p-2">{r.confidence}%</td>
                <td className="p-2 text-xs max-w-[200px]">{r.violations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="font-bold mb-3 dark:text-white text-black">Physics Violations Log</h3>
        {allViolations.length === 0 ? (
          <p className="text-sm dark:text-[#999999]">No active violations</p>
        ) : (
          <div className="space-y-2">
            {allViolations.map((v, i) => (
              <div
                key={i}
                className="rounded-lg border p-3 text-sm dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
              >
                <div className="flex gap-2 items-center mb-1">
                  <span className="font-semibold">{v.pondId}</span>
                  <span className="capitalize">{v.sensor}</span>
                  <StatusPill status={v.severity} />
                </div>
                <p className="dark:text-[#999999]">{v.message}</p>
                <p className="text-xs text-accent mt-1">{v.rule}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-bold mb-3 dark:text-white text-black">Cross-Sensor Score</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {watchdog &&
            Object.entries(watchdog).map(([id, pond]) => (
              <div
                key={id}
                className="rounded-xl border p-4 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
              >
                <p className="font-semibold capitalize mb-2">{id.replace('_', ' ')}</p>
                <div className="h-2 rounded-full dark:bg-[#222222] bg-[#E0E0E0] mb-2">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pond.cross_sensor_score}%` }}
                  />
                </div>
                <p className="text-xs dark:text-[#999999]">
                  Score: {pond.cross_sensor_score} · False alarm risk:{' '}
                  <span
                    className={
                      pond.false_alarm_risk === 'HIGH'
                        ? 'text-danger'
                        : pond.false_alarm_risk === 'MEDIUM'
                          ? 'text-warning'
                          : 'text-success'
                    }
                  >
                    {pond.false_alarm_risk}
                  </span>
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
