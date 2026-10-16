import { createHash } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { validatePayload } from "./validation.js";
import { getRateLimitState } from "./rate-limit.js";

initializeApp();
const db = getFirestore();


function ipKey(ip) {
  return createHash("sha256").update(ip).digest("hex");
}

export const submitOrder = onCall(
  { region: "asia-southeast2", maxInstances: 10, enforceAppCheck: false },
  async (request) => {
    const data = request.data;
    const payload = validatePayload(data);
    // The Functions Emulator may omit req.ip in local callable requests. Use a
    // deterministic loopback identity only in emulator mode; production fails closed.
    const ip = request.rawRequest.ip ||
      (process.env.FUNCTIONS_EMULATOR === "true" ? "127.0.0.1" : null);
    if (typeof ip !== "string" || !ip.trim()) {
      throw new HttpsError("resource-exhausted", "Cannot validate request source. Try again later.");
    }

    const nowMs = Date.now();
    const key = ipKey(ip.trim());
    const rateRef = db.collection("_orderRateLimits").doc(key);
    const orderRef = db.collection("orders").doc();
    const productRef = db.collection("products").doc(payload.productId);
    const methodRef = db.collection("paymentMethods").doc(payload.paymentMethodId);

    const orderSummary = await db.runTransaction(async (tx) => {
      const [rateSnap, productSnap, methodSnap] = await Promise.all([
        tx.get(rateRef), tx.get(productRef), tx.get(methodRef)
      ]);

      const rateState = getRateLimitState(rateSnap.exists ? rateSnap.data() : {}, nowMs);
      if (!rateState.allowed) {
        throw new HttpsError("resource-exhausted", "Terlalu banyak pesanan dari jaringan ini. Coba lagi beberapa menit.");
      }
      if (!productSnap.exists || productSnap.data().active !== true) {
        throw new HttpsError("failed-precondition", "Paket tidak tersedia.");
      }
      if (!methodSnap.exists || methodSnap.data().active !== true) {
        throw new HttpsError("failed-precondition", "Metode pembayaran tidak tersedia.");
      }

      const product = productSnap.data();
      const method = methodSnap.data();
      if (!Number.isSafeInteger(product.price) || product.price < 0 ||
          typeof product.name !== "string" ||
          typeof method.name !== "string") {
        throw new HttpsError("failed-precondition", "Data katalog tidak valid.");
      }

      tx.set(rateRef, {
        windowStartMs: rateState.windowStartMs,
        count: rateState.nextCount,
        resetAt: Timestamp.fromMillis(rateState.resetAtMs),
        updatedAt: FieldValue.serverTimestamp()
      });
      tx.create(orderRef, {
        customerName: payload.customerName,
        nickname: payload.nickname,
        playerId: payload.playerId,
        phone: payload.phone,
        productId: payload.productId,
        productName: product.name,
        price: product.price,
        paymentMethodId: payload.paymentMethodId,
        paymentMethodName: method.name,
        orderStatus: "Menunggu diproses",
        paymentStatus: "Menunggu pembayaran",
        createdAt: FieldValue.serverTimestamp()
      });

      return {
        productName: product.name,
        price: product.price,
        paymentMethodName: method.name
      };
    });

    return { orderId: orderRef.id, ...orderSummary };
  }
);
