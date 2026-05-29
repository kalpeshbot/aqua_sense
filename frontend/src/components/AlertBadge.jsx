import { useEffect, useState } from 'react';

export default function AlertBadge({ degree, expiresAt, eventId }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) {
        setRemaining('00:00 remaining');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} remaining`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const diffMs = new Date(expiresAt) - new Date();
  const urgent = diffMs < 5 * 60 * 1000;

  const colors = {
    1: 'bg-warning/20 text-warning border-warning/40',
    2: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    3: 'bg-danger/20 text-danger border-danger/40 animate-pulse',
  };

  return (
    <div
      className={`inline-flex flex-col items-start border rounded-lg px-3 py-2 ${colors[degree] || colors[1]}`}
    >
      <span className="text-xs font-bold">DEGREE {degree}</span>
      <span className={`text-sm font-mono ${urgent ? 'text-danger' : ''}`}>{remaining}</span>
      <span className="text-[10px] opacity-60">#{eventId}</span>
    </div>
  );
}
