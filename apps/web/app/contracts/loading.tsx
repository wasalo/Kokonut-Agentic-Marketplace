export default function ContractsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-content2 rounded w-48" />
        <div className="h-4 bg-content2 rounded w-64" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 bg-content2 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
