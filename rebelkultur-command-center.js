(() => {
  const U = window.__RK_SUPABASE_URL, K = window.__RK_SUPABASE_KEY;
  if (!U || !K || !window.supabase?.createClient) return;
  const db = window.supabase.createClient(U, K);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money = v => Number(v || 0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
  const css = `
    .rk-center{margin:0 0 22px;border:1px solid #e5e7eb;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(15,23,42,.05);overflow:hidden}
    .rk-center-head{padding:22px;display:flex;justify-content:space-between;gap:18px;align-items:center;border-bottom:1px solid #eef0f3}
    .rk-center-head h3{margin:0 0 5px;font-size:22px}.rk-center-head p{margin:0;color:#6b7280}.rk-center-badge{font-size:12px;font-weight:800;border:1px solid #d1d5db;border-radius:999px;padding:7px 11px;white-space:nowrap}
    .rk-center-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:16px 22px}.rk-center-stat{padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc}.rk-center-stat strong{display:block;font-size:21px}.rk-center-stat span{font-size:12px;color:#6b7280}
    .rk-center-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;padding:0 22px 22px}.rk-center-panel{border:1px solid #e5e7eb;border-radius:13px;padding:15px}.rk-center-panel h4{margin:0 0 10px}.rk-center-action{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #eef0f3}.rk-center-action:first-of-type{border-top:0}.rk-center-action .ico{width:29px;height:29px;border-radius:50%;background:#f3f4f6;display:grid;place-items:center;flex:0 0 auto}.rk-center-action main{flex:1}.rk-center-action strong{display:block}.rk-center-action small{display:block;color:#6b7280;margin-top:2px}.rk-center-btn{border:1px solid #d1d5db;background:#fff;border-radius:9px;padding:7px 10px;cursor:pointer;font-weight:600;white-space:nowrap}.rk-center-btn:hover{background:#f9fafb}.rk-center-funnel{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.rk-center-funnel div{padding:11px;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;text-align:center}.rk-center-funnel strong{display:block;font-size:20px}.rk-center-funnel span{font-size:11px;color:#6b7280}.rk-center-note{margin-top:10px;font-size:12px;color:#6b7280}
    @media(max-width:760px){.rk-center-stats{grid-template-columns:repeat(2,1fr)}.rk-center-grid{grid-template-columns:1fr}.rk-center-head{align-items:flex-start;flex-direction:column}.rk-center-funnel{grid-template-columns:1fr}}
  `;
  if(!document.getElementById('rk-center-style')){const s=document.createElement('style');s.id='rk-center-style';s.textContent=css;document.head.appendChild(s)}
  let merchant, products=[], orders=[];

  async function load(){
    const {data:{user}}=await db.auth.getUser(); if(!user) return false;
    const {data:m}=await db.from('merchants').select('id,shop_name,slug,published').eq('owner_id',user.id).limit(1).maybeSingle();
    if(!m) return false; merchant=m;
    const {data:p}=await db.from('products').select('id,name,price,stock,description,image_url,created_at').eq('merchant_id',m.id);
    products=p||[];
    const ids=products.map(x=>x.id); if(!ids.length){orders=[];return true}
    const {data:oi}=await db.from('order_items').select('order_id,quantity,unit_price,product_id,orders!inner(id,status,total,created_at,merchant_id)').in('product_id',ids);
    const map=new Map(); (oi||[]).forEach(x=>{const o=x.orders;if(!o||o.merchant_id!==merchant.id||['new','cancelled'].includes(o.status))return;if(!map.has(o.id))map.set(o.id,{...o,items:0,revenue:0});const z=map.get(o.id);z.items+=Number(x.quantity||0);z.revenue+=Number(x.unit_price||0)*Number(x.quantity||0)});
    orders=[...map.values()]; return true;
  }
  function go(tab){if(typeof window.setDashTab==='function')window.setDashTab(tab);else document.querySelector(`.dash-tab[data-tab="${tab}"]`)?.click();window.scrollTo({top:0,behavior:'smooth'})}
  function shop(){return `${location.origin}${location.pathname}?shop=${encodeURIComponent(merchant.slug)}#shop`}
  function render(){
    const host=document.getElementById('dashboardOverview');if(!host||!merchant)return;
    let box=document.getElementById('rkCommandCenter');if(!box){box=document.createElement('section');box.id='rkCommandCenter';box.className='rk-center';const b=document.getElementById('rkShopBuilder');(b?b.after(box):host.prepend(box))}
    const stock=products.reduce((a,p)=>a+Number(p.stock||0),0), inventory=products.reduce((a,p)=>a+Number(p.stock||0)*Number(p.price||0),0);
    const paid=orders.filter(o=>['paid','processing','shipped','completed'].includes(o.status));
    const open=orders.filter(o=>['paid','processing'].includes(o.status));
    const missingDesc=products.filter(p=>!String(p.description||'').trim()).length, missingImg=products.filter(p=>!String(p.image_url||'').trim()).length;
    const actions=[];
    if(!products.length)actions.push(['📦','Produkte hinzufügen','Dein Shop hat noch keine Produkte.','products','Öffnen']);
    else if(missingDesc)actions.push(['✍️',`${missingDesc} Produkttexte verbessern`,'Fehlende Beschreibungen können automatisch ergänzt werden.','products','Öffnen']);
    if(missingImg)actions.push(['🖼️',`${missingImg} Produktbilder ergänzen`,'Gute Produktbilder helfen bei Suche und Empfehlungen.','products','Öffnen']);
    if(!merchant.published)actions.push(['🚀','Shop veröffentlichen','Wenn die Einrichtung fertig ist, kannst du deinen Shop sichtbar machen.','settings','Öffnen']);
    if(!actions.length)actions.push(['✓','Alles im grünen Bereich','Keine dringende Aufgabe erkannt. Rebelkultur optimiert weiter im Hintergrund.','','']);
    box.innerHTML=`<div class="rk-center-head"><div><h3>Rebelkultur Shop-Zentrale</h3><p>Wichtige Zahlen, nächste Schritte und automatische Empfehlungen auf einen Blick.</p></div><span class="rk-center-badge">${merchant.published?'SHOP ONLINE':'NOCH NICHT VERÖFFENTLICHT'}</span></div><div class="rk-center-stats"><div class="rk-center-stat"><strong>${products.length}</strong><span>Produkte</span></div><div class="rk-center-stat"><strong>${paid.length}</strong><span>Bestellungen</span></div><div class="rk-center-stat"><strong>${money(paid.reduce((a,o)=>a+o.revenue,0))}</strong><span>Umsatz</span></div><div class="rk-center-stat"><strong>${stock}</strong><span>Artikel auf Lager</span></div></div><div class="rk-center-grid"><div class="rk-center-panel"><h4>⚡ Was solltest du jetzt tun?</h4>${actions.map(a=>`<div class="rk-center-action"><div class="ico">${a[0]}</div><main><strong>${esc(a[1])}</strong><small>${esc(a[2])}</small></main>${a[3]?`<button class="rk-center-btn" data-go="${esc(a[3])}">${esc(a[4])}</button>`:''}</div>`).join('')}</div><div class="rk-center-panel"><h4>📊 Verkaufstrichter</h4><div class="rk-center-funnel"><div><strong>${products.length}</strong><span>Produkte</span></div><div><strong>${orders.length}</strong><span>Käufe</span></div><div><strong>${open.length}</strong><span>Offen</span></div></div><div class="rk-center-note">Inventarwert: ${money(inventory)} · Öffne Bestellungen für die Abwicklung.</div><button class="rk-center-btn" data-go="orders" style="margin-top:10px">Bestellungen ansehen</button></div></div>`;
    box.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
  }
  async function refresh(){if(await load())render()}
  setTimeout(refresh,850);document.addEventListener('click',e=>{const t=e.target.closest('.dash-tab');if(t&&t.dataset.tab==='overview')setTimeout(refresh,120)});
})();
