// GET /api/media/pull — 出力側: 待機スライドショーの画像を取得（ver が変わった時だけ呼ぶ）
import { json, getJSON } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const kv = env.SYNC;
  if (!kv) return json({ error: "kv_unbound" }, 500);

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") || "";
  const outToken = url.searchParams.get("token") || "";
  if (!sessionId || !outToken) return json({ status: "invalid" }, 400);

  const sess = await getJSON(kv, `sess:${sessionId}`);
  if (!sess || sess.outToken !== outToken) return json({ status: "invalid" }, 401);

  const media = await getJSON(kv, `media:${sessionId}`);
  return json({ status: "ok", ver: media ? media.ver : null, slides: media ? media.slides : [] });
}
