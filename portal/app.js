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
  up: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  report: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  inbox: '<path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
  down: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'
};
const ic = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
const PILL = {
  new: ['New', 'p-pink'], follow_up: ['Follow-up', 'p-amber'], booked: ['Booked', 'p-green'], won: ['Won', 'p-green'], lost: ['Lost', 'p-grey'],
  draft: ['Draft', 'p-grey'], waiting: ['Waiting on you', 'p-pink'], approved: ['Approved', 'p-green'], changes: ['Changes requested', 'p-amber'], published: ['Published', 'p-violet'],
  submitted: ['Submitted', 'p-pink'], in_progress: ['In progress', 'p-violet'], done: ['Done', 'p-green'],
  due: ['Due', 'p-amber'], paid: ['Paid', 'p-green'], overdue: ['Overdue', 'p-pink'],
  onboarding: ['Onboarding', 'p-violet'], active: ['Active', 'p-green'], paused: ['Paused', 'p-grey'],
  ontrack: ['On track', 'p-green'], attention: ['Needs attention', 'p-amber'],
  ai: ['Assistant replying', 'p-violet'], callback: ['Call back', 'p-amber'], no_answer: ['No answer', 'p-grey'], not_interested: ['Not interested', 'p-grey'], sold: ['Sold', 'p-green'], wrong_number: ['Wrong number', 'p-grey'], hot: ['Hot', 'p-pink'], warm: ['Warm', 'p-amber'], cold: ['Cold', 'p-grey'], published: ['Published', 'p-green'], sent: ['Sent', 'p-violet'], clicked: ['Clicked', 'p-amber'], reviewed: ['Reviewed', 'p-green'], failed: ['Failed', 'p-pink'], live: ['Live', 'p-green'], ended: ['Ended', 'p-grey'], human: ['With you', 'p-amber'], closed: ['Closed', 'p-grey'], opted_out: ['Opted out', 'p-grey']
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
    extra: (() => {
      const names = ['Sarah K.', 'Tom R.', 'Priya N.', 'Ben L.', 'Grace W.', 'Liam P.', 'Ava S.', 'Noah M.', 'Mia T.', 'Jack H.', 'Chloe M.', 'Ethan B.'];
      const srcs = ['Google Ads', 'Meta lead form', 'Website quiz', 'Google Business', 'Website chat', 'Instagram'];
      const sts = ['booked', 'new', 'follow_up', 'won', 'booked', 'follow_up', 'new', 'lost', 'booked', 'follow_up', 'won', 'new'];
      const leads = names.map((name, i) => ({ id: 'l' + i, name, source: srcs[i % srcs.length], enquiry: ['Switchboard upgrade', 'Hot water system', 'Ceiling fans', 'Solar inspection', 'Rewire quote', 'Safety switch'][i % 6], status: sts[i], score: [92, 48, 71, 95, 84, 66, 41, 22, 88, 59, 97, 52][i], value: [2400, 1800, 650, 5200, 1400, 980, 760, 0, 3100, 1250, 4600, 900][i], first_reply_seconds: [38, 41, 52, 35, 29, 47, 44, 61, 33, 39, 31, 55][i], phone: '04' + String(12345678 + i * 1111).slice(0, 8), email: name.split(' ')[0].toLowerCase() + '@example.com', created_at: d(-i * 0.7) }));
      const outcomes = ['booked', 'no_answer', 'callback', 'booked', 'sold', 'not_interested', 'no_answer', 'booked', 'callback', 'booked'];
      const calls = outcomes.map((o, i) => ({ id: 'k' + i, lead_name: names[i], caller: ['Jess', 'Marco'][i % 2], outcome: o, duration_seconds: o === 'no_answer' ? 0 : [214, 0, 96, 305, 422, 71, 0, 188, 64, 251][i], notes: ['Booked site visit Thu 2pm. 1960s house, wants upgrade before selling.', '', 'Asked to call back after 5pm.', 'Booked quote for two hot water units.', 'Paid deposit over the phone for safety switch install.', 'Already went with another sparky.', '', 'Booked solar inspection Sat 9am.', 'Checking with partner, call Monday.', 'Booked rewire quote next Tue.'][i], called_at: d(-i * 0.6) }));
      const reviews = [['Megan R.', 5, 'Replied to my enquiry at 9pm on a Sunday and had someone out Tuesday. Brilliant service.', 'Thanks Megan, glad we could get you sorted so quickly!'], ['Daniel K.', 5, 'Fast, tidy and the quote was spot on. Would use again.', ''], ['Alisha P.', 4, 'Good work, just took a bit longer than expected to finish.', ''], ['Chris W.', 5, 'Easy to book, great communication the whole way.', 'Cheers Chris, appreciate it!'], ['Sam T.', 3, 'Job was fine but I had to chase the invoice.', '']].map(([author, rating, body, reply], i) => ({ id: 'r' + i, platform: i === 3 ? 'Facebook' : 'Google', author, rating, body, reply, created_at: d(-i * 4 - 1) }));
      const reqs = Array.from({ length: 14 }, (_, i) => ({ id: 'q' + i, name: names[i % names.length], contact: '04xx xxx xxx', channel: i % 3 ? 'sms' : 'email', status: ['reviewed', 'clicked', 'sent', 'reviewed', 'sent', 'clicked', 'reviewed'][i % 7], created_at: d(-i) }));
      const creatives = [['Meta', 'Switchboard upgrade: $0 call-out this month', '../assets/img11.jpg', 640, 48200, 912, 21], ['Meta', 'Before-and-after rewire reel', '../assets/img4.jpg', 410, 30500, 488, 9], ['Google', 'Emergency electrician Brisbane northside', '', 980, 9100, 640, 26], ['Meta', 'Meet the team: 20 years local', '../assets/img1.jpg', 220, 21400, 205, 3], ['Google', 'Solar inspection booking', '', 350, 4200, 260, 8], ['Instagram', 'Story: same-day quotes', '../assets/img7.jpg', 180, 15600, 233, 5]].map(([channel, title, image_url, spend, impressions, clicks, leads], i) => ({ id: 'cr' + i, channel, title, image_url, spend, impressions, clicks, leads, status: i === 3 ? 'paused' : 'live' }));
      const mon = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);
      const reports = [{ id: 'rp1', month: mon, status: 'published', headline: 'Best month yet: 21 booked jobs, cost per lead down 28%.', happened: 'You had 64 enquiries last month, 18% more than the month before. Every one got a reply in under a minute (average 41 seconds), and our team spoke to 48 of them. 21 were booked in and 6 paid a deposit on the spot.', working: 'The “$0 call-out” switchboard ad is your best performer at $30 a lead. Google searches for emergency electricians are bringing in the highest-value jobs. Leads called within 5 minutes booked at nearly twice the rate of the rest.', next: 'Move $300 from the “Meet the team” ad into the switchboard offer. Launch a lead revival campaign to 140 old quotes from last winter. Start asking every finished job for a Google review by text.' }];
      return { leads, calls, reviews, reqs, creatives, reports };
    })(),
    reply: {
      [c1]: { client_id: c1, enabled: true, business_name: 'Sample Realty', about: 'Residential sales and appraisals in Brisbane’s inner north. Free appraisals. Open homes Saturdays.', questions: 'Are you buying or selling?\nWhich suburb?\nWhen are you hoping to move?', booking_url: 'https://calendly.com/sample-realty/appraisal', hours: 'Mon to Sat, 8am to 6pm', tone: 'Warm, friendly and to the point', handoff_email: 'agent@samplerealty.com.au', handoff_phone: '', sms_enabled: true, email_enabled: true, sms_number: '+61400000000', intake_key: 'demo-key-c1', assistant_name: 'Ava', sign_off: 'Ava, Sample Realty', brand_color: '#1F6F5C', website: 'https://samplerealty.com.au', logo_url: '' }
    },
    convs: {
      [c1]: [
        { id: 'v1', channel: 'sms', contact: '+61412345678', status: 'human', summary: 'Sarah K. selling a 3-bed in Wilston, wants to list in Feb. Booked appraisal Thu 10am.', last_message_at: d(-0.02), lead_name: 'Sarah K.' },
        { id: 'v2', channel: 'email', contact: 'tom@example.com', status: 'ai', summary: 'Tom R. buying in Newmarket, budget around $1.1m.', last_message_at: d(-0.2), lead_name: 'Tom R.' },
        { id: 'v3', channel: 'sms', contact: '+61498765432', status: 'opted_out', summary: 'Asked not to be contacted.', last_message_at: d(-3), lead_name: 'Ben L.' }
      ]
    },
    msgs: {
      v1: [['lead', 'Hi, thinking of selling our place in Wilston. What would it be worth?', -0.05], ['ai', 'Hi Sarah, thanks for getting in touch with Sample Realty. I’m their automated assistant. Is it a house or a unit, and how many bedrooms? Reply STOP to opt out.', -0.0499], ['lead', '3 bed house', -0.04], ['ai', 'Lovely. When are you hoping to sell?', -0.0399], ['lead', 'Probably February', -0.03], ['ai', 'Great. A free appraisal is the best next step. You can pick a time here: calendly.com/sample-realty/appraisal. An agent will confirm with you today.', -0.0299]],
      v2: [['lead', 'Do you have anything in Newmarket around 1.1?', -0.21], ['ai', 'Hi Tom, thanks for getting in touch with Sample Realty. I’m their automated assistant, and a team member will follow up during business hours. Are you after a house or a unit, and how many bedrooms do you need?', -0.2]],
      v3: [['ai', 'Hi Ben, thanks for your enquiry with Sample Realty. I’m their automated assistant. Are you buying or selling? Reply STOP to opt out.', -3.01], ['lead', 'STOP', -3]]
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
    replySettings: (c) => q(sb.from('reply_settings').select('*').eq('client_id', c).maybeSingle()),
    calls: (c) => q(sb.from('calls').select('*').eq('client_id', c).order('called_at', { ascending: false }).limit(200)),
    addCall: (c, o) => q(sb.from('calls').insert({ ...o, client_id: c })),
    reviews: (c) => q(sb.from('reviews').select('*').eq('client_id', c).order('created_at', { ascending: false }).limit(200)),
    reviewRequests: (c) => q(sb.from('review_requests').select('*').eq('client_id', c).order('created_at', { ascending: false }).limit(200)),
    replyReview: (id, reply) => q(sb.from('reviews').update({ reply, replied_at: new Date().toISOString() }).eq('id', id)),
    addReview: (c, o) => q(sb.from('reviews').insert({ ...o, client_id: c })),
    draftReviewReply(id) { return api.replyFn({ action: 'review_reply', review_id: id }); },
    sendReviewInvite(c, o) { return api.replyFn({ action: 'review_invite', client_id: c, ...o }); },
    async creatives(c) { const rows = await q(sb.from('creatives').select('*').eq('client_id', c).order('created_at', { ascending: false })); const paths = rows.filter((r) => r.image_path && !r.image_url).map((r) => r.image_path); if (paths.length) { const { data } = await sb.storage.from('client-files').createSignedUrls(paths, 3600); (data || []).forEach((d, i) => { const r = rows.find((x) => x.image_path === paths[i]); if (r && d.signedUrl) r.image_url = d.signedUrl; }); } return rows; },
    async addCreative(c, o, file) { if (file) { const path = `${c}/creatives/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`; await q(sb.storage.from('client-files').upload(path, file)); o.image_path = path; } return q(sb.from('creatives').insert({ ...o, client_id: c })); },
    reports: (c) => q(sb.from('reports').select('*').eq('client_id', c).order('month', { ascending: false })),
    saveReport: (c, o) => q(sb.from('reports').upsert({ ...o, client_id: c }, { onConflict: 'client_id,month' })),
    async draftReport(c, month) { const r = await api.replyFn({ action: 'report', client_id: c, month }); return r.report; },
    setLeadFields: (id, o) => q(sb.from('leads').update(o).eq('id', id)),
    allLeads: (c) => q(sb.from('leads').select('*').eq('client_id', c).order('created_at', { ascending: false }).limit(10000)),
    async everyLead() { const rows = await q(sb.from('leads').select('*, clients(name)').order('created_at', { ascending: false }).limit(20000)); return rows.map((r) => ({ ...r, client: r.clients?.name })); },
    async connStatus(c) { const r = await q(sb.rpc('connection_status', { p_client: c })); return r?.[0] || null; },
    conn: (c) => q(sb.from('connections').select('*').eq('client_id', c).maybeSingle()),
    saveConn: (c, o) => q(sb.from('connections').upsert({ ...o, client_id: c, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })),
    metaConnect(c) { return api.replyFn({ action: 'meta_connect', client_id: c }); },
    async saveReply(c, o) {
      const up = (x) => sb.from('reply_settings').upsert({ ...x, client_id: c, updated_at: new Date().toISOString() }, { onConflict: 'client_id' }).select().single();
      let { data, error } = await up(o);
      if (error && /column/i.test(error.message)) { const { assistant_name, sign_off, brand_color, website, logo_url, email_from, review_url, ...rest } = o; ({ data, error } = await up(rest)); }
      if (error) throw error; return data;
    },
    async conversations(c) { const rows = await q(sb.from('conversations').select('*, leads(name)').eq('client_id', c).order('last_message_at', { ascending: false }).limit(100)); return rows.map((r) => ({ ...r, lead_name: r.leads?.name })); },
    messages: (id) => q(sb.from('messages').select('*').eq('conversation_id', id).order('created_at')),
    setConv: (id, status) => q(sb.from('conversations').update({ status }).eq('id', id)),
    async replyFn(body) {
      const { data } = await sb.auth.getSession();
      const r = await fetch(CFG.SUPABASE_URL + '/functions/v1/reply/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session.access_token, apikey: CFG.SUPABASE_ANON_KEY }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({ ok: false, error: 'The reply service isn’t switched on yet.' }));
      if (!j.ok) throw new Error(j.error || 'Something went wrong'); return j;
    },
    sendMsg(id, body) { return api.replyFn({ action: 'send', conversation_id: id, body }); },
    testLead(c, o) { return api.replyFn({ action: 'test', client_id: c, ...o }); },
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
    metrics: (c) => ok(D.metrics[c] || []), leads: (c) => ok(c === 'c1' ? D.extra.leads : (D.leads[c] || [])), posts: (c) => ok(D.posts[c] || []),
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
    assign() { return ok(); },
    replySettings: (c) => ok(D.reply[c] || null),
    calls: (c) => ok(c === 'c1' ? D.extra.calls : []),
    addCall(c, o) { D.extra.calls.unshift({ id: uid(), called_at: new Date().toISOString(), ...o }); return ok(); },
    reviews: (c) => ok(c === 'c1' ? D.extra.reviews : []),
    reviewRequests: (c) => ok(c === 'c1' ? D.extra.reqs : []),
    replyReview(id, reply) { const r = D.extra.reviews.find((x) => x.id === id); if (r) { r.reply = reply; r.replied_at = new Date().toISOString(); } return ok(); },
    addReview(c, o) { D.extra.reviews.unshift({ id: uid(), created_at: new Date().toISOString(), ...o }); return ok(); },
    draftReviewReply(id) { const r = D.extra.reviews.find((x) => x.id === id); return ok({ reply: r.rating >= 4 ? `Thanks so much, ${r.author.split(' ')[0]}! We really appreciate you taking the time to leave a review, and we’re glad you were happy with the job.` : `Thanks for the feedback, ${r.author.split(' ')[0]}. You’re right, and we’re sorry about that. We’ve fixed how we send invoices so it doesn’t happen again. Please call us if there’s anything else we can do.` }); },
    sendReviewInvite(c, o) { D.extra.reqs.unshift({ id: uid(), name: o.name, contact: o.phone || o.email, channel: o.phone ? 'sms' : 'email', status: 'sent', created_at: new Date().toISOString() }); return ok(); },
    creatives: (c) => ok(c === 'c1' ? D.extra.creatives : []),
    addCreative(c, o) { D.extra.creatives.unshift({ id: uid(), status: 'live', ...o }); return ok(); },
    reports: (c) => ok(c === 'c1' ? D.extra.reports.filter((r) => isAgency() || r.status === 'published') : []),
    saveReport(c, o) { const i = D.extra.reports.findIndex((r) => r.id === o.id); if (i >= 0) D.extra.reports[i] = { ...D.extra.reports[i], ...o }; else D.extra.reports.unshift({ id: uid(), ...o }); return ok(); },
    draftReport(c, month) { return ok({ month, status: 'draft', headline: 'Draft: a strong month for booked jobs.', happened: 'Enquiries, replies, calls and bookings for the month, summarised in plain words.', working: 'The ads, channels and follow-up habits that brought in the best leads.', next: 'Three specific changes we’ll make next month.' }); },
    setLeadFields(id, o) { [...Object.values(D.leads).flat(), ...D.extra.leads].forEach((l) => { if (l.id === id) Object.assign(l, o); }); return ok(); },
    saveReply(c, o) { D.reply[c] = { intake_key: 'demo-key-' + c, ...(D.reply[c] || {}), ...o, client_id: c }; return ok(D.reply[c]); },
    conversations: (c) => ok(D.convs[c] || []),
    allLeads: (c) => api.leads(c),
    everyLead: () => ok(D.clients.flatMap((cl) => (cl.id === 'c1' ? D.extra.leads : (D.leads[cl.id] || [])).map((l) => ({ ...l, client: cl.name })))),
    connStatus: (c) => ok(c === 'c1' ? { meta_page_name: 'Sample Electrical', meta_ig_username: 'sampleelectrical', facebook: true, instagram: true, inbound_email: null } : null),
    conn: (c) => ok(D.conn?.[c] || (c === 'c1' ? { meta_page_id: '1029384756', meta_page_name: 'Sample Electrical', meta_ig_username: 'sampleelectrical', meta_page_token: 'set', lead_ads: true, dms: true } : null)),
    saveConn(c, o) { (D.conn ||= {})[c] = { ...(D.conn[c] || {}), ...o }; return ok(); },
    metaConnect: () => ok({ ok: true, page: 'Sample Electrical', instagram: 'sampleelectrical' }),
    messages: (id) => ok((D.msgs[id] || []).map(([sender, body, n]) => ({ id: uid(), sender, body, direction: sender === 'lead' ? 'in' : 'out', created_at: new Date(Date.now() + n * 86400000).toISOString() }))),
    setConv(id, status) { Object.values(D.convs).flat().forEach((v) => { if (v.id === id) v.status = status; }); return ok(); },
    sendMsg(id, body) { (D.msgs[id] ||= []).push(['human', body, 0]); Object.values(D.convs).flat().forEach((v) => { if (v.id === id) { v.status = 'human'; v.last_message_at = new Date().toISOString(); } }); return ok(); },
    testLead(c, o) { const id = uid(); (D.convs[c] ||= []).unshift({ id, channel: o.phone ? 'sms' : 'email', contact: o.phone || o.email, status: 'ai', summary: 'Test lead', last_message_at: new Date().toISOString(), lead_name: o.name }); D.msgs[id] = [['lead', o.message || 'Hi, I’d like to know more.', 0], ['ai', `Hi ${o.name.split(' ')[0]}, thanks for getting in touch with ${D.reply[c]?.business_name || 'us'}. I’m their automated assistant. What are you looking for, and when?` + (o.phone ? ' Reply STOP to opt out.' : ''), 0]]; return ok({ ok: true }); }
  });
}

