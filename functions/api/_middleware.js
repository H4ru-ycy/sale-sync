// functions/api/_middleware.js — /api/* 共通。OPTIONS(プリフライト)応答とCORS付与。
import { CORS, preflight } from "./_lib.js";

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return preflight();
  const res = await context.next();
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  return out;
}
