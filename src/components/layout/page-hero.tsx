const GRADIENTS = {
  blue: "from-blue-700 via-indigo-700 to-slate-900",
  emerald: "from-emerald-700 via-teal-800 to-slate-900",
  violet: "from-violet-700 via-purple-800 to-slate-900",
  slate: "from-slate-700 via-slate-800 to-slate-950",
} as const;

const GLOWS = {
  blue: ["bg-blue-400/20", "bg-indigo-400/20"],
  emerald: ["bg-emerald-400/20", "bg-teal-300/20"],
  violet: ["bg-violet-400/20", "bg-fuchsia-400/15"],
  slate: ["bg-amber-400/15", "bg-blue-400/10"],
} as const;

export interface PageHeroMetric {
  label: string;
  value: string;
  hint?: string;
}

interface PageHeroProps {
  title: string;
  description?: string;
  accent?: keyof typeof GRADIENTS;
  metrics?: PageHeroMetric[];
  progress?: {
    percent: number;
    label: string;
    startLabel?: string;
    endLabel?: string;
  };
  children?: React.ReactNode;
}

export function PageHero({
  title,
  description,
  accent = "blue",
  metrics = [],
  progress,
  children,
}: PageHeroProps) {
  const [glowA, glowB] = GLOWS[accent];
  const percent = progress ? Math.max(0, Math.min(100, Math.round(progress.percent))) : 0;

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-l ${GRADIENTS[accent]} p-6 text-white shadow-lg sm:p-8`}
    >
      <div
        className={`pointer-events-none absolute -start-20 -top-24 h-64 w-64 rounded-full blur-3xl ${glowA}`}
      />
      <div
        className={`pointer-events-none absolute -bottom-28 end-10 h-72 w-72 rounded-full blur-3xl ${glowB}`}
      />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-md text-sm text-white/70">{description}</p>
          ) : null}
        </div>

        {metrics.length > 0 ? (
          <div className="flex flex-wrap gap-6 sm:gap-10">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <p className="text-xs font-medium text-white/70">{metric.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {metric.value}
                </p>
                {metric.hint ? (
                  <p className="mt-0.5 text-[11px] text-white/60">{metric.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {progress ? (
        <div className="relative mt-7">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>{progress.label}</span>
            <span className="font-semibold text-white">{percent}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-l from-emerald-300 to-emerald-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          {progress.startLabel || progress.endLabel ? (
            <div className="mt-2 flex justify-between text-[11px] text-white/60">
              <span>{progress.startLabel}</span>
              <span>{progress.endLabel}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {children ? <div className="relative mt-6">{children}</div> : null}
    </section>
  );
}
