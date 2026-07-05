import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }

  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "bokobzadir@gmail.com", password: "123456" },
  { email: "itaybenyair99@gmail.com", password: "123456" },
];

const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

if (listError) {
  console.error("Failed to list users:", listError.message);
  process.exit(1);
}

for (const user of users) {
  const existing = existingUsers.users.find(
    (item) => item.email?.toLowerCase() === user.email.toLowerCase(),
  );

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: user.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`Failed to update ${user.email}:`, error.message);
      continue;
    }

    console.log(`Updated password for ${user.email}`);
    continue;
  }

  const { error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  if (error) {
    console.error(`Failed to create ${user.email}:`, error.message);
    continue;
  }

  console.log(`Created ${user.email}`);
}

console.log("Done.");
