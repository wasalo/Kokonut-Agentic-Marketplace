export default function BiddingLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-content2 rounded w-48" />
        <div className="h-4 bg-content2 rounded w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-content2 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
