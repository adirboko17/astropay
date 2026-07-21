import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRef = "jiakqbgnuqsmncpuxdii";
const functionDir = path.join("supabase", "functions", "sync-payplus-recurring-customers");

if (!fs.existsSync(functionDir)) {
  console.error("Missing edge function directory:", functionDir);
  process.exit(1);
}

console.log("Deploying sync-payplus-recurring-customers to Supabase...");
execSync(
  `npx supabase functions deploy sync-payplus-recurring-customers --project-ref ${projectRef} --no-verify-jwt`,
  { stdio: "inherit", cwd: process.cwd() },
);
