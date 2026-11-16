// Supabase Edge Function: paymegate-webhook (prepared, NOT deployed). Deploy with --no-verify-jwt
// (PayMeGate can't send a Supabase JWT; the HMAC signature is the authentication).
// Secrets: PAYMEGATE_WEBHOOK_SECRET (returned once by PayMeGate when the webhook is first configured).
// Telegram token: GROK795_BOT_TOKEN if set, otherwise the existing Vault secret via tg_secrets().
import { makeHandler } from "./handler.ts";

const SB = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };
let bot = Deno.env.get("GROK795_BOT_TOKEN") || "";

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...H, Prefer: "return=representation", ...(init.headers || {}) } });
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}
async function telegram(method: string, body: unknown) {
  if (!bot) bot = (await (await fetch(`${SB}/rest/v1/rpc/tg_secrets`, { method: "POST", headers: H, body: "{}" })).json())?.bot || "";
  const r = await fetch(`https://api.telegram.org/bot${bot}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return await r.json().catch(() => null);
}

Deno.serve(makeHandler({ secret: Deno.env.get("PAYMEGATE_WEBHOOK_SECRET") || "", db, telegram }));
