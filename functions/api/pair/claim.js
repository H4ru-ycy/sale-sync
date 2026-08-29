// POST /api/pair/claim — 手元側: PINで認証 → 9時間有効
import { json, jstDate, rndToken, getJSON, putJSON, readBody, NINE_HOURS_MS } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const kv = env.SYNC;
  if (!kv) return json({ error: "kv_unbound", message: "KV名前空間『SYNC』が接続されていません。" }, 500);

  const body = await readBody(request);
  const pin = String(body.pin || "").replace(/\D/g, "");
  if (pin.length !== 8) return json({ error: "invalid_pin", message: "8桁のPINを入力してください。" }, 400);

  const pinRec = await getJSON(kv, `pin:${pin}`);
  if (!pinRec) return json({ error: "pin_not_found", message: "PINが無効か期限切れです。" }, 404);

  const sessKey = `sess:${pinRec.sessionId}`;
  const sess = await getJSON(kv, sessKey);
  if (!sess || sess.status !== "pending") return json({ error: "already_used", message: "この認証は既に使用済みです。" }, 409);

  const now = Date.now(), today = jstDate(now), sellerToken = rndToken(16), expiresAt = now + NINE_HOURS_MS;
  const ttl = Math.ceil(NINE_HOURS_MS / 1000) + 300;
  await putJSON(kv, sessKey, { ...sess, status: "active", claimedAt: now, expiresAt, sellerToken }, { expirationTtl: ttl });
  await kv.delete(`pin:${pin}`);
  await putJSON(kv, `dev:${sess.deviceId}`, { lastAuthDate: today }, { expirationTtl: 60 * 60 * 26 });
  return json({ sessionId: pinRec.sessionId, sellerToken, expiresAt });
}
