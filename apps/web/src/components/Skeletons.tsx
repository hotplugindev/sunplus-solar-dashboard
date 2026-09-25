export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-800 rounded" />
        <div className="h-3 w-16 bg-gray-800 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-800 rounded" />
            <div className="space-y-1">
              <div className="h-3 w-12 bg-gray-800 rounded" />
              <div className="h-4 w-16 bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-3 w-32 bg-gray-800 rounded" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-4 w-4 bg-gray-800 rounded" />
        <div className="h-3 w-20 bg-gray-800 rounded" />
      </div>
      <div className="h-6 w-24 bg-gray-800 rounded" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
      <div className="h-4 w-32 bg-gray-800 rounded mb-4" />
      <div className="h-[220px] w-full bg-gray-800 rounded" />
    </div>
  );
}

export function SkeletonSourceItem() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-center justify-between animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-800 rounded" />
        <div className="h-3 w-48 bg-gray-800 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-8 bg-gray-800 rounded-lg" />
        <div className="h-8 w-8 bg-gray-800 rounded-lg" />
      </div>
    </div>
  );
}
