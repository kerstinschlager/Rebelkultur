(() => {
  const U = window.__RK_SUPABASE_URL;
  const K = window.__RK_SUPABASE_KEY;
  if (!U || !K || !window.supabase?.createClient) return;
  const db = window.supabase.createClient(U, K);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  const css = `
    .rk-builder{margin:0 0 22px;border:1px solid #e5e7eb;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(15,23,42,.06);overflow:hidden}
    .rk-builder-head{padding:22px 24px;background:linear-gradient(135deg,#111827,#374151);color:#fff;display:flex;justify-content:space-between;gap:20px;align-items:center}
    .rk-builder-head h3{margin:0 0 5px;font-size:22px}.rk-builder-head p{margin:0;color:#d1d5db}.rk-builder-percent{font-size:28px;font-weight:800;white-space:nowrap}
    .rk-builder-progress{height:7px;background:#e5e7eb}.rk-builder-progress>span{display:block;height:100%;background:#111827;transition:width .25s}
    .rk-builder-body{padding:18px 24px}.rk-builder-step{display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid #eef0f3}.rk-builder-step:last-child{border-bottom:0}
    .rk-builder-icon{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#f3f4f6;font-weight:700;flex:0 0 auto}.rk-builder-step.done .rk-builder-icon{background:#111827;color:#fff}
    .rk-builder-copy{flex:1}.rk-builder-copy strong{display:block}.rk-builder-copy small{color:#6b7280}.rk-builder-action{border:1px solid #d1d5db;background:#fff;border-radius:9px;padding:8px 12px;cursor:pointer;font-weight:600}.rk-builder-action:hover{background:#f9fafb}
    .rk-builder-step.done .rk-builder-action{display:none}.rk-builder-open{margin-top:15px}
    @media(max-width:700px){.rk-builder-head{align-items:flex-start;flex-direction:column}.rk-builder-percent{font-size:24px}.rk-builder-step{align-items:flex-start}.rk-builder-action{padding:7px 9px}}
  `;
  const style = document.createElement('style'); style.id='rk-builder-style'; style.textContent=css; if(!document.getElementById(style.id)) document.head.appendChild(style);

  let merchant = null;
  let state = {design:false, products:false, payments:false, shipping:false, legal:false, seo:false};

  async function loadState(){
    const {data:{user}} = await db.auth.getUser();
    if(!user) return null;
    const {data:m} = await db.from('merchants').select('id,shop_name,slug,published,stripe_account_id,stripe_onboarding_complete').eq('owner_id',user.id).limit(1).maybeSingle();
    if(!m) return null;
    merchant=m;
    const [p,s,l,seo] = await Promise.all([
      db.from('products').select('id').eq('merchant_id',m.id).limit(1),
      db.from('merchant_site_content').select('merchant_id').eq('merchant_id',m.id).maybeSingle(),
      db.from('merchant_legal_settings').select('impressum,datenschutz').eq('merchant_id',m.id).maybeSingle(),
      db.from('merchant_seo_settings').select('seo_title').eq('merchant_id',m.id).maybeSingle()
    ]);
    state.products = !!(p.data?.length);
    state.design = !!(s.data?.merchant_id) || !!m.theme;
    state.payments = !!m.stripe_account_id && !!m.stripe_onboarding_complete;
    state.legal = !!(l.data?.impressum && l.data?.datenschutz);
    state.seo = !!seo.data?.seo_title;
    state.shipping = false;
    return m;
  }

  function go(tab){
    if(typeof window.setDashTab==='function') window.setDashTab(tab);
    else document.querySelector(`.dash-tab[data-tab="${tab}"]`)?.click();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function render(){
    const host=document.getElementById('dashboardOverview'); if(!host || !merchant) return;
    let box=document.getElementById('rkShopBuilder');
    if(!box){ box=document.createElement('section'); box.id='rkShopBuilder'; box.className='rk-builder'; host.prepend(box); }
    const steps=[
      ['design','Design auswählen','Wähle ein professionelles Layout für deinen Shop.','design','Design wählen'],
      ['products','Produkte hinzufügen','Mindestens ein Produkt ist nötig, bevor dein Shop starten kann.','products','Produkt hinzufügen'],
      ['payments','Zahlungen verbinden','Verbinde Stripe, damit Kunden sicher bezahlen können.','settings','Zahlungen einrichten'],
      ['shipping','Versand festlegen','Lege fest, wie Bestellungen versendet und abgewickelt werden.','settings','Versand einrichten'],
      ['legal','Rechtliches hinterlegen','Impressum und Datenschutz sollten vor der Veröffentlichung vorhanden sein.','legal','Rechtliches öffnen'],
      ['seo','Bei Google besser gefunden werden','Hinterlege einen Seitentitel für Suchmaschinen.','design','SEO einrichten']
    ];
    const done=steps.filter(x=>state[x[0]]).length, pct=Math.round(done/steps.length*100);
    box.innerHTML=`<div class="rk-builder-head"><div><h3>Dein Shop ist fast startklar</h3><p>Rebelkultur führt dich Schritt für Schritt durch die Einrichtung.</p></div><div class="rk-builder-percent">${pct}%</div></div><div class="rk-builder-progress"><span style="width:${pct}%"></span></div><div class="rk-builder-body">${steps.map((s,i)=>`<div class="rk-builder-step ${state[s[0]]?'done':''}"><div class="rk-builder-icon">${state[s[0]]?'✓':i+1}</div><div class="rk-builder-copy"><strong>${esc(s[1])}</strong><small>${esc(s[2])}</small></div>${state[s[0]]?'<span aria-label="Erledigt">✓</span>':`<button class="rk-builder-action" data-builder-tab="${esc(s[3])}">${esc(s[4])}</button>`}</div>`).join('')}<div class="rk-builder-open"><button class="secondary" id="rkOpenDesign">Shop gestalten &amp; Vorschau öffnen</button></div></div>`;
    box.querySelectorAll('[data-builder-tab]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.builderTab)));
    box.querySelector('#rkOpenDesign')?.addEventListener('click',()=>go('design'));
  }

  async function refresh(){ await loadState(); render(); }

  const original = window.renderDashboard;
  window.renderDashboard = async function(...args){
    const result = original ? await original.apply(this,args) : undefined;
    setTimeout(refresh,50);
    return result;
  };
  document.addEventListener('click',e=>{
    const tab=e.target.closest('.dash-tab');
    if(tab && tab.dataset.tab==='overview') setTimeout(refresh,80);
  });
  window.addEventListener('hashchange',()=>setTimeout(refresh,100));
  setTimeout(refresh,400);
})();
