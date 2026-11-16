# PayMeGate card checkout: publish checklist (nothing here is live yet)

Order matters: the site's card buttons call `start_card_checkout`, so apply the DB change first.

1. **DB:** apply `supabase/migrations/20261116000000_paymegate_card_checkout.sql`.
   It adds `card_checkouts` and `paymegate_events` plus the `start_card_checkout` RPC, and limits the Zelle alert triggers to `status='pending'`.
2. **Function:** deploy with `supabase functions deploy paymegate-webhook --no-verify-jwt`.
3. **Webhook:** `PUT https://api.paymegate.com/v1/webhook` with `{"url":"https://vrmtxrtzweblakuvkwoe.supabase.co/functions/v1/paymegate-webhook"}`.
   On first setup, the response includes `signingSecret` **once**. Store it only as a Supabase secret:
   `supabase secrets set PAYMEGATE_WEBHOOK_SECRET=...`. Never print or commit it.
   Then confirm in the dashboard, under Settings → Webhooks, that `order.paid` is subscribed.
4. **Return to site:** in the PayMeGate dashboard, set Custom Checkout → Back URL to `https://watchcheesetv.com/thank-you.html`.
   This is account-wide; the API has no per-product return URL. The renewal wording on the thank-you page comes from `localStorage` (or `?renew=1`).
5. **Site:** push this branch to CheeseTV main and the matching mirror commit to cheesetv-tv main.
6. **Smoke test:**
   - Start a card checkout on /signup.html and on /renew.html. Check that a `card_checkouts` row appears and that the browser lands on the right PayMeGate link.
   - A real paid order (or a `pmg_test_` sandbox key with a sandbox webhook) should send a Telegram alert to 6744659892 marked NEW or RENEWAL.

Telegram: `GROK795_BOT_TOKEN` env if set, otherwise the existing Vault `grok795_bot_token` via `tg_secrets()`.
NEW alerts include the existing `sp:<id>` button. Steve creates the line, replies `username password`, and the existing tg-webhook emails the login.
