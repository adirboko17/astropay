import { Suspense } from "react";

import { PayPlusPageContent } from "@/components/payplus/payplus-page-content";
import { PageHero } from "@/components/layout/page-hero";
import { PayPlusSyncButton } from "@/components/payplus/payplus-sync-button";

export const dynamic = "force-dynamic";

function PayPlusPageFallback() {
  return (
    <div className="space-y-6">
      <PageHero
        title="PayPlus — הוראות קבע"
        description="טוען נתונים מ-PayPlus…"
        accent="violet"
      >
        <PayPlusSyncButton />
      </PageHero>
      <div className="animate-pulse space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-slate-200/70" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-slate-200/60" />
      </div>
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
