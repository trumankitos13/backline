import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  try {
    return readFileSync(join(root, relativePath), "utf8");
  } catch {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
}

function requireText(relativePath, pattern, message) {
  const value = read(relativePath);
  if (value && !pattern.test(value)) failures.push(`${relativePath}: ${message}`);
}

const requiredFiles = [
  ".env.staging.example",
  ".nvmrc",
  "supabase/config.toml",
];

for (const file of requiredFiles) read(file);

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajor !== 22) failures.push(`Node 22 is required; found ${process.versions.node}`);

const packageJson = JSON.parse(read("package.json") || "{}");
if (packageJson.dependencies?.["@supabase/supabase-js"] !== "2.110.0") {
  failures.push("@supabase/supabase-js must remain pinned to 2.110.0 during Milestone 0");
}
if (packageJson.devDependencies?.supabase !== "2.109.0") {
  failures.push("Supabase CLI must remain pinned to 2.109.0 during Milestone 0");
}

requireText(
  "supabase/config.toml",
  /site_url\s*=\s*"http:\/\/127\.0\.0\.1:5173"/,
  "local Auth site_url must match the Vite development server",
);
requireText(
  ".github/workflows/ci.yml",
  /run:\s*npm test/,
  "CI must run the unit suite",
);
requireText(
  ".github/workflows/ci.yml",
  /run:\s*npm run check:milestone0/,
  "CI must enforce the Milestone 0 repository contract",
);

const migrationNames = readdirSync(join(root, "supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const migrationIds = migrationNames.map((name) => name.slice(0, 14));
if (new Set(migrationIds).size !== migrationIds.length) {
  failures.push("Supabase migration timestamps must be unique");
}

const requiredMigrations = [
  "20260719203232_phase_2_realtime_messaging_and_booking_states.sql",
  "20260719210030_phase_2_durable_notifications.sql",
  "20260719214303_phase_3_payment_foundation.sql",
  "20260722161611_phase_4_live_availability_and_matching.sql",
  "20260722162218_phase_4_sos_broadcasts.sql",
  "20260722162229_phase_4_sos_broadcast_schema.sql",
];
for (const migration of requiredMigrations) {
  if (!migrationNames.includes(migration)) failures.push(`Missing required migration: ${migration}`);
}

const forbiddenPublicSecretNames = [
  "VITE_SUPABASE_SERVICE_ROLE_KEY",
  "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "VITE_STRIPE_SECRET_KEY",
  "EXPO_PUBLIC_STRIPE_SECRET_KEY",
  "VITE_VAPID_PRIVATE_KEY",
  "EXPO_PUBLIC_VAPID_PRIVATE_KEY",
];
const clientFiles = [
  ...readdirSync(join(root, "src"), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name)),
  join(root, ".env.staging.example"),
];
for (const file of clientFiles) {
  const contents = readFileSync(file, "utf8");
  for (const name of forbiddenPublicSecretNames) {
    if (contents.includes(name)) failures.push(`${file}: forbidden public secret variable ${name}`);
  }
  if (/sk_(?:live|test)_[A-Za-z0-9]{16,}/.test(contents)) {
    failures.push(`${file}: probable Stripe secret key in client-readable content`);
  }
}

if (failures.length) {
  console.error("Milestone 0 readiness check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Milestone 0 repository contract passed (${migrationNames.length} migrations checked).`);
