import { sendBackToApp } from './_redirect.js';

// SSLCommerz redirects here when the payment attempt fails on the gateway.
export default function handler(req, res) {
    sendBackToApp(req, res, 'failed');
}
