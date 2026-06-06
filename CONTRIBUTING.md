# Contributing to Really Simple Stripe Terminal POS

Thank you for helping improve this project. Really Simple Stripe Terminal POS is a **free, open-source template** for a minimal staff-facing web POS that takes in-person card payments via Stripe Terminal (server-driven integration).

## Where to contribute

This repository is the **upstream template**. Improvements that benefit all operators belong here as issues or pull requests.

If you deployed your own copy from **[Use this template](https://github.com/knv568/really-simple-stripe-terminal-pos/generate)**, that repo is yours — keep business-specific changes there. When you build something reusable (bug fix, docs, feature that fits the template’s scope), please contribute it back to **this** repository instead of only maintaining it in your fork.

| Change type | Where it goes |
|-------------|---------------|
| Bug fix, shared feature, docs, tests | This repo (PR) |
| Business name, branding, quick amounts | Your operator repo (`src/lib/branding.ts`) |
| Your Stripe keys, PIN, Vercel settings | Your deployment only — never in a PR |

## What we’re looking for

Contributions that fit the project’s goals:

- Fixes for payment, reader, auth, or receipt flows
- Improvements to the charge UI, PWA, or staff experience
- Tests, documentation, and accessibility fixes
- Security hardening (server-side secrets, session handling, restricted keys)
- Template-friendly defaults — generic wording in `branding.ts`, not one business’s name

Out of scope for this template (usually better as a fork or separate project):

- Full retail POS features (inventory, tables, multi-location, etc.)
- Stripe Terminal **SDK** integration in the browser (this app is **server-driven** only)
- Collecting card or email data in the staff browser (email receipts use reader `collectInputs`)
- Hardcoded business-specific strings outside [`src/lib/branding.ts`](src/lib/branding.ts)

When in doubt, open an issue first to discuss scope.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Report concerns to knv568@gmail.com.

## Security

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report them privately.

Never commit secrets (`.env.local`, API keys, PINs). PRs containing credentials will be closed.

## Development setup

1. Fork and clone this repository (or clone directly if you have write access).
2. Install Node.js **22.x** (see [`.tool-versions`](.tool-versions)).
3. Copy [`.env.example`](.env.example) to `.env.local` and fill in test-mode values:

   | Variable | Notes |
   |----------|--------|
   | `STRIPE_SECRET_KEY` | Restricted test key `rk_test_...` preferred |
   | `STRIPE_READER_ID` | Test reader, e.g. register `simulated-wpe` in Dashboard |
   | `POS_ACCESS_PIN` | Any 4–8 digit PIN for local dev |
   | `POS_SESSION_SECRET` | e.g. `openssl rand -hex 32` |

4. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000), sign in with your PIN, and exercise the charge flow.

Operator-focused setup (deploy, WisePOS E, restricted keys): [README.md](README.md).

## Before you open a PR

Run the checks locally:

```bash
npm run lint
npm test
npm run build
```

All three should pass. Add or update tests when you change behavior in `src/lib/` or API routes.

For UI or payment-flow changes, describe how you tested (simulated reader, live reader, email receipt on/off, cancel path, etc.).

## Pull request guidelines

Use the PR template when opening a pull request. In brief:

1. **One logical change per PR** when possible — easier to review and merge.
2. **Link an issue** if one exists, or briefly explain the problem and solution in the PR description.
3. **Keep template defaults generic** — do not change `branding.ts` to your business name.
4. **Update docs** when behavior, env vars, or setup steps change ([README.md](README.md), [AGENTS.md](AGENTS.md), and this file as needed).
5. **Follow existing patterns** — see conventions below and [AGENTS.md](AGENTS.md) for architecture detail.

Maintainers may ask for changes or suggest splitting large PRs. Thank you for your patience.

## Code conventions

### Architecture

- **Server-driven Terminal** — PaymentIntents and reader actions run on the server via Next.js API routes.
- **No Stripe secrets on the client** — use `requireApiAuth()` on protected routes.
- **Branding in one place** — business name, Stripe metadata tags, and quick amounts live in [`src/lib/branding.ts`](src/lib/branding.ts).

Full layout, payment flow, email receipts, and cancel behavior: [AGENTS.md](AGENTS.md).

### Style

- TypeScript strict mode; match surrounding file style.
- Reuse helpers in `src/lib/stripe.ts`, `src/lib/auth.ts`, and existing API route patterns.
- UI: touch-friendly targets (`.touch-target`), mobile-first ~390px layout, tokens in `src/app/globals.css`.
- Prefer focused changes over refactors unrelated to the issue.

### Tests

Vitest tests live alongside source (`*.test.ts`). Add tests for non-trivial logic in `src/lib/` and for regressions you fix.

## Suggesting features or reporting bugs

Use the **Bug report** or **Feature request** templates on [GitHub Issues](https://github.com/knv568/really-simple-stripe-terminal-pos/issues). Do not open a public issue for security vulnerabilities — see [SECURITY.md](SECURITY.md).

## Staying in sync (operator repos)

If you maintain a deployment from this template and want upstream fixes:

```bash
git remote add upstream https://github.com/knv568/really-simple-stripe-terminal-pos.git
git fetch upstream
git merge upstream/main
```

Resolve conflicts carefully in `branding.ts` and any customizations. Details: README **Staying updated**.

## Questions

- **Using the app in production:** [README.md](README.md)
- **Architecture and extending the app:** [AGENTS.md](AGENTS.md)
- **Stripe Terminal:** [Server-driven integration](https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=server-driven)

We appreciate every issue, doc fix, and pull request that keeps this template simple, secure, and useful for small businesses.
