// node --test tests/paymegate-webhook.test.mts   (Node 23.6+ strips TS types)
import test from "node:test"; import assert from "node:assert/strict";
import { makeHandler, sign, verify, OWNER } from "../supabase/functions/paymegate-webhook/handler.ts";
const SECRET = "whsec_test_only"; const NOW = 1_800_000_000_000;
function env(rows: any[] = []) {
  const calls: any[] = [], tg: any[] = []; const events = new Set<string>(); let id = 100;
  const db = async (path: string, init: any = {}) => {
    calls.push({ path, method: init.method || "GET", body: init.body ? JSON.parse(init.body) : null });
    if (path === "paymegate_events" && init.method === "POST") { const e = JSON.parse(init.body).event_id; if (events.has(e)) return { ok: false, status: 409, data: null }; events.add(e); return { ok: true, status: 201, data: null }; }
    if (path.startsWith("card_checkouts?select")) { const u = new URL("http://x/" + path); const em = decodeURIComponent(u.searchParams.get("email")!.slice(3));
      const k = u.searchParams.get("kind")?.slice(3); const n = u.searchParams.get("connections")?.slice(3);
      return { ok: true, status: 200, data: rows.filter(r => r.email === em && (!k || r.kind === k) && (!n || String(r.connections) === n)) }; }
    if ((path === "signup_requests" || path === "renewal_requests") && init.method === "POST") return { ok: true, status: 201, data: [{ id: ++id }] };
    return { ok: true, status: 204, data: null };
  };
  const h = makeHandler({ secret: SECRET, db, telegram: async (m, b) => { tg.push({ m, b }); return {}; }, now: () => NOW });
  return { h, calls, tg };
}
async function req(ev: any, o: { ts?: number; sig?: string; id?: string } = {}) {
  const raw = JSON.stringify(ev); const ts = String(o.ts ?? NOW / 1000);
  return new Request("http://x/", { method: "POST", body: raw, headers: { "x-paymegate-event": "order.paid", "x-paymegate-event-id": o.id ?? ev.id,
    "x-paymegate-timestamp": ts, "x-paymegate-signature": o.sig ?? await sign(SECRET, ts, raw), "content-type": "application/json" } });
}
const ev = (over: any = {}) => ({ id: "f15068cf-c0ea-4b67-91bb-4c45ec6eac88", type: "order.paid", createdAt: "2027-01-15T08:00:00Z", orderUUID: "9cb50d55-9e02-4fc0-a824-277ac39b4144",
  status: "PAID", amount: "19.99", currency: "USD", customerEmail: "Buyer@Example.com", externalId: null, metadata: { app: "cheesetv", type: "renewal", connections: 2, months: 1 }, paidAt: "2027-01-15T08:00:00Z", ...over });

test("signature: matches spec format and rejects tamper/stale", async () => {
  const s = await sign(SECRET, "1", "{}"); assert.match(s, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(await verify(SECRET, "1800000000", await sign(SECRET, "1800000000", "{}"), "{}", NOW), true);
  assert.equal(await verify(SECRET, "1800000000", await sign(SECRET, "1800000000", "{}"), "{ }", NOW), false);
  assert.equal(await verify(SECRET, "1799999000", await sign(SECRET, "1799999000", "{}"), "{}", NOW), false);
  assert.equal(await verify("", "1800000000", s, "{}", NOW), false);
});
test("bad signature -> 401, no alert", async () => {
  const e = env(); const r = await e.h(await req(ev(), { sig: "A".repeat(43) })); assert.equal(r.status, 401); assert.equal(e.tg.length, 0); assert.equal(e.calls.length, 0);
});
test("renewal: username from site form, marked RENEWAL, Zelle-free insert as paid, deduped", async () => {
  const e = env([{ id: 7, kind: "renewal", connections: 2, email: "buyer@example.com", username: "jdoe22", customer_name: "J Doe" }]);
  const r = await e.h(await req(ev())); assert.equal(r.status, 200);
  const ins = e.calls.find(c => c.path === "renewal_requests"); assert.equal(ins.body.username, "jdoe22"); assert.equal(ins.body.status, "paid"); assert.equal(ins.body.contact, "buyer@example.com");
  assert.equal(e.tg.length, 1); const t = e.tg[0].b; assert.equal(t.chat_id, OWNER);
  assert.match(t.text, /RENEWAL paid by card/); assert.match(t.text, /Username: jdoe22/); assert.match(t.text, /2 connections/); assert.match(t.text, /\$19\.99 USD/); assert.match(t.text, /buyer@example\.com/);
  assert.ok(e.calls.some(c => c.path === "card_checkouts?id=eq.7" && c.method === "PATCH"));
  const r2 = await e.h(await req(ev())); assert.equal(r2.status, 200); assert.equal(e.tg.length, 1, "duplicate delivery must not alert twice");
});
test("new: NEW alert with create-login button wired to existing sp: flow", async () => {
  const e = env([{ id: 9, kind: "new", connections: 1, email: "new@example.com", customer_name: "Ann", device: "Roku", phone: null }]);
  await e.h(await req(ev({ id: "11111111-1111-4111-8111-111111111111", amount: "14.99", customerEmail: "new@example.com", metadata: { app: "cheesetv", type: "new", connections: 1 } })));
  const ins = e.calls.find(c => c.path === "signup_requests"); assert.equal(ins.body.status, "paid"); assert.equal(ins.body.device, "Roku"); assert.match(ins.body.memo_code, /^CARD-/);
  const t = e.tg[0].b; assert.match(t.text, /NEW customer paid by card #101/); assert.doesNotMatch(t.text, /Username/);
  assert.equal(t.reply_markup.inline_keyboard[0][0].callback_data, "sp:101");
});
test("renewal paid without site form: still alerts, asks for username", async () => {
  const e = env(); await e.h(await req(ev({ id: "22222222-2222-4222-8222-222222222222" })));
  assert.match(e.tg[0].b.text, /RENEWAL/); assert.match(e.tg[0].b.text, /Username: not given/);
});
test("non-CheeseTV product: unknown type alert, no rows inserted", async () => {
  const e = env(); await e.h(await req(ev({ id: "33333333-3333-4333-8333-333333333333", metadata: {} , amount: "50.00"})));
  assert.match(e.tg[0].b.text, /Card payment received/); assert.ok(!e.calls.some(c => c.path === "signup_requests" || c.path === "renewal_requests"));
});
test("event id header must match body", async () => {
  const e = env(); const r = await e.h(await req(ev(), { id: "44444444-4444-4444-8444-444444444444" })); assert.equal(r.status, 400); assert.equal(e.tg.length, 0);
});
