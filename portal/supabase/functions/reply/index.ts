// brightfront Reply: AI lead replies (Supabase Edge Function "reply")
//
// Routes (all POST):
//   /reply/intake  public   new lead from a website form, Meta via Zapier, etc. Needs the client's intake key.
//   /reply/sms     public   Twilio "a message comes in" webhook. Checked with the Twilio signature.
//   /reply/send    signed-in portal users: send a message by hand, or run a test lead.
//   /reply/hook    public   universal lead catcher (Zapier, Make, Hipages, Google lead forms, any form). ?key=INTAKE_KEY&source=Name
//   /reply/meta    public   Meta webhook: Facebook/Instagram lead ads + Messenger/Instagram DMs. Checked with the app secret.
//   /reply/email   public   inbound email (Postmark, Mailgun, SendGrid, Cloudflare). ?key=INTAKE_KEY
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   ANTHROPIC_API_KEY             required
//   TWILIO_ACCOUNT_SID            for SMS
//   TWILIO_AUTH_TOKEN             for SMS
//   SMTP_PASS                     for email (the info@brightfrontstudio.com mailbox password)
//   META_APP_SECRET, META_VERIFY_TOKEN   for Facebook/Instagram
//   optional: RESEND_API_KEY (send from each client's own domain), AI_MODEL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_FROM, TWILIO_FROM
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const AI_MODEL = env("AI_MODEL", "claude-haiku-5-5");
const FN_URL = `${env("SUPABASE_URL")}/functions/v1/reply`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const twiml = () => new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });

/* ---------- helpers ---------- */
function auPhone(p?: string | null): string | null {
  if (!p) return null;
  let s = String(p).replace(/[^\d+]/g, "");
  if (s.startsWith("+")) return s.length >= 10 ? s : null;
  if (s.startsWith("61")) return "+" + s;
  if (s.startsWith("0")) return "+61" + s.slice(1);
  if (s.length === 9 && s.startsWith("4")) return "+61" + s;
  return null;
}
const validEmail = (e?: string | null) => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
const STOP = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|opt ?out)\s*[.!]*\s*$/i;

async function readBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await req.json().catch(() => ({}));
  const f = await req.formData().catch(() => null);
  const o: Record<string, string> = {};
  f?.forEach((v, k) => (o[k] = String(v)));
  return o;
}

