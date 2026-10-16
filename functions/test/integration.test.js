import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.GCLOUD_PROJECT || "demo-voidstore-integration";
assert.match(process.env.FIRESTORE_EMULATOR_HOST || "", /^127\.0\.0\.1:8080$/);
assert.match(process.env.FUNCTIONS_EMULATOR || "true", /true/);

initializeApp({ projectId });
const db = getFirestore();
const endpoint = `http://127.0.0.1:5001/${projectId}/asia-southeast2/submitOrder`;

const payload = {
  customerName: "Integration Customer",
  nickname: "IntegrationPlayer",
  playerId: "123456789",
  phone: "081234567890",
  productId: "integration_product",
  paymentMethodId: "integration_payment"
};

async function call(data) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data })
  });
  assert.equal(response.status, 200, `Callable HTTP response should be 200, got ${response.status}`);
  return response.json();
}

try {
  await db.collection("products").doc(payload.productId).set({
    name: "Integration Package", price: 12345, active: true, sortOrder: 1
  });
  await db.collection("paymentMethods").doc(payload.paymentMethodId).set({
    name: "Integration Payment", active: true, sortOrder: 1
  });
  await db.collection("products").doc("integration_inactive").set({
    name: "Inactive Package", price: 999, active: false, sortOrder: 2
  });

  const forged = await call({ ...payload, price: 1, orderStatus: "Selesai" });
  assert.equal(forged.error?.status, "INVALID_ARGUMENT", "forged server-owned fields must be rejected");

  const inactive = await call({ ...payload, productId: "integration_inactive" });
  assert.equal(inactive.error?.status, "FAILED_PRECONDITION", "inactive products must be rejected");

  const first = await call(payload);
  assert.ok(first.result?.orderId, "valid request should return an order ID");
  const saved = await db.collection("orders").doc(first.result.orderId).get();
  assert.equal(saved.exists, true);
  assert.equal(saved.data().price, 12345, "server must use catalog price");
  assert.equal(saved.data().productName, "Integration Package");
  assert.equal(saved.data().orderStatus, "Menunggu diproses");

  for (let i = 0; i < 4; i++) {
    const result = await call({ ...payload, nickname: `IntegrationPlayer${i}` });
    assert.ok(result.result?.orderId, `submission ${i + 2} should be accepted`);
  }
  const sixth = await call({ ...payload, nickname: "SixthAttempt" });
  assert.equal(sixth.error?.status, "RESOURCE_EXHAUSTED", "sixth request in window must be rate-limited");

  console.log("Callable integration checks passed: forged fields rejected, inactive catalog rejected, server price trusted, five orders allowed, sixth blocked.");
} finally {
  await db.terminate();
}
