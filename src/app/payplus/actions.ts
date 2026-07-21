"use server";

import { revalidatePath } from "next/cache";

import { revalidatePayPlusChargesCache } from "@/lib/payplus/revalidate-charges";
import { syncPayPlusRecurringClients } from "@/lib/payplus/sync";

export async function syncPayPlusFromEnv() {
  try {
    const result = await syncPayPlusRecurringClients();
    revalidatePath("/payplus");
    revalidatePath("/");
    revalidatePayPlusChargesCache();

    if (result.synced_count === 0 && result.errors.length > 0) {
      return {
        error: result.errors.map((entry) => entry.message).join(" · "),
        result,
      };
    }

    return { success: true as const, result };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "שגיאה בסנכרון PayPlus",
    };
  }
}
