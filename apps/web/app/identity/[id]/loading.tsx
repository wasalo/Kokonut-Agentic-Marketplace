export default function AgentProfileLoading() {
  return (
    <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto animate-pulse space-y-6">
        {/* Agent header */}
        <div className="bg-background border border-divider rounded-xl p-4 md:p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="size-16 md:size-20 bg-content2 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-7 bg-content2 rounded w-48" />
              <div className="h-4 bg-content2 rounded w-24" />
              <div className="h-4 bg-content2 rounded w-full" />
              <div className="h-4 bg-content2 rounded w-3/4" />
              {/* Capability badges */}
              <div className="flex gap-2">
                <div className="h-5 bg-content2 rounded-full w-16" />
                <div className="h-5 bg-content2 rounded-full w-20" />
                <div className="h-5 bg-content2 rounded-full w-14" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-background border border-divider rounded-xl p-4 space-y-2">
              <div className="h-3 bg-content2 rounded w-16" />
              <div className="h-6 bg-content2 rounded w-12" />
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-divider pb-2">
          <div className="h-4 bg-content2 rounded w-16" />
          <div className="h-4 bg-content2 rounded w-16" />
          <div className="h-4 bg-content2 rounded w-16" />
          <div className="h-4 bg-content2 rounded w-16" />
        </div>

        {/* Tab content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-background border border-divider rounded-xl p-4 space-y-3">
              <div className="h-5 bg-content2 rounded w-2/3" />
              <div className="h-4 bg-content2 rounded w-full" />
              <div className="h-4 bg-content2 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
