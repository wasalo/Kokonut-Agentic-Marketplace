export default function ServiceDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <div className="h-3 bg-content2 rounded w-20" />
          <div className="h-3 bg-content2 rounded w-2" />
          <div className="h-3 bg-content2 rounded w-24" />
        </div>

        {/* Title + Price */}
        <div className="space-y-3">
          <div className="h-8 bg-content2 rounded w-2/3" />
          <div className="h-6 bg-content2 rounded w-1/4" />
        </div>

        {/* Provider info */}
        <div className="flex items-center gap-3">
          <div className="size-10 bg-content2 rounded-full" />
          <div className="space-y-2">
            <div className="h-4 bg-content2 rounded w-32" />
            <div className="h-3 bg-content2 rounded w-20" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-content2 rounded w-full" />
          <div className="h-4 bg-content2 rounded w-full" />
          <div className="h-4 bg-content2 rounded w-3/4" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <div className="h-10 bg-content2 rounded w-32" />
          <div className="h-10 bg-content2 rounded w-24" />
        </div>
      </div>
    </div>
  );
}
