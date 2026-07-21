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
        className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
      >
        {isPending ? "מסנכרן מ-PayPlus…" : "סנכרון מ-PayPlus"}
      </button>
      {message ? (
        <p
          className={`max-w-xs text-end text-xs ${isError ? "text-amber-100" : "text-white/80"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
