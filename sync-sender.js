/* sync-sender.js — 売上計算ツールが読み込む送信ライブラリ */
(function (global) {
  const CONFIG = {
    API_BASE: (global.SALESYNC_API || "/api"),
    PUSH_DEBOUNCE_MS: 700,
  };
  const KEY = "salesync.sender";
  let sess = load();
  let lastState = null, pushTimer = null;

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || "null"); }catch(e){ return null; } }
  function save(s){ sess = s; try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }
  function drop(){ sess = null; try{ localStorage.removeItem(KEY); }catch(e){} }
  function active(){ return !!(sess && sess.expiresAt && Date.now() < sess.expiresAt); }

  async function api(path, opts){
    const res = await fetch(CONFIG.API_BASE + path, { headers:{ "Content-Type":"application/json" }, ...opts });
    return res.json().catch(()=>({}));
  }
  function normalize(s){
    const items = (s.items||[]).map(function(it){
      return { name:String(it.name==null?"":it.name), price:Number(it.price)||0,
               qty:Number(it.qty)||0, kind:String(it.kind==null?"":it.kind) };
    });
    const total = Number.isFinite(s.total) ? s.total : items.reduce(function(a,it){ return a+it.price*it.qty; },0);
    return { title: s.title!=null ? String(s.title) : undefined, items:items, total:total };
  }
  function update(state){
    lastState = normalize(state);
    if(!active()) return;
    if(pushTimer) return;
    pushTimer = setTimeout(flush, CONFIG.PUSH_DEBOUNCE_MS);
  }
  async function flush(){
    pushTimer = null;
    if(!active() || !lastState) return;
    try{
      const r = await api("/state/push", { method:"POST", body: JSON.stringify({
        sessionId: sess.sessionId, sellerToken: sess.sellerToken, state: lastState }) });
      if(r && r.error === "expired"){ drop(); }
    }catch(e){}
  }
  async function connectWithPin(pin){
    pin = String(pin||"").replace(/\D/g,"");
    if(pin.length !== 8) return false;
    const r = await api("/pair/claim", { method:"POST", body: JSON.stringify({ pin:pin }) });
    if(r && r.sessionId){
      save({ sessionId:r.sessionId, sellerToken:r.sellerToken, expiresAt:r.expiresAt });
      if(lastState){ flush(); }
      return true;
    }
    return false;
  }
  global.SalesSync = { update:update, connectWithPin:connectWithPin, disconnect:drop, isActive:active, _config:CONFIG };
})(window);
