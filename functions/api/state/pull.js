// GET /api/state/pull — 出力側: 状態を取得（ポーリング）
import { json, getJSON } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const kv = env.SYNC;
  if (!kv) return json({ error: "kv_unbound", message: "KV名前空間『SYNC』が接続されていません。" }, 500);

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") || "";
  const outToken = url.searchParams.get("token") || "";
  if (!sessionId || !outToken) return json({ status: "invalid" }, 400);

  const sess = await getJSON(kv, `sess:${sessionId}`);
  if (!sess || sess.outToken !== outToken) return json({ status: "invalid" }, 401);
  if (sess.status === "pending") return json({ status: "pending" });
  if (sess.status === "active" && Date.now() > sess.expiresAt) return json({ status: "expired", expiresAt: sess.expiresAt });
  if (sess.status !== "active") return json({ status: sess.status });

  const state = await getJSON(kv, `state:${sessionId}`);
  return json({ status: "active", expiresAt: sess.expiresAt, state: state || null });
}
