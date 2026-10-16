# Draft order spam protection

This branch routes new orders through the Firebase callable function `submitOrder` rather than allowing browser clients to write to `orders` directly.

## Current draft behavior
- Callable endpoint is configured for region `asia-southeast2`, but it has **not been deployed**.
- The server re-reads the selected product and payment method and uses current catalog values for the order price/name.
- Order payload fields and Player ID format are validated on the server.
- A Firestore transaction permits at most 5 successful order submissions per source IP per fixed 10-minute window.
- Only a SHA-256 hash of the source IP is stored in the private `_orderRateLimits` collection; raw IP addresses are not written.
- Firestore Rules deny all direct client creation in `orders`, preventing bypass of the backend rate limit.
- Rules tests and backend payload-validation tests run in CI.

## Important limitations before release
1. This is draft code; it is not deployed. Production Rules and the live site must remain unchanged until an explicitly approved release.
2. Deploying Cloud Functions requires a Firebase project with Functions enabled and may require the Blaze billing plan. Do not enable billing or deploy without the owner's explicit consent.
3. App Check enforcement is currently disabled on the callable endpoint. Before public release, register the web app with Firebase App Check, add the real reCAPTCHA Enterprise/site configuration to the client, test it, and then enable `enforceAppCheck`. Do not use a fake key or enable enforcement before the client is configured.
4. IP rate limiting is a useful baseline, not complete bot prevention. Shared networks can share a limit; distributed IPs can evade it. Consider App Check, abuse monitoring, alerting, and a reviewed escalation policy.
5. Existing order creation in the live site depends on production Rules. Because the production Rules have not been changed, this draft must not be merged/deployed until the backend and Rules are released together.
6. Run an emulator/integration test for the callable function and a manual browser E2E test in a non-production Firebase project before release. Do not use real customer data.

## Local checks
- Root: `npm install && npm run test:rules`
- Functions: `npm install --prefix functions && npm test --prefix functions`
- Audit: `npm audit --prefix functions --audit-level=high`

The backend function currently uses the Firebase Admin SDK and therefore bypasses Firestore Rules. Its validation and rate-limit transaction must be reviewed carefully before deployment.
