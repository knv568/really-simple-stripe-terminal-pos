# Security Policy

## Supported Versions

Security fixes are provided for the latest release on the default branch (`main`).

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

Older tags and deployed copies created from this template are not monitored unless explicitly noted in a release.

## Scope

This policy covers vulnerabilities in **Really Simple Stripe Terminal POS** (this repository).

It does **not** cover:

- Stripe’s APIs, Dashboard, or Terminal hardware/firmware — report those to [Stripe](https://support.stripe.com/contact/email)
- Misconfiguration of your deployment (weak PIN, leaked `.env.local`, unrestricted Stripe keys, public URLs without access control)
- Third-party dependencies — we will address confirmed issues via dependency updates when applicable

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately via GitHub Security Advisories:

**[Report a vulnerability](https://github.com/knv568/really-simple-stripe-terminal-pos/security/advisories/new)**

If you cannot use that form, open a **private** discussion with the repository maintainer through GitHub and mark it as a security report.

### What to include

- Description of the issue and potential impact
- Steps to reproduce (or proof of concept)
- Affected version or commit
- Any suggested fix, if you have one

### What to expect

| Stage | Timeline |
| ----- | -------- |
| Initial acknowledgement | Within **7 days** |
| Status update | Within **14 days**, or sooner if we need more information |
| Fix or decision | Depends on severity; critical issues are prioritized |

**If accepted:** we will work on a fix, coordinate disclosure timing with you when possible, and credit reporters in the advisory unless you prefer to remain anonymous.

**If declined:** we will explain why (e.g. out of scope, duplicate, deployment misconfiguration, or not reproducible).

## Security practices for operators

When you deploy this app, treat it as staff-only infrastructure:

- Use **restricted** Stripe API keys scoped to Terminal and PaymentIntents
- Set a strong `POS_ACCESS_PIN` and a long random `POS_SESSION_SECRET`
- Never commit `.env.local` or expose secrets to the browser
- Restrict who can reach the deployed URL (VPN, IP allowlist, or similar where practical)

See also the [Security section in README.md](./README.md#security).
