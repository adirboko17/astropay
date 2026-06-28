interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      <div className="mt-4 h-1 w-10 rounded-full bg-gradient-to-l from-blue-500 to-indigo-500 opacity-70 transition group-hover:w-14" />
    </div>
  );
}
