# VOID STORE — Firestore Rules Test Report (Draft Only)

## Status snapshot — 2026-10-16

**Production remains untouched.** No Firebase Rules were published, no commits were merged into `main`, and no live-site deployment or production test writes were performed.

## Automated Rules tests

Latest previously completed CI run: https://github.com/VOIDSTORE-ID/web-/actions/runs/38865540874

A new CI run triggered by the checkout change is in progress: https://github.com/VOIDSTORE-ID/web-/actions/runs/38868604458. Do not treat it as passed until GitHub reports a completed successful result.

- Workflow job: `firestore-rules` — completed successfully.
- Test command: `npm run test:rules` using an isolated Firestore Emulator.
- Result: **13 tests passed, 0 failed**.
- Test duration: about 3.7 seconds; full CI job took about 2 minutes due to dependency installation and emulator setup.
- Test project ID: `voidstore-rules-isolated-test`; test data is cleared and recreated per test.
- The emulator loads the draft `firestore.rules` directly; this does not prove the rules have been deployed or that the live site works end-to-end.

Covered scenarios: public ordered catalog/payment-method reads; valid anonymous order creation; manipulated product price/name rejection; inactive product/payment method rejection; anonymous order-read denial; active staff order reads/progress updates; staff payment-status denial; owner payment-status update; inactive staff denial; staff catalog/role escalation denial; owner product/payment-method edits with audit fields; staff order deletion denial and owner deletion allowed; unlisted collection denial.

## Dependency audit — unresolved blocker

The CI dependency audit completed, but it reported **33 advisories: 1 critical, 13 high, 19 moderate, 0 low**. Notable affected packages include `tar` (critical), `firebase-tools`, `firebase`, `@firebase/firestore`, `@firebase/rules-unit-testing`, `undici`, `basic-ftp`, `braces`, `chokidar`, and proxy-related dependencies.

The repository currently has no committed `package-lock.json`; CI installs from the package ranges, so dependency resolution is not yet reproducible. Generate and commit a lockfile on the draft branch, then test using `npm ci`. The package list is currently used for draft testing; the storefront imports Firebase Web SDK 10.14.1 from Google's CDN. This does not automatically mean every npm finding is exploitable in the deployed browser app, but the critical/high findings must be triaged and resolved safely before release. The suggested fixes in the audit include major-version changes, so **do not run `npm audit fix --force` blindly**. Pin compatible versions, generate a lockfile, and rerun the isolated tests and audit.

## Known release gaps

1. Dependency vulnerabilities are unresolved; draft is **not release-ready**.
2. Customer checkout, popup/WhatsApp handoff, owner/staff login, product editing, payment-method toggles, and order updates have not had a real browser end-to-end test. Draft checkout code was updated in commit `5e7bdbe9f97ef1b0cce57ee5e1bc3205d71ea449` to open a temporary tab synchronously during the submit gesture, navigate to WhatsApp only after the order write succeeds, close the temporary tab on write failure, and provide a fallback WhatsApp link if the popup is blocked. This is a code-level mitigation, not proof of browser behavior; verify in a real browser before release.
3. Production Firebase Rules remain deny-all; the Firebase-integrated draft will not work against production until a separately reviewed and approved Rules release.
4. Anonymous order creation has no rate limiting. Evaluate App Check and/or trusted server-side abuse controls before opening public order writes.
5. Branch comparison against `main` is divergent (draft 18 commits ahead, 1 behind at the last comparison); inspect and reconcile in draft before any release.
6. Confirm public Firebase config, WhatsApp number, owner account/profile, and live Firestore document shapes using safe checks before release.

## Security expectations

- Public users may read catalog and payment-method metadata and create only schema-valid orders linked to active product/payment documents with matching names and prices.
- Public users must not read orders or other users' profiles.
- Active staff may read orders and update order progress, but may not change payment status or manage catalog/users.
- Only an active owner may change payment status, manage catalog/payment methods, or manage staff profiles.
- Unlisted collections remain denied by default.

## Release boundary

Do not publish Firebase Rules, merge to `main`, or deploy until dependency findings are addressed, browser end-to-end checks are completed in a safe test environment, final regression tests pass, and the user explicitly approves the production release.
