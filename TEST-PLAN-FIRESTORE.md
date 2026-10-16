# VOID STORE — Firestore Rules Test Plan (Draft Only)

Status: test cases prepared; NOT executed against Firebase Emulator or a separate Firebase project.
Scope: validate the proposed `firestore.rules` in an isolated environment only.
Safety: do not publish these Rules to the production Firebase project. Production currently remains deny-all.

## Test fixtures for an isolated test database

Create test identities:
- `ownerA`: Firebase Auth user with `users/{ownerA_uid}` profile `{ role: "owner", active: true }`
- `staffA`: Firebase Auth user with `users/{staffA_uid}` profile `{ role: "staff", active: true }`
- `staffInactive`: Firebase Auth user with `users/{staffInactive_uid}` profile `{ role: "staff", active: false }`
- `customerAnon`: unauthenticated client

Seed:
- `products/60_uc`: `{ name: "60 UC", price: 16000, active: true, sortOrder: 1 }`
- `products/disabled_uc`: `{ name: "Disabled UC", price: 20000, active: false, sortOrder: 2 }`
- `paymentMethods/dana`: `{ name: "DANA", active: true, sortOrder: 1 }`
- `paymentMethods/disabled_method`: `{ name: "Disabled method", active: false, sortOrder: 2 }`
- `orders/order1`: valid order with `orderStatus: "Menunggu diproses"`, `paymentStatus: "Menunggu pembayaran"`

## Required authorization tests

| ID | Actor | Action | Expected |
|---|---|---|---|
| R01 | Anonymous | Read product catalog | ALLOW |
| R02 | Anonymous | Read paymentMethods collection | ALLOW (metadata only; never store payment secrets here) |
| R03 | Anonymous | Create valid order using active product/method and exact price/name | ALLOW |
| R04 | Anonymous | Create order with altered price or product name | DENY |
| R05 | Anonymous | Create order using inactive product or payment method | DENY |
| R06 | Anonymous | Read orders | DENY |
| R07 | Staff active | Read orders | ALLOW |
| R08 | Staff active | Change only orderStatus to an allowed value and set updatedBy to own UID, updatedAt to request.time | ALLOW |
| R09 | Staff active | Change paymentStatus to "Dibayar" | DENY |
| R10 | Staff active | Change paymentStatus to "Dibatalkan" | DENY |
| R11 | Staff active | Change orderStatus and paymentStatus in same update | DENY |
| R12 | Owner active | Change paymentStatus to "Dibayar", with audit fields | ALLOW |
| R13 | Owner active | Change orderStatus with audit fields | ALLOW |
| R14 | Inactive staff | Read or update orders | DENY |
| R15 | Staff active | Edit product price or payment method active flag | DENY |
| R16 | Owner active | Edit product price / payment method active flag with valid schema and audit fields | ALLOW |
| R17 | Staff active | Promote self or another user to owner | DENY |
| R18 | Any user | Read/write an unlisted collection | DENY |
| R19 | Staff active | Delete order | DENY |
| R20 | Owner active | Delete order | ALLOW |

## Important test notes

1. Run these cases using the Firebase Emulator Suite or a separate disposable Firebase project, never the production database.
2. The Firebase Console Rules Playground tests the currently published Rules; it cannot validate this un-published draft directly.
3. For create-order tests, use a server timestamp so the stored `createdAt` resolves to `request.time`.
4. For staff order-status updates, preserve `paymentStatus` unchanged. For owner payment-status tests, include `updatedAt: serverTimestamp()` and `updatedBy: ownerA_uid`.
5. Check all failed attempts are denied by Firestore, not merely hidden/disabled in the dashboard UI.
6. Anonymous order creation can still be abused at scale. These Rules do not provide rate limiting. Consider App Check and server-side abuse controls before public launch.
7. Do not store payment credentials, QR secrets, private keys, or other sensitive payment data in publicly readable `paymentMethods` documents.

## Current limitations / next step

No Firebase Emulator, Node.js runtime, or isolated Firebase test project is available through the current connected tools. Therefore this document is a test plan, not a test report. Do not claim the Rules passed until the cases are actually executed and results recorded.
