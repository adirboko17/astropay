"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { syncPayPlusFromEnv } from "@/app/payplus/actions";

export function PayPlusSyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function handleSync() {
    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const response = await syncPayPlusFromEnv();

      if ("error" in response && response.error) {
        setIsError(true);
        setMessage(response.error);
        return;
      }

      const { synced_count, created_count, updated_count } = response.result!;
      setMessage(
        `סונכרנו ${synced_count} הוראות קבע (${created_count} חדשות, ${updated_count} עודכנו)`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <SyncIcon spinning={isPending} />
        {isPending ? "מסנכרן מ-PayPlus…" : "סנכרון מ-PayPlus"}
      </button>
      {message ? (
        <p
          className={`max-w-xs text-end text-xs ${isError ? "text-rose-600" : "text-emerald-600"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M20 7h-5V2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9a7 7 0 0 1 11.8-3L20 7M4 17l2.7 1a7 7 0 0 0 11.8-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
