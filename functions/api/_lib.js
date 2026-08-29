// functions/api/_lib.js — 共通ロジック（KV は「変数名 SYNC」で接続）
export const NINE_HOURS_MS = 9 * 60 * 60 * 1000;
export const PIN_TTL_SEC = 600;                 // 未認証のPIN/QRの寿命（10分）
export const ALLOW_SAME_DAY_REAUTH = false;     // 同日中の再認証を許可するなら true

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS } });
export const preflight = () => new Response(null, { status: 204, headers: CORS });

export const jstDate = (ts = Date.now()) => new Date(ts + 9 * 3600 * 1000).toISOString().slice(0, 10);
export const rndToken = (bytes = 16) => { const a = new Uint8Array(bytes); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, "0")).join(""); };
export const pin8 = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(a[0] % 1e8).padStart(8, "0"); };
export const getJSON = async (kv, k) => { const v = await kv.get(k); return v ? JSON.parse(v) : null; };
export const putJSON = (kv, k, val, opts) => kv.put(k, JSON.stringify(val), opts);
export const readBody = async (request) => { try { return await request.json(); } catch { return {}; } };
