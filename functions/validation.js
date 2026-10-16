import { HttpsError } from "firebase-functions/v2/https";

function cleanString(value, max, field) {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `Field ${field} must be text.`);
  }
  const result = value.trim();
  if (!result || result.length > max) {
    throw new HttpsError("invalid-argument", `Field ${field} is invalid.`);
  }
  return result;
}

export function validatePayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpsError("invalid-argument", "Order payload is invalid.");
  }
  const allowed = [
    "customerName", "nickname", "playerId", "phone",
    "productId", "productName", "price", "paymentMethodId",
    "paymentMethodName", "orderStatus", "paymentStatus", "createdAt"
  ];
  if (Object.keys(data).some((key) => !allowed.includes(key))) {
    throw new HttpsError("invalid-argument", "Order contains unsupported fields.");
  }
  const payload = {
    customerName: cleanString(data.customerName, 80, "customerName"),
    nickname: cleanString(data.nickname, 80, "nickname"),
    playerId: cleanString(data.playerId, 30, "playerId"),
    phone: cleanString(data.phone, 25, "phone"),
    productId: cleanString(data.productId, 150, "productId"),
    paymentMethodId: cleanString(data.paymentMethodId, 150, "paymentMethodId")
  };
  if (!/^[0-9]{5,30}$/.test(payload.playerId)) {
    throw new HttpsError("invalid-argument", "Player ID must contain 5–30 digits.");
  }
  if (payload.phone.length < 6) {
    throw new HttpsError("invalid-argument", "Phone number is invalid.");
  }
  return payload;
}
