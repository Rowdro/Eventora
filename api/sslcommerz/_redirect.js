// Shared helper for success.js / fail.js / cancel.js.
// SSLCommerz POSTs form-encoded data straight to these URLs (no CORS, no
// client JS involved) and expects a redirect back into the browser. We send
// the user back into the SPA's hash router with the reference/status/txn id
// as a query string appended after the hash path, e.g.:
//   https://your-app.vercel.app/#/payment/callback?ref=EVPAY-XXXX&status=success&txn=VAL123

function baseUrl(req) {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return proto + '://' + host;
}

export function sendBackToApp(req, res, status) {
    const src = (req.method === 'POST' ? req.body : req.query) || {};
    const tranId = src.tran_id || src.tranId || '';
    const valId = src.val_id || src.valId || '';
    // value_a was set by create-session.js to the app's own callback URL
    // (origin + pathname + '#/payment/callback'), so it survives round-trip
    // through SSLCommerz even if the deployment URL/path ever changes.
    const callbackBase = src.value_a || (baseUrl(req) + '/#/payment/callback');

    const qs = new URLSearchParams({ ref: tranId, status, txn: valId }).toString();
    const target = callbackBase + (callbackBase.includes('?') ? '&' : '?') + qs;

    res.writeHead(302, { Location: target });
    res.end();
}
