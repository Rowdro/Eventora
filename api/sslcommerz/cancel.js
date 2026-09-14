import { sendBackToApp } from './_redirect.js';

// SSLCommerz redirects here when the buyer cancels on the gateway page.
export default function handler(req, res) {
    sendBackToApp(req, res, 'cancelled');
}
