// POST /api/sslcommerz/create-session
// Starts an SSLCommerz sandbox payment session and returns a GatewayPageURL
// for the client to redirect the browser to.
//
// Required Vercel env vars (Project Settings -> Environment Variables):
//   SSLCOMMERZ_STORE_ID        your sandbox store id
//   SSLCOMMERZ_STORE_PASSWORD  your sandbox store password
//   SSLCOMMERZ_IS_LIVE         "true" for the live gateway, unset/"false" for sandbox

function baseUrl(req) {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return proto + '://' + host;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isLive = String(process.env.SSLCOMMERZ_IS_LIVE || 'false').toLowerCase() === 'true';

    if (!storeId || !storePassword) {
        return res.status(500).json({
            error: 'SSLCommerz is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD in your Vercel project environment variables.'
        });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const { ref, amount, currency, method, description, customer, callbackUrl } = body;

    if (!ref || !amount) {
        return res.status(400).json({ error: 'Missing required fields: ref, amount' });
    }

    const origin = baseUrl(req);
    const cusName = (customer && customer.name) || 'Eventora Guest';
    const cusEmail = (customer && customer.email) || 'guest@example.com';

    const apiUrl = isLive
        ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
        : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

    const params = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword,
        total_amount: String(amount),
        currency: currency || 'BDT',
        tran_id: ref,
        success_url: origin + '/api/sslcommerz/success',
        fail_url: origin + '/api/sslcommerz/fail',
        cancel_url: origin + '/api/sslcommerz/cancel',
        ipn_url: origin + '/api/sslcommerz/ipn',
        shipping_method: 'NO',
        product_name: description || 'Eventora Ticket',
        product_category: 'Event Ticket',
        product_profile: 'general',
        cus_name: cusName,
        cus_email: cusEmail,
        cus_add1: 'N/A',
        cus_city: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01700000000',
        num_of_item: '1',
        // Round-tripped through SSLCommerz and echoed back on success/fail/cancel
        // so the redirect handlers know exactly where in the SPA to send the user.
        value_a: callbackUrl || (origin + '/#/payment/callback'),
        value_b: method || ''
    });

    try {
        const sslRes = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        const data = await sslRes.json();

        if (data && data.status === 'SUCCESS' && data.GatewayPageURL) {
            return res.status(200).json({ redirectUrl: data.GatewayPageURL, sessionkey: data.sessionkey });
        }
        return res.status(502).json({ error: (data && (data.failedreason || data.message)) || 'SSLCommerz declined to start the session.' });
    } catch (err) {
        return res.status(502).json({ error: 'Could not reach SSLCommerz: ' + err.message });
    }
}
