export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="טוען">
      <div className="h-36 rounded-3xl bg-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-slate-200/60" />
    </div>
  );
}
