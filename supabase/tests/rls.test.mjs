// Row-Level-Security isolation tests for Backline.
//
// Proves the policies in supabase/migrations/*_rls_policies.sql actually hold:
//   - catalog is publicly readable but not publicly writable
//   - every per-user table isolates rows to their owner (A cannot read, update,
//     or forge B's data)
//
// Requires a *disposable* Supabase project (never point this at production — it
// creates and deletes users). Set:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Run:  node supabase/tests/rls.test.mjs
// Exits non-zero on any failure. See supabase/tests/README.md.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

// ---- tiny assertion harness ----
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failures.push(name);
    console.log(`  \x1b[31m✗ ${name}\x1b[0m`);
  }
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

/** create a confirmed user and return an authed client + id. */
async function makeUser(tag) {
  const email = `rls-test-${tag}-${Date.now()}@backline.test`;
  const password = "test-password-123!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: `RLS ${tag}` },
  });
  if (error) throw new Error(`createUser(${tag}): ${error.message}`);
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw new Error(`signIn(${tag}): ${signInErr.message}`);
  return { id: data.user.id, client, email };
}

async function main() {
  console.log("\n\x1b[1mBackline RLS isolation tests\x1b[0m\n");

  // A catalog musician id is needed for FK-constrained inserts (bookings, convos)
  const { data: musicians, error: catErr } = await anon.from("musicians").select("id").limit(1);
  if (catErr) throw new Error(`catalog read: ${catErr.message}`);
  if (!musicians?.length) {
    throw new Error("Catalog is empty — run supabase/seed.sql before the RLS tests.");
  }
  const musicianId = musicians[0].id;

  console.log("catalog (anon / signed-out):");
  check("anon CAN read catalog (musicians)", musicians.length > 0);
  const anonWrite = await anon.from("musicians").insert({ id: `hack-${Date.now()}`, name: "x", handle: `h${Date.now()}` });
  check("anon CANNOT write catalog", anonWrite.error !== null);

  // Phase 0 parity: the DB-backed catalog carries the 4-object refactor fields
  // (proves both the parity migration AND the regenerated seed are applied).
  const parity = await Promise.all([
    anon.from("musicians").select("links").eq("id", "m-dre").single(),
    anon.from("venues").select("backline, hiring").eq("id", "v-armadillo").single(),
    anon.from("gigs").select("description, sub_needed").eq("id", "e-cedarrye-rattlesnake").single(),
    anon.from("band_members").select("admin").eq("musician_id", "m-ada").single(),
  ]);
  check("catalog parity: musician links seeded", !parity[0].error && parity[0].data?.links != null);
  check("catalog parity: venue backline + hiring seeded", !parity[1].error && parity[1].data?.backline != null);
  check("catalog parity: event description + sub_needed seeded", !parity[2].error && parity[2].data?.description != null && parity[2].data?.sub_needed != null);
  check("catalog parity: band admin flag seeded", !parity[3].error && parity[3].data?.admin === true);

  const A = await makeUser("a");
  const B = await makeUser("b");
  console.log("\nseeding user A's private data:");

  // A writes a full set of owned rows
  const bookingId = `bk-rls-${Date.now()}`;
  const openingId = `op-rls-${Date.now()}`;
  const seedA = await Promise.all([
    A.client.from("follows").insert({ user_id: A.id, target_id: "b-moontower" }),
    A.client.from("bookings").insert({ id: bookingId, user_id: A.id, musician_id: musicianId, gig_title: "Secret gig", amount: 150, status: "offer" }),
    A.client.from("liked_posts").insert({ user_id: A.id, post_id: "p-1" }),
    A.client.from("responded_sub_posts").insert({ user_id: A.id, post_id: "p-1" }),
    A.client.from("profiles").update({ handle: `a-${Date.now()}` }).eq("id", A.id),
    // fee lives on this row — its privacy is exactly what these tests protect
    A.client.from("openings").insert({ id: openingId, user_id: A.id, instrument: "drums", posted_by_kind: "player", posted_by_id: "me", when_label: "Tonight", fee: 150 }),
    // projects + group chats persist as whole documents (Phase 0)
    A.client.from("user_projects").insert({ id: `proj-rls-${Date.now()}`, user_id: A.id, data: { id: "proj-x", name: "Secret Project", members: [] } }),
    A.client.from("group_conversations").insert({ id: `g-rls-${Date.now()}`, user_id: A.id, data: { id: "g-x", kind: "group", messages: [], unread: 0 } }),
  ]);
  check("A can write its own follows/bookings/likes/subs/profile/openings/projects/group-chats", seedA.every((r) => !r.error));

  const convIns = await A.client.from("conversations").insert({ user_id: A.id, musician_id: musicianId }).select("id").single();
  check("A can create its own conversation", !convIns.error);
  const convId = convIns.data?.id;
  const msgIns = await A.client.from("messages").insert({ id: `m-rls-${Date.now()}`, conversation_id: convId, sender: "user", body: "secret" });
  check("A can post a message in its own conversation", !msgIns.error);

  // ---- isolation: B must not SEE any of A's rows ----
  console.log("\nuser B reading user A's data (must be empty):");
  const reads = {
    profiles: await B.client.from("profiles").select("*").eq("id", A.id),
    follows: await B.client.from("follows").select("*").eq("user_id", A.id),
    bookings: await B.client.from("bookings").select("*").eq("user_id", A.id),
    conversations: await B.client.from("conversations").select("*").eq("user_id", A.id),
    messages: await B.client.from("messages").select("*").eq("conversation_id", convId),
    liked_posts: await B.client.from("liked_posts").select("*").eq("user_id", A.id),
    responded_sub_posts: await B.client.from("responded_sub_posts").select("*").eq("user_id", A.id),
    openings: await B.client.from("openings").select("*").eq("user_id", A.id),
    user_projects: await B.client.from("user_projects").select("*").eq("user_id", A.id),
    group_conversations: await B.client.from("group_conversations").select("*").eq("user_id", A.id),
  };
  for (const [table, res] of Object.entries(reads)) {
    check(`B sees 0 of A's ${table}`, !res.error && (res.data?.length ?? 0) === 0);
  }

  // ---- isolation: B must not MUTATE A's rows ----
  console.log("\nuser B mutating user A's data (must not take effect):");
  // 'held' also proves the escrow-states enum migration is applied
  await B.client.from("bookings").update({ status: "held" }).eq("id", bookingId);
  const afterUpd = await admin.from("bookings").select("status").eq("id", bookingId).single();
  check("B cannot change A's booking status", afterUpd.data?.status === "offer");

  await B.client.from("bookings").delete().eq("id", bookingId);
  const afterDel = await admin.from("bookings").select("id").eq("id", bookingId);
  check("B cannot delete A's booking", (afterDel.data?.length ?? 0) === 1);

  const forge = await B.client.from("follows").insert({ user_id: A.id, target_id: "v-armadillo" });
  check("B cannot forge a row owned by A (WITH CHECK)", forge.error !== null);

  const forgeOpening = await B.client.from("openings").insert({ id: `op-forge-${Date.now()}`, user_id: A.id, instrument: "bass", posted_by_kind: "player", posted_by_id: "me", when_label: "Tonight", fee: 999 });
  check("B cannot forge an opening owned by A (fee privacy)", forgeOpening.error !== null);

  const forgeProject = await B.client.from("user_projects").insert({ id: `proj-forge-${Date.now()}`, user_id: A.id, data: {} });
  check("B cannot forge a project owned by A", forgeProject.error !== null);

  // A's held→released transition still works from A's own client
  const aHold = await A.client.from("bookings").update({ status: "held" }).eq("id", bookingId).select("status").single();
  check("A can move its own booking to 'held' (new enum value live)", aHold.data?.status === "held");

  // ---- positive control: B sees its own data ----
  console.log("\npositive control:");
  const ownProfile = await B.client.from("profiles").select("*").eq("id", B.id);
  check("B CAN read its own profile", !ownProfile.error && (ownProfile.data?.length ?? 0) === 1);

  // ---- cleanup ----
  await admin.auth.admin.deleteUser(A.id);
  await admin.auth.admin.deleteUser(B.id);
  await admin.from("bookings").delete().eq("id", bookingId); // in case cascade lagged

  console.log(`\n\x1b[1m${passed} passed, ${failures.length} failed\x1b[0m`);
  if (failures.length) {
    console.log("\x1b[31mFAILURES:\x1b[0m\n  - " + failures.join("\n  - "));
    process.exit(1);
  }
  console.log("\x1b[32mAll RLS isolation checks passed.\x1b[0m");
}

main().catch((e) => {
  console.error("\x1b[31mRLS test run errored:\x1b[0m", e.message);
  process.exit(1);
});
