export default function PayPlusLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="h-24 bg-white" />
        <div className="h-20 border-t border-slate-100 bg-slate-50/50" />
      </div>
      <div className="h-28 rounded-2xl border border-slate-200 bg-white" />
      <div className="h-96 rounded-2xl bg-slate-200/60" />
    </div>
  );
}
