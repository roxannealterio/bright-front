// brightfront client portal
// Runs on Supabase when config.js has keys, otherwise in demo mode with sample data.
const CFG = window.BF_CONFIG || {};
const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
const $app = document.getElementById('app');

/* ---------------- helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => n == null || n === '' ? '—' : '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n) => n == null ? '—' : '$' + Math.round(Number(n)).toLocaleString('en-AU');
const fmtDate = (d, o = { day: 'numeric', month: 'short' }) => d ? new Date(d).toLocaleDateString('en-AU', o) : '—';
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Not scheduled';
const initials = (s) => (s || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800); }
const ICON = {
  dash: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  flag: '<path d="M4 21V4h13l-2 4 2 4H4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  leads: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'
};
const ic = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
const PILL = {
  new: ['New', 'p-pink'], follow_up: ['Follow-up', 'p-amber'], booked: ['Booked', 'p-green'], won: ['Won', 'p-green'], lost: ['Lost', 'p-grey'],
  draft: ['Draft', 'p-grey'], waiting: ['Waiting on you', 'p-pink'], approved: ['Approved', 'p-green'], changes: ['Changes requested', 'p-amber'], published: ['Published', 'p-violet'],
  submitted: ['Submitted', 'p-pink'], in_progress: ['In progress', 'p-violet'], done: ['Done', 'p-green'],
  due: ['Due', 'p-amber'], paid: ['Paid', 'p-green'], overdue: ['Overdue', 'p-pink'],
  onboarding: ['Onboarding', 'p-violet'], active: ['Active', 'p-green'], paused: ['Paused', 'p-grey'],
  ontrack: ['On track', 'p-green'], attention: ['Needs attention', 'p-amber']
};
const pill = (k) => { const p = PILL[k] || [k, 'p-grey']; return `<span class="pill ${p[1]}">${esc(p[0])}</span>`; };

/* ---------------- demo data ---------------- */
function demoData() {
  const c1 = 'c1', c2 = 'c2', c3 = 'c3';
  const today = new Date(); const d = (n) => new Date(today.getTime() + n * 86400000).toISOString();
  const weeks = (base) => base.map((l, i) => ({ id: uid(), week_start: d(-7 * (base.length - 1 - i)).slice(0, 10), leads: l[0], booked_calls: l[1], ad_spend: l[2] }));
  return {
    clients: [
      { id: c1, name: 'Sample Realty', industry: 'Real estate', plan: 'Keep it growing', baseline_cpl: 39.8, guarantee_start: d(-47).slice(0, 10), monthly_budget: 2500, status: 'active' },
      { id: c2, name: 'Sample Fitness Co', industry: 'Fitness coach', plan: 'Keep it moving', baseline_cpl: 45, guarantee_start: d(-30).slice(0, 10), monthly_budget: 1500, status: 'active' },
      { id: c3, name: 'Sample Skin Clinic', industry: 'Beauty clinic', plan: 'Keep it growing', baseline_cpl: 95, guarantee_start: d(-61).slice(0, 10), monthly_budget: 3000, status: 'active' }
    ],
    metrics: {
      [c1]: weeks([[9, 3, 410], [11, 4, 430], [10, 4, 420], [13, 5, 450], [15, 6, 470], [14, 5, 455], [17, 7, 480], [19, 8, 490], [18, 7, 470], [21, 9, 505]]),
      [c2]: weeks([[6, 2, 300], [7, 3, 310], [8, 3, 320], [9, 4, 330], [10, 4, 330], [11, 5, 340]]),
      [c3]: weeks([[4, 1, 520], [5, 2, 540], [5, 2, 560], [6, 2, 570], [6, 3, 580], [7, 3, 590], [7, 3, 600], [8, 4, 610]])
    },
    leads: {
      [c1]: [['Sarah K.', 'Google Ads', 'Appraisal enquiry', 'booked', -1], ['Tom R.', 'Instagram', 'DM to lead form', 'new', -1], ['Priya N.', 'Google Business', 'Phone call', 'booked', -2], ['Ben L.', 'Meta lead form', 'Buyer enquiry', 'follow_up', -3], ['Grace W.', 'Website quiz', 'Selling in 2027', 'won', -5]].map(([name, source, enquiry, status, n]) => ({ id: uid(), name, source, enquiry, status, created_at: d(n) })),
      [c2]: [['Liam P.', 'Instagram', '12-week program', 'booked', -1], ['Ava S.', 'Meta lead form', 'Free trial session', 'new', -2]].map(([name, source, enquiry, status, n]) => ({ id: uid(), name, source, enquiry, status, created_at: d(n) })),
      [c3]: [['Chloe M.', 'Google Ads', 'Skin consult', 'follow_up', -1]].map(([name, source, enquiry, status, n]) => ({ id: uid(), name, source, enquiry, status, created_at: d(n) }))
    },
    posts: {
      [c1]: [
        { id: 'p1', channel: 'Instagram Reel', title: 'Open home tips', caption: '3 things buyers check in the first 10 seconds of an open home.', scheduled_for: d(5), status: 'waiting' },
        { id: 'p2', channel: 'Meta ad', title: 'Seller lead ad', caption: 'Thinking of selling in 2027? Get a free price estimate in 60 seconds.', scheduled_for: d(3), status: 'waiting' },
        { id: 'p3', channel: 'Instagram carousel', title: 'Just sold', caption: 'Just sold in Paddington: how we got 31 enquiries in 9 days.', scheduled_for: d(7), status: 'changes' },
        { id: 'p4', channel: 'Google Business', title: 'Appraisal week', caption: 'Free appraisal week. Book a 15-minute call.', scheduled_for: d(8), status: 'approved', decided_at: d(-2) },
        { id: 'p5', channel: 'Instagram post', title: 'Meet the agent', caption: 'Ten years in the area, and still loving every open home.', scheduled_for: d(-6), status: 'published' }
      ], [c2]: [{ id: 'p6', channel: 'Instagram Reel', title: 'Client transformation', caption: '12 weeks, 3 sessions a week, zero fad diets.', scheduled_for: d(2), status: 'waiting' }], [c3]: [
        { id: 'p7', channel: 'Meta ad', title: 'Summer skin', caption: 'Summer-ready skin starts now. Book your consult.', scheduled_for: d(4), status: 'waiting' },
        { id: 'p8', channel: 'Instagram post', title: 'Treatment menu', caption: 'Our most-booked treatments, explained in 30 seconds.', scheduled_for: d(6), status: 'waiting' },
        { id: 'p9', channel: 'Instagram Reel', title: 'Clinic tour', caption: 'Come behind the scenes at the clinic.', scheduled_for: d(9), status: 'waiting' }]
    },
    comments: { p3: [{ id: uid(), author_name: 'You', role: 'client', body: 'Slide 3 should say 9 days, not 10.', created_at: d(-1) }, { id: uid(), author_name: 'Roxanne', role: 'agency', body: 'Fixed. New version up tomorrow morning.', created_at: d(-1) }] },
    requests: {
      [c1]: [['Add Christmas hours to Google', 'Google Business', 'submitted', 20], ['New listing ad: 14 Kneale St', 'Ad or campaign', 'in_progress', 2], ['Update website hero photo', 'Website change', 'in_progress', 3], ['Monthly report: October', 'Report or question', 'done', -8], ['Reels for open home', 'Social post', 'done', -11]].map(([title, type, status, n]) => ({ id: uid(), title, type, status, details: '', due_date: d(n).slice(0, 10), created_at: d(-4) })),
      [c2]: [['Story ads for January intake', 'Ad or campaign', 'submitted', 14]].map(([title, type, status, n]) => ({ id: uid(), title, type, status, details: '', due_date: d(n).slice(0, 10), created_at: d(-1) })),
      [c3]: []
    },
    invoices: {
      [c1]: [{ id: uid(), number: 'BF-0012', description: 'Keep it growing · monthly fee', amount: null, issued_on: d(-4).slice(0, 10), due_date: d(3).slice(0, 10), status: 'due', pay_url: '' }, { id: uid(), number: 'BF-0011', description: 'Keep it growing · monthly fee', amount: null, issued_on: d(-34).slice(0, 10), due_date: d(-27).slice(0, 10), status: 'paid' }, { id: uid(), number: 'BF-0010', description: 'Set-up and onboarding', amount: null, issued_on: d(-55).slice(0, 10), due_date: d(-48).slice(0, 10), status: 'paid' }],
      [c2]: [{ id: uid(), number: 'BF-0013', description: 'Keep it moving · monthly fee', amount: null, issued_on: d(-2).slice(0, 10), due_date: d(5).slice(0, 10), status: 'due' }], [c3]: []
    },
    steps: {
      [c1]: [['Sign your agreement', '', true], ['Kick-off call', '', true], ['Give us Google Ads access', '', true], ['Give us Meta Business access', 'Takes 2 minutes. We’ll walk you through it.', false], ['Google Analytics & Search Console', 'Add info@brightfrontstudio.com as a user.', false], ['Upload your brand assets', 'Logo, photos, colours and fonts.', false]].map(([title, detail, done], i) => ({ id: uid(), title, detail, done, sort: i })),
      [c2]: [['Sign your agreement', '', true], ['Kick-off call', '', true], ['Give us Meta Business access', '', true], ['Upload your brand assets', '', true]].map(([title, detail, done], i) => ({ id: uid(), title, detail, done, sort: i })),
      [c3]: [['Sign your agreement', '', true], ['Kick-off call', '', false]].map(([title, detail, done], i) => ({ id: uid(), title, detail, done, sort: i }))
    },
    files: { [c1]: [{ id: uid(), name: 'logo.svg', size: 12000, created_at: d(-40) }, { id: uid(), name: 'brand-photos.zip', size: 186000000, created_at: d(-38) }, { id: uid(), name: 'brand-guidelines.pdf', size: 4200000, created_at: d(-38) }], [c2]: [], [c3]: [] }
  };
}

