# Eventora

Static single-page app + Vercel serverless functions wiring paid checkout to
the **SSLCommerz sandbox** gateway.

## File structure

```
index.html              # shell only — links style.css, loads app.js
style.css               # all app styles
watchdog.js             # shows a friendly error instead of a blank page if app.js fails to load
config.js               # window.EVENTORA_CONFIG — payment endpoints, social links, Google client id
app.js                  # the whole app: store, router, views, checkout/payment flow
api/sslcommerz/
  create-session.js     # POST — starts an SSLCommerz sandbox session, returns GatewayPageURL
  success.js            # SSLCommerz redirects here on success -> bounces back into the SPA
  fail.js                # SSLCommerz redirects here on failure -> bounces back into the SPA
  cancel.js              # SSLCommerz redirects here on cancel -> bounces back into the SPA
  verify.js              # POST — the SPA calls this to confirm the txn server-side before issuing a ticket
  ipn.js                  # SSLCommerz's server-to-server Instant Payment Notification (backstop)
  _redirect.js            # shared helper used by success/fail/cancel
package.json             # "type": "module" so the /api files can use ES `import`/`export`
.env.example              # env vars to copy into Vercel
```

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from inside it).
2. Import the repo in Vercel — no build step needed, it's a static site + `/api` functions, Vercel detects both automatically.
3. In **Project Settings → Environment Variables**, add (see `.env.example`):
   - `SSLCOMMERZ_STORE_ID`
   - `SSLCOMMERZ_STORE_PASSWORD`
   - `SSLCOMMERZ_IS_LIVE` = `false`
4. Deploy. That's it — `config.js` already points checkout at `/api/sslcommerz/create-session` and `/api/sslcommerz/verify`, so paid checkout goes live automatically once the env vars are set.

To test locally: `npm i -g vercel`, then `vercel dev` from this folder (serves the static files **and** runs the `/api` functions together, which a plain static server can't do).

## How the SSLCommerz flow works

1. Attendee checks out → the app POSTs to `/api/sslcommerz/create-session`, which calls SSLCommerz's sandbox API with your store credentials (kept server-side only) and gets back a `GatewayPageURL`.
2. Browser is redirected to that SSLCommerz-hosted page to pay (sandbox test cards/wallets — see SSLCommerz's sandbox docs).
3. SSLCommerz POSTs the result to `/api/sslcommerz/success` (or `fail`/`cancel`), which 302-redirects the browser back into the app at `#/payment/callback?ref=…&status=…&txn=…`.
4. The app calls `/api/sslcommerz/verify`, which re-checks the transaction against SSLCommerz's **Order Validation API** (never trusts the redirect alone) before marking the order paid and issuing the ticket.

No secrets ever reach the browser — `SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASSWORD` are only read inside the `/api` functions.

## Footer behavior

- Logged-out (public pages) and **admin** dashboard: footer shows both the **Attendees** and **Organizers** columns.
- **Attendee** dashboard: the **Organizers** column is hidden.
- **Organizer** dashboard: the **Attendees** column is hidden.

This is handled by `footerHTML(role)` in `app.js`.
