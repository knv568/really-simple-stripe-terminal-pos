# Contributor guide — Really Simple Stripe Terminal POS

Notes for developers extending or contributing to this open-source **template** repository. Operator setup: **README.md**.

## What this project is

A **free, minimal staff-facing web POS** for in-person card payments via **BBPOS WisePOS E** (or simulated reader) using Stripe’s **server-driven Terminal** integration.

This repo is a **[GitHub template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)**. Operators create their own repository from it, customize [`src/lib/branding.ts`](src/lib/branding.ts), and deploy independently. Improvements to the shared codebase land here via issues and PRs — not from individual deployed instances.

| Component | Role |
|-----------|------|
| **This repo** (`really-simple-stripe-terminal-pos`) | Template + upstream source; Next.js app deployed to Vercel (or similar) |
| **Operator repos** | Created from template; own Stripe keys, branding, and Vercel project |
| **WisePOS E** | Payment terminal UI only — does **not** run this app |
| **Stripe** | Payment processing; distinguish POS charges via metadata |

**Customization (operators):** Edit [`src/lib/branding.ts`](src/lib/branding.ts) for business name, page title, Stripe tags, and quick-amount presets.

## Naming conventions

Use consistently (defaults in `branding.ts`):

| Context | Default | Customize in |
|---------|---------|--------------|
| App / product name | `My Business` | `BRAND.businessName` |
| npm package | `really-simple-stripe-terminal-pos` | `package.json` (operators may rename after creating from template) |
| Stripe metadata `payment_type` | `pos` | `STRIPE_TAGS.paymentType` |
| Stripe metadata `source` | `really-simple-stripe-terminal-pos` | `STRIPE_TAGS.source` |
| PaymentIntent description prefix | `BRAND.businessName` | `buildDescription()` in `stripe.ts` |
| Page title / PWA | `Really Simple Stripe Terminal POS` | `BRAND.pageTitle` |
| PWA home screen label | `My Business` | `BRAND.pwaShortName` (≤12 chars recommended) |
| PWA icon glyph | first letter of `pwaShortName` | `BRAND.iconMark` (optional, 1–2 chars) |
| PWA / UI accent | `#3d5a47` | `BRAND.accentColor` (sync with `--accent` in globals.css) |
| UI subtitle | `Point of Sale` | `BRAND.locationSubtitle` (empty to hide) |

## Architecture (server-driven)

```
Staff phone/tablet (browser)
    → Next.js API routes (Vercel)
        → Stripe API
            → WisePOS E (Wi‑Fi / internet)
```

- **No** Stripe Terminal JS/iOS/Android SDK in the browser.
- **No** `connection_token` endpoint (SDK-only).
- Backend: create `PaymentIntent` → `terminal.readers.processPaymentIntent` → poll status.

Reference: [Server-driven integration](https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=server-driven)

## Tech stack

- Next.js 15 App Router, React 19, TypeScript (strict)
- Tailwind CSS v4 (`src/app/globals.css`)
- Stripe Node SDK — server only
- Deploy: Vercel

Node: see `.tool-versions` (22.x).

## Repository layout

```
src/
  app/
    page.tsx              # Login gate → PosApp | LoginForm
    layout.tsx            # Metadata from BRAND + PWA icons
    manifest.ts           # Web app manifest (home screen / install)
    globals.css           # .pos-page, .touch-target, tokens
    api/
      auth/login|logout/
      charge/               # collectInputs (email) + PI + processPaymentIntent
      cancel-payment/       # cancelAction + PI cancel
      payment-intent/[id]/
      simulate-card/        # test mode only
      config/
      reader/
  components/
    login-form.tsx
    pos-app.tsx
  lib/
    auth.ts
    branding.ts           # Business name, PWA colors/mark, Stripe tags, quick amounts
 pwa-icon.tsx          # ImageResponse icon from BRAND
    stripe.ts             # metadata helpers using STRIPE_TAGS
    payment-intent-access.ts  # poll/cancel guard for POS-owned PIs
```

## Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `STRIPE_SECRET_KEY` | Yes | `rk_live_...` / `rk_test_...` preferred |
| `STRIPE_READER_ID` | Yes | Must match key mode (test/live) |
| `POS_ACCESS_PIN` | Yes | Staff login |
| `POS_SESSION_SECRET` | Yes | Session HMAC |

Never commit `.env.local`.

## Authentication

- PIN → `POST /api/auth/login` → httpOnly `pos_session` (12h).
- Payment routes: `requireApiAuth(request)`.
- No Stripe secrets on the client.

## Payment flow

