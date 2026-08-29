// POST /api/state/push — 手元側: 計算内容を送信
import { json, getJSON, putJSON, readBody } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const kv = env.SYNC;
  if (!kv) return json({ error: "kv_unbound", message: "KV名前空間『SYNC』が接続されていません。" }, 500);

  const { sessionId, sellerToken, state } = await readBody(request);
  if (!sessionId || !sellerToken) return json({ error: "auth" }, 400);
  const sess = await getJSON(kv, `sess:${sessionId}`);
  if (!sess || sess.sellerToken !== sellerToken) return json({ error: "auth" }, 401);
  if (sess.status !== "active" || Date.now() > sess.expiresAt) return json({ error: "expired", expiresAt: sess.expiresAt }, 410);

  const ttl = Math.max(60, Math.ceil((sess.expiresAt - Date.now()) / 1000) + 120);
  await putJSON(kv, `state:${sessionId}`, { ...state, ts: Date.now() }, { expirationTtl: ttl });
  return json({ ok: true, expiresAt: sess.expiresAt });
}
