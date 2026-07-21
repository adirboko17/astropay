import { updateTag } from "next/cache";

export function revalidatePayPlusChargesCache() {
  updateTag("payplus-charges");
}