/* ---------- lead field mapping (any form, any tool) ---------- */
const norm = (k: string) => String(k).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
function flatten(o: any, out: Record<string, string> = {}): Record<string, string> {
  if (Array.isArray(o)) {
    for (const it of o) {
      if (it && typeof it === "object" && "name" in it && ("values" in it || "value" in it)) {
        const k = norm(it.name); if (!(k in out)) out[k] = Array.isArray(it.values) ? it.values.join(", ") : String(it.value ?? "");
      } else flatten(it, out);
    }
  } else if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === "object") flatten(v, out);
      else if (v != null && v !== "") { const nk = norm(k); if (!(nk in out)) out[nk] = String(v); }
    }
  }
  return out;
}
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?61|0)[\s-]?4(?:[\s-]?\d){8}|(?:\+?61|0)[\s-]?[2378](?:[\s-]?\d){8}/;
const NAME_KEYS = ["full_name", "name", "your_name", "contact_name", "customer_name", "fullname", "client_name"];
const PHONE_KEYS = ["phone", "phone_number", "mobile", "mobile_number", "mobile_phone", "contact_number", "telephone", "tel", "cell", "your_phone"];
const EMAIL_KEYS = ["email", "email_address", "your_email", "e_mail", "contact_email"];
const MSG_KEYS = ["message", "your_message", "comments", "comment", "enquiry_message", "description", "job_description", "details", "notes", "question", "body", "text"];
const ENQ_KEYS = ["service", "services", "enquiry", "enquiry_type", "job_type", "category", "interested_in", "product", "trade", "subject"];
const SKIP = new Set(["key", "source", "website", "page", "_redirect", "redirect", "form_id", "ad_id", "adset_id", "campaign_id", "created_time", "id", "leadgen_id", "page_id", "platform", "is_organic"]);
function pick(f: Record<string, string>, keys: string[], contains?: string) {
  for (const k of keys) if (f[k]) return f[k];
  if (contains) for (const [k, v] of Object.entries(f)) if (k.includes(contains) && v) return v;
  return "";
}
function mapLead(raw: any) {
  const f = flatten(raw);
  let name = pick(f, NAME_KEYS) || [f.first_name || f.firstname || f.given_name, f.last_name || f.lastname || f.surname || f.family_name].filter(Boolean).join(" ");
  let email = pick(f, EMAIL_KEYS, "email"); if (!validEmail(email)) email = (Object.values(f).join(" ").match(EMAIL_RE) || [""])[0];
  let phone = pick(f, PHONE_KEYS, "phone") || pick(f, [], "mobile"); if (!auPhone(phone)) phone = (Object.values(f).join(" ").match(PHONE_RE) || [""])[0];
  const message = pick(f, MSG_KEYS, "message");
  const enquiry = pick(f, ENQ_KEYS);
  const used = new Set([...NAME_KEYS, ...PHONE_KEYS, ...EMAIL_KEYS, ...MSG_KEYS, ...ENQ_KEYS, "first_name", "last_name", "firstname", "lastname", "given_name", "surname", "family_name"]);
  const extra = Object.entries(f).filter(([k, v]) => !used.has(k) && !SKIP.has(k) && !k.startsWith("_") && v && String(v).length < 300 && !EMAIL_RE.test(String(v)))
    .slice(0, 12).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join("\n");
  return { name: clip(name, 120), email, phone, message: clip([message, extra && "Other details:\n" + extra].filter(Boolean).join("\n\n"), 2000), enquiry: clip(enquiry, 120) };
}
// "Name: Sam\nPhone: 04..." lines from website form notification emails
function fieldsFromText(t: string) {
  const o: Record<string, string> = {};
  for (const line of t.split(/\r?\n/)) { const m = line.match(/^\s*\**([A-Za-z][A-Za-z ()'/-]{1,30}?)\**\s*[:\-]\s*(.+)$/); if (m) { const k = norm(m[1]); if (!(k in o)) o[k] = m[2].trim(); } }
  return o;
}

/* ---------- connections (Meta pages, inbound email) ---------- */
const GRAPH = "https://graph.facebook.com/v21.0";
async function getConn(clientId: string) {
  const { data } = await db.from("connections").select("*").eq("client_id", clientId).maybeSingle();
  return data as Record<string, any> | null;
}
async function graph(path: string, token: string, init?: RequestInit) {
  const r = await fetch(`${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`Meta: ${j.error?.message || r.status}`);
  return j;
}
async function sendDm(token: string, to: string, body: string) {
  await graph("me/messages", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: to }, messaging_type: "RESPONSE", message: { text: body.slice(0, 1000) } }) });
}
const isDm = (ch: string) => ch === "messenger" || ch === "instagram";
const CH_LABEL: Record<string, string> = { sms: "Mobile", email: "Email", messenger: "Facebook Messenger", instagram: "Instagram DM" };

/* ---------- AI ---------- */
type Settings = Record<string, any>;
type Turn = { sender: string; body: string };

function systemPrompt(s: Settings, channel: string, first: boolean) {
  const who = s.assistant_name ? `${s.assistant_name}, ${s.business_name || "the business"}'s automated assistant` : `${s.business_name || "the business"}'s automated assistant`;
  return `You reply to new enquiries for ${s.business_name || "a local business"} in Australia. You are ${who}, not a person. Write as the business: never mention any agency, software or AI company.

ABOUT THE BUSINESS (only facts you may use):
${s.about || "(no details given)"}

QUESTIONS TO ASK, one at a time, skipping any already answered:
${s.questions || "What are you looking for, and when?"}

BOOKING LINK: ${s.booking_url || "none. Say a team member will be in touch to book a time."}
WHEN A PERSON FOLLOWS UP: ${s.hours || "during business hours"}
TONE: ${s.tone || "Warm, friendly and to the point"}

RULES
- Australian English. Plain words. No emojis unless the lead uses them first.
- ${channel === "sms" ? "SMS: keep each reply under 300 characters. No sign-off." : isDm(channel) ? `${channel === "instagram" ? "Instagram" : "Facebook Messenger"} direct message: casual and short, under 400 characters, no sign-off. If you need to book them in, ask for their mobile or email.` : `Email: 3 to 6 short sentences, no subject line. Sign off as: ${s.sign_off || s.assistant_name || s.business_name || "the team"}.`}
- ${first ? `This is the first message. Say you're ${who}, thank them for getting in touch, and ask the first question.${channel === "sms" ? ' End with: "Reply STOP to opt out."' : ""}` : "Continue the conversation. Do not re-introduce yourself."}
- Ask one question at a time. Never ask for card, bank or ID details.
- Never invent prices, availability, results, guarantees or policies. If you don't know, say a team member will confirm.
- Offer the booking link once the lead has answered the questions or asks to book.
- Hand over to a person (handoff = true) if the lead asks for a person, is upset, raises anything legal, medical, financial or urgent, asks something you can't answer, or has answered all the questions.
- When handing over, tell them a team member will be in touch ${s.hours ? "(" + s.hours + ")" : "soon"}.

Reply with JSON only, no other text:
{"reply": "<message to send>", "handoff": true|false, "status": "new"|"follow_up"|"booked", "summary": "<one line for the business: who, what they want, when, any answers>"}`;
}

async function aiReply(s: Settings, channel: string, history: Turn[], lead: Record<string, any>) {
  const first = !history.some((t) => t.sender !== "lead");
  const context = `Lead details: name ${lead.name || "unknown"}; source ${lead.source || "unknown"}${lead.enquiry ? "; enquiry type " + lead.enquiry : ""}.`;
  const messages: { role: string; content: string }[] = [];
  const turns = history.length ? history : [{ sender: "lead", body: lead.message || "(They filled in an enquiry form with no message.)" }];
  for (const t of turns) {
    const role = t.sender === "lead" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    const content = t.sender === "lead" ? t.body : JSON.stringify({ reply: t.body });
    if (last && last.role === role) last.content += "\n" + content; else messages.push({ role, content });
  }
  if (messages[0]?.role !== "user") messages.unshift({ role: "user", content: "(New enquiry)" });
  messages[0].content = context + "\n\n" + messages[0].content;
  if (messages[messages.length - 1].role !== "user") messages.push({ role: "user", content: "(No new message. Write the next message.)" });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 500, system: systemPrompt(s, channel, first), messages }),
  });
  if (!r.ok) throw new Error(`AI error ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const text: string = (data.content || []).map((c: any) => c.text || "").join("").trim();
  let out: any;
  try { out = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { out = { reply: text, handoff: true, status: "follow_up", summary: "AI reply could not be read. Check this conversation." }; }
  let reply = clip(out.reply, channel === "sms" ? 480 : isDm(channel) ? 900 : 2000);
  if (channel === "sms" && first && !/STOP/i.test(reply)) reply += " Reply STOP to opt out.";
  return { reply, handoff: !!out.handoff, status: ["new", "follow_up", "booked"].includes(out.status) ? out.status : "follow_up", summary: clip(out.summary, 400) };
}


async function claude(system: string, user: string, max = 700) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: max, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`AI error ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const text: string = (data.content || []).map((c: any) => c.text || "").join("").trim();
  try { return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { return { text }; }
}

/* ---------- sending ---------- */
async function sendSms(from: string, to: string, body: string) {
  const sid = env("TWILIO_ACCOUNT_SID"), tok = env("TWILIO_AUTH_TOKEN");
  if (!sid || !tok) throw new Error("SMS isn't connected yet (Twilio keys missing).");
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${sid}:${tok}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  if (!r.ok) throw new Error(`SMS failed: ${(await r.text()).slice(0, 200)}`);
}

const safeColor = (c?: string | null) => (/^#[0-9a-f]{6}$/i.test(c || "") ? c : "#0B0B2E");
const escHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Branded email: the client's name, logo and colour. No agency branding anywhere.
function brandedHtml(text: string, b: Settings | null) {
  const body = text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${escHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
  if (!b) return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1A1A2E">${body}</div>`;
  const col = safeColor(b.brand_color), name = escHtml(b.business_name || "");
  const head = b.logo_url && /^https:\/\//.test(b.logo_url)
    ? `<img src="${escHtml(b.logo_url)}" alt="${name}" style="max-height:44px;max-width:220px;display:block">`
    : `<span style="font-size:20px;font-weight:700;color:#fff">${name}</span>`;
  const site = b.website && /^https?:\/\//.test(b.website) ? `<a href="${escHtml(b.website)}" style="color:${col}">${escHtml(b.website.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : "";
  return `<div style="background:#F4F4F7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:${b.logo_url ? "#fff" : col};padding:20px 28px;border-bottom:4px solid ${col}">${head}</td></tr>
<tr><td style="padding:26px 28px 10px;font-size:15px;line-height:1.6;color:#1A1A2E">${body}</td></tr>
${b.booking_url ? `<tr><td style="padding:0 28px 22px"><a href="${escHtml(b.booking_url)}" style="display:inline-block;background:${col};color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">Book a time</a></td></tr>` : ""}
<tr><td style="padding:16px 28px 22px;border-top:1px solid #EEE;font-size:12px;line-height:1.5;color:#777">${name}${site ? " · " + site : ""}<br>You're getting this because you contacted ${name}. Reply to this email to reach the team.</td></tr>
</table></div>`;
}

async function sendEmail(to: string, subject: string, text: string, fromName: string, replyTo?: string | null, brand: Settings | null = null) {
  const name = fromName.replace(/[<>"]/g, "");
  // Fully white-labelled: send from the client's own domain through Resend once their domain is verified there.
  if (brand?.email_from && validEmail(brand.email_from) && env("RESEND_API_KEY")) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${name} <${brand.email_from}>`, to: [to], subject, text, html: brandedHtml(text, brand), ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!r.ok) throw new Error(`Email failed: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  if (!env("SMTP_PASS")) throw new Error("Email isn't connected yet (SMTP password missing).");
  const user = env("SMTP_USER", "info@brightfrontstudio.com");
  const client = new SMTPClient({ connection: { hostname: env("SMTP_HOST", "smtp.titan.email"), port: Number(env("SMTP_PORT", "465")), tls: true, auth: { username: user, password: env("SMTP_PASS") } } });
  try {
    await client.send({ from: `${name} <${env("SMTP_FROM", user)}>`, to, subject, content: text, html: brandedHtml(text, brand), ...(replyTo ? { replyTo } : {}) });
  } finally { await client.close(); }
}

/* ---------- core ---------- */
async function addMsg(conv: any, direction: "in" | "out", sender: string, body: string, error?: string) {
  await db.from("messages").insert({ conversation_id: conv.id, client_id: conv.client_id, direction, sender, body, error: error || null });
  await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conv.id);
}

async function deliver(conv: any, s: Settings, body: string, sender: "ai" | "human") {
  try {
    if (conv.channel === "sms") await sendSms(s.sms_number || env("TWILIO_FROM"), conv.contact, body);
    else if (isDm(conv.channel)) {
      const c = await getConn(conv.client_id);
      if (!c?.meta_page_token) throw new Error("Facebook/Instagram isn't connected for this business.");
      await sendDm(c.meta_page_token, conv.contact, body);
    } else {
      const c = await getConn(conv.client_id).catch(() => null);
      const replyTo = validEmail(c?.inbound_email) ? c!.inbound_email : s.handoff_email; // replies come back to the assistant when inbound email is set up
      await sendEmail(conv.contact, `Thanks for getting in touch${s.business_name ? " with " + s.business_name : ""}`, body, s.assistant_name && s.business_name ? `${s.assistant_name} at ${s.business_name}` : s.business_name || "Enquiries", replyTo, s);
    }
    await addMsg(conv, "out", sender, body);
  } catch (e) {
    await addMsg(conv, "out", sender, body, String((e as Error).message || e));
    throw e;
  }
}

async function notifyHandoff(conv: any, s: Settings, lead: any, summary: string) {
  if (!validEmail(s.handoff_email)) return;
  const { data: msgs } = await db.from("messages").select("sender, body").eq("conversation_id", conv.id).order("created_at");
  const transcript = (msgs || []).map((m: any) => `${m.sender === "lead" ? lead?.name || "Lead" : m.sender === "ai" ? "Assistant" : "You"}: ${m.body}`).join("\n\n");
  const contact = isDm(conv.channel) ? `${CH_LABEL[conv.channel]}${lead?.phone ? " · Mobile: " + lead.phone : ""}${lead?.email ? " · Email: " + lead.email : ""}` : `${CH_LABEL[conv.channel] || "Contact"}: ${conv.contact}`;
  await sendEmail(s.handoff_email, `New lead ready for you: ${lead?.name || conv.contact}`,
    `${summary || "A lead needs a person."}\n\n${contact}\n\nConversation so far:\n\n${transcript}\n\nOpen your portal to reply or take over: https://brightfrontstudio.com/portal/`,
    `${s.business_name || "Your"} lead alerts`).catch(() => {});
}

async function respond(conv: any, s: Settings, lead: any) {
  const { data: hist } = await db.from("messages").select("sender, body").eq("conversation_id", conv.id).order("created_at");
  const out = await aiReply(s, conv.channel, (hist || []) as Turn[], lead || {});
  await deliver(conv, s, out.reply, "ai");
  const upd: Record<string, unknown> = { summary: out.summary || conv.summary };
  if (out.handoff) upd.status = "human";
  await db.from("conversations").update(upd).eq("id", conv.id);
  if (lead?.id && out.status !== "new") await db.from("leads").update({ status: out.status }).eq("id", lead.id);
  if (out.handoff) await notifyHandoff(conv, s, lead, out.summary);
  return out;
}

async function newLead(s: Settings, input: Record<string, string>) {
  const phone = auPhone(input.phone || input.mobile || input.phone_number);
  const email = validEmail(input.email) ? input.email.trim().toLowerCase() : null;
  const name = clip(input.name || input.full_name || [input.first_name, input.last_name].filter(Boolean).join(" ") || "New lead", 120);
  const message = clip(input.message || input.enquiry_message || input.comments, 2000);
  if (!phone && !email) return { ok: false, error: "A phone or email is needed." };

  // Skip duplicates sent twice in a row
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: dup } = await db.from("conversations").select("id").eq("client_id", s.client_id).in("contact", [phone, email].filter(Boolean) as string[]).gte("created_at", since).limit(1);
  if (dup?.length) return { ok: true, duplicate: true };

  if (input.external_id) {
    const { data: seen } = await db.from("leads").select("id").eq("client_id", s.client_id).eq("external_id", input.external_id).limit(1);
    if (seen?.length) return { ok: true, duplicate: true };
  }
  const { data: lead, error } = await db.from("leads").insert({
    client_id: s.client_id, name, phone, email, message,
    source: clip(input.source || "Website", 80), enquiry: clip(input.enquiry || input.service || "", 120), status: "new",
    ...(input.external_id ? { external_id: clip(input.external_id, 200) } : {}),
  }).select().single();
  if (error) throw error;

  if (!s.enabled) return { ok: true, lead_id: lead.id, replied: false };
  const channel = phone && s.sms_enabled && (s.sms_number || env("TWILIO_FROM")) ? "sms" : email && s.email_enabled ? "email" : null;
  if (!channel) return { ok: true, lead_id: lead.id, replied: false };

  const { data: conv } = await db.from("conversations").insert({ client_id: s.client_id, lead_id: lead.id, channel, contact: channel === "sms" ? phone : email }).select().single();
  if (message) await addMsg(conv, "in", "lead", message);
  try { await respond(conv, s, lead); await db.from("leads").update({ first_reply_seconds: Math.max(1, Math.round((Date.now() - new Date(lead.created_at).getTime()) / 1000)) }).eq("id", lead.id); } catch (e) { console.error(e); return { ok: true, lead_id: lead.id, replied: false, error: String((e as Error).message) }; }
  return { ok: true, lead_id: lead.id, replied: true, channel };
}

/* ---------- Twilio signature ---------- */
async function twilioValid(req: Request, params: Record<string, string>) {
  const sig = req.headers.get("x-twilio-signature"); const tok = env("TWILIO_AUTH_TOKEN");
  if (!sig || !tok) return false;
  const data = FN_URL + "/sms" + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(tok), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return btoa(String.fromCharCode(...mac)) === sig;
}

/* ---------- Meta: lead ads + DMs ---------- */
async function settingsFor(clientId: string) {
  const { data } = await db.from("reply_settings").select("*").eq("client_id", clientId).maybeSingle();
  return (data || { client_id: clientId, enabled: false }) as Settings;
}
async function metaLead(v: any) {
  const { data: c } = await db.from("connections").select("*").eq("meta_page_id", String(v.page_id)).maybeSingle();
  if (!c?.meta_page_token || c.lead_ads === false) return;
  const ld = await graph(`${v.leadgen_id}?fields=field_data,ad_name,campaign_name,form_id,platform`, c.meta_page_token);
  const m = mapLead({ field_data: ld.field_data || [] });
  const plat = String(ld.platform || "").toLowerCase() === "ig" ? "Instagram" : "Facebook";
  await newLead(await settingsFor(c.client_id), { ...m, enquiry: m.enquiry || clip(ld.ad_name || ld.campaign_name || "", 120), source: `${plat} lead ad`, external_id: `meta:${v.leadgen_id}` });
}
async function metaDm(object: string, entryId: string, m: any) {
  if (!m.message || m.message.is_echo || !m.sender?.id || m.sender.id === entryId) return;
  const channel = object === "instagram" ? "instagram" : "messenger";
  const { data: c } = await db.from("connections").select("*").eq(channel === "instagram" ? "meta_ig_id" : "meta_page_id", entryId).maybeSingle();
  if (!c?.meta_page_token) return;
  const s = await settingsFor(c.client_id);
  const psid = String(m.sender.id);
  const text = clip(m.message.text || (m.message.attachments?.length ? "(sent a photo or attachment)" : ""), 1600);
  if (!text) return;
  let { data: conv } = await db.from("conversations").select("*").eq("client_id", c.client_id).eq("channel", channel).eq("contact", psid).order("last_message_at", { ascending: false }).limit(1).maybeSingle();
  let lead: any = null;
  if (!conv) {
    let name = channel === "instagram" ? "Instagram user" : "Facebook user";
    try { const p = await graph(`${psid}?fields=name${channel === "instagram" ? ",username" : ""}`, c.meta_page_token); name = p.name || (p.username ? "@" + p.username : name); } catch { /* profile not available */ }
    const em = (text.match(EMAIL_RE) || [""])[0], ph = auPhone((text.match(PHONE_RE) || [""])[0]);
    ({ data: lead } = await db.from("leads").insert({ client_id: c.client_id, name: clip(name, 120), email: em || null, phone: ph, message: text, source: channel === "instagram" ? "Instagram DM" : "Facebook Messenger", status: "new", external_id: `${channel}:${psid}` }).select().single());
    ({ data: conv } = await db.from("conversations").insert({ client_id: c.client_id, lead_id: lead.id, channel, contact: psid }).select().single());
  } else {
    ({ data: lead } = conv.lead_id ? await db.from("leads").select("*").eq("id", conv.lead_id).maybeSingle() : { data: null });
    // Pick up a mobile or email they type in the chat
    if (lead) { const em = (text.match(EMAIL_RE) || [""])[0], ph = auPhone((text.match(PHONE_RE) || [""])[0]); const up: any = {}; if (em && !lead.email) up.email = em; if (ph && !lead.phone) up.phone = ph; if (Object.keys(up).length) await db.from("leads").update(up).eq("id", lead.id); }
  }
  await addMsg(conv, "in", "lead", text);
  if (conv.status === "ai" && s.enabled && s.dm_enabled !== false && c.dms !== false) {
    await respond(conv, s, lead);
    if (lead && lead.first_reply_seconds == null) await db.from("leads").update({ first_reply_seconds: Math.max(1, Math.round((Date.now() - new Date(lead.created_at).getTime()) / 1000)) }).eq("id", lead.id);
  } else if (conv.status === "human") await notifyHandoff(conv, s, lead, `${lead?.name || "A lead"} sent a new ${CH_LABEL[channel]} message: "${text}"`);
}

/* ---------- inbound email ---------- */
const BOT_FROM = /(no-?reply|do-?not-?reply|mailer-daemon|postmaster|wordpress|notifications?|forms?@|bounce)/i;
function addr(v: any) { const t = String(v?.Email || v?.email || v || ""); return ((t.match(EMAIL_RE) || [""])[0]).toLowerCase(); }
function nameOf(v: string) { const m = String(v || "").match(/^\s*"?([^"<]+?)"?\s*</); return m ? m[1].trim() : ""; }
async function inboundEmail(s: Settings, raw: any) {
  const headers: Record<string, string> = {};
  for (const h of raw.Headers || []) headers[String(h.Name).toLowerCase()] = String(h.Value);
  if (typeof raw.headers === "string") for (const l of raw.headers.split(/\r?\n/)) { const i = l.indexOf(":"); if (i > 0) headers[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
  if (/auto-(replied|generated)/i.test(headers["auto-submitted"] || "") || /bulk|list|junk/i.test(headers["precedence"] || "")) return { ok: true, skipped: "automatic email" };
  const fromRaw = raw.From || raw.from || raw.sender || "";
  const fromEmail = addr(raw.FromFull || fromRaw);
  const fromName = raw.FromName || raw.FromFull?.Name || nameOf(fromRaw);
  const subject = clip(raw.Subject || raw.subject, 200);
  const full = String(raw.TextBody || raw["body-plain"] || raw.text || raw.plain || "");
  const reply = String(raw.StrippedTextReply || raw["stripped-text"] || "") || full.split(/\n(?:On .{5,200}wrote:|-{2,}\s*Original Message|From: )/i)[0].split(/\r?\n/).filter((l) => !l.startsWith(">")).join("\n");
  const own = [env("SMTP_USER", "info@brightfrontstudio.com"), s.handoff_email, s.email_from].filter(Boolean).map((x: string) => x.toLowerCase());
  if (!fromEmail || own.includes(fromEmail)) return { ok: true, skipped: "own address" };

  // A website form notification (from a no-reply address): pull the customer's details out of the body
  let lead = { name: fromName, email: fromEmail, phone: "", message: clip(reply, 2000), enquiry: subject };
  if (BOT_FROM.test(fromEmail)) {
    const replyTo = addr(raw.ReplyTo || raw["reply-to"] || headers["reply-to"] || "");
    const m = mapLead(fieldsFromText(full));
    if (!m.email && !m.phone && !replyTo) return { ok: true, skipped: "no customer details found" };
    lead = { name: m.name || nameOf(raw.ReplyTo || "") || "New lead", email: m.email || replyTo, phone: m.phone, message: m.message || clip(full, 2000), enquiry: m.enquiry || subject };
  } else {
    // A reply in an ongoing email conversation goes back to the assistant
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: conv } = await db.from("conversations").select("*").eq("client_id", s.client_id).eq("channel", "email").eq("contact", fromEmail).gte("last_message_at", since).order("last_message_at", { ascending: false }).limit(1).maybeSingle();
    if (conv && conv.status !== "closed") {
      await addMsg(conv, "in", "lead", clip(reply || full, 4000));
      const { data: l } = conv.lead_id ? await db.from("leads").select("*").eq("id", conv.lead_id).maybeSingle() : { data: null };
      if (conv.status === "ai" && s.enabled) await respond(conv, s, l);
      else if (conv.status === "human") await notifyHandoff(conv, s, l, `${l?.name || fromEmail} replied by email: "${clip(reply, 300)}"`);
      return { ok: true, conversation: conv.id };
    }
  }
  const msgId = headers["message-id"] || raw.MessageID || "";
  return await newLead(s, { ...lead, source: "Email", external_id: msgId ? `email:${clip(msgId, 180)}` : "" });
}

/* ---------- routes ---------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop();
  if (req.method === "GET" && route === "meta") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" && env("META_VERIFY_TOKEN") && url.searchParams.get("hub.verify_token") === env("META_VERIFY_TOKEN");
    return ok ? new Response(url.searchParams.get("hub.challenge") || "", { status: 200 }) : new Response("Forbidden", { status: 403 });
  }
  if (req.method !== "POST") return json({ ok: true, service: "brightfront Reply" });

  try {
    if (route === "intake") {
      const input = await readBody(req);
      const key = input.key || new URL(req.url).searchParams.get("key") || "";
      if (input.website) return json({ ok: true }); // spam trap field
      const { data: s } = await db.from("reply_settings").select("*").eq("intake_key", key).maybeSingle();
      if (!s) return json({ ok: false, error: "Unknown key" }, 401);
      const r = await newLead(s, input);
      const back = input._redirect || new URL(req.url).searchParams.get("redirect");
      if (back && /^https:\/\//.test(back)) return Response.redirect(back, 303);
      return json(r, r.ok ? 200 : 400);
    }

    if (route === "hook") {
      const raw: any = await readBody(req);
      const key = url.searchParams.get("key") || raw.key || "";
      const { data: s } = await db.from("reply_settings").select("*").eq("intake_key", key).maybeSingle();
      if (!s) return json({ ok: false, error: "Unknown key" }, 401);
      const m = mapLead(raw);
      const r = await newLead(s, { ...m, source: clip(url.searchParams.get("source") || raw.source || raw.platform || "Lead form", 80), external_id: raw.leadgen_id || raw.lead_id || raw.external_id || "" });
      return json(r, r.ok ? 200 : 400);
    }

    if (route === "meta") {
      const text = await req.text();
      const secret = env("META_APP_SECRET");
      if (!secret) return new Response("Not set up", { status: 403 });
      const sig = (req.headers.get("x-hub-signature-256") || "").replace(/^sha256=/, "");
      const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const mac = [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, "0")).join("");
      if (!sig || mac !== sig) return new Response("Forbidden", { status: 403 });
      const body = JSON.parse(text || "{}");
      for (const entry of body.entry || []) {
        for (const ch of entry.changes || []) if (ch.field === "leadgen") await metaLead(ch.value).catch((e) => console.error("leadgen", e));
        for (const m of entry.messaging || []) await metaDm(body.object, String(entry.id), m).catch((e) => console.error("dm", e));
      }
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    if (route === "email") {
      const key = url.searchParams.get("key") || "";
      const { data: s } = await db.from("reply_settings").select("*").eq("intake_key", key).maybeSingle();
      if (!s) return json({ ok: false, error: "Unknown key" }, 401);
      const raw: any = await readBody(req);
      return json(await inboundEmail(s, raw));
    }

    if (route === "sms") {
      const p = await readBody(req);
      if (!(await twilioValid(req, p))) return new Response("Forbidden", { status: 403 });
      const from = auPhone(p.From) || p.From, to = auPhone(p.To) || p.To, body = clip(p.Body, 1600);
      const { data: s } = await db.from("reply_settings").select("*").eq("sms_number", to).maybeSingle();
      if (!s) return twiml();
      let { data: conv } = await db.from("conversations").select("*").eq("client_id", s.client_id).eq("contact", from).order("last_message_at", { ascending: false }).limit(1).maybeSingle();
      if (!conv) {
        const { data: lead } = await db.from("leads").insert({ client_id: s.client_id, name: "Text from " + from, phone: from, message: body, source: "SMS", status: "new" }).select().single();
        ({ data: conv } = await db.from("conversations").insert({ client_id: s.client_id, lead_id: lead.id, channel: "sms", contact: from }).select().single());
      }
      await addMsg(conv, "in", "lead", body);
      if (STOP.test(body)) {
        await db.from("conversations").update({ status: "opted_out" }).eq("id", conv.id);
        await deliver(conv, s, `You're unsubscribed from ${s.business_name || "these"} messages. You won't hear from us again by text.`, "ai").catch(() => {});
        return twiml();
      }
      if (conv.status === "opted_out") return twiml();
      const { data: lead } = conv.lead_id ? await db.from("leads").select("*").eq("id", conv.lead_id).maybeSingle() : { data: null };
      if (conv.status === "ai" && s.enabled) await respond(conv, s, lead);
      else if (conv.status === "human") await notifyHandoff(conv, s, lead, `${lead?.name || from} sent a new text: "${body}"`);
      return twiml();
    }

    if (route === "send") {
      const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const { data: u } = await db.auth.getUser(token);
      if (!u?.user) return json({ ok: false, error: "Please log in again." }, 401);
      const { data: me } = await db.from("profiles").select("*").eq("id", u.user.id).single();
      const can = (cid: string) => me?.role === "agency" || me?.client_id === cid;
      const input = await req.json();

      if (input.action === "test") {
        if (!can(input.client_id)) return json({ ok: false, error: "Not allowed" }, 403);
        const { data: s } = await db.from("reply_settings").select("*").eq("client_id", input.client_id).maybeSingle();
        if (!s) return json({ ok: false, error: "Save your reply settings first." }, 400);
        const r: any = await newLead({ ...s, enabled: true }, { ...input, source: "Test lead" });
        if (r.ok && !r.replied && !r.duplicate) return json({ ok: false, error: r.error || "Turn on email or texting in your settings, and add a matching contact." }, 400);
        return json(r, r.ok ? 200 : 400);
      }


      if (input.action === "meta_connect") {
        if (me?.role !== "agency") return json({ ok: false, error: "Not allowed" }, 403);
        const c = await getConn(input.client_id);
        if (!c?.meta_page_id || !c?.meta_page_token) return json({ ok: false, error: "Add the Page ID and Page access token first." }, 400);
        const page = await graph(`${c.meta_page_id}?fields=name,instagram_business_account{id,username}`, c.meta_page_token);
        await graph(`${c.meta_page_id}/subscribed_apps?subscribed_fields=leadgen,messages,messaging_postbacks`, c.meta_page_token, { method: "POST" });
        const ig = page.instagram_business_account;
        await db.from("connections").update({ meta_page_name: page.name, meta_ig_id: ig?.id || null, meta_ig_username: ig?.username || null, meta_checked_at: new Date().toISOString() }).eq("client_id", input.client_id);
        return json({ ok: true, page: page.name, instagram: ig?.username || null });
      }

      if (input.action === "review_reply") {
        const { data: rv } = await db.from("reviews").select("*").eq("id", input.review_id).single();
        if (!rv || !can(rv.client_id)) return json({ ok: false, error: "Not allowed" }, 403);
        const { data: s } = await db.from("reply_settings").select("*").eq("client_id", rv.client_id).maybeSingle();
        const out = await claude(`You write public replies to customer reviews for ${s?.business_name || "an Australian business"}. Australian English, warm and genuine, 1 to 3 sentences, first person plural ("we"). Thank them by first name. For 3 stars or less: acknowledge the issue, apologise once without excuses, and say what's being done or invite them to get in touch. Never mention AI, never offer discounts, never argue. Tone: ${s?.tone || "warm and to the point"}. Reply with JSON only: {"reply": "..."}`, `${rv.rating}-star ${rv.platform} review from ${rv.author || "a customer"}: "${rv.body || "(no text)"}"`, 300);
        return json({ ok: true, reply: clip(out.reply || out.text, 1000) });
      }

      if (input.action === "review_invite") {
        if (!can(input.client_id)) return json({ ok: false, error: "Not allowed" }, 403);
        const { data: s } = await db.from("reply_settings").select("*").eq("client_id", input.client_id).maybeSingle();
        if (!s?.review_url) return json({ ok: false, error: "Add your Google review link in Inbox → What it says first." }, 400);
        const phone = auPhone(input.phone), email = validEmail(input.email) ? input.email.trim() : null;
        if (!phone && !email) return json({ ok: false, error: "Add a mobile or an email." }, 400);
        const first = clip(input.name, 60).split(" ")[0] || "there";
        const msg = `Hi ${first}, thanks for choosing ${s.business_name || "us"}! If you have a minute, we'd really appreciate a quick review: ${s.review_url}`;
        const channel = phone && (s.sms_number || env("TWILIO_FROM")) ? "sms" : email ? "email" : null;
        if (!channel) return json({ ok: false, error: "Texting isn't set up yet. Add an email instead." }, 400);
        let error: string | null = null;
        try {
          if (channel === "sms") await sendSms(s.sms_number || env("TWILIO_FROM"), phone!, msg + " Reply STOP to opt out.");
          else await sendEmail(email!, `How did we go, ${first}?`, msg + `\n\n${s.sign_off || s.business_name || ""}`, s.business_name || "Reviews", s.handoff_email, s);
        } catch (e) { error = String((e as Error).message || e); }
        await db.from("review_requests").insert({ client_id: input.client_id, name: clip(input.name, 120), contact: channel === "sms" ? phone : email, channel, status: error ? "failed" : "sent", error });
        return error ? json({ ok: false, error }, 500) : json({ ok: true });
      }

      if (input.action === "report") {
        if (me?.role !== "agency") return json({ ok: false, error: "Not allowed" }, 403);
        const cid = input.client_id; const start = new Date(input.month || new Date()); start.setDate(1);
        const from = new Date(start); from.setMonth(from.getMonth() - 1);
        const [{ data: cl }, { data: met }, { data: leads }, { data: calls }, { data: crs }, { data: revs }] = await Promise.all([
          db.from("clients").select("*").eq("id", cid).single(),
          db.from("metrics").select("*").eq("client_id", cid).gte("week_start", from.toISOString().slice(0, 10)).order("week_start"),
          db.from("leads").select("source,status,score,value,first_reply_seconds,created_at").eq("client_id", cid).gte("created_at", from.toISOString()),
          db.from("calls").select("outcome,duration_seconds,called_at").eq("client_id", cid).gte("called_at", from.toISOString()),
          db.from("creatives").select("channel,title,spend,leads,clicks,impressions,status").eq("client_id", cid),
          db.from("reviews").select("rating,created_at").eq("client_id", cid).gte("created_at", from.toISOString()),
        ]);
        const facts = JSON.stringify({ client: cl?.name, industry: cl?.industry, baseline_cpl: cl?.baseline_cpl, weekly_metrics: met, leads, calls, ads: crs, reviews: revs });
        const out = await claude(`You write a monthly marketing and sales report for a small Australian business owner, from an agency. Plain Australian English, short sentences, no jargon, no hype. Use only the numbers in the data; never invent figures. Compare to the previous month where the data allows. Reply with JSON only: {"headline": "<one line with the biggest result>", "happened": "<3-4 sentences: enquiries, reply speed, calls, bookings, sales>", "working": "<2-3 sentences: best ads, channels and habits>", "next": "<2-3 specific actions for next month>"}`, facts, 900);
        return json({ ok: true, report: { headline: clip(out.headline, 200), happened: clip(out.happened || out.text, 2000), working: clip(out.working, 2000), next: clip(out.next, 2000) } });
      }

      const { data: conv } = await db.from("conversations").select("*").eq("id", input.conversation_id).single();
      if (!conv || !can(conv.client_id)) return json({ ok: false, error: "Not allowed" }, 403);
      if (conv.status === "opted_out") return json({ ok: false, error: "This person opted out. You can't message them here." }, 400);
      const { data: s } = await db.from("reply_settings").select("*").eq("client_id", conv.client_id).single();
      const body = clip(input.body, conv.channel === "sms" ? 480 : 4000);
      if (!body) return json({ ok: false, error: "Write a message first." }, 400);
      await deliver(conv, s, body, "human");
      await db.from("conversations").update({ status: "human" }).eq("id", conv.id);
      return json({ ok: true });
    }

    return json({ ok: false, error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
