export default function NotificationsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-content2 rounded w-48" />
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-content2 rounded-full w-20" />
          ))}
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-content2 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