1. `POST /api/charge` — optional email collection, then `PaymentIntent` + `processPaymentIntent` (`enable_customer_cancellation: true`).
2. Client polls `GET /api/payment-intent/:id`.
3. Success → UI reset; metadata tags sale with `STRIPE_TAGS`.

## Email receipts

Optional **server-driven** flow — email is collected on the **reader**, not in the staff browser.

| Layer | Behavior |
|-------|----------|
| **UI** (`pos-app.tsx`) | Checkbox **Email receipt** → sends `requestEmailReceipt: true` in charge body |
| **API** (`api/charge/route.ts`) | If enabled, calls `terminal.readers.collectInputs` with one optional `email` input before creating the PI |
| **Reader** | Customer enters email or taps **Skip** (`required: false`) |
| **Server** | Polls reader action until `collect_inputs` succeeds/fails (~130s timeout); extracts email via `extractCollectedEmail()` |
| **PaymentIntent** | Sets `receipt_email` on create (and update when email present) |
| **After pay** | Stripe sends receipt email when the PI succeeds — POS does not send mail itself |

**Order matters:** email collect → create/update PI with `receipt_email` → `processPaymentIntent` for card present.

**Response fields:** `receiptEmailProvided: boolean` and a `message` hint for staff (e.g. receipt saved vs card-only).

**Errors:** `409` reader busy / collect failed; `408` terminal_reader_timeout during email step. Charge is not started if email collection fails when requested.

**Do not** collect email in the browser for PCI/simplicity — keep it on the reader via `collectInputs`.

**Test mode (simulated reader):** There is no reader UI for email entry. While `/api/charge` is polling `collect_inputs`, call the test helper from a separate terminal:

```bash
stripe terminal readers test_helpers succeed_input_collection tmr_xxx \
  --skip-non-required-inputs=none   # hard-coded someone@example.com
# or --skip-non-required-inputs=all to simulate Skip
```

Reference: [Collect inputs](https://docs.stripe.com/terminal/features/collect-inputs) · [Succeed input collection](https://docs.stripe.com/api/terminal/readers/succeed_input_collection)

## Cancel flow

- `POST /api/cancel-payment` — `cancelAction` + `paymentIntents.cancel`.
- UI: **Cancel transaction**; reader: customer cancel enabled.

## Test mode

- `isStripeTestMode()` from key prefix.
- Simulated reader: `simulated-wpe`.
- `POST /api/simulate-card` — test only (`presentPaymentMethod` for card tap).
- Email receipt on simulated reader: `stripe terminal readers test_helpers succeed_input_collection` while charge route is waiting on `collect_inputs` (no reader keyboard in test mode).

## UI conventions

- Primary layout: iPhone ~390px — `.pos-page`, `.pos-footer`, `.touch-target`, `.pos-input`.
- Header: `BRAND.locationSubtitle` + `BRAND.businessName`.
- Quick amount buttons from `QUICK_AMOUNTS_GBP`.
- **Email receipt** checkbox above the charge footer; disabled while busy/cancelling.

## What not to do

- Do not expose Stripe secret keys to the client.
- Do not host the POS on the WisePOS E.
- Do not hardcode business-specific strings outside `branding.ts`.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

## Extending the app

1. API route under `src/app/api/` + auth as needed.
2. Reuse `getStripe()`, `getReaderId()`, metadata helpers in `src/lib/stripe.ts`.
3. Update `branding.ts` for business-specific naming; avoid scattering literals.
4. Update **README.md** and this file if env vars or flows change.

**Template maintenance:** keep defaults generic in `branding.ts`; never commit secrets. Operators merge `upstream/main` into their repos to pick up changes — see README **Staying updated**.

## Key Stripe docs

- [WisePOS E](https://docs.stripe.com/terminal/payments/setup-reader/bbpos-wisepos-e)
- [Server-driven payments](https://docs.stripe.com/terminal/payments/collect-card-payment?terminal-sdk-platform=server-driven)
- [Cancel action](https://docs.stripe.com/api/terminal/readers/cancel_action)
- [Collect inputs (email on reader)](https://docs.stripe.com/terminal/features/collect-inputs)
- [Restricted keys](https://docs.stripe.com/keys/restricted-api-keys)

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| No such reader, livemode false | Test/live key mismatch with `tmr_` |
| Reader offline | Network / power |
| Reader busy on cancel | Card authorizing |
| 401 | Session expired |
| Email collect timeout | Reader idle too long; retry charge |
| No receipt after success | Customer skipped; verify `receipt_email` on PI in Dashboard |

Operator setup: **README.md**.
