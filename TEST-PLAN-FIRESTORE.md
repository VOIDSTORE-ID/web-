# VOID STORE — Firestore Rules Test Report (Draft Only)

## Status snapshot — 2026-10-16

**Production remains untouched.** No Firebase Rules were published, no commits were merged into `main`, and no live-site deployment or production test writes were performed.

## Automated Rules tests

Latest completed run: https://github.com/VOIDSTORE-ID/web-/actions/runs/38876213373 on draft commit `ba0b9926717cfe9b94c6240fd660aa80cb0cd595`. Java 21 setup fixed emulator startup and all **15 Firestore Rules tests passed (0 failed)**. The workflow remains failed at the security gate because the audit still reports **20 advisories: 0 critical, 9 high, 11 moderate, 0 low**. This means the Rules tests are green, but release-quality CI correctly remains blocked. npm's suggested remediations include major-version downgrades (Firebase SDK to 9.14.0 and rules-unit-testing to 2.0.7), so they must not be applied blindly.

The prior expanded Rules suite reported 15 tests passing and 0 failing in run https://github.com/VOIDSTORE-ID/web-/actions/runs/38869463318. These are Firestore Rules emulator tests only; they do not test checkout or login through a real browser.

- Test command: `npm run test:rules` using an isolated Firestore Emulator.
- The emulator loads draft `firestore.rules` directly; this does not prove rules are deployed or that the live site works end-to-end.
- Coverage includes public catalog reads, valid anonymous order creation, product/payment mismatch rejection, staff/owner role boundaries, order update restrictions, audit fields, and default-deny behavior.

## Dependency audit — release blocker

The earlier audit reported 33 advisories (1 critical, 13 high, 19 moderate, 0 low). After upgrading `firebase-tools` to `^15.34.0`, the latest run reports **20 advisories: 0 critical, 9 high, 11 moderate, 0 low**. This is an improvement, but 9 high advisories remain. Affected dependency families include `tar`, `firebase-tools`, `firebase`, `@firebase/firestore`, `@firebase/rules-unit-testing`, `undici`, and proxy-related dependencies.

The repository has no committed `package-lock.json`; CI currently uses `npm install`, so dependency resolution is not reproducible. A lockfile should be generated and committed only after dependency versions are reviewed and tests pass. Do not run `npm audit fix --force` blindly: suggested remediations include major-version changes.

A new CI security gate was added in commit `7a205fc5f95bd3565e6c5133bdc8e196f26d7f1f`. Run `38871297530` confirmed the gate blocks CI with 1 critical and 13 high advisories after 15 Rules tests passed. After the CLI upgrade, run `38871764550` reduced the audit to 0 critical and 9 high, but the Rules tests did not run successfully because Java 21 was missing. Commit `ba0b9926717cfe9b94c6240fd660aa80cb0cd595` adds Java 21 setup, and run `38876213373` confirms all 15 Rules tests now pass. The workflow still fails the security gate because 9 high advisories remain. The gate is a release-quality guardrail, not a vulnerability fix.

Triage step: `firebase-tools` was upgraded from `^13.35.1` to `^15.34.0` in commit `1f66a52f2e9b2ffd5acf8fffc4866638585ec627`. Public package security data identifies 15.34.0 as the latest release and reports no direct vulnerabilities in that version; this does not establish that its full dependency tree is clean. The resulting CI run must validate compatibility and the remaining audit. Other Firebase SDK / rules-testing advisories have not been changed pending careful compatibility review.

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
