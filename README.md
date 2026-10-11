# taptools: analytics (Phase 2)

Tap tracking, customer logins, and the analytics dashboard. No store/ecommerce yet.

## What's in here

| Path | What it does |
|---|---|
| `/c/<code>` | **The URL written onto every card.** Records the tap, then redirects to the business's review page. |
| `/dashboard` | Pick a business, then see its analytics: taps, trend vs. previous period, taps per day, per card, per location, busiest weekday, iPhone vs Android. 7/30/90-day ranges. **Open to anyone with the link — no login right now.** |
| `/admin` | All businesses, make blank card codes, add businesses. **Also open — no login.** |
| `/admin/<id>` | One business: cards (change review link any time), locations, analytics add-on on/off. |

**Paid add-on behavior:** taps are recorded for every card whether or not the business pays. Owners without the add-on see only "Customers have tapped your cards N times" and an *Add analytics* button. When they upgrade, their full history is already there. That locked screen is your upsell.

**Counting rules (so the numbers are honest):**
- Link previewers and bots (iMessage/WhatsApp/Slack previews, crawlers) are stored but never counted.
- The same phone tapping the same card twice within 20 seconds counts once (phones sometimes double-fire NFC).
- Days are cut at midnight in the business's own time zone.
- Redirects are 302 + no-store. Never switch to 301: phones would cache it and later taps would skip the server, uncounted.

## Run it locally

```bash
npm install
cp .env.example .env        # then edit ADMIN_EMAIL / ADMIN_PASSWORD / SESSION_SECRET
npm run db:demo             # tables + your admin login + a demo barbershop with 90 days of fake taps
npm run dev                 # http://localhost:3000
```

Use `npm run db:setup` instead of `db:demo` for a clean database with no demo data.

Locally the database is an embedded Postgres saved in `./.data` (nothing to install). In production set `DATABASE_URL` to a real Postgres URL and the same code uses it.

## Your workflow selling door to door

1. Before heading out: `/admin` → **Make blank cards** (e.g. 20). Write each listed URL (`https://<domain>/c/XXXXXXX`) onto a chip with an NFC writing app (NFC Tools is free on iPhone and Android). Stick the code on the back.
2. At the sale: `/admin/<business>` → **Add a card**, paste their Google review link, type the blank card's code. Card is live instantly.
3. If they buy analytics: tick **Paid for analytics add-on** and create their login.
4. Demo pitch: open `/dashboard?b=<demo business id>` on your phone to show what it looks like (the demo seed makes one for you — see its printed output).

To get a business's Google review link: search the business on Google → "Ask for reviews" (if you're logged in as owner) or use Google's Place ID finder and build `https://search.google.com/local/writereview?placeid=<ID>`.

## Going live (what it costs)

| Piece | Option | Rough cost |
|---|---|---|
| Domain | taptools.com or fallback | ~$10–15/yr (more if the .com is owned by someone and for sale) |
| Hosting | Vercel (easiest for Next.js) | Hobby plan is free but its terms are non-commercial; Pro is ~$20/mo. Railway or Render run this for roughly $5–10/mo. |
| Database | Neon or Supabase Postgres | Free tier covers this for a long time |

Check current pricing before signing up; these change.

Steps: buy the domain → create a Neon database → deploy to your host with these env vars → run `npm run db:setup` once against the production `DATABASE_URL` → point the domain at the host.

```
DATABASE_URL=postgres://...      # from Neon/Supabase
SESSION_SECRET=<64 random characters>
PUBLIC_URL=https://taptools.com  # your real domain
ADMIN_EMAIL=you@...
ADMIN_PASSWORD=<strong password>
CONTACT_EMAIL=you@...            # where "Add analytics" emails go
```

## Login is currently removed

`/dashboard` and `/admin` are open to anyone with the link — no password. This was pulled out deliberately to get something running without the `SESSION_SECRET`/auth code getting in the way during setup. The old code is still sitting in `lib/auth.ts` and `lib/session.ts`, and the `users` table is still in the schema, so putting a sign-in page back later is mostly rewiring, not rebuilding. **Do not hand a `/dashboard?b=...` link to a real customer until that's back in place** — anyone with the link can currently see that business's tap data, and anyone can open `/admin` and edit any business's cards.

## Things to know

- **Buy the domain before programming real cards.** The chip stores the full URL. If you write `taptools.com/c/...` and later can't get or lose that domain, every card in the field is dead. Cards written during local testing (`localhost`) won't work on customers' phones.
- **Never let the domain lapse.** Turn on auto-renew. Same reason.
- **No password reset by email yet.** You set and reset owner passwords from `/admin/<business>`. Self-service reset needs an email service (e.g. Resend, free tier); add it once you have more than a handful of customers.
- **Billing for the add-on is manual.** You flip the checkbox. Stripe subscriptions can switch it on/off automatically later; the `analytics_enabled` flag is the hook.
- **Phase 3 fit:** the store can live in this same app (same login, same database), so a business can reorder cards from their dashboard.
