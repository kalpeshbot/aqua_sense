export function SkeletonCard({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[#111] dark:bg-[#111] ${className}`}>
      <div className="h-4 bg-[#222] rounded w-3/4 mb-3"></div>
      <div className="h-8 bg-[#222] rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-[#222] rounded w-full"></div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="animate-pulse flex gap-4 py-3 border-b border-[#222]">
      <div className="h-4 bg-[#222] rounded w-1/4"></div>
      <div className="h-4 bg-[#222] rounded w-1/4"></div>
      <div className="h-4 bg-[#222] rounded w-1/4"></div>
      <div className="h-4 bg-[#222] rounded w-1/4"></div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-[#222] rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}></div>
      ))}
    </div>
  );
}
