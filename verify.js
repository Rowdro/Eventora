// POST /api/sslcommerz/verify
// Called by the client after the browser lands back on #/payment/callback.
// Confirms the transaction server-side with SSLCommerz's Order Validation API
// before the app is allowed to mark an order as paid and issue a ticket.
//
// Required Vercel env vars: SSLCOMMERZ_STORE_ID, SSLCOMMERZ_STORE_PASSWORD,
// and (optionally) SSLCOMMERZ_IS_LIVE — same as create-session.js.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isLive = String(process.env.SSLCOMMERZ_IS_LIVE || 'false').toLowerCase() === 'true';

    if (!storeId || !storePassword) {
        return res.status(500).json({ error: 'SSLCommerz is not configured on the server.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const { ref, txn } = body; // ref = our tran_id, txn = val_id returned by SSLCommerz

    if (!txn) {
        // No val_id means SSLCommerz never confirmed a transaction for this
        // attempt (typical for a cancelled or failed checkout) — nothing to verify.
        return res.status(200).json({ verified: false });
    }

    const validatorUrl = (isLive
        ? 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
        : 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php')
        + '?val_id=' + encodeURIComponent(txn)
        + '&store_id=' + encodeURIComponent(storeId)
        + '&store_passwd=' + encodeURIComponent(storePassword)
        + '&format=json';

    try {
        const sslRes = await fetch(validatorUrl);
        const data = await sslRes.json();

        const statusOk = data && (data.status === 'VALID' || data.status === 'VALIDATED');
        const refMatches = !ref || !data.tran_id || data.tran_id === ref;

        if (statusOk && refMatches) {
            return res.status(200).json({
                verified: true,
                txnId: data.bank_tran_id || data.val_id || txn,
                amount: data.amount,
                currency: data.currency_type
            });
        }
        return res.status(200).json({ verified: false });
    } catch (err) {
        return res.status(502).json({ error: 'Could not reach SSLCommerz validation API: ' + err.message });
    }
}