/* ---------------- data layer ---------------- */
let sb = null;
const api = {};
if (LIVE) {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
  Object.assign(api, {
    async session() { return (await sb.auth.getSession()).data.session; },
    async signIn(email, password) { await q(sb.auth.signInWithPassword({ email, password })); },
    async signUp(email, password, full_name) { await q(sb.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo: location.href.split('#')[0] } })); },
    async reset(email) { await q(sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] })); },
    async signOut() { await sb.auth.signOut(); },
    async me() { const u = (await sb.auth.getUser()).data.user; return q(sb.from('profiles').select('*').eq('id', u.id).single()); },
    clients: () => q(sb.from('clients').select('*').order('name')),
    metrics: (c) => q(sb.from('metrics').select('*').eq('client_id', c).order('week_start')),
    leads: (c) => q(sb.from('leads').select('*').eq('client_id', c).order('created_at', { ascending: false }).limit(50)),
    posts: (c) => q(sb.from('posts').select('*').eq('client_id', c).order('scheduled_for')),
    async comments(c) { const rows = await q(sb.from('comments').select('*').eq('client_id', c).order('created_at')); const by = {}; rows.forEach((r) => (by[r.post_id] ||= []).push(r)); return by; },
    requests: (c) => q(sb.from('requests').select('*').eq('client_id', c).order('created_at', { ascending: false })),
    invoices: (c) => q(sb.from('invoices').select('*').eq('client_id', c).order('issued_on', { ascending: false })),
    steps: (c) => q(sb.from('onboarding_steps').select('*').eq('client_id', c).order('sort')),
    files: (c) => q(sb.from('files').select('*').eq('client_id', c).order('created_at', { ascending: false })),
    decide: (id, decision) => q(sb.rpc('decide_post', { p_post: id, p_decision: decision })),
    async addComment(post, c, body) { const u = (await sb.auth.getUser()).data.user; return q(sb.from('comments').insert({ post_id: post, client_id: c, author_id: u.id, author_name: state.me.full_name || u.email, body })); },
    async addRequest(c, r) { const u = (await sb.auth.getUser()).data.user; return q(sb.from('requests').insert({ ...r, client_id: c, created_by: u.id })); },
    setRequest: (id, status) => q(sb.from('requests').update({ status }).eq('id', id)),
    completeStep: (id) => q(sb.rpc('complete_step', { p_step: id })),
    async upload(c, file) {
      const u = (await sb.auth.getUser()).data.user; const path = `${c}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
      await q(sb.storage.from('client-files').upload(path, file));
      return q(sb.from('files').insert({ client_id: c, path, name: file.name, size: file.size, uploaded_by: u.id }));
    },
    async fileUrl(path) { const { data } = await sb.storage.from('client-files').createSignedUrl(path, 3600); return data?.signedUrl; },
    addClient: (o) => q(sb.from('clients').insert(o).select().single()),
    updateClient: (id, o) => q(sb.from('clients').update(o).eq('id', id)),
    addMetric: (c, o) => q(sb.from('metrics').upsert({ ...o, client_id: c }, { onConflict: 'client_id,week_start' })),
    addLead: (c, o) => q(sb.from('leads').insert({ ...o, client_id: c })),
    setLead: (id, status) => q(sb.from('leads').update({ status }).eq('id', id)),
    addPost: (c, o) => q(sb.from('posts').insert({ ...o, client_id: c })),
    setPost: (id, status) => q(sb.from('posts').update({ status }).eq('id', id)),
    addInvoice: (c, o) => q(sb.from('invoices').insert({ ...o, client_id: c })),
    setInvoice: (id, status) => q(sb.from('invoices').update({ status }).eq('id', id)),
    addStep: (c, o) => q(sb.from('onboarding_steps').insert({ ...o, client_id: c })),
    async assign(email, c) { const r = await q(sb.from('profiles').update({ client_id: c, role: 'client' }).eq('email', email.trim().toLowerCase()).select()); if (!r.length) throw new Error('No portal account with that email yet. Ask them to sign up first.'); }
  });
} else {
  const D = demoData(); let who = null;
  const ok = (v) => Promise.resolve(v);
  Object.assign(api, {
    session: () => ok(who), signIn: () => ok(), signUp: () => ok(), reset: () => ok(), signOut() { who = null; return ok(); },
    demoAs(role, email) { who = role === 'agency' ? { full_name: 'Roxanne Alterio', email: 'info@brightfrontstudio.com', role: 'agency', client_id: null } : { full_name: 'Sample client', email: email || 'client@example.com', role: 'client', client_id: 'c1' }; },
    me: () => ok(who),
    clients: () => ok(D.clients.slice()),
    metrics: (c) => ok(D.metrics[c] || []), leads: (c) => ok(D.leads[c] || []), posts: (c) => ok(D.posts[c] || []),
    comments: () => ok(D.comments), requests: (c) => ok(D.requests[c] || []), invoices: (c) => ok(D.invoices[c] || []),
    steps: (c) => ok(D.steps[c] || []), files: (c) => ok(D.files[c] || []),
    decide(id, decision) { Object.values(D.posts).flat().forEach((p) => { if (p.id === id) { p.status = decision; p.decided_at = new Date().toISOString(); } }); return ok(); },
    addComment(post, c, body) { (D.comments[post] ||= []).push({ id: uid(), author_name: who.role === 'agency' ? 'Roxanne' : 'You', role: who.role, body, created_at: new Date().toISOString() }); return ok(); },
    addRequest(c, r) { (D.requests[c] ||= []).unshift({ id: uid(), status: 'submitted', created_at: new Date().toISOString(), ...r }); return ok(); },
    setRequest(id, status) { Object.values(D.requests).flat().forEach((r) => { if (r.id === id) r.status = status; }); return ok(); },
    completeStep(id) { Object.values(D.steps).flat().forEach((s) => { if (s.id === id) s.done = true; }); return ok(); },
    upload(c, file) { (D.files[c] ||= []).unshift({ id: uid(), name: file.name, size: file.size, created_at: new Date().toISOString() }); return ok(); },
    fileUrl: () => ok(null),
    addClient(o) { const n = { id: uid(), status: 'onboarding', ...o }; D.clients.push(n); ['metrics', 'leads', 'posts', 'requests', 'invoices', 'steps', 'files'].forEach((k) => (D[k][n.id] = [])); return ok(n); },
    updateClient(id, o) { Object.assign(D.clients.find((c) => c.id === id), o); return ok(); },
    addMetric(c, o) { const a = D.metrics[c]; const i = a.findIndex((m) => m.week_start === o.week_start); if (i >= 0) a[i] = { ...a[i], ...o }; else a.push({ id: uid(), ...o }); a.sort((x, y) => x.week_start.localeCompare(y.week_start)); return ok(); },
    addLead(c, o) { D.leads[c].unshift({ id: uid(), created_at: new Date().toISOString(), ...o }); return ok(); },
    setLead(id, status) { Object.values(D.leads).flat().forEach((l) => { if (l.id === id) l.status = status; }); return ok(); },
    addPost(c, o) { D.posts[c].push({ id: uid(), ...o }); return ok(); },
    setPost(id, status) { Object.values(D.posts).flat().forEach((p) => { if (p.id === id) p.status = status; }); return ok(); },
    addInvoice(c, o) { D.invoices[c].unshift({ id: uid(), ...o }); return ok(); },
    setInvoice(id, status) { Object.values(D.invoices).flat().forEach((i) => { if (i.id === id) i.status = status; }); return ok(); },
    addStep(c, o) { D.steps[c].push({ id: uid(), done: false, ...o }); return ok(); },
    assign() { return ok(); }
  });
}

/* ---------------- state + routing ---------------- */
const state = { me: null, clients: [], clientId: null, view: 'dashboard', data: {}, postTab: 'waiting', openPost: null };
const isAgency = () => state.me?.role === 'agency';
const client = () => state.clients.find((c) => c.id === state.clientId);

async function load() {
  const c = state.clientId; if (!c) { state.data = {}; return; }
  const [metrics, leads, posts, comments, requests, invoices, steps, files] = await Promise.all([api.metrics(c), api.leads(c), api.posts(c), api.comments(c), api.requests(c), api.invoices(c), api.steps(c), api.files(c)]);
  state.data = { metrics, leads, posts, comments, requests, invoices, steps, files };
}
async function boot() {
  try {
    const s = await api.session();
    if (!s) return renderLogin();
    state.me = await api.me();
    if (!state.me) return renderLogin();
    state.clients = await api.clients();
    if (isAgency()) { state.view = state.view === 'dashboard' && !state.clientId ? 'overview' : state.view; }
    else { state.clientId = state.me.client_id; if (!state.clientId) return renderPending(); }
    if (isAgency() && !state.clientId && state.view !== 'overview') state.view = 'overview';
    await load(); render();
  } catch (e) { console.error(e); renderError(e); }
}
function go(view, clientId) { if (clientId !== undefined) state.clientId = clientId; state.view = view; state.openPost = null; load().then(render).then(() => { window.scrollTo(0, 0); document.querySelector('.main h1')?.focus({ preventScroll: true }); }); }

/* ---------------- login ---------------- */
function renderLogin(mode = 'in', msg = '') {
  $app.innerHTML = `<div class="login">
  <section class="login-side" aria-label="About the portal">
    <span class="wm" aria-label="brightfront">br<span class="wi">ı</span>ghtfront</span>
    <div>
      <h1>Your marketing, in one place.</h1>
      <ul><li>Live results against your 40% guarantee</li><li>Approve posts and ads in one tap</li><li>Send requests, track progress, pay invoices</li><li>Share access and brand files securely</li></ul>
    </div>
    <p class="small" style="color:#8C8CB0;position:relative;z-index:1;margin:0">Need help? <a href="mailto:${esc(CFG.SUPPORT_EMAIL)}" style="color:#fff">${esc(CFG.SUPPORT_EMAIL)}</a></p>
  </section>
  <main class="login-main">
    <form class="login-box" id="authForm" novalidate>
      <h2 tabindex="-1">${mode === 'up' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Log in to your portal'}</h2>
      <p class="muted" style="margin:0">${mode === 'up' ? 'Use the email we have for your business. We’ll link your account to your business.' : mode === 'reset' ? 'We’ll email you a link to set a new password.' : 'Welcome back.'}</p>
      ${!LIVE ? '<div class="demo-note">Preview mode with sample data. Log in with any email and password. Use info@brightfrontstudio.com to see your agency view.</div>' : ''}
      ${mode === 'up' ? '<label class="lab">Full name<input class="field" name="full_name" autocomplete="name" required></label>' : ''}
      <label class="lab">Email<input class="field" name="email" type="email" autocomplete="email" required></label>
      ${mode !== 'reset' ? `<label class="lab">Password<input class="field" name="password" type="password" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}" minlength="${LIVE ? 8 : 1}" required></label>` : ''}
      ${msg ? `<p role="alert" style="margin:0;font-weight:600;color:${msg.startsWith('✓') ? 'var(--green)' : 'var(--pinkd)'}">${esc(msg)}</p>` : ''}
      <button class="btn btn-pink" type="submit">${mode === 'up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Log in'}</button>
      <div class="row small" style="justify-content:space-between">
        ${mode === 'in' ? '<button type="button" class="btn-link" data-mode="up">Create an account</button><button type="button" class="btn-link" data-mode="reset">Forgot password?</button>' : '<button type="button" class="btn-link" data-mode="in">Back to log in</button>'}
      </div>
    </form>
  </main></div>`;
  $app.querySelectorAll('.btn-link').forEach((b) => Object.assign(b.style, { background: 'none', border: 0, padding: '8px 0', color: 'var(--pinkd)', fontWeight: 700, cursor: 'pointer', minHeight: '44px' }));
  $app.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => renderLogin(b.dataset.mode));
    const f = document.getElementById('authForm');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const bad = [...f.querySelectorAll('[required]')].find((i) => !i.checkValidity()); if (bad) return bad.reportValidity();
    const fd = Object.fromEntries(new FormData(f)); const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    if (!LIVE) { if (mode !== 'in') return renderLogin('in', '✓ Done. In preview mode you can log in straight away.'); api.demoAs(/^info@brightfrontstudio\.com$/i.test(fd.email.trim()) ? 'agency' : 'client', fd.email.trim()); state.view = 'dashboard'; state.clientId = null; return boot(); }
    try {
      if (mode === 'up') { await api.signUp(fd.email, fd.password, fd.full_name); return renderLogin('in', '✓ Check your email to confirm your account, then sign in.'); }
      if (mode === 'reset') { await api.reset(fd.email); return renderLogin('in', '✓ Reset link sent. Check your email.'); }
      await api.signIn(fd.email, fd.password); boot();
    } catch (err) { renderLogin(mode, err.message || 'Something went wrong. Try again.'); }
  };
}
function renderPending() {
  $app.innerHTML = `<div class="login"><section class="login-side"><span class="wm" aria-label="brightfront">br<span class="wi">ı</span>ghtfront</span></section><main class="login-main"><div class="login-box"><h2>You’re signed in.</h2><p class="muted">We’re linking your account to your business. You’ll see your portal as soon as that’s done, usually within one business day.</p><p class="muted">Questions? <a href="mailto:${esc(CFG.SUPPORT_EMAIL)}">${esc(CFG.SUPPORT_EMAIL)}</a></p><button class="btn btn-ghost" id="so">Log out</button></div></main></div>`;
  document.getElementById('so').onclick = async () => { await api.signOut(); renderLogin(); };
}
function renderError(e) { $app.innerHTML = `<div class="login-main" style="min-height:100vh"><div class="login-box"><h2>We couldn’t load your portal.</h2><p class="muted">${esc(e.message || e)}</p><button class="btn btn-pink" onclick="location.reload()">Try again</button></div></div>`; }

/* ---------------- shell ---------------- */
function counts() {
  const d = state.data;
  return { approvals: (d.posts || []).filter((p) => p.status === 'waiting').length, requests: (d.requests || []).filter((r) => r.status !== 'done').length, steps: (d.steps || []).filter((s) => !s.done).length };
}
function navBtn(view, label, icon, count) {
  return `<button type="button" data-go="${view}" ${state.view === view ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span>${count ? `<span class="count" aria-label="${count} open">${count}</span>` : ''}</button>`;
}
function render() {
  const c = counts(); const me = state.me;
  const clientNav = state.clientId ? `
    ${isAgency() ? `<div class="nav-label">${esc(client()?.name || 'Client')}</div>` : ''}
    ${navBtn('dashboard', 'Results', 'dash')}
    ${navBtn('leads', 'Leads', 'leads')}
    ${navBtn('approvals', 'Approvals', 'check', c.approvals)}
    ${navBtn('requests', 'Requests', 'chat', c.requests)}
    ${navBtn('invoices', 'Invoices', 'doc')}
    ${navBtn('onboarding', 'Onboarding & files', 'flag', c.steps)}` : '';
  $app.innerHTML = `
  <div class="mobilebar"><span class="wm" aria-label="brightfront">br<span class="wi">ı</span>ghtfront</span><button type="button" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="side">${ic('menu', 22)}</button></div>
  <div class="shell">
    <aside class="side" id="side">
      <div class="brand"><span class="wm" aria-label="brightfront">br<span class="wi">ı</span>ghtfront</span></div>
      <div class="brand-sub">${isAgency() ? 'Agency workspace' : 'Client portal'}</div>
      ${isAgency() ? `<div class="switch"><label class="sr" for="clientSel">Viewing client</label><select id="clientSel"><option value="">All clients</option>${state.clients.map((x) => `<option value="${esc(x.id)}" ${x.id === state.clientId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` : ''}
      <nav class="nav" aria-label="Portal">
        ${isAgency() ? navBtn('overview', 'All clients', 'users') : ''}
        ${clientNav}
      </nav>
      <div class="side-foot"><div class="avatar">${esc(initials(me.full_name || me.email))}</div><div class="who"><b>${esc(me.full_name || me.email)}</b><span>${isAgency() ? 'brightfront' : esc(client()?.name || '')}</span></div><button type="button" id="signOut" aria-label="Log out">${ic('out')}</button></div>
    </aside>
    <main class="main" id="main">${VIEWS[state.view]()}</main>
  </div>`;
  wire();
}
function head(eyebrow, title, sub, actions = '') {
  return `<header class="top"><div><p class="eyebrow">${esc(eyebrow)}</p><h1 tabindex="-1">${esc(title)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="top-actions">${!LIVE ? '<span class="pill p-grey" style="align-self:center">Demo data</span>' : ''}${actions}</div></header>`;
}

/* ---------------- calculations ---------------- */
function stats(cl, metrics) {
  const last4 = metrics.slice(-4), prev4 = metrics.slice(-8, -4);
  const sum = (a, k) => a.reduce((s, m) => s + Number(m[k] || 0), 0);
  const leads = sum(last4, 'leads'), calls = sum(last4, 'booked_calls'), spend = sum(last4, 'ad_spend');
  const pLeads = sum(prev4, 'leads');
  const cpl = leads ? spend / leads : null;
  const uplift = cl?.baseline_cpl && cpl ? (1 - cpl / cl.baseline_cpl) * 100 : null;
  const day = cl?.guarantee_start ? Math.min(90, Math.max(0, daysBetween(cl.guarantee_start, new Date()))) : null;
  return { leads, calls, spend, cpl, uplift, day, leadsDelta: pLeads ? ((leads - pLeads) / pLeads) * 100 : null, book: leads ? (calls / leads) * 100 : null };
}
function health(cl, s) {
  if (cl.status === 'onboarding') return 'onboarding';
  if (s.uplift == null) return 'ontrack';
  const expected = s.day != null ? (40 * s.day) / 90 : 0;
  return s.uplift >= expected * 0.75 ? 'ontrack' : 'attention';
}

/* ---------------- views ---------------- */
const VIEWS = {
  overview() {
    return head('Agency', 'All clients', 'Every client at a glance: results, what’s waiting, and who needs a nudge.', `<button class="btn btn-pink" data-act="newClient">${ic('plus', 16)} Add client</button>`) + `<div id="ov"><div class="card empty">Loading clients…</div></div>`;
  },
  dashboard() {
    const cl = client(); const d = state.data; const s = stats(cl, d.metrics);
    const bars = d.metrics.slice(-10); const max = Math.max(1, ...bars.map((m) => m.leads));
    const pct = s.uplift == null ? 0 : Math.max(0, Math.min(100, (s.uplift / 40) * 100));
    const waiting = d.posts.filter((p) => p.status === 'waiting').length, steps = d.steps.filter((x) => !x.done), due = d.invoices.filter((i) => i.status !== 'paid');
    const attn = [
      waiting && [`${waiting} ${waiting === 1 ? 'post is' : 'posts are'} waiting for your approval`, 'approvals', 'Review'],
      steps[0] && [steps[0].title, 'onboarding', 'Do it now'],
      due[0] && [`Invoice ${due[0].number} due ${fmtDate(due[0].due_date)}`, 'invoices', 'View']
    ].filter(Boolean);
    return head(isAgency() ? cl.name : `Hi ${esc((state.me.full_name || '').split(' ')[0] || 'there')}`, 'Your results', 'Last 4 weeks. Every number comes from your own ad accounts.', `${isAgency() ? `<button class="btn btn-ghost" data-act="addMetric">${ic('plus', 16)} Add week</button>` : ''}<button class="btn btn-pink" data-go="requests">New request</button>`) + `
    <section class="grid g4" aria-label="Key numbers">
      <div class="card kpi"><span class="lab">Leads</span><span class="val">${s.leads}</span><span class="delta ${s.leadsDelta >= 0 ? 'up' : 'down'}">${s.leadsDelta == null ? 'First month' : (s.leadsDelta >= 0 ? '▲ ' : '▼ ') + Math.abs(s.leadsDelta).toFixed(0) + '% vs previous 4 weeks'}</span></div>
      <div class="card kpi"><span class="lab">Cost per lead</span><span class="val">${s.cpl == null ? '—' : money(s.cpl)}</span><span class="delta ${s.uplift >= 0 ? 'up' : 'down'}">${cl.baseline_cpl ? 'Baseline ' + money(cl.baseline_cpl) : 'No baseline set'}</span></div>
      <div class="card kpi"><span class="lab">Booked calls</span><span class="val">${s.calls}</span><span class="delta muted">${s.book == null ? '—' : s.book.toFixed(0) + '% of leads booked'}</span></div>
      <div class="card kpi"><span class="lab">Ad spend</span><span class="val">${money0(s.spend)}</span><span class="delta muted">${cl.monthly_budget ? 'Budget ' + money0(cl.monthly_budget) + '/month' : ''}</span></div>
    </section>
    <section class="grid g2" style="margin-top:16px">
      <div class="card guar">
        <div class="card-head" style="margin-bottom:8px"><h2>40% uplift guarantee</h2><span class="small muted">${s.day == null ? 'Not started' : `Day ${s.day} of 90`}</span></div>
        <p class="muted" style="margin:0 0 14px">Cost per lead vs your agreed baseline${cl.baseline_cpl ? ` of ${money(cl.baseline_cpl)}` : ''}.</p>
        <div class="row" style="align-items:baseline;margin-bottom:14px"><span class="big">${s.uplift == null ? '—' : Math.round(s.uplift) + '%'}</span><span class="muted">${s.uplift == null ? 'Waiting on first results' : s.uplift >= 0 ? 'lower cost per lead' : 'higher than baseline'}</span></div>
        <div class="bar" role="img" aria-label="${Math.round(pct)}% of the 40% target"><i style="width:${pct}%"></i></div>
        <p class="small muted" style="margin:10px 0 0">Target: 40% by day 90, measured in your own accounts.</p>
      </div>
      <div class="card">
        <div class="card-head"><h2>Leads per week</h2><span class="small muted">Last ${bars.length} weeks</span></div>
        ${bars.length ? `<div class="chart" role="img" aria-label="Leads per week: ${bars.map((b) => b.leads).join(', ')}">${bars.map((b) => `<div class="col"><span class="v">${b.leads}</span><div class="b" style="height:${Math.max(4, (b.leads / max) * 130)}px"></div><span class="lbl">${fmtDate(b.week_start, { day: 'numeric', month: 'numeric' })}</span></div>`).join('')}</div>` : '<p class="empty">Results appear here after your first full week.</p>'}
      </div>
    </section>
    <section class="grid g2" style="margin-top:16px">
      <div class="card"><div class="card-head"><h2>Needs your attention</h2></div>
        ${attn.length ? `<ul class="list">${attn.map(([t, v, a]) => `<li><span style="font-weight:600">${esc(t)}</span><button class="btn btn-ghost btn-sm" data-go="${v}">${a}</button></li>`).join('')}</ul>` : '<p class="empty">You’re all caught up.</p>'}
      </div>
      <div class="card"><div class="card-head"><h2>Latest leads</h2><button class="btn btn-ghost btn-sm" data-go="leads">See all</button></div>${leadTable(d.leads.slice(0, 5), false)}</div>
    </section>`;
  },
  leads() {
    const d = state.data;
    const by = ['new', 'follow_up', 'booked', 'won'].map((k) => [k, d.leads.filter((l) => l.status === k).length]);
    return head('Pipeline', 'Leads', 'Every enquiry we bring in, and where it’s up to.', isAgency() ? `<button class="btn btn-pink" data-act="addLead">${ic('plus', 16)} Add lead</button>` : '') + `
    <section class="grid g4">${by.map(([k, n]) => `<div class="card kpi"><span class="lab">${PILL[k][0]}</span><span class="val">${n}</span></div>`).join('')}</section>
    <section class="card" style="margin-top:16px">${leadTable(d.leads, isAgency())}</section>`;
  },
  approvals() {
    const d = state.data; const tab = state.postTab;
    const groups = { waiting: (p) => p.status === 'waiting', upcoming: (p) => ['approved', 'changes', 'draft'].includes(p.status), published: (p) => p.status === 'published' };
    const list = d.posts.filter(groups[tab]);
    const n = (k) => d.posts.filter(groups[k]).length;
    return head('Content', 'Approvals', 'Nothing goes live until you say yes. Approve it, or tell us what to change.', isAgency() ? `<button class="btn btn-pink" data-act="addPost">${ic('plus', 16)} Add post</button>` : '') + `
    <div class="tabs" role="tablist" aria-label="Filter posts">
      ${[['waiting', 'Waiting on you'], ['upcoming', 'Upcoming'], ['published', 'Published']].map(([k, l]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${tab === k}">${l} (${n(k)})</button>`).join('')}
    </div>
    ${list.length ? `<div class="posts">${list.map((p) => postCard(p, d.comments[p.id] || [])).join('')}</div>` : `<div class="card empty">${tab === 'waiting' ? 'Nothing waiting on you. Nice.' : 'Nothing here yet.'}</div>`}`;
  },
  requests() {
    const d = state.data; const cols = [['submitted', 'Submitted'], ['in_progress', 'In progress'], ['done', 'Done']];
    return head('Work', 'Requests', 'Ask for anything here instead of email. We reply within one business day.') + `
    <section class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));align-items:start">
      <form class="card" id="reqForm" style="display:flex;flex-direction:column;gap:12px" novalidate>
        <h2>New request</h2>
        <label class="lab">What do you need?<input class="field" name="title" maxlength="200" required placeholder="e.g. Ad for my new listing"></label>
        <label class="lab">Type<select class="field" name="type"><option>Ad or campaign</option><option>Social post</option><option>Website change</option><option>Google Business</option><option>Report or question</option></select></label>
        <label class="lab">Details<textarea class="field" name="details" maxlength="2000"></textarea></label>
        <label class="lab">Needed by<input class="field" type="date" name="due_date"></label>
        <button class="btn btn-pink" type="submit">Send request</button>
      </form>
      <div class="kanban" style="grid-column:span 1">${cols.map(([k, l]) => { const items = d.requests.filter((r) => r.status === k); return `<div class="kcol"><h3>${pill(k)}<span class="muted">${items.length}</span></h3>${items.map((r) => `<div class="kcard"><b>${esc(r.title)}</b><span class="small muted">${esc(r.type || '')}${r.due_date ? ' · due ' + fmtDate(r.due_date) : ''}</span>${isAgency() && k !== 'done' ? `<button class="btn btn-ghost btn-sm" data-req="${esc(r.id)}" data-to="${k === 'submitted' ? 'in_progress' : 'done'}">${k === 'submitted' ? 'Start' : 'Mark done'}</button>` : ''}</div>`).join('') || '<p class="small muted" style="margin:4px">Nothing here.</p>'}</div>`; }).join('')}</div>
    </section>`;
  },
  invoices() {
    const d = state.data; const due = d.invoices.filter((i) => i.status !== 'paid');
    return head('Billing', 'Invoices', 'Fixed monthly fee, agreed in writing. No lock-in, 30 days’ notice.', isAgency() ? `<button class="btn btn-pink" data-act="addInvoice">${ic('plus', 16)} New invoice</button>` : '') + `
    ${due.length ? `<div class="card" style="background:var(--amberl);border-color:#F2DDB0;margin-bottom:16px"><b>${due.length} invoice${due.length > 1 ? 's' : ''} to pay</b> <span class="muted">· next due ${fmtDate(due[due.length - 1].due_date, { day: 'numeric', month: 'long' })}</span></div>` : ''}
    <section class="card"><div class="tbl-wrap"><table><thead><tr><th scope="col">Invoice</th><th scope="col">For</th><th scope="col">Amount</th><th scope="col">Issued</th><th scope="col">Due</th><th scope="col">Status</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>
    ${d.invoices.map((i) => `<tr><td><b>${esc(i.number)}</b></td><td>${esc(i.description || '')}</td><td>${i.amount == null ? '<span class="muted">[PRICE]</span>' : money(i.amount)}</td><td class="muted">${fmtDate(i.issued_on)}</td><td class="muted">${fmtDate(i.due_date)}</td><td>${pill(i.status)}</td><td style="text-align:right;white-space:nowrap">${i.status !== 'paid' && i.pay_url ? `<a class="btn btn-pink btn-sm" href="${esc(i.pay_url)}" target="_blank" rel="noopener">Pay now</a>` : ''}${i.pdf_path ? ` <button class="btn btn-ghost btn-sm" data-file="${esc(i.pdf_path)}">PDF</button>` : ''}${isAgency() && i.status !== 'paid' ? ` <button class="btn btn-ghost btn-sm" data-inv="${esc(i.id)}">Mark paid</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No invoices yet.</td></tr>'}
    </tbody></table></div></section>`;
  },
  onboarding() {
    const d = state.data; const done = d.steps.filter((s) => s.done).length; const pct = d.steps.length ? (done / d.steps.length) * 100 : 0;
    return head('Getting set up', 'Onboarding & files', d.steps.length && done < d.steps.length ? `${d.steps.length - done} step${d.steps.length - done > 1 ? 's' : ''} left before we can launch.` : 'You’re all set up.', isAgency() ? `<button class="btn btn-ghost" data-act="addStep">${ic('plus', 16)} Add step</button>` : '') + `
    <section class="grid g2" style="align-items:start">
      <div class="card"><div class="card-head"><h2>Setup checklist</h2><b>${done} of ${d.steps.length} done</b></div>
        <div class="bar light" role="img" aria-label="${Math.round(pct)}% complete" style="margin-bottom:8px"><i style="width:${pct}%"></i></div>
        <ol class="steps">${d.steps.map((s, i) => `<li><span class="dot ${s.done ? 'done' : ''}">${s.done ? ic('check', 16) : i + 1}</span><div style="flex:1;min-width:0"><b style="${s.done ? 'color:var(--muted)' : ''}">${esc(s.title)}</b>${s.detail ? `<div class="small muted">${esc(s.detail)}</div>` : ''}</div>${s.done ? '' : `<button class="btn btn-ghost btn-sm" data-step="${esc(s.id)}">Mark done</button>`}</li>`).join('')}</ol>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:14px"><h2>Brand files</h2>
        <label class="drop" id="drop">${ic('up', 26)}<b>Drop files here or browse</b><span class="small muted">Logos, photos, videos and PDFs. Up to 50 MB each.</span><input type="file" id="fileIn" multiple aria-label="Upload files"></label>
        ${d.files.length ? `<div class="files">${d.files.map((f) => `<button type="button" class="file" ${f.path ? `data-file="${esc(f.path)}"` : ''} style="border:0;text-align:left;cursor:${f.path ? 'pointer' : 'default'}"><b>${esc(f.name)}</b><span class="small muted">${f.size ? (f.size > 1e6 ? (f.size / 1e6).toFixed(1) + ' MB' : Math.ceil(f.size / 1e3) + ' KB') : ''} · ${fmtDate(f.created_at)}</span></button>`).join('')}</div>` : '<p class="empty" style="padding:8px">No files yet.</p>'}
      </div>
    </section>`;
  }
};
function leadTable(leads, editable) {
  if (!leads.length) return '<p class="empty">No leads yet. They’ll show up here as soon as they come in.</p>';
  return `<div class="tbl-wrap"><table><thead><tr><th scope="col">Name</th><th scope="col">Source</th><th scope="col">Enquiry</th><th scope="col">Date</th><th scope="col">Status</th></tr></thead><tbody>${leads.map((l) => `<tr><td><b>${esc(l.name)}</b></td><td class="muted">${esc(l.source || '')}</td><td class="muted">${esc(l.enquiry || '')}</td><td class="muted">${fmtDate(l.created_at)}</td><td>${editable ? `<label class="sr" for="ls-${esc(l.id)}">Status for ${esc(l.name)}</label><select id="ls-${esc(l.id)}" class="field" style="min-height:36px;padding:4px 8px;width:auto" data-lead="${esc(l.id)}">${['new', 'follow_up', 'booked', 'won', 'lost'].map((k) => `<option value="${k}" ${l.status === k ? 'selected' : ''}>${PILL[k][0]}</option>`).join('')}</select>` : pill(l.status)}</td></tr>`).join('')}</tbody></table></div>`;
}
function postCard(p, comments) {
  const open = state.openPost === p.id;
  return `<article class="post"><div class="img">${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : '<span>Preview coming</span>'}<span class="ch">${esc(p.channel)}</span></div>
  <div class="body"><div class="row" style="justify-content:space-between"><b>${esc(p.title || p.channel)}</b>${pill(p.status)}</div>
  <span class="small muted">${p.status === 'published' ? 'Published ' : 'Goes live '}${fmtDT(p.scheduled_for)}</span>
  <p class="cap" style="margin:0">${esc(p.caption || '')}</p>
  ${p.status === 'waiting' ? `<div class="acts"><button class="btn btn-pink btn-sm" data-decide="approved" data-post="${esc(p.id)}">Approve</button><button class="btn btn-ghost btn-sm" data-decide="changes" data-post="${esc(p.id)}">Request changes</button></div>` : ''}
  ${isAgency() && p.status === 'approved' ? `<div class="acts"><button class="btn btn-ghost btn-sm" data-setpost="published" data-post="${esc(p.id)}">Mark published</button></div>` : ''}
  ${isAgency() && p.status === 'changes' ? `<div class="acts"><button class="btn btn-ghost btn-sm" data-setpost="waiting" data-post="${esc(p.id)}">Send new version</button></div>` : ''}
  <button type="button" class="small" data-thread="${esc(p.id)}" aria-expanded="${open}" style="background:none;border:0;padding:6px 0;text-align:left;font-weight:700;color:var(--pinkd);cursor:pointer;min-height:36px">${comments.length ? `${comments.length} comment${comments.length > 1 ? 's' : ''}` : 'Add a comment'}</button>
  ${open ? `<div class="thread">${comments.map((m) => `<div class="msg ${m.role === 'agency' || (LIVE && m.author_id !== state.me.id) ? 'agency' : ''}"><span class="avatar">${esc(initials(m.author_name))}</span><p><b>${esc(m.author_name || '')}</b> · ${esc(m.body)}</p></div>`).join('')}
    <form class="cform" data-post="${esc(p.id)}" style="display:flex;flex-direction:column;gap:8px"><label class="sr" for="cm-${esc(p.id)}">Comment</label><textarea class="field" id="cm-${esc(p.id)}" name="body" maxlength="2000" style="min-height:70px" placeholder="What should we change?"></textarea><button class="btn btn-navy btn-sm" type="submit" style="align-self:flex-start">Send comment</button></form></div>` : ''}
  </div></article>`;
}

/* ---------------- agency overview (async) ---------------- */
async function fillOverview() {
  const box = document.getElementById('ov'); if (!box) return;
  const rows = await Promise.all(state.clients.map(async (cl) => { const [m, p, r, inv] = await Promise.all([api.metrics(cl.id), api.posts(cl.id), api.requests(cl.id), api.invoices(cl.id)]); const s = stats(cl, m); return { cl, s, waiting: p.filter((x) => x.status === 'waiting').length, open: r.filter((x) => x.status !== 'done').length, due: inv.filter((x) => x.status !== 'paid').length, h: health(cl, s) }; }));
  const tot = (k) => rows.reduce((a, r) => a + r[k], 0);
  const risk = rows.filter((r) => r.h === 'attention');
  box.innerHTML = `
  <section class="grid g4"><div class="card kpi"><span class="lab">Active clients</span><span class="val">${rows.filter((r) => r.cl.status === 'active').length}</span></div><div class="card kpi"><span class="lab">Approvals waiting</span><span class="val">${tot('waiting')}</span></div><div class="card kpi"><span class="lab">Open requests</span><span class="val">${tot('open')}</span></div><div class="card kpi"><span class="lab">Unpaid invoices</span><span class="val">${tot('due')}</span></div></section>
  ${risk.length ? `<section class="card guar" style="margin-top:16px"><h2 style="margin-bottom:6px">Guarantee watch</h2>${risk.map((r) => `<p class="muted" style="margin:6px 0">${esc(r.cl.name)} is at ${r.s.uplift == null ? '—' : Math.round(r.s.uplift) + '%'} uplift on day ${r.s.day} of 90. <button class="btn btn-pink btn-sm" data-open="${esc(r.cl.id)}" style="margin-left:6px">Open</button></p>`).join('')}</section>` : ''}
  <section class="card" style="margin-top:16px"><div class="card-head"><h2>Clients</h2></div><div class="tbl-wrap"><table><thead><tr><th scope="col">Client</th><th scope="col">Plan</th><th scope="col">Leads (4 wks)</th><th scope="col">Cost per lead</th><th scope="col">Guarantee</th><th scope="col">Waiting</th><th scope="col">Health</th><th scope="col"><span class="sr">Open</span></th></tr></thead><tbody>
  ${rows.map((r) => `<tr><td><b>${esc(r.cl.name)}</b><div class="small muted">${esc(r.cl.industry || '')}</div></td><td>${esc(r.cl.plan || '')}</td><td><b>${r.s.leads}</b></td><td>${r.s.cpl == null ? '—' : money(r.s.cpl)}</td><td>${r.s.uplift == null ? '—' : Math.round(r.s.uplift) + '% · day ' + r.s.day}</td><td>${r.waiting} approvals · ${r.open} requests</td><td>${pill(r.h)}</td><td style="text-align:right"><button class="btn btn-ghost btn-sm" data-open="${esc(r.cl.id)}">Open</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">No clients yet. Add your first one.</td></tr>'}
  </tbody></table></div></section>
  <section class="card" style="margin-top:16px"><h2 style="margin-bottom:8px">Give a client access</h2><p class="muted small" style="margin:0 0 12px">Ask them to create an account on this portal with their email, then link it to their business here.</p>
  <form id="assignForm" class="row" novalidate><label class="sr" for="asEmail">Client email</label><input class="field" id="asEmail" name="email" type="email" placeholder="client@business.com.au" required style="flex:1 1 220px"><label class="sr" for="asClient">Business</label><select class="field" id="asClient" name="client" style="flex:1 1 180px">${state.clients.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select><button class="btn btn-navy" type="submit">Link account</button></form></section>`;
  box.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => go('dashboard', b.dataset.open));
  document.getElementById('assignForm').onsubmit = async (e) => { e.preventDefault(); const f = e.target; if (!f.email.checkValidity()) return f.email.reportValidity(); try { await api.assign(f.email.value, f.client.value); toast('Account linked. They’ll see their portal next time they sign in.'); f.reset(); } catch (err) { toast(err.message); } };
}

/* ---------------- dialogs (agency) ---------------- */
function dialog(title, fields, onSave) {
  const d = document.createElement('dialog');
  d.innerHTML = `<form method="dialog" novalidate><h2>${esc(title)}</h2>${fields}<div class="dlg-acts"><button class="btn btn-ghost" value="cancel" type="button" data-x>Cancel</button><button class="btn btn-pink" type="submit">Save</button></div></form>`;
  document.body.appendChild(d); d.showModal();
  d.querySelector('[data-x]').onclick = () => d.close();
  d.addEventListener('close', () => d.remove());
  d.querySelector('form').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const bad = [...f.querySelectorAll('[required]')].find((i) => !i.checkValidity()); if (bad) return bad.reportValidity();
    try { await onSave(Object.fromEntries(new FormData(f))); d.close(); toast('Saved'); await reload(); } catch (err) { toast(err.message || 'Could not save'); }
  };
}
const F = (label, name, type = 'text', extra = '') => `<label class="lab">${label}<input class="field" name="${name}" type="${type}" ${extra}></label>`;
const today = () => new Date().toISOString().slice(0, 10);
const ACTS = {
  newClient: () => dialog('Add client', `${F('Business name', 'name', 'text', 'required')}<div class="two">${F('Industry', 'industry')}<label class="lab">Plan<select class="field" name="plan"><option>Keep it live</option><option selected>Keep it moving</option><option>Keep it growing</option></select></label></div><div class="two">${F('Baseline cost per lead ($)', 'baseline_cpl', 'number', 'step="0.01" min="0"')}${F('Guarantee start', 'guarantee_start', 'date')}</div>${F('Monthly ad budget ($)', 'monthly_budget', 'number', 'step="1" min="0"')}`,
    async (o) => { const n = await api.addClient({ name: o.name, industry: o.industry || null, plan: o.plan, baseline_cpl: o.baseline_cpl || null, guarantee_start: o.guarantee_start || null, monthly_budget: o.monthly_budget || null }); state.clients = await api.clients(); for (const [i, t] of ['Sign your agreement', 'Kick-off call', 'Give us Google Ads access', 'Give us Meta Business access', 'Google Analytics & Search Console', 'Upload your brand assets'].entries()) await api.addStep(n.id, { title: t, sort: i }); }),
  addMetric: () => dialog('Add a week of results', `${F('Week starting', 'week_start', 'date', `required value="${today()}"`)}<div class="two">${F('Leads', 'leads', 'number', 'min="0" required')}${F('Booked calls', 'booked_calls', 'number', 'min="0" required')}</div>${F('Ad spend ($)', 'ad_spend', 'number', 'step="0.01" min="0" required')}`, (o) => api.addMetric(state.clientId, { week_start: o.week_start, leads: +o.leads, booked_calls: +o.booked_calls, ad_spend: +o.ad_spend })),
  addLead: () => dialog('Add lead', `${F('Name', 'name', 'text', 'required')}<div class="two">${F('Source', 'source', 'text', 'placeholder="Google Ads"')}${F('Enquiry', 'enquiry')}</div>`, (o) => api.addLead(state.clientId, { name: o.name, source: o.source, enquiry: o.enquiry, status: 'new' })),
  addPost: () => dialog('Add post for approval', `<div class="two"><label class="lab">Channel<select class="field" name="channel"><option>Instagram Reel</option><option>Instagram post</option><option>Instagram carousel</option><option>Meta ad</option><option>Google Ads</option><option>Google Business</option><option>TikTok</option><option>Email</option></select></label>${F('Goes live', 'scheduled_for', 'datetime-local', 'required')}</div>${F('Title', 'title', 'text', 'required')}<label class="lab">Caption<textarea class="field" name="caption"></textarea></label>`, (o) => api.addPost(state.clientId, { channel: o.channel, title: o.title, caption: o.caption, scheduled_for: new Date(o.scheduled_for).toISOString(), status: 'waiting' })),
  addInvoice: () => dialog('New invoice', `<div class="two">${F('Invoice number', 'number', 'text', 'required placeholder="BF-0014"')}${F('Amount ($)', 'amount', 'number', 'step="0.01" min="0" required')}</div>${F('Description', 'description', 'text', 'placeholder="Keep it growing · monthly fee"')}<div class="two">${F('Issued', 'issued_on', 'date', `value="${today()}"`)}${F('Due', 'due_date', 'date', 'required')}</div>${F('Payment link (optional)', 'pay_url', 'url', 'placeholder="https://buy.stripe.com/…"')}`, (o) => api.addInvoice(state.clientId, { number: o.number, amount: +o.amount, description: o.description, issued_on: o.issued_on, due_date: o.due_date, pay_url: o.pay_url || null, status: 'due' })),
  addStep: () => dialog('Add onboarding step', `${F('Step', 'title', 'text', 'required')}${F('Help text', 'detail')}`, (o) => api.addStep(state.clientId, { title: o.title, detail: o.detail, sort: state.data.steps.length }))
};
async function reload() { await load(); render(); }

/* ---------------- events ---------------- */
function wire() {
  const side = document.getElementById('side'), mb = document.getElementById('menuBtn');
  mb && (mb.onclick = () => { const o = side.classList.toggle('open'); mb.setAttribute('aria-expanded', o); });
  document.getElementById('signOut').onclick = async () => { await api.signOut(); state.me = null; state.clientId = null; renderLogin(); };
  document.getElementById('clientSel')?.addEventListener('change', (e) => e.target.value ? go(state.view === 'overview' ? 'dashboard' : state.view, e.target.value) : go('overview', null));
  $app.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => { side.classList.remove('open'); go(b.dataset.go === 'overview' ? 'overview' : b.dataset.go, b.dataset.go === 'overview' ? null : undefined); });
  $app.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => ACTS[b.dataset.act]());
  $app.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { state.postTab = b.dataset.tab; render(); });
  $app.querySelectorAll('[data-decide]').forEach((b) => b.onclick = async () => { try { await api.decide(b.dataset.post, b.dataset.decide); if (b.dataset.decide === 'changes') state.openPost = b.dataset.post; toast(b.dataset.decide === 'approved' ? 'Approved. We’ll schedule it.' : 'Got it. Tell us what to change below.'); await reload(); if (b.dataset.decide === 'changes') { state.postTab = 'upcoming'; render(); document.getElementById('cm-' + b.dataset.post)?.focus(); } } catch (e) { toast(e.message); } });
  $app.querySelectorAll('[data-setpost]').forEach((b) => b.onclick = async () => { await api.setPost(b.dataset.post, b.dataset.setpost); toast('Updated'); reload(); });
  $app.querySelectorAll('[data-thread]').forEach((b) => b.onclick = () => { state.openPost = state.openPost === b.dataset.thread ? null : b.dataset.thread; render(); });
  $app.querySelectorAll('.cform').forEach((f) => f.onsubmit = async (e) => { e.preventDefault(); const body = f.body.value.trim(); if (!body) return f.body.focus(); await api.addComment(f.dataset.post, state.clientId, body); state.openPost = f.dataset.post; toast('Comment sent'); reload(); });
  $app.querySelectorAll('[data-req]').forEach((b) => b.onclick = async () => { await api.setRequest(b.dataset.req, b.dataset.to); toast('Request updated'); reload(); });
  $app.querySelectorAll('[data-inv]').forEach((b) => b.onclick = async () => { await api.setInvoice(b.dataset.inv, 'paid'); toast('Marked as paid'); reload(); });
  $app.querySelectorAll('[data-step]').forEach((b) => b.onclick = async () => { await api.completeStep(b.dataset.step); toast('Step done'); reload(); });
  $app.querySelectorAll('[data-lead]').forEach((s) => s.onchange = async () => { await api.setLead(s.dataset.lead, s.value); toast('Lead updated'); });
  $app.querySelectorAll('[data-file]').forEach((b) => b.onclick = async () => { const u = await api.fileUrl(b.dataset.file); u ? window.open(u, '_blank', 'noopener') : toast('Files open from the live portal.'); });
  const rf = document.getElementById('reqForm');
  rf && (rf.onsubmit = async (e) => { e.preventDefault(); if (!rf.title.checkValidity()) return rf.title.reportValidity(); await api.addRequest(state.clientId, { title: rf.title.value.trim(), type: rf.type.value, details: rf.details.value.trim(), due_date: rf.due_date.value || null }); toast('Request sent. We’ll reply within one business day.'); reload(); });
  const fi = document.getElementById('fileIn'), drop = document.getElementById('drop');
  if (fi) {
    const up = async (files) => { for (const f of files) { if (f.size > 50e6) { toast(`${f.name} is over 50 MB`); continue; } await api.upload(state.clientId, f); } toast('Uploaded'); reload(); };
    fi.onchange = () => up([...fi.files]);
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
    drop.addEventListener('drop', (e) => { e.preventDefault(); up([...e.dataTransfer.files]); });
  }
  if (state.view === 'overview') fillOverview();
}

if (LIVE) sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') renderLogin(); if (ev === 'PASSWORD_RECOVERY') { const p = prompt('Enter a new password (8+ characters)'); if (p) sb.auth.updateUser({ password: p }).then(() => toast('Password updated')); } });
boot();
