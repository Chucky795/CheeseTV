// PayMeGate order.paid -> Telegram alert for Steve (chat 6744659892 only).
// Verifies X-Paymegate-Signature = base64url(HMAC-SHA256(secret, timestamp + "." + rawBody)), rejects stale
// timestamps, dedupes by event id, matches the site's card_checkouts row by email, and records the paid
// signup/renewal so the existing Telegram buttons (sp:<id>) keep working.

export const OWNER = 6744659892;
const PLAN: Record<string, number> = { "14.99": 1, "19.99": 2, "27.99": 3 };

export interface Deps {
  secret: string;                       // PAYMEGATE_WEBHOOK_SECRET
  db: (path: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; data: any }>;
  telegram: (method: string, body: unknown) => Promise<unknown>;
  now?: () => number;                   // ms
  toleranceSec?: number;
}

const enc = new TextEncoder();
function b64url(buf: ArrayBuffer) {
  let s = ""; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function sign(secret: string, ts: string, raw: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, enc.encode(`${ts}.${raw}`)));
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function verify(secret: string, ts: string | null, sig: string | null, raw: string, nowMs: number, tol = 300) {
  if (!secret || !ts || !sig || !/^[0-9]+$/.test(ts) || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return false;
  if (Math.abs(nowMs / 1000 - Number(ts)) > tol) return false;
  return safeEq(await sign(secret, ts, raw), sig);
}

const plural = (n: number) => `${n} connection${n === 1 ? "" : "s"}`;
export function alertText(o: { kind: "new" | "renewal" | "unknown"; n: number | null; amount: string; currency: string; email: string;
  username?: string | null; name?: string | null; phone?: string | null; device?: string | null; order: string; ref?: number | null; test?: boolean; siteEmail?: string | null; exact?: boolean }) {
  const head = o.kind === "renewal" ? "🔁 RENEWAL paid by card" : o.kind === "new" ? "🆕 NEW customer paid by card" : "💳 Card payment received";
  const lines = [`${o.test ? "[TEST] " : ""}${head}${o.ref ? ` #${o.ref}` : ""}`,
    `Plan: ${o.n ? plural(o.n) : "?"} · 1 month`, `Amount: $${o.amount} ${o.currency}`, `Email: ${o.email}`];
  if (o.siteEmail && o.siteEmail !== o.email) lines.push(o.exact ? `ℹ️ Site form email was ${o.siteEmail} (customer used a different email at checkout). Matched by order, details are exact.` :`⚠️ Site form email was ${o.siteEmail} (different from checkout). Details below are a likely match; double-check.`);
  if (o.kind === "renewal") lines.push(`Username: ${o.username || "not given (ask the customer)"}`);
  if (o.name) lines.push(`Name: ${o.name}`);
  if (o.phone) lines.push(`Phone: ${o.phone}`);
  if (o.device) lines.push(`Device: ${o.device}`);
  lines.push(`Order ref: CARD-${o.order.slice(0, 8)} · ${o.email}`, `Order: ${o.order}`, "");
  lines.push(o.kind === "renewal" ? `Verified by PayMeGate. Extend ${o.username || "the customer's line"} by 1 month on BQ Panel.`
    : o.kind === "new" ? "Verified by PayMeGate. Create the login, then tap the button and reply with username and password to email it."
    : "Verified by PayMeGate, but no matching sign-up/renew form was found. Email the customer to ask if this is new or a renewal.");
  return lines.join("\n");
}

export function makeHandler(d: Deps) {
  const now = d.now ?? (() => Date.now());
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return new Response("ok");
    const raw = await req.text();
    const ok = await verify(d.secret, req.headers.get("x-paymegate-timestamp"), req.headers.get("x-paymegate-signature"), raw, now(), d.toleranceSec);
    if (!ok) return new Response("invalid signature", { status: 401 });
    let ev: any; try { ev = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
    if (ev?.type !== "order.paid" || ev?.status !== "PAID" || req.headers.get("x-paymegate-event") !== "order.paid") return new Response("ignored", { status: 200 });
    const eventId = req.headers.get("x-paymegate-event-id") || ev.id;
    if (!eventId || (ev.id && eventId !== ev.id)) return new Response("bad event id", { status: 400 });

    const md = ev.metadata || {};
    const fromMeta = md.app === "cheesetv" && (md.type === "new" || md.type === "renewal") ? md.type : null;
    const n = Number(md.connections) || PLAN[String(ev.amount)] || null;
    const email = String(ev.customerEmail || "").toLowerCase();

    // Idempotency: first writer wins; a duplicate delivery returns 200 without a second alert.
    const ins = await d.db("paymegate_events", { method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ event_id: eventId, order_uuid: ev.orderUUID, amount: ev.amount, currency: ev.currency, customer_email: email, kind: fromMeta, connections: n, payload: ev }) });
    if (!ins.ok) return new Response(ins.status === 409 ? "duplicate" : "db error", { status: ins.status === 409 ? 200 : 500 });

    // Exact match first: orders created by paymegate-checkout carry metadata.checkout_id and externalId "ctv-<id>".
    const cidRaw = String(md.checkout_id ?? "") || (/^ctv-(\d+)$/.exec(String(ev.externalId ?? ""))?.[1] ?? "");
    const cid = /^\d{1,12}$/.test(cidRaw) ? cidRaw : null;
    let co = cid ? ((await d.db(`card_checkouts?select=*&id=eq.${cid}&paid_at=is.null&limit=1`)).data?.[0] ?? null) : null;
    const exact = !!co;
    let siteEmail: string | null = co && co.email && co.email !== email ? co.email : null;
    // Otherwise: newest unpaid site checkout for this email (same type and plan when known), within 48 h.
    const since = new Date(now() - 48 * 3600e3).toISOString();
    let q = `card_checkouts?select=*&paid_at=is.null&email=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=1`;
    if (fromMeta) q += `&kind=eq.${fromMeta}`;
    if (n) q += `&connections=eq.${n}`;
    if (!co) co = (await d.db(q)).data?.[0] ?? null;
    // Customer may have changed the email on the checkout page: fall back to the newest unpaid site form
    // for the same type and plan in the last 2 hours, and flag it so Steve double-checks.
    if (!co && fromMeta && n) {
      const since2 = new Date(now() - 2 * 3600e3).toISOString();
      co = (await d.db(`card_checkouts?select=*&paid_at=is.null&kind=eq.${fromMeta}&connections=eq.${n}&created_at=gte.${encodeURIComponent(since2)}&order=created_at.desc&limit=1`)).data?.[0] ?? null;
      if (co) siteEmail = co.email;
    }
    const kind: "new" | "renewal" | "unknown" = fromMeta ?? co?.kind ?? "unknown";
    const test = ev.livemode === false;
    const paidAt = ev.paidAt || new Date(now()).toISOString();
    let ref: number | null = null, markup: unknown = undefined;

    if (kind === "new") {
      const r = await d.db("signup_requests", { method: "POST", body: JSON.stringify({
        customer_name: (co?.customer_name || email.split("@")[0]).slice(0, 80), email, phone: co?.phone ?? null, device: co?.device || "Other",
        connections: n || 1, amount: ev.amount, memo_code: `CARD-${String(ev.orderUUID).slice(0, 8)}`, status: "paid", paid_at: paidAt, is_test: test }) });
      ref = r.data?.[0]?.id ?? null;
      markup = { inline_keyboard: [
        ...(ref ? [[{ text: "✅ Login created: reply with it", callback_data: `sp:${ref}` }]] : []),
        [{ text: "➕ Open BQ Panel: add line", url: "https://bqpanel.com/devices/m3u/create" }]] };
    } else if (kind === "renewal") {
      const r = await d.db("renewal_requests", { method: "POST", body: JSON.stringify({
        username: co?.username || "(unknown)", customer_name: (co?.customer_name || email.split("@")[0]).slice(0, 80), contact: email,
        connections: n || 1, amount: ev.amount, status: "paid", paid_at: paidAt, is_test: test }) });
      ref = r.data?.[0]?.id ?? null;
    }
    if (co) await d.db(`card_checkouts?id=eq.${co.id}`, { method: "PATCH", body: JSON.stringify({ paid_at: paidAt, order_uuid: ev.orderUUID,
      ...(kind === "new" ? { signup_id: ref } : kind === "renewal" ? { renewal_id: ref } : {}) }) });
    await d.db(`paymegate_events?event_id=eq.${eventId}`, { method: "PATCH", body: JSON.stringify({ kind, checkout_id: co?.id ?? null,
      ...(kind === "new" ? { signup_id: ref } : kind === "renewal" ? { renewal_id: ref } : {}) }) });

    const tr: any = await d.telegram("sendMessage", { chat_id: OWNER, text: alertText({ kind, n, amount: String(ev.amount), currency: ev.currency || "USD", email,
      username: co?.username, name: co?.customer_name, phone: co?.phone, device: co?.device, order: ev.orderUUID, ref, test, siteEmail, exact }),
      ...(markup ? { reply_markup: markup } : {}) });
    await d.db(`paymegate_events?event_id=eq.${eventId}`, { method: "PATCH", body: JSON.stringify({ alert_ok: !!tr?.ok }) });
    return new Response("ok", { status: 200 });
  };
}
