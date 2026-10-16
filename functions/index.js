import { createHash } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { validatePayload } from "./validation.js";

initializeApp();
const db = getFirestore();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ORDERS_PER_WINDOW = 5;
const ALLOWED_FIELDS = [
  "customerName", "nickname", "playerId", "phone",
  "productId", "productName", "price", "paymentMethodId",
  "paymentMethodName", "orderStatus", "paymentStatus", "createdAt"
];

function ipKey(ip) {
  return createHash("sha256").update(ip).digest("hex");
}

export const submitOrder = onCall(
  { region: "asia-southeast2", maxInstances: 10, enforceAppCheck: false },
  async (request) => {
    const data = request.data;
    const payload = validatePayload(data);
    const ip = request.rawRequest.ip;
    if (typeof ip !== "string" || !ip.trim()) {
      throw new HttpsError("resource-exhausted", "Cannot validate request source. Try again later.");
    }

    const nowMs = Date.now();
    const windowStart = Math.floor(nowMs / WINDOW_MS) * WINDOW_MS;
    const resetAt = Timestamp.fromMillis(windowStart + WINDOW_MS);
    const key = ipKey(ip.trim());
    const rateRef = db.collection("_orderRateLimits").doc(key);
    const orderRef = db.collection("orders").doc();
    const productRef = db.collection("products").doc(payload.productId);
    const methodRef = db.collection("paymentMethods").doc(payload.paymentMethodId);

    await db.runTransaction(async (tx) => {
      const [rateSnap, productSnap, methodSnap] = await Promise.all([
        tx.get(rateRef), tx.get(productRef), tx.get(methodRef)
      ]);

      const rateData = rateSnap.exists ? rateSnap.data() : {};
      const sameWindow = rateData.windowStartMs === windowStart;
      const count = sameWindow ? Number(rateData.count || 0) : 0;
      if (count >= MAX_ORDERS_PER_WINDOW) {
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
        windowStartMs: windowStart,
        count: count + 1,
        resetAt,
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
    });

    return { orderId: orderRef.id };
  }
);
