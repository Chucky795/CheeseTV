// Supabase Edge Function: paymegate-checkout Deploy with verify_jwt=false (the site calls it
// with the public key only). Creates a PayMeGate ORDER instead of sending customers to the product link, so they land
// on the branded /pay/<order> page (Cheese TV logo badge + "Return to Cheese TV" link) instead of the "C" letter badge.
//
// Flow: site form -> POST here {kind, connections, email, name, phone?, device?, username?}
//   1. start_card_checkout RPC (same validation + rate limits as today) -> card_checkouts.id
//   2. POST https://api.paymegate.com/v1/orders (no extra API scope needed; the current key works)
//      externalId "ctv-<id>", metadata.checkout_id, per-order backUrl (thank-you, ?renew=1 for renewals), 2 h expiry
//   3. returns {url} -> site redirects there.
// The webhook can then match payments exactly by metadata.checkout_id / externalId instead of by email.
//
// API key: PAYMEGATE_API_KEY env if set, otherwise Vault 'paymegate_api_key' via pmg_secrets().api (service_role only).
// The key never reaches the browser. On any PayMeGate failure we return {id, fallback:true}; the site then opens the
// public product link (no second card_checkouts row).
const SB = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };
const LINKS: Record<string, Record<number, string>> = {
  new: { 1: "4e4df175-d0ad-498b-8b35-91ebe69d8778", 2: "486b0630-cb41-4251-a1a7-43f7f1cbf4e9", 3: "f8945a6f-74cb-46c3-8440-27c700bcb6d1" },
  renewal: { 1: "21a8bb68-f799-47f1-b242-2e272a265f4a", 2: "b3976fbc-7244-4fac-ada2-cff0e4834c58", 3: "d76a41e2-4801-49f8-adab-0b4e18329b88" },
};
const ORIGINS = ["https://watchcheesetv.com", "https://www.watchcheesetv.com"];
let apiKey = Deno.env.get("PAYMEGATE_API_KEY") || "";

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization", Vary: "Origin" };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return new Response("ok");
  let b: any; try { b = await req.json(); } catch { return json(req, { error: "Bad request" }, 400); }
  const kind = b?.kind === "renewal" ? "renewal" : b?.kind === "new" ? "new" : null, n = Number(b?.connections);
  if (!kind || !LINKS[kind][n]) return json(req, { error: "Please pick 1, 2 or 3 connections" }, 400);

  const r = await fetch(`${SB}/rest/v1/rpc/start_card_checkout`, { method: "POST", headers: H, body: JSON.stringify({
    p_kind: kind, p_connections: n, p_email: b.email, p_name: b.name ?? null, p_phone: b.phone ?? null, p_device: b.device ?? null, p_username: b.username ?? null }) });
  const co = await r.json().catch(() => null);
  if (!r.ok || !co?.id) return json(req, { error: co?.message || "Could not start checkout" }, 400);

  if (!apiKey) apiKey = (await (await fetch(`${SB}/rest/v1/rpc/pmg_secrets`, { method: "POST", headers: H, body: "{}" })).json().catch(() => null))?.api || "";
  if (!apiKey) return json(req, { id: co.id, error: "Checkout is not configured", fallback: true }, 503);

  const name = String(b.name || "").trim().slice(0, 80), user = kind === "renewal" ? String(b.username || "").trim().slice(0, 64) : "";
  let o: Response;
  try { o = await fetch("https://api.paymegate.com/v1/orders", { method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json", "User-Agent": "CheeseTV-checkout/1.0" },
    body: JSON.stringify({
      productUUID: LINKS[kind][n], externalId: `ctv-${co.id}`,
      customer: { email: String(b.email).trim().toLowerCase(), ...(name ? { fullName: (user ? `${name} (user ${user})` : name).slice(0, 128) } : {}) },
      backUrl: `https://watchcheesetv.com/thank-you.html${kind === "renewal" ? "?renew=1" : ""}`,
      expiresAt: new Date(Date.now() + 2 * 3600e3).toISOString(),
      metadata: { app: "cheesetv", type: kind, connections: String(n), months: "1", checkout_id: String(co.id), ...(user ? { username: user } : {}) },
    }) });
  } catch { return json(req, { id: co.id, error: "Could not open checkout", fallback: true }, 502); }
  const od = await o.json().catch(() => null);
  const url = od?.data?.checkoutUrl;
  if (!o.ok || !url || !/^https:\/\/www\.paymegate\.com\/pay\//.test(url)) return json(req, { id: co.id, error: "Could not open checkout", fallback: true }, 502);
  await fetch(`${SB}/rest/v1/card_checkouts?id=eq.${co.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ order_uuid: od.data.orderUUID }) });
  return json(req, { id: co.id, url });
});