/* ---------------- state + routing ---------------- */
const state = { me: null, clients: [], clientId: null, view: 'dashboard', data: {}, postTab: 'waiting', openPost: null, convId: null, msgs: [], replyTab: 'inbox' };
const isAgency = () => state.me?.role === 'agency';
const client = () => state.clients.find((c) => c.id === state.clientId);

async function load() {
  const c = state.clientId; if (!c) { state.data = {}; return; }
  const [metrics, leads, posts, comments, requests, invoices, steps, files] = await Promise.all([api.metrics(c), api.leads(c), api.posts(c), api.comments(c), api.requests(c), api.invoices(c), api.steps(c), api.files(c)]);
  state.data = { metrics, leads, posts, comments, requests, invoices, steps, files };
  const safe = (p) => p.catch(() => []);
  const [calls, reviews, reqs, creatives, reports] = await Promise.all([safe(api.calls(c)), safe(api.reviews(c)), safe(api.reviewRequests(c)), safe(api.creatives(c)), safe(api.reports(c))]);
  Object.assign(state.data, { calls, reviews, reqs, creatives, reports });
  if (state.view === 'replies' || state.view === 'dashboard') { state.data.convs = await api.conversations(c).catch(() => []); }
  if (state.view === 'channels') {
    const [reply, cs, conn] = await Promise.all([api.replySettings(c).catch(() => null), api.connStatus(c).catch(() => null), isAgency() ? api.conn(c).catch(() => null) : Promise.resolve(null)]);
    Object.assign(state.data, { reply, cs, conn });
  }
  if (state.view === 'replies') {
    const [reply, convs] = await Promise.all([api.replySettings(c).catch(() => null), api.conversations(c).catch(() => [])]);
    Object.assign(state.data, { reply, convs });
    if (!convs.find((v) => v.id === state.convId)) state.convId = convs[0]?.id || null;
    state.msgs = state.convId ? await api.messages(state.convId) : [];
  }
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
      ${LIVE && CFG.GOOGLE_LOGIN && mode !== 'reset' ? `<button type="button" class="btn btn-ghost" id="gBtn" style="width:100%"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>Continue with Google</button><div class="row small muted" style="justify-content:center">or use your email</div>` : ''}
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
    const gb = document.getElementById('gBtn'); if (gb) gb.onclick = async () => { try { const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } }); if (error) throw error; } catch (err) { renderLogin(mode, err.message); } };
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
  return { needYou: (d.convs || []).filter((v) => v.status === 'human').length, unreplied: (d.reviews || []).filter((r) => !r.reply).length, approvals: (d.posts || []).filter((p) => p.status === 'waiting').length, requests: (d.requests || []).filter((r) => r.status !== 'done').length, steps: (d.steps || []).filter((s) => !s.done).length };
}
function navBtn(view, label, icon, count) {
  return `<button type="button" data-go="${view}" ${state.view === view ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span>${count ? `<span class="count" aria-label="${count} open">${count}</span>` : ''}</button>`;
}
function render() {
  const c = counts(); const me = state.me;
  const clientNav = state.clientId ? `
    ${isAgency() ? `<div class="nav-label">${esc(client()?.name || 'Client')}</div>` : ''}
    ${navBtn('dashboard', 'Results', 'dash')}
    <div class="nav-label">Leads</div>
    ${navBtn('replies', 'Inbox', 'inbox', c.needYou)}
    ${navBtn('leads', 'Leads & pipeline', 'leads')}
    ${navBtn('calls', 'Calls', 'phone')}
    ${navBtn('channels', 'Connections', 'plug')}
    <div class="nav-label">Marketing</div>
    ${navBtn('ads', 'Ads & creative', 'image')}
    ${navBtn('reviews', 'Reviews', 'star', c.unreplied)}
    ${navBtn('reports', 'Monthly reports', 'report')}
    <div class="nav-label">Account</div>
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


/* ---------------- charts ---------------- */
// Single-series line chart (SVG) with hover tooltips. pts: [{label, value}]
function lineChart(pts, fmt = (v) => v, opts = {}) {
  if (!pts.length) return '<p class="empty">No data yet.</p>';
  const W = 560, H = 190, P = { l: 44, r: 12, t: 14, b: 26 };
  const vals = pts.map((p) => +p.value || 0); let max = Math.max(...vals), min = Math.min(0, ...vals); if (max === min) max = min + 1;
  const nice = (v) => { const e = Math.pow(10, Math.floor(Math.log10(v || 1))); return Math.ceil(v / e) * e; }; max = nice(max);
  const x = (i) => P.l + (pts.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (pts.length - 1));
  const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(+p.value).toFixed(1)}`).join('');
  const area = path + `L${x(pts.length - 1).toFixed(1)},${y(min)}L${x(0).toFixed(1)},${y(min)}Z`;
  const ticks = [0, .5, 1].map((t) => min + t * (max - min));
  const step = Math.ceil(pts.length / 6);
  return `<div class="lc"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Chart')}: ${pts.map((p) => esc(p.label) + ' ' + esc(fmt(p.value))).join(', ')}">
    ${ticks.map((t) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}" class="lc-grid"/><text x="${P.l - 8}" y="${y(t) + 4}" text-anchor="end" class="lc-ax">${esc(fmt(Math.round(t * 100) / 100))}</text>`).join('')}
    <path d="${area}" class="lc-area"/><path d="${path}" class="lc-line"/>
    ${pts.map((p, i) => (i % step === 0 || i === pts.length - 1) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" class="lc-ax">${esc(p.label)}</text>` : '').join('')}
    ${pts.map((p, i) => `<g class="lc-pt"><rect x="${x(i) - 16}" y="${P.t}" width="32" height="${H - P.t - P.b}" fill="transparent"/><line x1="${x(i)}" x2="${x(i)}" y1="${P.t}" y2="${H - P.b}" class="lc-cross"/><circle cx="${x(i)}" cy="${y(+p.value)}" r="5"/><g class="lc-tip" transform="translate(${Math.min(Math.max(x(i), 70), W - 70)},${Math.max(y(+p.value) - 34, 4)})"><rect x="-62" y="0" width="124" height="26" rx="8"/><text x="0" y="17" text-anchor="middle">${esc(p.label)}: ${esc(fmt(p.value))}</text></g></g>`).join('')}
  </svg></div>`;
}
// Horizontal bars, one hue. items: [{label, value, sub}]
function hBars(items, fmt = (v) => v) {
  if (!items.length) return '<p class="empty">No data yet.</p>';
  const max = Math.max(1, ...items.map((i) => +i.value || 0));
  return `<ul class="hb">${items.map((i) => `<li title="${esc(i.label)}: ${esc(fmt(i.value))}"><span class="hb-l">${esc(i.label)}</span><span class="hb-t"><i style="width:${Math.max(2, (100 * (+i.value || 0)) / max)}%"></i></span><b>${esc(fmt(i.value))}</b>${i.sub ? `<span class="hb-s">${esc(i.sub)}</span>` : ''}</li>`).join('')}</ul>`;
}
const scoreOf = (l) => l.score != null ? l.score : ({ won: 95, booked: 85, follow_up: 60, new: 45, lost: 10 }[l.status] ?? 40);
const heat = (n) => n >= 75 ? 'hot' : n >= 50 ? 'warm' : 'cold';
const secs = (n) => n == null ? '—' : n < 60 ? `${Math.round(n)}s` : n < 3600 ? `${Math.round(n / 60)}m` : `${Math.round(n / 3600)}h`;
const stars = (n) => `<span class="stars" aria-label="${n} out of 5 stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`;
const monthName = (d) => new Date(d).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

/* ---------------- views ---------------- */
const VIEWS = {
  overview() {
    return head('Agency', 'All clients', 'Every client at a glance: results, what’s waiting, and who needs a nudge.', `<button class="btn btn-ghost" data-act="csvAll">${ic('down', 16)} All leads (CSV)</button><button class="btn btn-pink" data-act="newClient">${ic('plus', 16)} Add client</button>`) + `<div id="ov"><div class="card empty">Loading clients…</div></div>`;
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
    </section>
    ${analytics(d)}`;
  },


  leads() {
    const d = state.data; const L = d.leads; const mode = state.leadMode || 'table';
    const open = L.filter((l) => !['won', 'lost'].includes(l.status));
    const pipe = open.reduce((a, l) => a + (+l.value || 0), 0);
    const hot = L.filter((l) => scoreOf(l) >= 75 && !['won', 'lost'].includes(l.status)).length;
    const booked = L.length ? Math.round((100 * L.filter((l) => ['booked', 'won'].includes(l.status)).length) / L.length) : 0;
    const rep = L.filter((l) => l.first_reply_seconds != null); const avg = rep.length ? rep.reduce((a, l) => a + l.first_reply_seconds, 0) / rep.length : null;
    const cols = [['new', 'New'], ['follow_up', 'Follow-up'], ['booked', 'Booked'], ['won', 'Won']];
    const sorted = [...L].sort((a, b) => scoreOf(b) - scoreOf(a));
    return head('Pipeline', 'Leads & pipeline', 'Every enquiry, scored and tracked from first message to sale. Hot leads first.', `<div class="seg" role="tablist" aria-label="View"><button role="tab" data-leadmode="table" aria-selected="${mode === 'table'}">List</button><button role="tab" data-leadmode="board" aria-selected="${mode === 'board'}">Board</button></div><button class="btn btn-ghost" data-act="csvLeads">${ic('down', 16)} Download CSV</button>${isAgency() ? `<button class="btn btn-pink" data-act="addLead">${ic('plus', 16)} Add lead</button>` : ''}`) + `
    <section class="grid g4">
      <div class="card kpi"><span class="lab">Hot leads to action</span><span class="val">${hot}</span><span class="delta muted">Score 75 and up</span></div>
      <div class="card kpi"><span class="lab">Open pipeline value</span><span class="val">${money0(pipe)}</span><span class="delta muted">${open.length} open leads</span></div>
      <div class="card kpi"><span class="lab">Booked or won</span><span class="val">${booked}%</span><span class="delta muted">of all leads</span></div>
      <div class="card kpi"><span class="lab">Average first reply</span><span class="val">${secs(avg)}</span><span class="delta muted">Speed to lead</span></div>
    </section>
    ${mode === 'board' ? `<section class="board" style="margin-top:16px">${cols.map(([k, lab]) => { const items = sorted.filter((l) => l.status === k); return `<div class="kcol"><h3>${lab}<span class="muted">${items.length} · ${money0(items.reduce((a, l) => a + (+l.value || 0), 0))}</span></h3>${items.map((l) => `<div class="kcard"><div class="row" style="justify-content:space-between;gap:8px"><button type="button" class="linkbtn" data-lead-open="${esc(l.id)}">${esc(l.name)}</button>${pill(heat(scoreOf(l)))}</div><span class="small muted">${esc(l.source || '')}${l.value ? ' · ' + money0(l.value) : ''}</span><label class="sr" for="bs-${esc(l.id)}">Stage</label><select id="bs-${esc(l.id)}" class="field" style="min-height:34px;padding:2px 8px;font-size:13px" data-lead="${esc(l.id)}">${['new', 'follow_up', 'booked', 'won', 'lost'].map((s) => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${PILL[s][0]}</option>`).join('')}</select></div>`).join('') || '<p class="small muted" style="margin:4px">Nothing here.</p>'}</div>`; }).join('')}</section>`
    : `<section class="card" style="margin-top:16px"><div class="tbl-wrap"><table><thead><tr><th scope="col">Name</th><th scope="col">Score</th><th scope="col">Source</th><th scope="col">Enquiry</th><th scope="col">Value</th><th scope="col">First reply</th><th scope="col">Date</th><th scope="col">Stage</th></tr></thead><tbody>
      ${sorted.map((l) => `<tr><td><button type="button" class="linkbtn" data-lead-open="${esc(l.id)}">${esc(l.name)}</button></td><td>${pill(heat(scoreOf(l)))} <span class="small muted">${scoreOf(l)}</span></td><td class="muted">${esc(l.source || '')}</td><td class="muted">${esc(l.enquiry || '')}</td><td>${l.value ? money0(l.value) : '<span class="muted">—</span>'}</td><td class="muted">${secs(l.first_reply_seconds)}</td><td class="muted">${fmtDate(l.created_at)}</td><td><label class="sr" for="ls-${esc(l.id)}">Stage for ${esc(l.name)}</label><select id="ls-${esc(l.id)}" class="field" style="min-height:36px;padding:4px 8px;width:auto" data-lead="${esc(l.id)}">${['new', 'follow_up', 'booked', 'won', 'lost'].map((k) => `<option value="${k}" ${l.status === k ? 'selected' : ''}>${PILL[k][0]}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="8" class="empty">No leads yet.</td></tr>'}
    </tbody></table></div></section>`}`;
  },
  calls() {
    const C = state.data.calls || [];
    const conn = C.filter((c) => !['no_answer', 'wrong_number'].includes(c.outcome));
    const booked = C.filter((c) => ['booked', 'sold'].includes(c.outcome)).length;
    const talk = conn.length ? conn.reduce((a, c) => a + (+c.duration_seconds || 0), 0) / conn.length : 0;
    const outs = ['booked', 'sold', 'callback', 'no_answer', 'not_interested', 'wrong_number'].map((k) => ({ label: PILL[k][0], value: C.filter((c) => c.outcome === k).length })).filter((x) => x.value);
    return head('brightfront Convert', 'Calls', 'Every call our sales team makes to your leads, with the outcome and notes.', isAgency() ? `<button class="btn btn-pink" data-act="addCall">${ic('plus', 16)} Log call</button>` : '') + `
    <section class="grid g4">
      <div class="card kpi"><span class="lab">Calls made</span><span class="val">${C.length}</span></div>
      <div class="card kpi"><span class="lab">Spoke to</span><span class="val">${C.length ? Math.round((100 * conn.length) / C.length) : 0}%</span><span class="delta muted">${conn.length} conversations</span></div>
      <div class="card kpi"><span class="lab">Booked or sold</span><span class="val">${booked}</span><span class="delta muted">${conn.length ? Math.round((100 * booked) / conn.length) : 0}% of conversations</span></div>
      <div class="card kpi"><span class="lab">Average call</span><span class="val">${secs(talk)}</span></div>
    </section>
    <section class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));margin-top:16px;align-items:start">
      <div class="card"><div class="card-head"><h2>Outcomes</h2></div>${hBars(outs)}</div>
      <div class="card" style="grid-column:span 2"><div class="card-head"><h2>Call log</h2></div><div class="tbl-wrap"><table><thead><tr><th scope="col">Lead</th><th scope="col">Outcome</th><th scope="col">Length</th><th scope="col">Caller</th><th scope="col">When</th><th scope="col">Notes</th></tr></thead><tbody>
        ${C.map((c) => `<tr><td><b>${esc(c.lead_name || '')}</b></td><td>${pill(c.outcome)}</td><td class="muted">${c.duration_seconds ? secs(c.duration_seconds) : '—'}</td><td class="muted">${esc(c.caller || '')}</td><td class="muted">${fmtDT(c.called_at)}</td><td class="small">${esc(c.notes || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No calls yet. Calls appear here once our team starts working your leads.</td></tr>'}
      </tbody></table></div></div>
    </section>`;
  },
  reviews() {
    const R = state.data.reviews || [], Q = state.data.reqs || [];
    const avg = R.length ? R.reduce((a, r) => a + r.rating, 0) / R.length : 0;
    const month = R.filter((r) => Date.now() - new Date(r.created_at) < 30 * 86400000).length;
    const reviewed = Q.filter((q) => q.status === 'reviewed').length;
    const dist = [5, 4, 3, 2, 1].map((n) => ({ label: n + ' star', value: R.filter((r) => r.rating === n).length }));
    return head('Reputation', 'Reviews', 'Ask every happy customer for a review, and reply to every review, from one place.', isAgency() ? `<button class="btn btn-ghost" data-act="addReview">${ic('plus', 16)} Add review</button>` : '') + `
    <section class="grid g4">
      <div class="card kpi"><span class="lab">Average rating</span><span class="val">${R.length ? avg.toFixed(1) : '—'}</span><span class="delta">${R.length ? stars(Math.round(avg)) : ''}</span></div>
      <div class="card kpi"><span class="lab">Total reviews</span><span class="val">${R.length}</span><span class="delta muted">${month} in the last 30 days</span></div>
      <div class="card kpi"><span class="lab">Review requests sent</span><span class="val">${Q.length}</span><span class="delta muted">${Q.length ? Math.round((100 * reviewed) / Q.length) : 0}% left a review</span></div>
      <div class="card kpi"><span class="lab">Waiting for a reply</span><span class="val">${R.filter((r) => !r.reply).length}</span></div>
    </section>
    <section class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));margin-top:16px;align-items:start">
      <div style="display:flex;flex-direction:column;gap:16px">
        <form class="card" id="invForm" style="display:flex;flex-direction:column;gap:12px" novalidate><h2>Ask for a review</h2><p class="small muted" style="margin:0">We’ll text or email them a link to your review page, in your business’s name.</p>
          ${F('Customer name', 'name', 'text', 'required')}<div class="two">${F('Mobile', 'phone', 'tel', 'placeholder="04…"')}${F('Email', 'email', 'email')}</div>
          <button class="btn btn-pink" type="submit" style="align-self:flex-start">Send request</button></form>
        <div class="card"><div class="card-head"><h2>Ratings</h2></div>${hBars(dist)}</div>
      </div>
      <div class="card" style="grid-column:span 2"><div class="card-head"><h2>Latest reviews</h2></div>
        ${R.length ? `<ul class="rv">${R.map((r) => `<li><div class="row" style="justify-content:space-between;gap:10px"><div><b>${esc(r.author || 'Customer')}</b> ${stars(r.rating)}</div><span class="small muted">${esc(r.platform)} · ${fmtDate(r.created_at)}</span></div><p>${esc(r.body || '')}</p>
          ${r.reply ? `<div class="rv-reply"><b>Your reply</b> ${esc(r.reply)}</div>` : `<form class="rvForm" data-review="${esc(r.id)}"><label class="sr" for="rv-${esc(r.id)}">Reply</label><textarea class="field" id="rv-${esc(r.id)}" name="reply" maxlength="2000" placeholder="Write a reply, or let AI draft one"></textarea><div class="row" style="gap:8px"><button type="button" class="btn btn-ghost btn-sm" data-draft="${esc(r.id)}">${ic('bolt', 14)} Draft with AI</button><button class="btn btn-navy btn-sm" type="submit">Save reply</button></div></form>`}</li>`).join('')}</ul>` : '<p class="empty">No reviews yet. Send your first review request.</p>'}
        <p class="small muted" style="margin:12px 0 0">Copy your saved reply to Google or Facebook to post it there.</p>
      </div>
    </section>`;
  },
  ads() {
    const cr = [...(state.data.creatives || [])].map((c) => ({ ...c, cpl: c.leads ? c.spend / c.leads : null, ctr: c.impressions ? (100 * c.clicks) / c.impressions : null }));
    const best = cr.filter((c) => c.cpl != null).sort((a, b) => a.cpl - b.cpl)[0];
    const spend = cr.reduce((a, c) => a + (+c.spend || 0), 0), leads = cr.reduce((a, c) => a + (+c.leads || 0), 0);
    const sort = state.adSort || 'cpl';
    const list = cr.sort((a, b) => sort === 'cpl' ? ((a.cpl ?? 1e9) - (b.cpl ?? 1e9)) : sort === 'leads' ? b.leads - a.leads : b.spend - a.spend);
    return head('Marketing', 'Ads & creative', 'Every ad we’re running for you, and what each one is bringing in.', isAgency() ? `<button class="btn btn-pink" data-act="addCreative">${ic('plus', 16)} Add ad</button>` : '') + `
    <section class="grid g4">
      <div class="card kpi"><span class="lab">Ad spend</span><span class="val">${money0(spend)}</span></div>
      <div class="card kpi"><span class="lab">Leads from ads</span><span class="val">${leads}</span></div>
      <div class="card kpi"><span class="lab">Cost per lead</span><span class="val">${leads ? money(spend / leads) : '—'}</span></div>
      <div class="card kpi"><span class="lab">Best ad</span><span class="val" style="font-size:18px;line-height:1.3">${best ? esc(best.title) : '—'}</span><span class="delta up">${best ? money(best.cpl) + ' per lead' : ''}</span></div>
    </section>
    <div class="row" style="gap:6px;margin:16px 0" role="tablist" aria-label="Sort ads"><span class="small muted" style="margin-right:4px">Sort by</span>${[['cpl', 'Cost per lead'], ['leads', 'Most leads'], ['spend', 'Most spend']].map(([k, l]) => `<button class="chip" role="tab" data-adsort="${k}" aria-selected="${sort === k}">${l}</button>`).join('')}</div>
    ${list.length ? `<section class="cr-grid">${list.map((c) => `<article class="cr"><div class="cr-img">${c.image_url ? `<img src="${esc(c.image_url)}" alt="" loading="lazy">` : `<span>${esc(c.channel)} search ad</span>`}<span class="ch">${esc(c.channel)}</span>${best && c.id === best.id ? '<span class="cr-best">Best performer</span>' : ''}</div>
      <div class="cr-body"><b>${esc(c.title)}</b><div class="cr-stats"><div><span>Spend</span><b>${money0(c.spend)}</b></div><div><span>Leads</span><b>${c.leads}</b></div><div><span>Per lead</span><b>${c.cpl == null ? '—' : money0(c.cpl)}</b></div><div><span>Click rate</span><b>${c.ctr == null ? '—' : c.ctr.toFixed(1) + '%'}</b></div></div>${pill(c.status)}</div></article>`).join('')}</section>` : '<div class="card empty">No ads yet. They’ll appear here once your campaigns are live.</div>'}`;
  },
  reports() {
    const RP = state.data.reports || []; const open = state.openReport || RP[0]?.id;
    return head('Marketing', 'Monthly reports', 'What happened, what’s working and what we’re doing next, in plain words.', isAgency() ? `<button class="btn btn-pink" data-act="draftReport">${ic('bolt', 16)} Draft this month with AI</button>` : '') + `
    ${RP.length ? `<div class="tabs" role="tablist" aria-label="Report month">${RP.map((r) => `<button role="tab" type="button" data-report="${esc(r.id || r.month)}" aria-selected="${(r.id || r.month) === open}">${esc(monthName(r.month))}${r.status === 'draft' ? ' · draft' : ''}</button>`).join('')}</div>
    ${RP.filter((r) => (r.id || r.month) === open).map((r) => `<article class="card report"><p class="eyebrow-s">${esc(monthName(r.month))} report</p><h2 class="rp-head">${esc(r.headline || '')}</h2>
      <div class="rp-cols"><section><h3>What happened</h3><p>${esc(r.happened || '')}</p></section><section><h3>What’s working</h3><p>${esc(r.working || '')}</p></section><section><h3>What we’re doing next</h3><p>${esc(r.next || '')}</p></section></div>
      ${isAgency() ? `<div class="row" style="gap:8px;margin-top:16px"><button class="btn btn-ghost btn-sm" data-editreport="${esc(r.id || r.month)}">Edit</button>${r.status === 'draft' ? `<button class="btn btn-pink btn-sm" data-publish="${esc(r.id || r.month)}">Publish to client</button>` : pill('published')}</div>` : ''}</article>`).join('')}` : `<div class="card empty">${isAgency() ? 'No reports yet. Draft this month’s with AI, check it, then publish it to the client.' : 'Your first monthly report will appear here at the end of your first month.'}</div>`}
    ${analytics(state.data)}`;
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
  },
  replies() {
    const d = state.data; const r = d.reply || {}; const convs = d.convs || []; const tab = state.replyTab;
    const on = !!r.enabled; const cv = convs.find((v) => v.id === state.convId);
    const month = convs.filter((v) => Date.now() - new Date(v.last_message_at) < 30 * 86400000);
    const n = (st) => month.filter((v) => v.status === st).length;
    const intake = LIVE ? `${CFG.SUPABASE_URL}/functions/v1/reply/intake` : 'https://YOUR-PROJECT.supabase.co/functions/v1/reply/intake';
    const tabs = [['inbox', 'Conversations'], ['settings', 'What it says'], ['connect', 'Connect & test']];
    const top = head('brightfront Reply', 'Inbox', 'Every new lead gets a reply in your business’s name in under a minute, day or night. When they’re ready, it hands them to you.',
      `<span class="pill ${on ? 'p-green' : 'p-grey'}" style="align-self:center">${on ? 'On' : 'Off'}</span><button class="btn ${on ? 'btn-ghost' : 'btn-pink'}" data-replyon="${on ? 0 : 1}">${on ? 'Pause replies' : 'Turn on replies'}</button>`);
    const kpis = `<section class="grid g4" aria-label="Last 30 days">
      <div class="card kpi"><span class="lab">Leads replied to</span><span class="val">${month.length}</span><span class="delta muted">Last 30 days</span></div>
      <div class="card kpi"><span class="lab">Handed to you</span><span class="val">${n('human')}</span><span class="delta muted">Ready for a person</span></div>
      <div class="card kpi"><span class="lab">Still chatting</span><span class="val">${n('ai')}</span><span class="delta muted">Assistant replying</span></div>
      <div class="card kpi"><span class="lab">Opted out</span><span class="val">${n('opted_out')}</span><span class="delta muted">Won’t be messaged again</span></div></section>`;
    const tabBar = `<div class="tabs" role="tablist" aria-label="Lead replies" style="margin-top:16px">${tabs.map(([k, l]) => `<button role="tab" type="button" data-rtab="${k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (!r.client_id && tab === 'inbox') body = `<div class="card empty" style="text-align:left"><h2 style="margin-bottom:6px">Set up your assistant</h2><p class="muted">Tell it about the business and what to ask every lead. It takes about five minutes.</p><button class="btn btn-pink" data-rtab="settings">Start set-up</button></div>`;
    else if (tab === 'inbox') body = `<section class="rp-wrap">
      <div class="card rp-list"><div class="card-head"><h2>Conversations</h2><button class="btn btn-ghost btn-sm" data-act="refreshReplies">Refresh</button></div>
        ${convs.length ? `<ul class="list rp-convs">${convs.map((v) => `<li><button type="button" class="rp-conv" data-conv="${esc(v.id)}" ${v.id === state.convId ? 'aria-current="true"' : ''}><span class="row" style="justify-content:space-between;gap:8px"><b>${esc(v.lead_name || v.contact)}</b><span class="small muted">${fmtDate(v.last_message_at)}</span></span><span class="row" style="gap:6px">${pill(v.status)}<span class="small muted">${CHN[v.channel] || 'Email'}</span></span>${v.summary ? `<span class="small muted rp-sum">${esc(v.summary)}</span>` : ''}</button></li>`).join('')}</ul>` : '<p class="empty">No conversations yet. Send a test lead from Connect & test.</p>'}
      </div>
      <div class="card rp-thread">${cv ? `
        <div class="card-head" style="align-items:flex-start"><div><h2>${esc(cv.lead_name || cv.contact)}</h2><span class="small muted">${['messenger', 'instagram'].includes(cv.channel) ? CHN[cv.channel] : (cv.channel === 'sms' ? 'Mobile' : 'Email') + ': ' + esc(cv.contact)}</span></div>${pill(cv.status)}</div>
        ${cv.summary ? `<p class="rp-note"><b>Summary</b> ${esc(cv.summary)}</p>` : ''}
        <div class="rp-msgs" id="rpMsgs">${state.msgs.map((m) => `<div class="rp-m ${m.sender === 'lead' ? 'in' : 'out'} ${m.sender}"><span class="small">${m.sender === 'lead' ? esc(cv.lead_name || 'Lead') : m.sender === 'ai' ? 'Assistant' : 'You'} · ${fmtDT(m.created_at)}</span><p>${esc(m.body)}</p>${m.error ? `<span class="small" style="color:var(--pinkd)">Not sent: ${esc(m.error)}</span>` : ''}</div>`).join('') || '<p class="empty">No messages yet.</p>'}</div>
        ${cv.status === 'opted_out' ? '<p class="muted small" style="margin:12px 0 0">This person opted out, so they can’t be messaged here.</p>' : `
        <div class="row" style="gap:8px;margin:12px 0">${cv.status === 'ai' ? `<button class="btn btn-ghost btn-sm" data-convst="human">Take over</button>` : `<button class="btn btn-ghost btn-sm" data-convst="ai">Let the assistant reply</button>`}<button class="btn btn-ghost btn-sm" data-convst="closed">Close</button></div>
        <form id="rpSend" class="rp-send" novalidate><label class="sr" for="rpBody">Your reply</label><textarea class="field" id="rpBody" name="body" maxlength="${cv.channel === 'sms' ? 480 : cv.channel === 'email' ? 4000 : 1000}" placeholder="Write your reply. Sending it takes the conversation over from the assistant."></textarea><button class="btn btn-navy" type="submit">Send ${cv.channel === 'sms' ? 'text' : cv.channel === 'email' ? 'email' : 'message'}</button></form>`}` : '<p class="empty">Pick a conversation to read it.</p>'}
      </div></section>`;
    else if (tab === 'settings') body = `<form class="card rp-form" id="rpSettings" novalidate>
      <h2>What your assistant knows and says</h2><p class="muted small" style="margin:0">It only uses what you write here. Anything else, it hands to you.</p>
      <div class="two"><label class="lab">Business name<input class="field" name="business_name" required maxlength="80" value="${esc(r.business_name || client()?.name || '')}"></label><label class="lab">Tone<input class="field" name="tone" maxlength="120" value="${esc(r.tone || 'Warm, friendly and to the point')}"></label></div>
      <label class="lab">About the business<span class="small muted">Services, area, prices you’re happy to share, anything leads often ask.</span><textarea class="field" name="about" maxlength="3000" required placeholder="We sell homes in Brisbane’s inner north. Free appraisals. Open homes every Saturday.">${esc(r.about || '')}</textarea></label>
      <label class="lab">Questions to ask every lead<span class="small muted">One per line. It asks them one at a time.</span><textarea class="field" name="questions" maxlength="1500" placeholder="Are you buying or selling?&#10;Which suburb?&#10;When are you hoping to move?">${esc(r.questions || '')}</textarea></label>
      <div class="two"><label class="lab">Booking link<input class="field" name="booking_url" type="url" maxlength="300" placeholder="https://calendly.com/…" value="${esc(r.booking_url || '')}"></label><label class="lab">When you follow up<input class="field" name="hours" maxlength="120" placeholder="Mon to Fri, 8am to 6pm" value="${esc(r.hours || '')}"></label></div>
      <div class="two"><label class="lab">Email me when a lead is ready<input class="field" name="handoff_email" type="email" required maxlength="200" value="${esc(r.handoff_email || state.me.email || '')}"></label><label class="lab">Mobile for alerts (optional)<input class="field" name="handoff_phone" type="tel" maxlength="20" value="${esc(r.handoff_phone || '')}"></label></div>
      <h2 style="margin-top:10px">Branding</h2><p class="muted small" style="margin:0">Leads only ever see your business. Every text and email uses your name, logo and colours.</p>
      <div class="rp-brand">
        <div class="rp-bfields">
          <div class="two"><label class="lab">Assistant name (optional)<input class="field" name="assistant_name" maxlength="30" placeholder="e.g. Ava" value="${esc(r.assistant_name || '')}"></label><label class="lab">Email sign-off<input class="field" name="sign_off" maxlength="80" placeholder="e.g. Ava, Sample Realty" value="${esc(r.sign_off || '')}"></label></div>
          <div class="two"><label class="lab">Brand colour<span class="rp-color"><input type="color" name="brand_color" value="${esc(/^#[0-9a-f]{6}$/i.test(r.brand_color || '') ? r.brand_color : '#0B0B2E')}" aria-label="Brand colour"><span class="small muted" id="rpColTxt">${esc(r.brand_color || '#0B0B2E')}</span></span></label><label class="lab">Website<input class="field" name="website" type="url" maxlength="200" placeholder="https://…" value="${esc(r.website || '')}"></label></div>
          <label class="lab">Review link<span class="small muted">Your Google review link, sent with review requests.</span><input class="field" name="review_url" type="url" maxlength="400" placeholder="https://g.page/r/…/review" value="${esc(r.review_url || '')}"></label>
          <label class="lab">Logo link<span class="small muted">A link to your logo image (PNG or JPG, https). Leave empty to use your business name.</span><input class="field" name="logo_url" type="url" maxlength="400" placeholder="https://yoursite.com.au/logo.png" value="${esc(r.logo_url || '')}"></label>
          ${isAgency() ? `<label class="lab">Send emails from (agency only)<span class="small muted">The client’s own address, once their domain is verified for sending. Empty sends from the shared address with their name.</span><input class="field" name="email_from" type="email" maxlength="200" placeholder="hello@theirbusiness.com.au" value="${esc(r.email_from || '')}"></label>` : ''}
        </div>
        <div class="rp-prev" aria-label="Email preview"><div class="rp-prev-h" id="rpPrevH"></div><div class="rp-prev-b"><p id="rpPrevT"></p><span class="rp-prev-btn" id="rpPrevBtn">Book a time</span></div><div class="rp-prev-f" id="rpPrevF"></div></div>
      </div>
      <fieldset class="rp-ch"><legend class="lab">Reply by</legend><label><input type="checkbox" name="sms_enabled" ${r.sms_enabled ? 'checked' : ''}> Text message, when the lead gives a mobile</label><label><input type="checkbox" name="email_enabled" ${r.email_enabled !== false ? 'checked' : ''}> Email</label></fieldset>
      ${isAgency() ? `<label class="lab">Sending mobile number (agency only)<span class="small muted">The client’s Twilio number in +61 format.</span><input class="field" name="sms_number" maxlength="20" placeholder="+614…" value="${esc(r.sms_number || '')}"></label>` : ''}
      <button class="btn btn-pink" type="submit" style="align-self:flex-start">Save</button></form>`;
    else body = `<section class="grid g2" style="align-items:start">
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><h2>Send a test lead</h2><p class="muted small" style="margin:0">Use your own mobile or email to see exactly what a lead gets.</p>
        ${r.client_id ? `<form id="rpTest" style="display:flex;flex-direction:column;gap:12px" novalidate>
          ${F('Name', 'name', 'text', 'required value="Test lead"')}<div class="two">${F('Mobile', 'phone', 'tel', 'placeholder="04…"')}${F('Email', 'email', 'email')}</div>
          <label class="lab">Their message<textarea class="field" name="message" maxlength="1000">Hi, I’d like to know more.</textarea></label>
          <button class="btn btn-navy" type="submit" style="align-self:flex-start">Send test</button></form>` : '<p class="empty">Save your settings first.</p>'}
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><h2>Connect your lead forms</h2>
        ${r.intake_key ? `<p class="muted small" style="margin:0">Send new leads to this address. Fields: name, email, phone, message, source.</p>
        <label class="lab">Lead address<input class="field" readonly value="${esc(intake)}?key=${esc(r.intake_key)}" onclick="this.select()"></label>
        <details open><summary class="small" style="font-weight:700;cursor:pointer">“Text us” chat button for your website</summary><p class="small muted">Paste this just before &lt;/body&gt; on your website. It shows a “Text us” button in your colours. Messages land in your Inbox and get an instant reply.</p><pre class="rp-code">${esc(`<script src="https://brightfrontstudio.com/widget.js" data-key="${r.intake_key}" data-name="${r.business_name || ''}" data-color="${r.brand_color || '#0B0B2E'}" async></script>`)}</pre></details>
        <details><summary class="small" style="font-weight:700;cursor:pointer">Website form code</summary><pre class="rp-code">${esc(`<form action="${intake}?key=${r.intake_key}&redirect=https://YOURSITE/thanks" method="post">
  <input name="name" required>
  <input name="phone" type="tel">
  <input name="email" type="email">
  <textarea name="message"></textarea>
  <input name="website" style="display:none" tabindex="-1" autocomplete="off">
  <button>Send</button>
</form>`)}</pre></details>
        <p class="small muted" style="margin:0">Facebook, Instagram, email and other lead sources: see <button type="button" class="linkbtn" data-go="channels">Connections</button>.</p>
        ${r.sms_number ? `<p class="small muted" style="margin:0">Texts send from ${esc(r.sms_number)}.</p>` : '<p class="small muted" style="margin:0">Texting turns on once we’ve set up your sending number.</p>'}` : '<p class="empty">Save your settings first.</p>'}
      </div></section>`;
    return top + kpis + tabBar + body;
  }
};

const CHN = { sms: 'Text', email: 'Email', messenger: 'Messenger', instagram: 'Instagram' };
const CSV_COLS = [['created_at', 'Date'], ['name', 'Name'], ['phone', 'Mobile'], ['email', 'Email'], ['source', 'Source'], ['enquiry', 'Enquiry'], ['message', 'Message'], ['status', 'Stage'], ['score', 'Score'], ['value', 'Deal value'], ['first_reply_seconds', 'First reply (seconds)'], ['notes', 'Notes']];
function downloadCsv(rows, file, withClient) {
  const cols = withClient ? [['client', 'Client'], ...CSV_COLS] : CSV_COLS;
  const cell = (v) => { let t = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const fmt = (k, v) => k === 'created_at' && v ? new Date(v).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) : k === 'status' && PILL[v] ? PILL[v][0] : v;
  const text = '﻿' + [cols.map((c) => c[1]).join(','), ...rows.map((r) => cols.map(([k]) => cell(fmt(k, r[k]))).join(','))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = file; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const slug = (t) => String(t || 'leads').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

VIEWS.channels = function () {
  const d = state.data, r = d.reply || {}, cs = d.cs || {}, cn = d.conn || {};
  const fn = LIVE ? `${CFG.SUPABASE_URL}/functions/v1/reply` : 'https://YOUR-PROJECT.supabase.co/functions/v1/reply';
  const key = r.intake_key;
  const L = d.leads || [];
  const bySrc = Object.entries(L.reduce((a, l) => { const k = l.source || 'Other'; a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
  const on = (x) => `<span class="pill ${x ? 'p-green' : 'p-grey'}">${x ? 'Connected' : 'Not connected'}</span>`;
  const copy = (label, val) => `<label class="lab">${label}<span class="row" style="gap:8px"><input class="field" readonly value="${esc(val)}" onclick="this.select()"><button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(val)}">Copy</button></span></label>`;
  const card = (title, sub, status, inner) => `<article class="card ch-card"><div class="card-head" style="align-items:flex-start;gap:12px"><div><h2>${title}</h2><p class="small muted" style="margin:4px 0 0">${sub}</p></div>${status}</div>${inner}</article>`;
  if (!key) return head('Leads', 'Connections', 'Every place your leads come from, feeding one inbox and one lead list.') + `<div class="card empty" style="text-align:left"><h2 style="margin-bottom:6px">Set up your assistant first</h2><p class="muted">Connections need your assistant’s settings saved. It takes about five minutes.</p><button class="btn btn-pink" data-go="replies">Open Inbox set-up</button></div>`;

  const flow = `<section class="card ch-flow" aria-label="How your leads flow"><div class="ch-flow-in">${['Website & chat', 'Facebook & Instagram', 'Email', 'Text', 'Zapier, Hipages & more'].map((t) => `<span>${t}</span>`).join('')}</div><div class="ch-arrow" aria-hidden="true">→</div><div class="ch-flow-mid"><b>Instant reply</b><span class="small">in your name, under a minute</span></div><div class="ch-arrow" aria-hidden="true">→</div><div class="ch-flow-out"><b>One lead list</b><span class="small">scored, tracked, downloadable</span></div></section>`;

  const fb = card('Facebook & Instagram', 'Lead ad forms land here instantly. Instagram and Messenger DMs get an automatic reply inside the chat.', on(cs.facebook),
    `${cs.facebook ? `<p class="small" style="margin:0">Page: <b>${esc(cs.meta_page_name || '')}</b>${cs.instagram ? ` · Instagram: <b>@${esc(cs.meta_ig_username || '')}</b>` : ' · <span class="muted">No Instagram account linked to this Page</span>'}</p>` : `<p class="small muted" style="margin:0">${isAgency() ? 'Add the client’s Facebook Page below.' : 'We connect this for you. Give us admin access to your Facebook Page in Onboarding.'}</p>`}
    ${isAgency() ? `<form id="metaForm" class="ch-form" novalidate>
      <div class="two">${F('Facebook Page ID', 'meta_page_id', 'text', `inputmode="numeric" value="${esc(cn.meta_page_id || '')}" placeholder="e.g. 1029384756"`)}<label class="lab">Page access token<span class="small muted">${cn.meta_page_token ? 'Saved. Paste a new one to replace it.' : 'Long-lived Page token from your Meta app.'}</span><input class="field" name="meta_page_token" type="password" autocomplete="off" placeholder="${cn.meta_page_token ? '••••••••' : 'Paste token'}"></label></div>
      <fieldset class="rp-ch"><legend class="lab">Use it for</legend><label><input type="checkbox" name="lead_ads" ${cn.lead_ads !== false ? 'checked' : ''}> Lead ad forms</label><label><input type="checkbox" name="dms" ${cn.dms !== false ? 'checked' : ''}> Auto-reply to DMs</label></fieldset>
      <div class="row" style="gap:8px"><button class="btn btn-navy" type="submit">Save</button><button class="btn btn-ghost" type="button" data-act="metaCheck">Connect & check</button></div></form>
      <details><summary class="small" style="font-weight:700;cursor:pointer">Meta app settings (one time, for all clients)</summary><p class="small muted">Webhook callback URL and fields for your Meta app. Subscribe the Page object to <b>leadgen</b> and <b>messages</b>, and the Instagram object to <b>messages</b>.</p>${copy('Callback URL', fn + '/meta')}</details>` : ''}`);

  const web = card('Website form & chat button', 'Your website enquiry form and the “Text us” button.', on(L.some((l) => /website|chat/i.test(l.source || ''))),
    `<details><summary class="small" style="font-weight:700;cursor:pointer">“Text us” chat button</summary><p class="small muted">Paste just before &lt;/body&gt; on the website.</p><pre class="rp-code">${esc(`<script src="https://brightfrontstudio.com/widget.js" data-key="${key}" data-name="${r.business_name || ''}" data-color="${r.brand_color || '#0B0B2E'}" async></script>`)}</pre></details>
    <details><summary class="small" style="font-weight:700;cursor:pointer">Form address</summary>${copy('Send the website form here', `${fn}/intake?key=${key}`)}</details>`);

  const em = card('Email enquiries', 'Forward enquiry emails here. Each one becomes a lead and gets a reply. Website form notifications are read too.', on(!!cs.inbound_email),
    `${cs.inbound_email ? `<p class="small" style="margin:0">Forwarding address: <b>${esc(cs.inbound_email)}</b>. When leads reply to the assistant’s email, it answers them too.</p>` : ''}
    ${isAgency() ? `<form id="emailForm" class="ch-form" novalidate>${F('Inbound address (from Postmark, Mailgun or Cloudflare)', 'inbound_email', 'email', `value="${esc(cn.inbound_email || '')}" placeholder="abc123@inbound.postmarkapp.com"`)}<button class="btn btn-navy" type="submit" style="align-self:flex-start">Save</button></form>
    <details><summary class="small" style="font-weight:700;cursor:pointer">Inbound webhook</summary><p class="small muted">Point the inbound email service’s webhook here. It’s unique to this business.</p>${copy('Webhook URL', `${fn}/email?key=${key}`)}</details>` : `<p class="small muted" style="margin:0">${cs.inbound_email ? 'Set your inbox to forward new enquiries to the address above.' : 'We’ll give you an address to forward enquiries to.'}</p>`}`);

  const sms = card('Text messages', 'Leads who text your business number get an instant reply.', on(!!r.sms_number), `<p class="small muted" style="margin:0">${r.sms_number ? `Your number: <b>${esc(r.sms_number)}</b>` : 'Turns on once your business sending number is set up.'}</p>`);

  const hook = card('Zapier, Make, Hipages & any other tool', 'One link that accepts leads from anywhere. Names, phones and emails are matched automatically, whatever the fields are called.', on(L.some((l) => !/website|chat|email|text|sms|test|instagram dm|messenger|lead ad/i.test(l.source || '') && l.source)),
    `${copy('Lead link', `${fn}/hook?key=${key}&source=Zapier`)}
    <p class="small muted" style="margin:0">Change <b>source=Zapier</b> to the tool’s name (e.g. <b>source=Hipages</b>) so you can see where each lead came from. In Zapier: <b>Webhooks by Zapier → POST</b>, payload type <b>JSON</b>. In Make: <b>HTTP → Make a request</b>. Google Ads lead forms: paste this link as the webhook URL.</p>`);

  const db = `<article class="card ch-card"><div class="card-head"><div><h2>Your lead database</h2><p class="small muted" style="margin:4px 0 0">Every lead from every channel, in one place.</p></div><button class="btn btn-ghost btn-sm" data-act="csvLeads">${ic('down', 14)} Download CSV</button></div>
    ${bySrc.length ? `<ul class="list">${bySrc.slice(0, 8).map(([k, n]) => `<li class="row" style="justify-content:space-between"><span>${esc(k)}</span><b>${n}</b></li>`).join('')}</ul>` : '<p class="empty">No leads yet.</p>'}
    <button type="button" class="btn btn-ghost btn-sm" data-go="leads" style="align-self:flex-start">Open leads & pipeline</button></article>`;

  return head('Leads', 'Connections', 'Every place your leads come from, feeding one inbox and one lead list.') + flow + `<section class="grid g2 ch-grid" style="margin-top:16px;align-items:start">${fb}${web}${em}${hook}${sms}${db}</section>`;
};

function analytics(d) {
  const L = d.leads || [], C = d.calls || [], cr = d.creatives || [], M = d.metrics || [];
  const replied = L.filter((l) => l.first_reply_seconds != null);
  const avgReply = replied.length ? replied.reduce((a, l) => a + l.first_reply_seconds, 0) / replied.length : null;
  const under = replied.length ? Math.round((100 * replied.filter((l) => l.first_reply_seconds <= 60).length) / replied.length) : null;
  const spoke = new Set(C.filter((c) => c.outcome !== 'no_answer' && c.outcome !== 'wrong_number').map((c) => c.lead_id || c.lead_name)).size;
  const funnel = [
    { label: 'Enquiries', value: L.length },
    { label: 'Answered in under a minute', value: replied.filter((l) => l.first_reply_seconds <= 60).length },
    { label: 'Spoken to by our team', value: spoke },
    { label: 'Qualified', value: L.filter((l) => scoreOf(l) >= 50).length },
    { label: 'Booked', value: L.filter((l) => ['booked', 'won'].includes(l.status)).length },
    { label: 'Won', value: L.filter((l) => l.status === 'won').length }
  ];
  const bySrc = Object.entries(L.reduce((a, l) => ((a[l.source || 'Other'] = (a[l.source || 'Other'] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  const cpl = M.filter((m) => m.leads).map((m) => ({ label: fmtDate(m.week_start, { day: 'numeric', month: 'numeric' }), value: Math.round((m.ad_spend / m.leads) * 100) / 100 }));
  const byCh = Object.values(cr.reduce((a, c) => { const k = c.channel; a[k] ||= { label: k, spend: 0, leads: 0 }; a[k].spend += +c.spend || 0; a[k].leads += +c.leads || 0; return a; }, {})).map((x) => ({ label: x.label, value: x.leads ? Math.round(x.spend / x.leads) : 0, sub: `${x.leads} leads from ${money0(x.spend)}` })).sort((a, b) => a.value - b.value);
  return `
    <section class="grid g2" style="margin-top:16px">
      <div class="card"><div class="card-head"><h2>Lead funnel</h2><span class="small muted">From enquiry to sale</span></div>${hBars(funnel)}</div>
      <div class="card"><div class="card-head"><h2>Speed to lead</h2><span class="small muted">How fast every lead heard back</span></div>
        <div class="row" style="gap:28px;align-items:flex-end;margin-bottom:16px"><div class="kpi"><span class="lab">Average first reply</span><span class="val">${secs(avgReply)}</span></div><div class="kpi"><span class="lab">Answered within a minute</span><span class="val">${under == null ? '—' : under + '%'}</span></div></div>
        <p class="small muted" style="margin:0 0 10px">Leads by where they came from</p>${hBars(bySrc)}</div>
    </section>
    <section class="grid g2" style="margin-top:16px">
      <div class="card"><div class="card-head"><h2>Cost per lead</h2><span class="small muted">Per week</span></div>${lineChart(cpl, (v) => '$' + Math.round(v), { label: 'Cost per lead by week' })}</div>
      <div class="card"><div class="card-head"><h2>Cost per lead by channel</h2><button class="btn btn-ghost btn-sm" data-go="ads">See ads</button></div>${hBars(byCh, (v) => '$' + v)}</div>
    </section>`;
}
function leadProfile(id) {
  const l = state.data.leads.find((x) => x.id === id); if (!l) return;
  const calls = (state.data.calls || []).filter((c) => c.lead_id === id || c.lead_name === l.name);
  const dlg = document.createElement('dialog'); dlg.className = 'profile';
  dlg.innerHTML = `<form method="dialog" novalidate>
    <div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><div><h2>${esc(l.name)}</h2><span class="small muted">${esc(l.source || '')}${l.enquiry ? ' · ' + esc(l.enquiry) : ''} · ${fmtDate(l.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>${pill(heat(scoreOf(l)))}</div>
    <div class="pf-grid">
      <div><span class="lab">Score</span><b>${scoreOf(l)}/100</b></div><div><span class="lab">Value</span><b>${l.value ? money0(l.value) : '—'}</b></div><div><span class="lab">First reply</span><b>${secs(l.first_reply_seconds)}</b></div><div><span class="lab">Stage</span><b>${esc(PILL[l.status]?.[0] || l.status)}</b></div>
    </div>
    <div class="pf-contact">${l.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(l.phone)}">${ic('phone', 15)} ${esc(l.phone)}</a>` : ''}${l.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : ''}</div>
    ${l.message ? `<p class="pf-msg">“${esc(l.message)}”</p>` : ''}
    ${isAgency() ? `<div class="two">${F('Score (0–100)', 'score', 'number', `min="0" max="100" value="${l.score ?? ''}"`)}${F('Deal value ($)', 'value', 'number', `min="0" step="1" value="${l.value ?? ''}"`)}</div>` : ''}
    <label class="lab">Notes<textarea class="field" name="notes" maxlength="4000" placeholder="Anything worth remembering about this lead">${esc(l.notes || '')}</textarea></label>
    <h3 style="font-size:15px;margin-top:4px">Calls</h3>
    ${calls.length ? `<ul class="list">${calls.map((c) => `<li><div><b>${pill(c.outcome)}</b> <span class="small muted">${fmtDT(c.called_at)}${c.caller ? ' · ' + esc(c.caller) : ''}</span>${c.notes ? `<div class="small">${esc(c.notes)}</div>` : ''}</div></li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">No calls logged yet.</p>'}
    <div class="dlg-acts"><button class="btn btn-ghost" type="button" data-x>Close</button><button class="btn btn-pink" type="submit">Save</button></div></form>`;
  document.body.appendChild(dlg); dlg.showModal();
  dlg.querySelector('[data-x]').onclick = () => dlg.close(); dlg.addEventListener('close', () => dlg.remove());
  dlg.querySelector('form').onsubmit = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const o = { notes: f.notes.trim() || null }; if (isAgency()) { o.score = f.score === '' ? null : Math.max(0, Math.min(100, +f.score)); o.value = f.value === '' ? null : +f.value; } try { await api.setLeadFields(id, o); toast('Saved'); dlg.close(); reload(); } catch (err) { toast(err.message); } };
}
function leadTable(leads, editable) {
  if (!leads.length) return '<p class="empty">No leads yet. They’ll show up here as soon as they come in.</p>';
  return `<div class="tbl-wrap"><table><thead><tr><th scope="col">Name</th><th scope="col">Source</th><th scope="col">Enquiry</th><th scope="col">Date</th><th scope="col">Status</th></tr></thead><tbody>${leads.map((l) => `<tr><td><button type="button" class="linkbtn" data-lead-open="${esc(l.id)}">${esc(l.name)}</button></td><td class="muted">${esc(l.source || '')}</td><td class="muted">${esc(l.enquiry || '')}</td><td class="muted">${fmtDate(l.created_at)}</td><td>${editable ? `<label class="sr" for="ls-${esc(l.id)}">Status for ${esc(l.name)}</label><select id="ls-${esc(l.id)}" class="field" style="min-height:36px;padding:4px 8px;width:auto" data-lead="${esc(l.id)}">${['new', 'follow_up', 'booked', 'won', 'lost'].map((k) => `<option value="${k}" ${l.status === k ? 'selected' : ''}>${PILL[k][0]}</option>`).join('')}</select>` : pill(l.status)}</td></tr>`).join('')}</tbody></table></div>`;
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
  refreshReplies: () => reload(),
  async csvLeads() { try { const rows = await api.allLeads(state.clientId); if (!rows.length) return toast('No leads to download yet.'); downloadCsv(rows, `${slug(client()?.name)}-leads-${today()}.csv`); toast(`Downloaded ${rows.length} lead${rows.length === 1 ? '' : 's'}.`); } catch (e) { toast(e.message); } },
  async csvAll() { try { const rows = await api.everyLead(); if (!rows.length) return toast('No leads yet.'); downloadCsv(rows, `brightfront-all-leads-${today()}.csv`, true); toast(`Downloaded ${rows.length} leads.`); } catch (e) { toast(e.message); } },
  async metaCheck() { toast('Checking with Facebook…'); try { const r = await api.metaConnect(state.clientId); toast(`Connected: ${r.page}${r.instagram ? ' + @' + r.instagram : ''}`); reload(); } catch (e) { toast(e.message); } },
  addCall: () => dialog('Log a call', `<label class="lab">Lead<select class="field" name="lead">${state.data.leads.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('')}<option value="">Someone else</option></select></label>${F('Name (if someone else)', 'lead_name')}<div class="two"><label class="lab">Outcome<select class="field" name="outcome">${['booked', 'sold', 'callback', 'no_answer', 'not_interested', 'wrong_number'].map((k) => `<option value="${k}">${PILL[k][0]}</option>`).join('')}</select></label>${F('Length (minutes)', 'mins', 'number', 'min="0" step="0.5"')}</div>${F('Caller', 'caller', 'text', `value="${esc((state.me.full_name || '').split(' ')[0])}"`)}<label class="lab">Notes<textarea class="field" name="notes"></textarea></label>`,
    async (o) => { const l = state.data.leads.find((x) => x.id === o.lead); await api.addCall(state.clientId, { lead_id: l ? l.id : null, lead_name: l ? l.name : o.lead_name, outcome: o.outcome, duration_seconds: Math.round((+o.mins || 0) * 60), caller: o.caller, notes: o.notes }); if (l && ['booked', 'sold'].includes(o.outcome)) await api.setLead(l.id, o.outcome === 'sold' ? 'won' : 'booked'); }),
  addReview: () => dialog('Add a review', `<div class="two">${F('Customer', 'author', 'text', 'required')}<label class="lab">Platform<select class="field" name="platform"><option>Google</option><option>Facebook</option></select></label></div><label class="lab">Stars<select class="field" name="rating">${[5, 4, 3, 2, 1].map((n) => `<option>${n}</option>`).join('')}</select></label><label class="lab">Review<textarea class="field" name="body"></textarea></label>`, (o) => api.addReview(state.clientId, { author: o.author, platform: o.platform, rating: +o.rating, body: o.body })),
  addCreative: () => dialog('Add an ad', `<div class="two"><label class="lab">Channel<select class="field" name="channel"><option>Meta</option><option>Instagram</option><option>Google</option><option>TikTok</option><option>Billboard</option></select></label><label class="lab">Status<select class="field" name="status"><option value="live">Live</option><option value="paused">Paused</option><option value="ended">Ended</option></select></label></div>${F('Ad name', 'title', 'text', 'required')}${F('Image link (or upload below)', 'image_url', 'url', 'placeholder="https://…"')}<label class="lab">Upload image<input class="field" name="file" type="file" accept="image/*"></label><div class="two">${F('Spend ($)', 'spend', 'number', 'min="0" step="0.01"')}${F('Leads', 'leads', 'number', 'min="0"')}</div><div class="two">${F('Impressions', 'impressions', 'number', 'min="0"')}${F('Clicks', 'clicks', 'number', 'min="0"')}</div>`,
    (o) => api.addCreative(state.clientId, { channel: o.channel, status: o.status, title: o.title, image_url: o.image_url || null, spend: +o.spend || 0, leads: +o.leads || 0, impressions: +o.impressions || 0, clicks: +o.clicks || 0 }, o.file && o.file.size ? o.file : null)),
  async draftReport() { const m = new Date(); const month = new Date(m.getFullYear(), m.getMonth(), 1).toISOString().slice(0, 10); toast('Drafting with AI…'); try { const r = await api.draftReport(state.clientId, month); await api.saveReport(state.clientId, { ...r, month, status: 'draft' }); toast('Draft ready. Check it, then publish.'); state.openReport = null; reload(); } catch (e) { toast(e.message); } },
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
  $app.querySelectorAll('[data-rtab]').forEach((b) => b.onclick = () => { state.replyTab = b.dataset.rtab; render(); });
  $app.querySelectorAll('[data-conv]').forEach((b) => b.onclick = async () => { state.convId = b.dataset.conv; state.msgs = await api.messages(state.convId); render(); scrollMsgs(); });
  $app.querySelectorAll('[data-convst]').forEach((b) => b.onclick = async () => { try { await api.setConv(state.convId, b.dataset.convst); toast(b.dataset.convst === 'human' ? 'You’ve taken over. The assistant won’t reply.' : b.dataset.convst === 'ai' ? 'The assistant will reply to their next message.' : 'Conversation closed.'); reload(); } catch (e) { toast(e.message); } });
  $app.querySelectorAll('[data-replyon]').forEach((b) => b.onclick = async () => { const r = state.data.reply; if (!r?.client_id) { state.replyTab = 'settings'; render(); return toast('Save your settings first.'); } try { await api.saveReply(state.clientId, { enabled: b.dataset.replyon === '1' }); toast(b.dataset.replyon === '1' ? 'Replies are on. New leads get a reply within a minute.' : 'Replies paused.'); reload(); } catch (e) { toast(e.message); } });
  const rs = document.getElementById('rpSettings');
  rs && (rs.onsubmit = async (e) => { e.preventDefault(); const bad = [...rs.querySelectorAll('[required],[type=url],[type=email]')].find((i) => !i.checkValidity()); if (bad) return bad.reportValidity(); const fd = Object.fromEntries(new FormData(rs)); const o = { business_name: fd.business_name.trim(), tone: fd.tone, about: fd.about.trim(), questions: fd.questions.trim(), booking_url: fd.booking_url.trim() || null, hours: fd.hours.trim() || null, handoff_email: fd.handoff_email.trim(), handoff_phone: fd.handoff_phone.trim() || null, sms_enabled: !!fd.sms_enabled, email_enabled: !!fd.email_enabled, assistant_name: fd.assistant_name.trim() || null, sign_off: fd.sign_off.trim() || null, brand_color: fd.brand_color, website: fd.website.trim() || null, logo_url: fd.logo_url.trim() || null, review_url: fd.review_url.trim() || null }; if (isAgency()) { o.sms_number = (fd.sms_number || '').replace(/\s/g, '') || null; o.email_from = (fd.email_from || '').trim() || null; } try { await api.saveReply(state.clientId, o); toast('Saved. Your assistant will use this from the next lead.'); state.replyTab = 'connect'; reload(); } catch (err) { toast(err.message); } });
  if (rs) {
    const upd = () => { const f = Object.fromEntries(new FormData(rs)); const col = f.brand_color || '#0B0B2E'; const h = document.getElementById('rpPrevH'); h.style.background = f.logo_url ? '#fff' : col; h.style.borderBottom = '4px solid ' + col; h.innerHTML = ''; if (/^https:\/\//.test(f.logo_url || '')) { const im = new Image(); im.src = f.logo_url; im.alt = ''; im.style.cssText = 'max-height:34px;max-width:180px'; h.appendChild(im); } else { h.textContent = f.business_name || 'Your business'; } document.getElementById('rpColTxt').textContent = col; const who = f.assistant_name ? `${f.assistant_name}, ${f.business_name}’s automated assistant` : `${f.business_name || 'your business'}’s automated assistant`; document.getElementById('rpPrevT').textContent = `Hi Sarah, thanks for getting in touch. I’m ${who}. ${(f.questions || 'What are you looking for?').split('\n')[0]}\n\n${f.sign_off || f.assistant_name || f.business_name || ''}`; document.getElementById('rpPrevBtn').style.background = col; document.getElementById('rpPrevBtn').style.display = f.booking_url ? '' : 'none'; document.getElementById('rpPrevF').textContent = `${f.business_name || ''}${f.website ? ' · ' + f.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''}`; };
    rs.addEventListener('input', upd); upd();
  }
  const rt = document.getElementById('rpTest');
  rt && (rt.onsubmit = async (e) => { e.preventDefault(); const fd = Object.fromEntries(new FormData(rt)); if (!fd.phone && !fd.email) return toast('Add a mobile or an email.'); const btn = rt.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…'; try { await api.testLead(state.clientId, fd); toast('Test sent. Check your phone or inbox.'); state.replyTab = 'inbox'; state.convId = null; reload(); } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Send test'; } });
  const rsend = document.getElementById('rpSend');
  rsend && (rsend.onsubmit = async (e) => { e.preventDefault(); const body = rsend.body.value.trim(); if (!body) return rsend.body.focus(); const btn = rsend.querySelector('[type=submit]'); btn.disabled = true; try { await api.sendMsg(state.convId, body); toast('Sent'); reload().then(scrollMsgs); } catch (err) { toast(err.message); btn.disabled = false; } });
  scrollMsgs();
  $app.querySelectorAll('[data-lead-open]').forEach((b) => b.onclick = () => leadProfile(b.dataset.leadOpen));
  $app.querySelectorAll('[data-leadmode]').forEach((b) => b.onclick = () => { state.leadMode = b.dataset.leadmode; render(); });
  $app.querySelectorAll('[data-adsort]').forEach((b) => b.onclick = () => { state.adSort = b.dataset.adsort; render(); });
  $app.querySelectorAll('[data-report]').forEach((b) => b.onclick = () => { state.openReport = b.dataset.report; render(); });
  $app.querySelectorAll('[data-publish]').forEach((b) => b.onclick = async () => { const r = state.data.reports.find((x) => (x.id || x.month) === b.dataset.publish); try { await api.saveReport(state.clientId, { ...r, status: 'published' }); toast('Published. Your client can see it now.'); reload(); } catch (e) { toast(e.message); } });
  $app.querySelectorAll('[data-editreport]').forEach((b) => b.onclick = () => { const r = state.data.reports.find((x) => (x.id || x.month) === b.dataset.editreport); dialog('Edit report', `${F('Headline', 'headline', 'text', `value="${esc(r.headline || '')}"`)}<label class="lab">What happened<textarea class="field" name="happened">${esc(r.happened || '')}</textarea></label><label class="lab">What’s working<textarea class="field" name="working">${esc(r.working || '')}</textarea></label><label class="lab">What we’re doing next<textarea class="field" name="next">${esc(r.next || '')}</textarea></label>`, (o) => api.saveReport(state.clientId, { ...r, ...o })); });
  const inv = document.getElementById('invForm');
  inv && (inv.onsubmit = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(inv)); if (!f.name.trim()) return inv.name.reportValidity(); if (!f.phone && !f.email) return toast('Add a mobile or an email.'); const btn = inv.querySelector('[type=submit]'); btn.disabled = true; try { await api.sendReviewInvite(state.clientId, f); toast('Review request sent.'); reload(); } catch (err) { toast(err.message); btn.disabled = false; } });
  $app.querySelectorAll('.rvForm').forEach((f) => f.onsubmit = async (e) => { e.preventDefault(); const t = f.reply.value.trim(); if (!t) return f.reply.focus(); try { await api.replyReview(f.dataset.review, t); toast('Reply saved. Paste it into Google or Facebook to post it.'); reload(); } catch (err) { toast(err.message); } });
  $app.querySelectorAll('[data-draft]').forEach((b) => b.onclick = async () => { b.disabled = true; b.textContent = 'Drafting…'; try { const r = await api.draftReviewReply(b.dataset.draft); const ta = document.getElementById('rv-' + b.dataset.draft); ta.value = r.reply; ta.focus(); } catch (err) { toast(err.message); } b.disabled = false; b.innerHTML = ic('bolt', 14) + ' Draft with AI'; });
  $app.querySelectorAll('[data-copy]').forEach((b) => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast('Copied'); } catch { b.previousElementSibling?.select(); toast('Press Cmd+C to copy'); } });
  const mf = document.getElementById('metaForm');
  mf && (mf.onsubmit = async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(mf)); const id = f.meta_page_id.trim(); if (id && !/^\d{5,25}$/.test(id)) return toast('The Page ID is a number, e.g. 1029384756.'); const o = { meta_page_id: id || null, lead_ads: !!f.lead_ads, dms: !!f.dms }; if (f.meta_page_token.trim()) o.meta_page_token = f.meta_page_token.trim(); try { await api.saveConn(state.clientId, o); toast('Saved. Now click Connect & check.'); reload(); } catch (err) { toast(/duplicate|unique/i.test(err.message) ? 'That Page is already connected to another client.' : err.message); } });
  const ef = document.getElementById('emailForm');
  ef && (ef.onsubmit = async (e) => { e.preventDefault(); const v = ef.inbound_email.value.trim(); if (v && !ef.inbound_email.checkValidity()) return ef.inbound_email.reportValidity(); try { await api.saveConn(state.clientId, { inbound_email: v || null }); toast('Saved'); reload(); } catch (err) { toast(err.message); } });
  if (state.view === 'overview') fillOverview();
}
function scrollMsgs() { const m = document.getElementById('rpMsgs'); if (m) m.scrollTop = m.scrollHeight; }

if (LIVE) sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') renderLogin(); if (ev === 'PASSWORD_RECOVERY') { const p = prompt('Enter a new password (8+ characters)'); if (p) sb.auth.updateUser({ password: p }).then(() => toast('Password updated')); } });
boot();
