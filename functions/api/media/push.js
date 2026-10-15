// POST /api/media/push — 手元側: 待機スライドショーの画像を送信（変更時だけ・軽量な state とは別保存）
import { json, getJSON, putJSON, readBody } from "../_lib.js";

const MAX_SLIDES = 20;
const MAX_BYTES = 20 * 1024 * 1024; // KV の1値上限(25MiB)より余裕をもたせる

export async function onRequestPost({ request, env }) {
  const kv = env.SYNC;
  if (!kv) return json({ error: "kv_unbound", message: "KV名前空間『SYNC』が接続されていません。" }, 500);

  const { sessionId, sellerToken, ver, slides } = await readBody(request);
  if (!sessionId || !sellerToken) return json({ error: "auth" }, 400);
  const sess = await getJSON(kv, `sess:${sessionId}`);
  if (!sess || sess.sellerToken !== sellerToken) return json({ error: "auth" }, 401);
  if (sess.status !== "active" || Date.now() > sess.expiresAt) return json({ error: "expired", expiresAt: sess.expiresAt }, 410);

  const list = Array.isArray(slides) ? slides.filter(s => typeof s === "string" && /^data:image\/(jpeg|png|webp|gif);base64,/.test(s)) : [];
  if (list.length > MAX_SLIDES) return json({ error: "too_many", message: `画像は${MAX_SLIDES}枚までです。` }, 413);
  const bytes = list.reduce((a, s) => a + s.length, 0);
  if (bytes > MAX_BYTES) return json({ error: "too_large", message: "画像の合計サイズが大きすぎます。枚数を減らしてください。" }, 413);

  const ttl = Math.max(60, Math.ceil((sess.expiresAt - Date.now()) / 1000) + 120);
  await putJSON(kv, `media:${sessionId}`, { ver: String(ver || Date.now()), slides: list, ts: Date.now() }, { expirationTtl: ttl });
  return json({ ok: true, ver: String(ver || ""), count: list.length });
}
