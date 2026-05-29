const STYLES = {
  SAFE: 'bg-success/20 text-success',
  NORMAL: 'bg-success/20 text-success',
  VALID: 'bg-success/20 text-success',
  WATCH: 'bg-warning/20 text-warning',
  WARNING: 'bg-warning/20 text-warning',
  SUSPICIOUS: 'bg-warning/20 text-warning',
  CRITICAL: 'bg-danger/20 text-danger animate-pulse',
  FAULTY: 'bg-danger/20 text-danger animate-pulse',
  DANGER: 'bg-danger/20 text-danger animate-pulse',
};

export default function StatusPill({ status, large }) {
  const key = (status || 'SAFE').toUpperCase();
  const style = STYLES[key] || STYLES.SAFE;
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${style} ${large ? 'text-sm px-3 py-1' : ''}`}
    >
      {status}
    </span>
  );
}
