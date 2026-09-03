# Subscriptions with Stripe checkout

Add a paid Looxrater Pro plan and gate the app's core surfaces behind it, while keeping the existing $4 one-time unlock for people who only want a single report.

## What the user experiences

- **Landing page pricing** shows two options: Looxrater Pro (monthly or yearly) and the $4 single-report unlock.
- **Analyze screen**: signed-in users without an active plan see a paywall panel instead of the photo picker, with the plan choice and a "buy a single report instead" link. Landing, method, auth and public share cards stay open to everyone.
- **Report history / account list**: locked for non-subscribers. Reports that were already paid for individually stay reachable by direct link and stay unlocked forever.
- **Report page**: subscribers see the full report immediately; non-subscribers keep the current blurred-metrics state with both the $4 unlock and a subscribe option.
- **Checkout**: tapping a plan opens Stripe Checkout, then returns to the app with the plan active and a confirmation toast.
- **Account page**: a Plan section showing status, renewal date, and a link to manage or cancel billing through Stripe's portal.

## Billing setup

- Provider: Lovable's built-in Stripe payments (no Stripe account or API keys needed from you). Built-in payments require a paid Lovable workspace plan — if the workspace isn't eligible yet, enabling will surface an upgrade link and the rest of the work waits on that.
- Products created in test mode first: Looxrater Pro Monthly and Looxrater Pro Yearly, plus a one-time Single Report product for the existing $4 unlock. Exact prices confirmed before creating them; suggested $9/month and $59/year.
- Tax handling is set up as part of the Stripe integration so charges stay compliant.

## Technical outline

Database:
- New `subscribers` table keyed by user id: Stripe customer id, subscription id, price/plan interval, status, `current_period_end`, timestamps. RLS: users select their own row; service role full access; explicit GRANTs.
- A `has_active_plan(uid)` security-definer helper for policy and server-side checks.
- Reports keep `unlocked` for one-time purchases, so a lapsed subscriber never loses a report they bought outright.

Server functions (`createServerFn`, `requireSupabaseAuth`):
- `createCheckout` — builds a Stripe Checkout session for a chosen plan or the one-time unlock (with the report id in metadata) and returns the URL.
- `getSubscriptionStatus` — reads the caller's row, returns plan/status/renewal date.
- `createPortalSession` — returns a Stripe billing-portal URL for cancel/manage.

Webhook: a public server route under `src/routes/api/public/` verifying the Stripe signature, then upserting the `subscribers` row on `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`, and flipping `reports.unlocked` for completed one-time purchases. Entitlement is written by the webhook only — never by the browser, which replaces the current temporary client-side unlock in `UnlockSheet`.

Gating: a `usePlan` hook wrapping `getSubscriptionStatus` drives the paywall UI; the authoritative check happens server-side in the report/history fetchers so a client-side bypass yields nothing.

Copy stays consistent with the product's stance: paying unlocks measurements and history, not a better or more accurate judgement of appearance.
