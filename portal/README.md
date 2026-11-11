# brightfront client portal

Client logins, results dashboard, content approvals, requests, invoices, onboarding and file uploads.
Hosted free on GitHub Pages. Logins, data and files live in Supabase.

## 1. Supabase (database + logins)
1. Create a project at supabase.com called `brightfront-portal` (Sydney region).
2. SQL Editor → New query → paste everything in `supabase/schema.sql` → Run.
3. Authentication → URL Configuration → set **Site URL** to your portal address, e.g. `https://portal.brightfrontstudio.com` (or your GitHub Pages URL).
4. Project Settings → API → copy the **Project URL** and the **anon / public** key into `config.js`.
   Never use the `service_role` key in this site.

## 2. GitHub (hosting)
1. Create a repo called `brightfront-portal` and upload everything in this folder.
2. Settings → Pages → Deploy from branch → `main` / root → Save.
3. Optional: add a `CNAME` file containing `portal.brightfrontstudio.com`, and a CNAME DNS record pointing `portal` to `<your-username>.github.io`.

## 3. Make yourself the admin
Open the portal → Create an account with info@brightfrontstudio.com → confirm the email → log in.
That email is automatically the admin, so you'll see **All clients**. Do this straight away, before sharing the link.

## 4. Add a client
1. All clients → **Add client** (name, plan, baseline cost per lead, guarantee start date).
2. Ask the client to open the portal and **Create an account** with their email.
3. All clients → **Give a client access** → their email + business → **Link account**.

Each client only ever sees their own business. This is enforced by the database (row-level security), not just the screens.

## Weekly routine
- Results → **Add week** (leads, booked calls, ad spend). The dashboard and guarantee tracker update automatically.
- Approvals → **Add post** for anything that needs sign-off.
- Invoices → **New invoice** (paste a Stripe payment link to show a **Pay now** button).

## brightfront Reply (AI lead replies)

1. Supabase -> SQL Editor: run `supabase/reply.sql` (done).
2. Edge Function `reply` deployed from `supabase/functions/reply/index.ts` (done). In its Settings, turn OFF "Verify JWT with legacy secret" (website forms and Twilio call it without a login; the code checks logins itself for /send).
3. Edge Functions -> Secrets: `ANTHROPIC_API_KEY`, `SMTP_PASS` (info@ mailbox). For texting: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
4. Twilio: buy an Australian mobile number per client, set "A message comes in" webhook to
   https://cupsusqjcgefmfhdznmo.supabase.co/functions/v1/reply/sms (HTTP POST), and put the number (+61...) in the client's Lead replies settings.
5. Lead forms POST to https://cupsusqjcgefmfhdznmo.supabase.co/functions/v1/reply/intake?key=CLIENT_KEY with name, email, phone, message, source.
