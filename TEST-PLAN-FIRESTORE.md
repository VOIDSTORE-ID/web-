# VOID STORE — Firestore Rules Test Report (Draft Only)

Status: isolated Firebase Emulator tests have been executed successfully on the draft branch. This is not a production deployment or an end-to-end test against the live Firebase project.

## Automated test result

GitHub Actions run: https://github.com/VOIDSTORE-ID/web-/actions/runs/38863666192

- Workflow job: `firestore-rules` — completed successfully.
- Test command: `npm run test:rules` against the local Firestore Emulator.
- Result: 11 tests passed, 0 failed.
- The test harness loads `firestore.rules` directly into an isolated emulator project named `voidstore-rules-isolated-test`.

Covered scenarios include public catalog reads, valid anonymous order creation, tampered price rejection, inactive product/payment-method rejection, anonymous order-read denial, active staff order access/progress updates, staff payment-status denial, owner payment-status update, inactive staff denial, staff catalog/role-escalation denial, and denial for unlisted collections.

## Remaining checks before release

1. Review and browser-test the customer checkout, WhatsApp handoff, owner login, staff login, order status updates, product edits, payment-method toggles, and owner-only payment-status changes using a safe test environment.
2. Confirm the production Firebase documents and fields match the draft Rules and UI assumptions. Do not run test writes against production.
3. Reconcile this branch with the current `main` branch and inspect the final diff before any merge or deployment.
4. Investigate dependency security findings from CI (`npm install` reported 32 advisories: 21 moderate, 10 high, 1 critical). Determine whether they affect runtime or development-only dependencies; resolve safely without blindly applying force upgrades.
5. Add appropriate abuse mitigation and monitoring for anonymous order creation. Firestore Rules validate data but do not rate-limit requests; evaluate Firebase App Check and/or server-side controls.
6. Verify the configured WhatsApp number and owner account/profile with non-sensitive checks before release.
7. Confirm browser Firebase configuration is intended for public use; rely on Authentication and Rules, not config secrecy, to protect data.
8. Run final regression tests after fixes and document exact commit SHA and rollback procedure.

## Security expectations

- Public users may read catalog and payment-method metadata and create only schema-valid orders tied to active product/method documents with matching names and price.
- Public users must not read orders or other users' profiles.
- Active staff may read orders and update allowed order progress, but may not change payment status or manage catalog/users.
- Only an active owner may change payment status, manage catalog/payment methods, or manage staff profiles.
- Unlisted collections remain denied by default.

## Safety status

The production Firebase Rules were not published. The live GitHub Pages site and `main` branch were not changed by this report update. Do not deploy until the remaining checks are completed and a final production release is explicitly approved.
