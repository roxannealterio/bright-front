/* "Text us" website widget. White-labelled: shows only the client's business name and colour.
   Add to any website, before </body>:
   <script src="https://autofice.com.au/widget.js" data-key="CLIENT_KEY" data-name="Business Name" data-color="#0B0B2E" async></script>
*/
(function () {
  var s = document.currentScript || document.querySelector('script[data-key][src*="widget.js"]');
  if (!s || window.__bfWidget) return; window.__bfWidget = true;
  var KEY = s.getAttribute('data-key'), NAME = s.getAttribute('data-name') || 'us', COLOR = /^#[0-9a-f]{6}$/i.test(s.getAttribute('data-color') || '') ? s.getAttribute('data-color') : '#0B0B2E';
  var LABEL = s.getAttribute('data-label') || 'Text us', POS = s.getAttribute('data-position') === 'left' ? 'left' : 'right';
  var URL_ = 'https://cupsusqjcgefmfhdznmo.supabase.co/functions/v1/reply/intake';
  var host = document.createElement('div'); host.style.cssText = 'position:fixed;z-index:2147483000;bottom:0;' + POS + ':0';
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  root.innerHTML = '<style>' +
    ':host{all:initial}*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
    '.fab{position:fixed;bottom:20px;' + POS + ':20px;display:flex;align-items:center;gap:10px;background:' + COLOR + ';color:#fff;border:0;border-radius:999px;padding:0 22px 0 18px;height:56px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.25)}' +
    '.fab:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid ' + COLOR + ';outline-offset:2px}' +
    '.fab svg{width:22px;height:22px}' +
    '.panel{position:fixed;bottom:88px;' + POS + ':20px;width:min(360px,calc(100vw - 24px));background:#fff;color:#1A1A2E;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;display:none}' +
    '.panel.open{display:block;animation:up .2s ease}@keyframes up{from{opacity:0;transform:translateY(8px)}}' +
    '.hd{background:' + COLOR + ';color:#fff;padding:18px 20px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px}' +
    '.hd b{display:block;font-size:17px}.hd span{font-size:13px;opacity:.85}' +
    '.x{background:rgba(255,255,255,.18);border:0;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;flex:0 0 auto}' +
    'form{padding:16px 20px 18px;display:flex;flex-direction:column;gap:10px}' +
    'label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600}' +
    'input,textarea{width:100%;border:1.5px solid #DADAE3;border-radius:12px;padding:11px 12px;font-size:16px;color:#1A1A2E;background:#fff}' +
    'textarea{min-height:84px;resize:vertical}' +
    '.go{background:' + COLOR + ';color:#fff;border:0;border-radius:999px;height:48px;font-size:16px;font-weight:700;cursor:pointer}' +
    '.go[disabled]{opacity:.6}' +
    '.fine{font-size:11px;color:#6B6B80;margin:0;line-height:1.4}' +
    '.ok{padding:28px 22px;text-align:center}.ok b{display:block;font-size:18px;margin-bottom:6px}.ok p{margin:0;color:#4A4A60;font-size:14px}' +
    '.err{color:#B3261E;font-size:13px;margin:0}' +
    '@media(max-width:480px){.fab{bottom:14px;' + POS + ':14px}.panel{bottom:80px;' + POS + ':12px}}' +
    '</style>' +
    '<div class="panel" role="dialog" aria-label="Text ' + esc(NAME) + '" id="p"><div class="hd"><div><b>Text ' + esc(NAME) + '</b><span>We usually reply in under a minute.</span></div><button class="x" type="button" aria-label="Close">\u00d7</button></div>' +
    '<form novalidate><label>Name<input name="name" autocomplete="name" required></label><label>Mobile<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required></label><label>How can we help?<textarea name="message" required></textarea></label>' +
    '<input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
    '<p class="err" role="alert"></p><button class="go" type="submit">Send</button>' +
    '<p class="fine">By sending, you agree to receive text messages from ' + esc(NAME) + ' about your enquiry. Reply STOP to opt out.</p></form></div>' +
    '<button class="fab" type="button" aria-expanded="false" aria-controls="p"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' + esc(LABEL) + '</button>';
  var fab = root.querySelector('.fab'), panel = root.querySelector('.panel'), form = root.querySelector('form'), err = root.querySelector('.err');
  function toggle(o) { panel.classList.toggle('open', o); fab.setAttribute('aria-expanded', o); if (o) setTimeout(function () { form.name.focus(); }, 50); else fab.focus(); }
  fab.onclick = function () { toggle(!panel.classList.contains('open')); };
  root.querySelector('.x').onclick = function () { toggle(false); };
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  form.onsubmit = function (e) {
    e.preventDefault(); err.textContent = '';
    var name = form.name.value.trim(), phone = form.phone.value.trim(), msg = form.message.value.trim();
    if (!name) { err.textContent = 'Add your name.'; return form.name.focus(); }
    if (!/^[+\d][\d\s()-]{7,}$/.test(phone)) { err.textContent = 'Add a mobile number we can text.'; return form.phone.focus(); }
    if (!msg) { err.textContent = 'Tell us what you need.'; return form.message.focus(); }
    var btn = form.querySelector('.go'); btn.disabled = true; btn.textContent = 'Sending\u2026';
    fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: KEY, name: name, phone: phone, message: msg, source: 'Website chat', website: form.website.value, page: location.href }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        if (j && j.ok === false) throw new Error(j.error || 'failed');
        form.outerHTML = '<div class="ok" role="status"><b>Thanks, ' + esc(name.split(' ')[0]) + '!</b><p>We\u2019ve got your message. Keep an eye on your phone, we\u2019ll text you shortly.</p></div>';
      })
      .catch(function () { btn.disabled = false; btn.textContent = 'Send'; err.textContent = 'Sorry, that didn\u2019t send. Please try again or call us.'; });
  };
})();
