/* Runtime configuration for this deployment. Edit values here — never put
   secrets in this file, it ships to the browser. Real SSLCommerz credentials
   (store_id / store_passwd) live only in Vercel Environment Variables and are
   read server-side by the files in /api/sslcommerz/*. */
window.EVENTORA_CONFIG = {
    // Google Sign-In (optional) — leave blank to disable Google auth.
    googleClientId: '',
    authVerifyEndpoint: '',

    // Social links shown in the footer (optional).
    social: {
        facebook: '',
        instagram: '',
        linkedin: '',
        x: '',
        youtube: ''
    },

    // Payment gateway — wired to the SSLCommerz sandbox serverless functions
    // in /api/sslcommerz/. No secrets here: the endpoints below just proxy to
    // your Vercel serverless functions, which hold the real store credentials.
    payments: {
        gatewayName: 'SSLCommerz',
        createSessionUrl: '/api/sslcommerz/create-session',
        verifyUrl: '/api/sslcommerz/verify'
    }
};
