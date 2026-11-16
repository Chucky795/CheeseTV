const SB = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER = 6744659892;
const H = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };
let S: { bot: string; resend: string; hook: string; from: string } | null = null;

async function secrets() {
  if (!S) S = await (await fetch(`${SB}/rest/v1/rpc/tg_secrets`, { method: "POST", headers: H, body: "{}" })).json();
  return S!;
}
async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...H, Prefer: "return=representation", ...(init.headers || {}) } });
  return r.ok ? await r.json() : [];
}
const patch = (t: string, q: string, body: unknown) => db(`${t}?${q}`, { method: "PATCH", body: JSON.stringify(body) });
async function tg(method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${(await secrets()).bot}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return await r.json();
}
const say = (text: string, extra: Record<string, unknown> = {}) => tg("sendMessage", { chat_id: OWNER, text, ...extra });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

async function emailLogin(row: any, user: string, pass: string) {
  const s = await secrets();
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
<h2>Welcome to CheeseTV 🧀📺</h2><p>Hi ${esc(row.customer_name)}, your payment was received and your account is ready.</p>
<p style="background:#f4f4f4;padding:12px;border-radius:8px">Username: <b>${esc(user)}</b><br>Password: <b>${esc(pass)}</b><br>Connections: ${row.connections}</p>
<h3>Set up your device</h3><ul>
<li><b>Fire TV, Android TV, Google TV:</b> install the <i>Downloader</i> app, open it and enter <b>watchcheesetv.com/tv.apk</b>. Install, open CheeseTV and sign in with the login above.</li>
<li><b>iPhone, iPad or computer:</b> open the web player at <a href="https://live.watchcheesetv.com">live.watchcheesetv.com</a> and sign in.</li>
<li>More devices and help: <a href="https://watchcheesetv.com/#download">watchcheesetv.com</a></li></ul>
<p>Pay as you go, no contract. To renew next month, go to <a href="https://watchcheesetv.com/renew.html">watchcheesetv.com/renew.html</a>, enter your username and pay by <b>card, Apple Pay or Google Pay</b> on our secure checkout, or by Zelle to cheesetv795@gmail.com. Renewals extend this same login, so there's no new login to set up.</p>
<p>Questions? Just reply to this email.</p><p>Enjoy!<br>CheeseTV</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${s.resend}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: s.from, to: [row.email], reply_to: "cheesetv795@gmail.com", subject: "Your CheeseTV login is ready", html }),
  });
  if (r.ok) return null;
  const j = await r.json().catch(() => ({}));
  return `${r.status} ${j.message || ""}`.trim();
}

async function onCallback(cq: any) {
  const [kind, idS] = String(cq.data || "").split(":");
  const id = Number(idS);
  await tg("answerCallbackQuery", { callback_query_id: cq.id });
  if (!id) return;
  const mid = cq.message?.message_id;
  const keepPanel = { inline_keyboard: [[{ text: "➕ Open BQ Panel: add line", url: "https://bqpanel.com/devices/m3u/create" }]] };
  if (kind === "sp" || kind === "sn") {
    const [row] = await db(`signup_requests?id=eq.${id}&select=*`);
    if (!row) return say(`Sign-up #${id} not found.`);
    if (row.status === "active") return say(`Sign-up #${id} is already active (login sent).`);
    if (kind === "sn") {
      await patch("signup_requests", `id=eq.${id}`, { status: "not_received" });
      await tg("editMessageReplyMarkup", { chat_id: OWNER, message_id: mid, reply_markup: { inline_keyboard: [[{ text: "✅ Payment received after all", callback_data: `sp:${id}` }]] } });
      return say(`❌ Sign-up #${id} (${row.customer_name}) marked as payment NOT received. Nothing was sent to the customer. If the Zelle shows up later, tap "Payment received after all".`);
    }
    await tg("editMessageReplyMarkup", { chat_id: OWNER, message_id: mid, reply_markup: keepPanel });
    const p = await say(`✅ Sign-up #${id} (${row.customer_name}, ${row.connections} connection${row.connections > 1 ? "s" : ""}) marked PAID.\n\n1. Create the line on BQ Panel.\n2. Reply to THIS message with the username and password, like:\nusername password\n\nI'll email the login to ${row.email}.`, { reply_markup: { force_reply: true, input_field_placeholder: "username password" } });
    await patch("signup_requests", `id=eq.${id}`, { status: "paid", paid_at: new Date().toISOString(), prompt_msg_id: p?.result?.message_id ?? null });
    return;
  }
  if (kind === "rp" || kind === "rn") {
    const [row] = await patch("renewal_requests", `id=eq.${id}`, kind === "rp" ? { status: "paid", paid_at: new Date().toISOString() } : { status: "not_received" });
    if (!row) return say(`Renewal #${id} not found.`);
    await tg("editMessageReplyMarkup", { chat_id: OWNER, message_id: mid, reply_markup: { inline_keyboard: kind === "rp" ? [] : [[{ text: "✅ Payment received after all", callback_data: `rp:${id}` }]] } });
    return say(kind === "rp" ? `✅ Renewal #${id} marked PAID. Renew user ${row.username} (${row.connections} connection${row.connections > 1 ? "s" : ""}) on BQ Panel.` : `❌ Renewal #${id} (${row.username}) marked as payment NOT received.`);
  }
}

async function onReply(msg: any) {
  const rid = msg.reply_to_message?.message_id;
  const [row] = await db(`signup_requests?prompt_msg_id=eq.${rid}&select=*`);
  if (!row) return;
  if (row.status === "active") return say(`Sign-up #${row.id} already has a login sent.`);
  const parts = String(msg.text || "").trim().split(/\s+/);
  if (parts.length !== 2 || parts.some((x) => x.length < 1 || x.length > 64)) {
    return say(`I couldn't read that. Reply to my message for #${row.id} with just the username and password, separated by a space or on two lines.`, { reply_markup: { force_reply: true } }).then(async (p: any) => { if (p?.result?.message_id) await patch("signup_requests", `id=eq.${row.id}`, { prompt_msg_id: p.result.message_id }); });
  }
  const [user, pass] = parts;
  await patch("signup_requests", `id=eq.${row.id}`, { line_username: user, line_password: pass });
  const err = await emailLogin(row, user, pass);
  await patch("signup_requests", `id=eq.${row.id}`, { status: "active", activated_at: new Date().toISOString(), line_password: null, emailed_at: err ? null : new Date().toISOString(), email_error: err });
  if (!err) return say(`📧 Login for #${row.id} emailed to ${row.email} (username ${user}). Customer marked ACTIVE. ✅`);
  return say(`⚠️ #${row.id} is marked ACTIVE, but the email to ${row.email} couldn't be sent (${err}).\nPlease send the login yourself:\nUsername: ${user}\nPassword: ${pass}\nDownloader code: watchcheesetv.com/tv.apk\nWeb player: https://live.watchcheesetv.com`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const s = await secrets();
  if (!s?.hook || req.headers.get("x-telegram-bot-api-secret-token") !== s.hook) return new Response("forbidden", { status: 403 });
  const u = await req.json().catch(() => ({}));
  try {
    if (u.callback_query) {
      if (u.callback_query.from?.id === OWNER && u.callback_query.message?.chat?.id === OWNER) await onCallback(u.callback_query);
    } else if (u.message?.chat?.id === OWNER && u.message?.from?.id === OWNER && u.message.reply_to_message) await onReply(u.message);
  } catch (e) { console.error(e); }
  return new Response("ok");
});
