# PayMeGate card checkout: live setup (Nov 15, 2026)

- **DB:** migration `paymegate_card_checkout` and `paymegate_events_alert_ok`, applied. Adds `card_checkouts`, `paymegate_events`, the `start_card_checkout` RPC (anon) and `pmg_secrets()` (service_role only). The Zelle alert triggers now fire only for `status='pending'`.
- **Function:** `paymegate-webhook` deployed with verify_jwt off. The HMAC signature is the authentication. GET/HEAD return 200 for PayMeGate's reachability probe.
- **Webhook:** set with `PUT /v1/webhook` and subscribed to `order.paid`. The signing secret was returned once and piped straight into Vault as `paymegate_webhook_secret`; it was never printed. There was no CLI or management token for function env secrets. The function also accepts a `PAYMEGATE_WEBHOOK_SECRET` env override.
- **Telegram:** uses `GROK795_BOT_TOKEN` env or Vault `grok795_bot_token`, and sends only to chat 6744659892. `paymegate_events.alert_ok` records whether Telegram accepted each alert.
- **Back URL:** the dashboard's Custom Checkout setting (account-wide; there's no API for it) should be `https://watchcheesetv.com/thank-you.html`.
- **Test without charging:** sign an event in SQL with the Vault secret (`extensions.hmac(ts||'.'||body::text, secret, 'sha256')`, base64url) and post it with `net.http_post`. Set `livemode:false` so the alert is marked [TEST].
- **tg-webhook:** copied to `supabase/functions/tg-webhook/` (v2). The welcome email now mentions card renewals.
