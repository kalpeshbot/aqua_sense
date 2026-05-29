import { Fragment, useCallback, useState } from 'react';
import api from '../api/client';
import usePolling from '../hooks/usePolling';
import AlertBadge from '../components/AlertBadge';
import StatusPill from '../components/StatusPill';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';

export default function Alerts() {
  const [tab, setTab] = useState('pending');
  const [denyId, setDenyId] = useState(null);
  const [denyReason, setDenyReason] = useState('');
  const { addToast } = useToast();

  const { data: pending, loading: pendingLoading, refetch: refetchPending } = usePolling(
    useCallback(async () => (await api.get('/api/approvals')).data, []),
    5000
  );
  const { data: history, refetch: refetchHistory } = usePolling(
    useCallback(async () => (await api.get('/api/approvals/history')).data, []),
    10000
  );
  const [expanded, setExpanded] = useState(null);

  const handleApprove = async (eventId) => {
    try {
      await api.post(`/api/approvals/approve/${eventId}`, { approved_by: 'owner' });
      addToast('Action approved', 'success');
      refetchPending();
      refetchHistory();
    } catch {
      addToast('Approve failed', 'error');
    }
  };

  const handleDeny = async (eventId) => {
    try {
      await api.post(`/api/approvals/deny/${eventId}`, {
        denied_by: 'owner',
        reason: denyReason || 'No reason given',
      });
      addToast('Action denied', 'error');
      setDenyId(null);
      setDenyReason('');
      refetchPending();
      refetchHistory();
    } catch {
      addToast('Deny failed', 'error');
    }
  };

  const statusStyle = {
    APPROVED: 'bg-success/20 text-success',
    DENIED: 'bg-danger/20 text-danger',
    AUTO_EXECUTED: 'bg-accent/20 text-accent',
    ESCALATED: 'bg-warning/20 text-warning',
    PENDING: 'bg-warning/20 text-warning',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b dark:border-[#222222] border-[#E0E0E0]">
        {['pending', 'history'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent dark:text-[#999999] text-[#666666]'
            }`}
          >
            {t === 'pending' ? 'PENDING APPROVALS' : 'HISTORY'}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        <div className="space-y-4">
          {pendingLoading && !pending ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : !pending?.length ? (
            <p className="dark:text-[#999999] text-center py-12">
              No pending approvals. Farm is running smoothly.
            </p>
          ) : (
            pending.map((event) => (
              <div
                key={event.event_id}
                className="rounded-xl border p-5 dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0]"
              >
                <div className="flex flex-wrap gap-4 items-start justify-between mb-4">
                  <AlertBadge
                    degree={event.degree}
                    expiresAt={event.expires_at}
                    eventId={event.event_id}
                  />
                  <div>
                    <h3 className="font-bold dark:text-white text-black capitalize">
                      {event.pond_id?.replace('_', ' ')}
                    </h3>
                    <StatusPill status={event.risk_level} />
                  </div>
                </div>
                <p className="text-sm dark:text-[#999999] mb-3">{event.llm_reasoning}</p>
                <div className="text-sm mb-3 p-3 rounded-lg dark:bg-black bg-white border dark:border-[#222222] border-[#E0E0E0]">
                  <strong>Recommended:</strong> {event.recommended_action?.chemical} —{' '}
                  {event.recommended_action?.dose_amount}{' '}
                  {event.recommended_action?.dose_unit}
                </div>
                <div className="flex flex-wrap gap-2 text-xs mb-4">
                  {Object.entries(event.sensor_summary || {}).map(([k, v]) => (
                    <span
                      key={k}
                      className="px-2 py-1 rounded dark:bg-[#222222] bg-[#E0E0E0]"
                    >
                      {k}: {v}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(event.event_id)}
                    className="px-4 py-2 rounded-lg bg-success text-white text-sm font-semibold"
                  >
                    APPROVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setDenyId(event.event_id)}
                    className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-semibold"
                  >
                    DENY
                  </button>
                </div>
                {denyId === event.event_id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded border dark:bg-black dark:border-[#222222] dark:text-white text-sm"
                      placeholder="Reason for denial"
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeny(event.event_id)}
                      className="px-3 py-2 bg-danger text-white rounded text-sm"
                    >
                      Confirm Deny
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="overflow-x-auto rounded-xl border dark:border-[#222222] border-[#E0E0E0]">
          <table className="w-full text-sm">
            <thead className="dark:bg-[#111111] bg-[#F8F8F8]">
              <tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Pond</th>
                <th className="p-2 text-left">Degree</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Resolved By</th>
              </tr>
            </thead>
            <tbody>
              {(history || []).map((row) => (
                <Fragment key={row.event_id}>
                  <tr
                    className="border-t dark:border-[#222222] border-[#E0E0E0] cursor-pointer hover:dark:bg-[#111111]"
                    onClick={() =>
                      setExpanded(expanded === row.event_id ? null : row.event_id)
                    }
                  >
                    <td className="p-2">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="p-2">{row.pond_id}</td>
                    <td className="p-2">DEGREE {row.degree}</td>
                    <td className="p-2">{row.recommended_action?.chemical}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${statusStyle[row.status] || ''}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-2">{row.resolved_by || '—'}</td>
                  </tr>
                  {expanded === row.event_id && (
                    <tr>
                      <td colSpan={6} className="p-3 text-xs dark:text-[#999999]">
                        {row.llm_reasoning}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
