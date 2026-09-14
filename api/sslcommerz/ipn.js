// POST /api/sslcommerz/ipn
// SSLCommerz's server-to-server Instant Payment Notification. This app's
// verification already happens synchronously via /api/sslcommerz/verify when
// the buyer's browser returns, so this endpoint just needs to exist and
// return 200 so SSLCommerz doesn't retry/flag it — useful as a backstop and
// for your own server-side logging/auditing if you add a database later.
export default function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end();
    }
    // console.log('SSLCommerz IPN:', req.body);
    res.status(200).send('IPN received');
}
