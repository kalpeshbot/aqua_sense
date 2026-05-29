import { useCallback } from 'react';
import api from '../api/client';
import usePolling from '../hooks/usePolling';
import StatusPill from '../components/StatusPill';

export default function Tanks() {
  const { data: tanksData } = usePolling(
    useCallback(async () => (await api.get('/api/tanks')).data, []),
    30000
  );
  const { data: lowTanks } = usePolling(
    useCallback(async () => (await api.get('/api/tanks/status/low')).data, []),
    30000
  );
  const { data: history } = usePolling(
    useCallback(async () => (await api.get('/api/approvals/history')).data, []),
    30000
  );

  const tanks = tanksData?.tanks || {};
  const lowIds = Object.keys(lowTanks || {});
  const doseHistory = (history || []).filter(
    (e) => e.status === 'APPROVED' && e.recommended_action?.chemical
  );

  const getFill = (tank) => {
    if (tank.capacity_L)
      return (tank.current_L / tank.capacity_L) * 100;
    if (tank.capacity_mins)
      return (tank.current_mins / tank.capacity_mins) * 100;
    if (tank.capacity_kg) return (tank.current_kg / tank.capacity_kg) * 100;
    return 0;
  };

  const getCurrent = (tank) => {
    if (tank.current_L !== undefined) return `${tank.current_L} ${tank.unit}`;
    if (tank.current_mins !== undefined) return `${tank.current_mins} ${tank.unit}`;
    return `${tank.current_kg} ${tank.unit}`;
  };

  const getCapacity = (tank) => {
    if (tank.capacity_L) return tank.capacity_L;
    if (tank.capacity_mins) return tank.capacity_mins;
    return tank.capacity_kg;
  };

  return (
    <div className="space-y-6">
      {lowIds.length > 0 && (
        <div className="rounded-xl border border-warning bg-warning/10 p-4 text-warning text-sm">
          Low stock alert: {lowIds.join(', ')} below threshold
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(tanks).map(([id, tank]) => {
          const pct = getFill(tank);
          const barColor =
            pct > 50 ? 'bg-success' : pct > 20 ? 'bg-warning' : 'bg-danger';
          return (
            <div
              key={id}
              className="rounded-xl border p-5 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold dark:text-white text-black">{tank.display_name}</h3>
                  <p className="text-xs dark:text-[#999999] mt-1">{tank.purpose}</p>
                </div>
                <StatusPill status={tank.status} />
              </div>
              <div className="h-3 rounded-full dark:bg-[#222222] bg-[#E0E0E0] my-3">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-sm dark:text-white text-black">
                {getCurrent(tank)} / {getCapacity(tank)} {tank.unit}
              </p>
              <p className="text-xs dark:text-[#999999] mt-1">{pct.toFixed(0)}% remaining</p>
              {tank.price_per_L && (
                <p className="text-xs mt-2 dark:text-[#999999]">
                  ₹{tank.price_per_L}/L
                </p>
              )}
              {tank.price_per_kg && (
                <p className="text-xs mt-2 dark:text-[#999999]">
                  ₹{tank.price_per_kg}/kg
                </p>
              )}
              <p className="text-[10px] mt-2 dark:text-[#999999]">Last used: —</p>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="font-bold mb-3 dark:text-white text-black">Dose History</h3>
        <div className="overflow-x-auto rounded-xl border dark:border-[#222222] border-[#E0E0E0]">
          <table className="w-full text-sm">
            <thead className="dark:bg-[#111111] bg-[#F8F8F8]">
              <tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Pond</th>
                <th className="p-2 text-left">Chemical</th>
                <th className="p-2 text-left">Dose</th>
                <th className="p-2 text-left">Cost Est.</th>
              </tr>
            </thead>
            <tbody>
              {doseHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center dark:text-[#999999]">
                    No approved doses yet
                  </td>
                </tr>
              ) : (
                doseHistory.map((row) => (
                  <tr key={row.event_id} className="border-t dark:border-[#222222]">
                    <td className="p-2">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="p-2">{row.pond_id}</td>
                    <td className="p-2">{row.recommended_action?.chemical}</td>
                    <td className="p-2">
                      {row.recommended_action?.dose_amount}{' '}
                      {row.recommended_action?.dose_unit}
                    </td>
                    <td className="p-2">—</td>
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
