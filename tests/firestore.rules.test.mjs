import { readFileSync } from "node:fs";
import { before, after, beforeEach, test } from "node:test";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "firebase/firestore";

const projectId = "voidstore-rules-isolated-test";
let env;

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules, host: "127.0.0.1", port: 8080 }
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "products/60_uc"), { name: "60 UC", price: 16000, active: true, sortOrder: 1 });
    await setDoc(doc(db, "products/disabled_uc"), { name: "Disabled UC", price: 20000, active: false, sortOrder: 2 });
    await setDoc(doc(db, "paymentMethods/dana"), { name: "DANA", active: true, sortOrder: 1 });
    await setDoc(doc(db, "paymentMethods/disabled_method"), { name: "Disabled method", active: false, sortOrder: 2 });
    await setDoc(doc(db, "orders/order1"), {
      customerName: "Test Customer", nickname: "Tester", playerId: "123456",
      phone: "081234567890", productId: "60_uc", productName: "60 UC", price: 16000,
      paymentMethodId: "dana", paymentMethodName: "DANA",
      orderStatus: "Menunggu diproses", paymentStatus: "Menunggu pembayaran",
      createdAt: new Date()
    });
    await setDoc(doc(db, "users/ownerA"), { role: "owner", active: true, email: "owner@example.test" });
    await setDoc(doc(db, "users/staffA"), { role: "staff", active: true, email: "staff@example.test" });
    await setDoc(doc(db, "users/staffInactive"), { role: "staff", active: false });
  });
});

function validOrder(overrides = {}) {
  return {
    customerName: "Test Customer", nickname: "Tester", playerId: "123456",
    phone: "081234567890", productId: "60_uc", productName: "60 UC", price: 16000,
    paymentMethodId: "dana", paymentMethodName: "DANA",
    orderStatus: "Menunggu diproses", paymentStatus: "Menunggu pembayaran",
    createdAt: serverTimestamp(), ...overrides
  };
}

test("public catalog reads succeed", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDocs(query(collection(db, "products"), orderBy("sortOrder"))));
  await assertSucceeds(getDocs(query(collection(db, "paymentMethods"), orderBy("sortOrder"))));
});

test("anonymous customer can create a valid order", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(db, "orders/newOrder"), validOrder()));
});

test("order with manipulated price or product name is denied", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "orders/badPrice"), validOrder({ price: 1 })));
  await assertFails(setDoc(doc(db, "orders/badName"), validOrder({ productName: "Different product" })));
});

test("order using inactive product or payment method is denied", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "orders/disabledProduct"), validOrder({ productId: "disabled_uc", productName: "Disabled UC", price: 20000 })));
  await assertFails(setDoc(doc(db, "orders/disabledMethod"), validOrder({ paymentMethodId: "disabled_method", paymentMethodName: "Disabled method" })));
});

test("anonymous customer cannot read orders", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "orders/order1")));
  await assertFails(getDocs(collection(db, "orders")));
});

test("active staff can read orders and update order progress", async () => {
  const db = env.authenticatedContext("staffA").firestore();
  await assertSucceeds(getDoc(doc(db, "orders/order1")));
  await assertSucceeds(updateDoc(doc(db, "orders/order1"), {
    orderStatus: "Diproses", updatedAt: serverTimestamp(), updatedBy: "staffA"
  }));
});

test("staff cannot change payment status", async () => {
  const db = env.authenticatedContext("staffA").firestore();
  await assertFails(updateDoc(doc(db, "orders/order1"), {
    paymentStatus: "Dibayar", updatedAt: serverTimestamp(), updatedBy: "staffA"
  }));
  await assertFails(updateDoc(doc(db, "orders/order1"), {
    orderStatus: "Diproses", paymentStatus: "Dibayar",
    updatedAt: serverTimestamp(), updatedBy: "staffA"
  }));
});

test("owner can change payment status", async () => {
  const db = env.authenticatedContext("ownerA").firestore();
  await assertSucceeds(updateDoc(doc(db, "orders/order1"), {
    paymentStatus: "Dibayar", updatedAt: serverTimestamp(), updatedBy: "ownerA"
  }));
});

test("inactive staff cannot read orders", async () => {
  const db = env.authenticatedContext("staffInactive").firestore();
  await assertFails(getDoc(doc(db, "orders/order1")));
});

test("staff cannot edit catalog or promote self", async () => {
  const db = env.authenticatedContext("staffA").firestore();
  await assertFails(updateDoc(doc(db, "products/60_uc"), { name: "Fake price", price: 1, active: true, sortOrder: 1, updatedAt: serverTimestamp(), updatedBy: "staffA" }));
  await assertFails(updateDoc(doc(db, "users/staffA"), { role: "owner", active: true }));
});

test("owner can edit product and payment method with audit fields", async () => {
  const db = env.authenticatedContext("ownerA").firestore();
  await assertSucceeds(updateDoc(doc(db, "products/60_uc"), {
    price: 17000, name: "60 UC", active: true, sortOrder: 1,
    updatedAt: serverTimestamp(), updatedBy: "ownerA"
  }));
  await assertSucceeds(updateDoc(doc(db, "paymentMethods/dana"), {
    name: "DANA", active: false, sortOrder: 1,
    updatedAt: serverTimestamp(), updatedBy: "ownerA"
  }));
});

test("staff cannot delete orders; owner can", async () => {
  const staffDb = env.authenticatedContext("staffA").firestore();
  await assertFails(deleteDoc(doc(staffDb, "orders/order1")));
  const ownerDb = env.authenticatedContext("ownerA").firestore();
  await assertSucceeds(deleteDoc(doc(ownerDb, "orders/order1")));
});

test("unlisted collections are denied", async () => {
  const db = env.authenticatedContext("ownerA").firestore();
  await assertFails(getDoc(doc(db, "privateSecrets/secret1")));
  await assertFails(setDoc(doc(db, "privateSecrets/secret2"), { value: "nope" }));
});

test("order rejects unknown fields and invalid customer data", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "orders/unknownField"), validOrder({ admin: true })));
  await assertFails(setDoc(doc(db, "orders/emptyName"), validOrder({ customerName: "" })));
  await assertFails(setDoc(doc(db, "orders/longName"), validOrder({ customerName: "x".repeat(81) })));
  await assertFails(setDoc(doc(db, "orders/badPlayerId"), validOrder({ playerId: "1234" })));
  await assertFails(setDoc(doc(db, "orders/badPhone"), validOrder({ phone: "x" })));
});

test("order rejects mismatched payment method metadata", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "orders/badPaymentName"), validOrder({ paymentMethodName: "Fake payment" })));
});
