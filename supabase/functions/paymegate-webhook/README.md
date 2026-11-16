# PayMeGate card checkout: live setup (Nov 15, 2026)

- **DB:** migration `paymegate_card_checkout` and `paymegate_events_alert_ok`, applied. Adds `card_checkouts`, `paymegate_events`, the `start_card_checkout` RPC (anon) and `pmg_secrets()` (service_role only). The Zelle alert triggers now fire only for `status='pending'`.
- **Function:** `paymegate-webhook` deployed with verify_jwt off. The HMAC signature is the authentication. GET/HEAD return 200 for PayMeGate's reachability probe.
- **Webhook:** set with `PUT /v1/webhook` and subscribed to `order.paid`. The signing secret was returned once and piped straight into Vault as `paymegate_webhook_secret`; it was never printed. There was no CLI or management token for function env secrets. The function also accepts a `PAYMEGATE_WEBHOOK_SECRET` env override.
- **Telegram:** uses `GROK795_BOT_TOKEN` env or Vault `grok795_bot_token`, and sends only to chat 6744659892. `paymegate_events.alert_ok` records whether Telegram accepted each alert.
- **Back URL:** the dashboard's Custom Checkout setting (account-wide; there's no API for it) should be `https://watchcheesetv.com/thank-you.html`.
- **Test without charging:** sign an event in SQL with the Vault secret (`extensions.hmac(ts||'.'||body::text, secret, 'sha256')`, base64url) and post it with `net.http_post`. Set `livemode:false` so the alert is marked [TEST].
- **tg-webhook:** copied to `supabase/functions/tg-webhook/` (v2). The welcome email now mentions card renewals.

## Branded order checkout (paymegate-checkout, live 2026-11-15)
The site POSTs the form to `functions/v1/paymegate-checkout` (verify_jwt off). It calls `start_card_checkout`, then
`POST /v1/orders` with externalId `ctv-<id>`, metadata.checkout_id, a per-order backUrl (thank-you, `?renew=1` for renewals)
and a 2 h expiry, and returns the branded `/pay/<order>` URL (logo badge + Return to Cheese TV). Key: Vault
`paymegate_api_key` via `pmg_secrets().api`. On failure the site falls back to the public product link. The webhook
matches exactly by checkout_id / externalId before the email match.

## Disabled 2026-11-15
CheeseTV went back to Zelle only. The deployed paymegate-checkout and paymegate-webhook functions are 410 stubs, the
PayMeGate secrets were deleted from Vault, and the site no longer loads cardpay.js. Tables and migrations are kept.
Full working state: branch archive/paymegate-card-checkout.
