/* WATCHDOG — shows a helpful message instead of a blank page if app.js fails to
   load or throws before booting (e.g. a network/CDN issue on first deploy). */
window.__evErr = null;
window.addEventListener('error', function (e) {
    window.__evErr = (e.message || 'Script error') + (e.filename ? '  (' + e.filename + ':' + (e.lineno || '?') + ')' : '');
});
setTimeout(function () {
    if (window.__eventoraBooted) return;
    var el = document.getElementById('app');
    if (el && !el.childElementCount) {
        var code = 'background:#0b0f19;padding:2px 6px;border-radius:5px;color:#e2e8f0';
        var msg;
        if (window.__evErr) {
            msg = 'A JavaScript error stopped the app before booting:<br><code style="' + code + '">' + String(window.__evErr).replace(/</g, '&lt;') + '</code><br><br>'
                + 'Open the browser console for the full stack trace, and check that <code style="' + code + '">app.js</code> and <code style="' + code + '">style.css</code> loaded successfully in the Network tab.';
        } else {
            msg = '<code style="' + code + '">app.js</code> never finished loading \u2014 check the Network tab for a failed request (404, CORS, or a slow/blocked CDN script) and hard-refresh with Ctrl/Cmd+Shift+R.';
        }
        el.innerHTML = '<div style="max-width:820px;margin:70px auto;padding:26px;border:1px solid rgba(248,113,113,.45);border-radius:16px;background:rgba(15,23,42,.85);color:#fecaca;font:500 14px/1.8 Inter,sans-serif">'
            + '<b style="display:block;font:800 18px Inter,sans-serif;color:#fca5a5;margin-bottom:8px">Eventora failed to start</b>' + msg + '</div>';
    }
}, 1600);
