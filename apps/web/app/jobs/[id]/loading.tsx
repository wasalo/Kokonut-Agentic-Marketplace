export default function JobDetailLoading() {
  return (
    <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <div className="h-3 bg-content2 rounded w-20" />
          <div className="h-3 bg-content2 rounded w-2" />
          <div className="h-3 bg-content2 rounded w-12" />
          <div className="h-3 bg-content2 rounded w-2" />
          <div className="h-3 bg-content2 rounded w-16" />
        </div>

        {/* Job header card */}
        <div className="bg-background border border-divider rounded-xl p-4 md:p-6 space-y-4">
          <div className="h-7 bg-content2 rounded w-1/2" />
          <div className="flex gap-3">
            <div className="h-5 bg-content2 rounded w-20" />
            <div className="h-5 bg-content2 rounded w-16" />
          </div>
          <div className="h-4 bg-content2 rounded w-full" />
          <div className="h-4 bg-content2 rounded w-3/4" />
        </div>

        {/* Balance card */}
        <div className="bg-background border border-divider rounded-xl p-4 md:p-6 space-y-3">
          <div className="h-5 bg-content2 rounded w-1/3" />
          <div className="h-8 bg-content2 rounded w-1/4" />
          <div className="h-4 bg-content2 rounded w-1/2" />
        </div>

        {/* Milestone section */}
        <div className="bg-background border border-divider rounded-xl p-4 md:p-6 space-y-3">
          <div className="h-5 bg-content2 rounded w-1/3" />
          <div className="h-4 bg-content2 rounded w-full" />
          <div className="h-4 bg-content2 rounded w-full" />
          <div className="h-4 bg-content2 rounded w-2/3" />
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
