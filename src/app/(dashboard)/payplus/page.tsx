import { Suspense } from "react";

import { PayPlusPageContent } from "@/components/payplus/payplus-page-content";

export const dynamic = "force-dynamic";

function PayPlusPageFallback() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="h-11 w-11 rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-slate-200" />
            <div className="h-3 w-56 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-20 border-t border-slate-100 bg-slate-50/50" />
      </div>
      <div className="h-28 rounded-2xl border border-slate-200 bg-white" />
      <div className="h-80 rounded-2xl bg-slate-200/60" />
    </div>
  );
}

export default function PayPlusPage() {
  return (
    <Suspense fallback={<PayPlusPageFallback />}>
      <PayPlusPageContent />
    </Suspense>
  );
}
