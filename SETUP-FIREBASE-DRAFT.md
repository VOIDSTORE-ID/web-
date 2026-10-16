# VOID STORE — draft Firebase

Status: DEVELOPMENT DRAFT ONLY. This branch is not the live GitHub Pages site.

## Files
- `index.html`: Firebase Web SDK client for the public UC catalog, checkout order creation, WhatsApp handoff, and a role-gated admin dashboard.
- `firestore.rules`: proposed Firestore rules for review. They have NOT been published to Firebase.

## Firebase project
- Project ID: `voidstore-8c351`
- Firestore region: `asia-southeast2`
- Admin WhatsApp configured in the page: `6285813172078`

## Expected Firestore data
`products`: documents use the actual IDs already created in the console, such as `60_uc`, `120_uc`, `180_uc`, `240_uc`, `325_uc`, `385_uc`, `445_uc`, `505_uc`, `565_uc`, `660_uc`. Fields used: `name` (string), `price` (integer Rupiah), `active` (boolean), `sortOrder` (integer).

`paymentMethods`: `dana`, `qris`, `gopay`, `ovo`; fields used: `name` (string), `active` (boolean), `sortOrder` (integer).

`users/{Firebase Auth UID}`: owner/staff profile with `role` set to `owner` or `staff` and `active: true`. Never let a public user assign themselves a role.

`orders` is created by the app only after a successful checkout write.

## Important limitations / before launch
1. Leave the currently published deny-all Firestore Rules untouched until rules are tested. The proposed rules file here is not deployed.
2. Use Firebase Rules Playground or Emulator Suite to test public reads, valid/invalid order creation, anonymous access to orders, owner/staff permissions, and role escalation attempts.
3. Add anti-abuse protections (for example Firebase App Check and sensible abuse monitoring) before public launch. Anonymous order creation can be abused.
4. Test the real product/method document fields and prices against Firestore. No test has been run against the live Firebase project from this draft.
5. Payment is not automatic. The page saves an order and opens WhatsApp; it does not verify transfer/QRIS payments.
6. The GitHub Pages production branch was not changed or published by this draft work.
