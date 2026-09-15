(()=>{
  const db=window.supabase.createClient(window.__RK_SUPABASE_URL,window.__RK_SUPABASE_KEY);
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const TRACK='https://oansbivjkczjbtxaknks.supabase.co/functions/v1/track-visitor';
  const CENTROIDS='https://raw.githubusercontent.com/komsitr/country-centroid/master/country-centroids.json';
  let loadedFor=null,globe=null,centroids=null,refreshTimer=null,trackingStarted=false;

  const css=document.createElement('style');css.textContent=`
    .shop-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:14px 0}.shop-stat-card{padding:18px;border:1px solid #e0d8e8;border-radius:15px;background:#fff}.shop-stat-card strong{display:block;font-size:27px}.shop-stat-card span{font-size:12px;color:#777}
    .visitor-live-card{margin-top:18px;border:1px solid #e0d8e8;border-radius:18px;background:#fff;overflow:hidden}.visitor-live-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid #ece7f0}.visitor-live-head h3{margin:0}.visitor-live-badge{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700}.visitor-live-dot{width:9px;height:9px;border-radius:50%;background:#c8ff24;box-shadow:0 0 0 5px rgba(200,255,36,.15)}.visitor-live-body{display:grid;grid-template-columns:minmax(280px,1.35fr) minmax(240px,.65fr);min-height:390px}.visitor-globe{min-height:390px;background:#0e0b14;position:relative}.visitor-globe canvas{display:block}.visitor-countries{padding:18px;overflow:auto;max-height:390px}.visitor-country{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #eee8f1}.visitor-country:last-child{border-bottom:0}.visitor-country strong{display:block}.visitor-country span{font-size:12px;color:#777}.visitor-country-count{font-weight:800;font-size:16px}.visitor-empty{padding:28px 10px;color:#777;text-align:center}.visitor-note{padding:12px 18px;border-top:1px solid #eee8f1;color:#777;font-size:12px}.visitor-error{padding:20px;color:#777}.visitor-loader{position:absolute;inset:0;display:grid;place-items:center;color:#ddd;font-size:13px;pointer-events:none}
    @media(max-width:800px){.shop-stat-grid{grid-template-columns:repeat(2,1fr)}.visitor-live-body{grid-template-columns:1fr}.visitor-countries{max-height:none}.visitor-globe{min-height:330px}.visitor-live-head{align-items:flex-start;flex-direction:column}}
    @media(max-width:520px){.shop-stat-grid{grid-template-columns:1fr}.visitor-globe{min-height:290px}}
  `;document.head.appendChild(css);

  async function getMerchant(){const {data:{user}}=await db.auth.getUser();if(!user)return null;const {data}=await db.from('merchants').select('id,slug').eq('owner_id',user.id).maybeSingle();return data||null}

  function visitorId(){
    const key='zq_anonymous_visitor_id';
    try{
      let id=localStorage.getItem(key);
      if(!id){id=crypto.randomUUID();localStorage.setItem(key,id)}
      return id;
    }catch(_){return crypto.randomUUID()}
  }

  async function trackShopVisitor(){
    if(trackingStarted)return;trackingStarted=true;
    const slug=new URLSearchParams(location.search).get('shop');
    if(!slug)return;
    const id=visitorId();
    const send=async()=>{try{await fetch(TRACK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,visitor_key:id,resolve:true}),keepalive:true})}catch(_){}};
    await send();
    setInterval(send,30000);
  }

  async function loadCentroids(){
    if(centroids)return centroids;
    try{
      const r=await fetch(CENTROIDS,{cache:'force-cache'});if(!r.ok)throw new Error('centroids');
      const rows=await r.json();centroids=Object.fromEntries((rows||[]).map(x=>[String(x.alpha2||'').toUpperCase(),x]));
    }catch(_){centroids={}}
    return centroids;
  }

  function loadGlobeScript(){
    return new Promise((resolve,reject)=>{
      if(window.Globe)return resolve();
      const existing=document.querySelector('script[data-zq-globe]');
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
      const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js';s.dataset.zqGlobe='1';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }

  async function buildGlobe(container,rows){
    try{
      await Promise.all([loadGlobeScript(),loadCentroids()]);
      if(!window.Globe)throw new Error('globe');
      const points=rows.map(r=>{const c=centroids[String(r.country_code||'').toUpperCase()];return c?{lat:Number(c.latitude),lng:Number(c.longitude),count:r.count,name:r.country_name||c.name,code:r.country_code}:null}).filter(Boolean);
      if(!globe){
        container.innerHTML='';
        globe=new window.Globe(container)
          .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg')
          .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png')
          .backgroundColor('#0e0b14')
          .showAtmosphere(true)
          .atmosphereColor('#c8ff24')
          .atmosphereAltitude(0.12)
          .pointLat('lat').pointLng('lng').pointLabel(d=>`${esc(d.name)}: ${d.count} aktive Besucher`)
          .pointColor(()=>'#c8ff24').pointAltitude(d=>Math.min(.18,.025+d.count*.018)).pointRadius(d=>Math.min(.8,.22+d.count*.05));
        globe.controls().autoRotate=true;globe.controls().autoRotateSpeed=.35;globe.controls().enableZoom=true;
      }
      globe.pointsData(points);
      container.querySelector('.visitor-loader')?.remove();
    }catch(_){
      container.innerHTML='<div class="visitor-error">Die Weltkugel konnte gerade nicht geladen werden. Die Länderübersicht bleibt verfügbar.</div>';
    }
  }

  async function loadVisitorAnalytics(merchant){
    const panel=document.querySelector('#dashboardOverview');if(!panel||panel.classList.contains('hidden'))return;
    let box=document.querySelector('#shopVisitorAnalytics');
    if(!box){
      box=document.createElement('article');box.className='panel';box.id='shopVisitorAnalytics';
      box.innerHTML='<div class="panel-head"><h3>Live-Besucher</h3><span>Herkunft in Echtzeit</span></div><div class="visitor-live-card"><div class="visitor-live-head"><div><h3>Woher kommen die Besucher?</h3><div class="muted">Aktive Besucher der veröffentlichten Händlerseite</div></div><div class="visitor-live-badge"><i class="visitor-live-dot"></i><span>LIVE · Aktualisierung alle 30 Sekunden</span></div></div><div class="visitor-live-body"><div id="visitorGlobe" class="visitor-globe"><div class="visitor-loader">Weltkugel wird geladen …</div></div><div id="visitorCountries" class="visitor-countries"><div class="visitor-empty">Besucherdaten werden geladen …</div></div></div><div class="visitor-note">Es werden nur Länderangaben für die Statistik verwendet. IP-Adressen werden nicht in Zorqemi gespeichert.</div></div>';
      panel.appendChild(box);
    }
    const countriesEl=box.querySelector('#visitorCountries'),globeEl=box.querySelector('#visitorGlobe');
    const since=new Date(Date.now()-24*60*60*1000).toISOString();
    const {data,error}=await db.from('visitor_sessions').select('country_code,country_name,last_seen_at').eq('merchant_id',merchant.id).gte('last_seen_at',since);
    if(error){countriesEl.innerHTML='<div class="visitor-error">Besucherdaten konnten nicht geladen werden.</div>';return}
    const grouped={};
    (data||[]).forEach(v=>{const code=String(v.country_code||'XX').toUpperCase();const active=new Date(v.last_seen_at).getTime()>Date.now()-5*60*1000;(grouped[code]??={country_code:code,country_name:v.country_name||'Unbekannt',count:0,active:0}).count++;if(active)grouped[code].active++});
    const rows=Object.values(grouped).sort((a,b)=>b.count-a.count);
    const activeTotal=rows.reduce((s,r)=>s+r.active,0);
    const allTotal=rows.reduce((s,r)=>s+r.count,0);
    countriesEl.innerHTML=rows.length?`<div class="visitor-country" style="padding-top:0"><div><strong>Jetzt online</strong><span>letzte 5 Minuten</span></div><div class="visitor-country-count">${activeTotal.toLocaleString('de-DE')}</div></div>`+rows.slice(0,12).map(r=>`<div class="visitor-country"><div><strong>${esc(r.country_name)}</strong><span>${esc(r.country_code)} · 24 Stunden</span></div><div class="visitor-country-count">${r.count.toLocaleString('de-DE')}</div></div>`).join(''):`<div class="visitor-empty"><strong>Noch keine Besucher erfasst.</strong><br>Die Statistik füllt sich, sobald dein veröffentlichter Händler-Shop besucht wird.</div>`;
    if(globeEl)await buildGlobe(globeEl,rows.filter(r=>r.country_code!=='XX'));
    const title=box.querySelector('.visitor-live-head h3');if(title)title.textContent=`Woher kommen die Besucher? · ${activeTotal.toLocaleString('de-DE')} jetzt online`;
    box.dataset.total=String(allTotal);loadedFor=merchant.id;
  }

  async function load(){
    const merchant=await getMerchant();
    if(!merchant)return;
    const panel=document.querySelector('#dashboardOverview');if(!panel)return;
    let box=document.querySelector('#shopAnalyticsStandalone');
    if(!box){
      box=document.createElement('article');box.className='panel';box.id='shopAnalyticsStandalone';
      box.innerHTML='<h3>Shop-Statistik</h3><div id="shopStatGrid" class="shop-stat-grid"><div class="muted">Wird geladen …</div></div><p class="muted">Bezahlte und bearbeitete Bestellungen; neue und stornierte Bestellungen werden nicht gezählt.</p>';
      panel.appendChild(box);
    }
    const grid=box.querySelector('#shopStatGrid');
    const {data:products}=await db.from('products').select('id,stock').eq('merchant_id',merchant.id);const mine=products||[];const ids=mine.map(p=>p.id);let orders=[];
    if(ids.length){const {data:items}=await db.from('order_items').select('order_id,product_id,quantity,unit_price,orders(id,status)').in('product_id',ids);const grouped={};(items||[]).forEach(i=>{const o=i.orders;if(!o||['new','cancelled'].includes(o.status))return;(grouped[o.id]??={...o,items:[]}).items.push(i)});orders=Object.values(grouped)}
    const revenue=orders.reduce((s,o)=>s+o.items.reduce((x,i)=>x+Number(i.unit_price||0)*Number(i.quantity||0),0),0);const sold=orders.reduce((s,o)=>s+o.items.reduce((x,i)=>x+Number(i.quantity||0),0),0);const open=orders.filter(o=>['paid','processing'].includes(o.status)).length;const stock=mine.reduce((s,p)=>s+Number(p.stock||0),0);const avg=orders.length?revenue/orders.length:0;
    grid.innerHTML=`<div class="shop-stat-card"><strong>${orders.length.toLocaleString('de-DE')}</strong><span>Bestellungen</span></div><div class="shop-stat-card"><strong>${money(revenue)}</strong><span>Umsatz</span></div><div class="shop-stat-card"><strong>${sold.toLocaleString('de-DE')}</strong><span>Artikel verkauft</span></div><div class="shop-stat-card"><strong>${money(avg)}</strong><span>Ø Bestellwert</span></div><div class="shop-stat-card"><strong>${open.toLocaleString('de-DE')}</strong><span>Offene Bestellungen</span></div><div class="shop-stat-card"><strong>${stock.toLocaleString('de-DE')}</strong><span>Artikel auf Lager</span></div>`;
    await loadVisitorAnalytics(merchant);
  }

  trackShopVisitor();
  const observer=new MutationObserver(()=>load());observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  clearInterval(refreshTimer);refreshTimer=setInterval(()=>{load();},30000);
  load();
})();
