## Summary

<!-- What changed and why? One logical change per PR when possible. -->

Fixes #<!-- issue number, or remove if none -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Tests
- [ ] Refactor / chore (no behavior change)

## Testing

Ran locally:

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`

How I tested (required for UI or payment-flow changes):

<!-- e.g. simulated reader charge, email receipt on/off, cancel path, live reader -->

## Checklist

- [ ] Keeps [`src/lib/branding.ts`](src/lib/branding.ts) generic — no business-specific names or secrets
- [ ] Docs updated if behavior, env vars, or setup changed ([README.md](README.md), [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md))
- [ ] Tests added or updated for non-trivial logic in `src/lib/` or API routes
