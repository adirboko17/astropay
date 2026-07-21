import { syncPayPlusRecurringClients } from "../src/lib/payplus/sync";

async function main() {
  const result = await syncPayPlusRecurringClients();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
