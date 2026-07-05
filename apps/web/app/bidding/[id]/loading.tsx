export default function BiddingDetailLoading() {
  return (
    <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <div className="h-3 bg-content2 rounded w-20" />
          <div className="h-3 bg-content2 rounded w-2" />
          <div className="h-3 bg-content2 rounded w-16" />
          <div className="h-3 bg-content2 rounded w-2" />
          <div className="h-3 bg-content2 rounded w-20" />
        </div>

        {/* Session header card */}
        <div className="bg-background border border-divider rounded-xl p-4 md:p-6 space-y-4">
          <div className="h-7 bg-content2 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3 bg-content2 rounded w-16" />
              <div className="h-5 bg-content2 rounded w-24" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-content2 rounded w-16" />
              <div className="h-5 bg-content2 rounded w-20" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="h-3 bg-content2 rounded w-12" />
              <div className="h-5 bg-content2 rounded w-16" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-content2 rounded w-12" />
              <div className="h-5 bg-content2 rounded w-16" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-content2 rounded w-12" />
              <div className="h-5 bg-content2 rounded w-16" />
            </div>
          </div>
        </div>

        {/* Bids section */}
        <div className="bg-background border border-divider rounded-xl p-4 md:p-6 space-y-3">
          <div className="h-5 bg-content2 rounded w-1/4" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-content2/50">
                <div className="size-8 bg-content2 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-content2 rounded w-1/3" />
                  <div className="h-3 bg-content2 rounded w-1/4" />
                </div>
                <div className="h-5 bg-content2 rounded w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-background border border-divider rounded-xl p-4 md:p-6 space-y-3">
          <div className="h-5 bg-content2 rounded w-1/4" />
          <div className="h-10 bg-content2 rounded w-full" />
        </div>
      </div>
    </div>
  );
}
