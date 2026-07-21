import { unstable_cache } from "next/cache";

import { fetchRecurringCharges } from "./client";
import { getPayPlusConfig } from "./config";
import type { PayPlusRecurringCharge } from "./types";

const PAYPLUS_CHARGES_REVALIDATE_SECONDS = 180;

export async function fetchRecurringChargesCached(
  recurringUid: string,
): Promise<PayPlusRecurringCharge[]> {
  return unstable_cache(
    async () => {
      const config = getPayPlusConfig();
      return fetchRecurringCharges(config, recurringUid);
    },
    ["payplus-recurring-charges", recurringUid],
    {
      revalidate: PAYPLUS_CHARGES_REVALIDATE_SECONDS,
      tags: ["payplus-charges", `payplus-charges:${recurringUid}`],
    },
  )();
}
