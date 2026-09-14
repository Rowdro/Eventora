import { sendBackToApp } from './_redirect.js';

// SSLCommerz redirects the buyer's browser here (via a POST) once payment on
// the gateway page succeeds. We don't trust this alone — the client still
// calls /api/sslcommerz/verify to confirm with SSLCommerz's validator API
// before any ticket is issued. This handler just routes the browser back
// into the single-page app.
export default function handler(req, res) {
    sendBackToApp(req, res, 'success');
}
