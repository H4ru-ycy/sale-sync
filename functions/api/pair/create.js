// POST /api/pair/create — 出力側: 認証開始（PIN発行）
import { json, jstDate, rndToken, pin8, getJSON, putJSON, readBody, PIN_TTL_SEC, ALLOW_SAME_DAY_REAUTH } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const kv = env.SYNC;
  if (!kv) return json({ error: "kv_unbound", message: "KV名前空間『SYNC』が接続されていません。" }, 500);

  const body = await readBody(request);
  const deviceId = String(body.deviceId || "").slice(0, 64);
  if (!deviceId) return json({ error: "device_required" }, 400);

  const today = jstDate();
  if (!ALLOW_SAME_DAY_REAUTH) {
    const dev = await getJSON(kv, `dev:${deviceId}`);
    if (dev && dev.lastAuthDate === today)
      return json({ error: "date_locked", message: "本日はすでに認証済みです。日付が変わると再認証できます。" }, 409);
  }

  const now = Date.now();
  const sessionId = rndToken(16), outToken = rndToken(16), pin = pin8();
  await putJSON(kv, `sess:${sessionId}`, {
    status: "pending", createdAt: now, createdDate: today, expiresAt: null,
    outToken, sellerToken: null, deviceId,
  }, { expirationTtl: PIN_TTL_SEC + 60 });
  await putJSON(kv, `pin:${pin}`, { sessionId }, { expirationTtl: PIN_TTL_SEC });
  return json({ sessionId, outToken, pin, ttl: PIN_TTL_SEC });
}
