# VOID STORE — Firestore Rules Test Report (Draft Only)

## Status snapshot — 2026-10-16

**Production remains untouched.** No Firebase Rules were published, no commits were merged into `main`, and no live-site deployment or production test writes were performed.

## Automated Rules tests

The latest workflow run is https://github.com/VOIDSTORE-ID/web-/actions/runs/38871297530, running against draft commit `7a205fc5f95bd3565e6c5133bdc8e196f26d7f1f`. The run completed with **failure by design of the new security gate**: dependency installation and the Firestore Rules emulator test step both succeeded, while `Block release-quality CI on critical or high advisories` failed. This confirms the gate blocks release-quality CI while critical/high dependency advisories remain; it does not mean the Rules tests failed.

The prior expanded Rules suite reported 15 tests passing and 0 failing in run https://github.com/VOIDSTORE-ID/web-/actions/runs/38869463318. These are Firestore Rules emulator tests only; they do not test checkout or login through a real browser.

- Test command: `npm run test:rules` using an isolated Firestore Emulator.
- The emulator loads draft `firestore.rules` directly; this does not prove rules are deployed or that the live site works end-to-end.
- Coverage includes public catalog reads, valid anonymous order creation, product/payment mismatch rejection, staff/owner role boundaries, order update restrictions, audit fields, and default-deny behavior.

## Dependency audit — release blocker

The latest inspected CI log reported **33 advisories: 1 critical, 13 high, 19 moderate, 0 low**. The install summary separately reported 32 vulnerabilities; the subsequent JSON audit step reported 33, so the JSON audit count is the more detailed report to track. Affected dependency families include `tar`, `firebase-tools`, `firebase`, `@firebase/firestore`, `@firebase/rules-unit-testing`, `undici`, and proxy-related dependencies.

The repository has no committed `package-lock.json`; CI currently uses `npm install`, so dependency resolution is not reproducible. A lockfile should be generated and committed only after dependency versions are reviewed and tests pass. Do not run `npm audit fix --force` blindly: suggested remediations include major-version changes.

A new CI security gate was added in commit `7a205fc5f95bd3565e6c5133bdc8e196f26d7f1f`. Run `38871297530` confirmed it behaves as intended: the Rules emulator tests passed, then the workflow failed because critical/high advisories remain. This is a release-quality guardrail, not a vulnerability fix.

## Known release gaps

1. Dependency vulnerabilities remain unresolved; draft is **not release-ready**.
2. Customer checkout, popup/WhatsApp handoff, owner/staff login, product editing, payment-method toggles, and order updates have not had a real browser end-to-end test. Checkout code was updated in commit `5e7bdbe9f97ef1b0cce57ee5e1bc3205d71ea449` to mitigate popup blocking and avoid opening WhatsApp before the order write succeeds. This is a code-level mitigation, not proof of browser behavior.
3. Production Firebase Rules remain deny-all. The Firebase-integrated draft will not work against production until a separately reviewed and approved Rules release.
4. Anonymous order creation has no rate limiting. Evaluate App Check and/or trusted server-side abuse controls before enabling public order writes.
5. Branch comparison against `main` was previously reported as divergent (draft 18 commits ahead, 1 behind); recheck and reconcile in draft before any release.
6. Confirm public Firebase config, WhatsApp number, owner account/profile, and live Firestore document shapes using safe checks before release.

## Security expectations

- Public users may read catalog and payment-method metadata and create only schema-valid orders linked to active product/payment documents with matching names and prices.
- Public users must not read orders or other users' profiles.
- Active staff may read orders and update order progress, but may not change payment status or manage catalog/users.
- Only an active owner may change payment status, manage catalog/payment methods, or manage staff profiles.
- Unlisted collections remain denied by default.

## Release boundary

Do not publish Firebase Rules, merge to `main`, or deploy until dependency findings are triaged and resolved, browser end-to-end checks are completed in a safe test environment, final regression tests pass, and the user explicitly approves the production release.
