export default function Loading(): JSX.Element {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
      <p className="mt-6 text-muted-foreground">Loading…</p>
    </div>
  );
}
