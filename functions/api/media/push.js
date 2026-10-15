/* sync-sender.js — 売上計算ツールが読み込む送信ライブラリ
   ・SalesSync.connectWithPin(pin) / SalesSync.update({title,items,total,idle,alert})
   ・SalesSync.pushMedia(slides, ver) … 待機スライドショー画像（dataURL配列）を送信
   ・items は {name, price, qty, kind}
   ・idle  は {on, sec, fit, ver, count}（待機スライドショー設定）
   ・alert は {on, text, size, color, bg, style, id}（割り込み表示） */
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
  function clampNum(v, lo, hi, d){ v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }
  function normIdle(i){
    if(!i) return undefined;
    return { on:!!i.on, sec:clampNum(i.sec,2,120,8), fit: i.fit==="cover" ? "cover" : "contain",
             ver:String(i.ver||""), count:clampNum(i.count,0,99,0) };
  }
  function normAlert(a){
    if(!a || !a.on) return { on:false };
    return { on:true, text:String(a.text||"").slice(0,200), size:clampNum(a.size,3,40,12),
             color:String(a.color||"#ffffff").slice(0,9), bg:String(a.bg||"#c0392b").slice(0,9),
             style: a.style==="banner" ? "banner" : "full", id:String(a.id||"") };
  }
  function normalize(s){
    const items = (s.items||[]).map(function(it){
      return { name:String(it.name==null?"":it.name), price:Number(it.price)||0,
               qty:Number(it.qty)||0, kind:String(it.kind==null?"":it.kind) };
    });
    const total = Number.isFinite(s.total) ? s.total : items.reduce(function(a,it){ return a+it.price*it.qty; },0);
    return { title: s.title!=null ? String(s.title) : undefined, items:items, total:total,
             idle:normIdle(s.idle), alert:normAlert(s.alert) };
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
  async function pushMedia(slides, ver){
    if(!active()) return { error:"inactive" };
    try{
      const r = await api("/media/push", { method:"POST", body: JSON.stringify({
        sessionId: sess.sessionId, sellerToken: sess.sellerToken, ver: ver, slides: slides||[] }) });
      if(r && r.error === "expired"){ drop(); }
      return r || { error:"network" };
    }catch(e){ return { error:"network" }; }
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
  function sessionId(){ return active() ? sess.sessionId : null; }
  global.SalesSync = { update:update, connectWithPin:connectWithPin, pushMedia:pushMedia, sessionId:sessionId,
                       disconnect:drop, isActive:active, _config:CONFIG };
})(window);
