import test from "node:test";
import assert from "node:assert/strict";

// Keep validation behavior in a pure module so it can be tested without Firebase credentials.
import { validatePayload } from "../validation.js";

const good = {
  customerName: "Test Customer", nickname: "Tester", playerId: "123456",
  phone: "081234567890", productId: "60_uc", paymentMethodId: "dana"
};

test("accepts a well-formed order request", () => {
  assert.deepEqual(validatePayload(good), good);
});
test("rejects malformed player IDs", () => {
  assert.throws(() => validatePayload({ ...good, playerId: "12ab" }), /Player ID/);
});
test("rejects unknown fields", () => {
  assert.throws(() => validatePayload({ ...good, admin: true }), /unsupported/);
});
test("trims customer fields and rejects blank names", () => {
  assert.equal(validatePayload({ ...good, customerName: "  Customer  " }).customerName, "Customer");
  assert.throws(() => validatePayload({ ...good, customerName: " " }), /customerName/);
});
