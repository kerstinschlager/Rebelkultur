(()=>{
  const db=window.supabase.createClient(window.__RK_SUPABASE_URL,window.__RK_SUPABASE_KEY);
  const TRACK='https://oansbivjkczjbtxaknks.supabase.co/functions/v1/track-visitor';
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const css=document.createElement('style');css.textContent=`
    .zq-funnel-wrap{margin-top:18px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:18px}.zq-chart-card{border:1px solid #e0d8e8;border-radius:18px;background:#fff;padding:18px}.zq-chart-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.zq-chart-head h3{margin:0}.zq-chart-head span{font-size:12px;color:#777}.zq-sales-chart{height:250px;display:flex;align-items:stretch;gap:7px;border-bottom:1px solid #ddd8e3;padding:10px 4px 0}.zq-sales-day{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;gap:5px}.zq-sales-bar{min-height:2px;border-radius:6px 6px 0 0;background:#c8ff24;position:relative}.zq-sales-bar:hover:after{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;background:#17131d;color:#fff;padding:6px 8px;border-radius:7px;font-size:11px;z-index:3}.zq-sales-label{text-align:center;font-size:10px;color:#777;overflow:hidden}.zq-sales-total{font-size:24px;font-weight:800}.zq-funnel{display:grid;gap:12px}.zq-funnel-row{display:grid;grid-template-columns:145px 1fr 45px;align-items:center;gap:8px}.zq-funnel-name{font-size:12px;font-weight:700}.zq-funnel-track{height:18px;background:#eee9f1;border-radius:99px;overflow:hidden}.zq-funnel-fill{height:100%;background:#c8ff24;border-radius:99px}.zq-funnel-count{text-align:right;font-weight:800}.zq-funnel-meta{margin-top:14px;padding-top:12px;border-top:1px solid #eee8f1;display:grid;grid-template-columns:1fr 1fr;gap:10px}.zq-mini-stat{padding:10px;border-radius:10px;background:#f7f5f8}.zq-mini-stat strong{display:block;font-size:18px}.zq-mini-stat span{font-size:11px;color:#777}.zq-abandon{margin-top:12px;font-size:12px;color:#777}.zq-abandon strong{color:#17131d}.zq-chart-empty{padding:35px 10px;text-align:center;color:#777}.zq-range{font-size:12px;color:#777}
    @media(max-width:900px){.zq-funnel-wrap{grid-template-columns:1fr}.zq-sales-chart{height:220px}.zq-funnel-row{grid-template-columns:125px 1fr 40px}}
  `;document.head.appendChild(css);

  async function merchant(){const {data:{user}}=await db.auth.getUser();if(!user)return null;const {data}=await db.from('merchants').select('id,slug').eq('owner_id',user.id).maybeSingle();return data||null}
  function dayKey(d){return new Date(d).toISOString().slice(0,10)}
  function label(d){return new Date(d).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}
  function renderSales(el,days){
    const max=Math.max(...days.map(x=>x.revenue),1),total=days.reduce((s,x)=>s+x.revenue,0);
    el.innerHTML=`<div class="zq-chart-head"><div><div class="zq-sales-total">${money(total)}</div><span>Umsatz · letzte 30 Tage</span></div><span class="zq-range">Tagesumsatz</span></div><div class="zq-sales-chart">${days.map(d=>{const h=Math.max(2,d.revenue/max*205);return `<div class="zq-sales-day"><div class="zq-sales-bar" style="height:${h}px" data-tip="${esc(label(d.date))}: ${esc(money(d.revenue))} · ${d.orders} Bestellung${d.orders===1?'':'en'}"></div><div class="zq-sales-label">${esc(label(d.date))}</div></div>`}).join('')}</div>`;
  }
  function renderFunnel(el,stats){
    const max=Math.max(stats.started,1), rows=[['Checkout gestartet',stats.started],['Daten abgeschickt',stats.details],['Weiter zu Stripe',stats.redirect],['Kauf abgeschlossen',stats.purchased]];
    const conv=stats.started?Math.round(stats.purchased/stats.started*100):0,aband=stats.started?100-conv:0;
    el.innerHTML=`<div class="zq-chart-head"><div><h3>Checkout-Trichter</h3><span>Letzte 30 Tage · eindeutige Besucher</span></div><span>Conversion ${conv}%</span></div><div class="zq-funnel">${rows.map(r=>`<div class="zq-funnel-row"><div class="zq-funnel-name">${r[0]}</div><div class="zq-funnel-track"><div class="zq-funnel-fill" style="width:${Math.max(1,Math.round(r[1]/max*100))}%"></div></div><div class="zq-funnel-count">${r[1]}</div></div>`).join('')}</div><div class="zq-funnel-meta"><div class="zq-mini-stat"><strong>${stats.cancelled}</strong><span>Zahlungen abgebrochen</span></div><div class="zq-mini-stat"><strong>${conv}%</strong><span>Checkout-Conversion</span></div></div><div class="zq-abandon"><strong>${aband}%</strong> der gestarteten Checkouts erreichen noch keinen abgeschlossenen Kauf.</div>`;
  }
  async function load(){
    const panel=document.querySelector('#dashboardOverview');if(!panel||panel.classList.contains('hidden'))return;
    const m=await merchant();if(!m)return;
    let root=document.querySelector('#zqCheckoutAnalytics');
    if(!root){root=document.createElement('article');root.className='panel';root.id='zqCheckoutAnalytics';root.innerHTML='<div class="panel-head"><h3>Verkäufe & Checkout</h3><span>Live-Analyse</span></div><div class="zq-funnel-wrap"><div id="zqSalesChart" class="zq-chart-card"><div class="zq-chart-empty">Verkaufsdaten werden geladen …</div></div><div id="zqFunnelChart" class="zq-chart-card"><div class="zq-chart-empty">Checkout-Daten werden geladen …</div></div></div>';panel.appendChild(root)}
    const since=new Date(Date.now()-30*24*60*60*1000).toISOString();
    const {data:products}=await db.from('products').select('id').eq('merchant_id',m.id);const ids=(products||[]).map(x=>x.id);
    const days=[];for(let i=29;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push({date:d.toISOString(),key:dayKey(d),revenue:0,orders:new Set()})}
    if(ids.length){const {data:items}=await db.from('order_items').select('order_id,quantity,unit_price,orders(id,status,created_at)').in('product_id',ids).gte('orders.created_at',since);const by={};(items||[]).forEach(i=>{const o=i.orders;if(!o||['new','cancelled'].includes(o.status))return;const k=dayKey(o.created_at);const d=by[k]??={revenue:0,orders:new Set()};d.revenue+=Number(i.unit_price||0)*Number(i.quantity||0);d.orders.add(o.id)});days.forEach(d=>{d.revenue=by[d.key]?.revenue||0;d.orders=by[d.key]?.orders?.size||0})}
    renderSales(root.querySelector('#zqSalesChart'),days);
    const {data:events}=await db.from('checkout_events').select('visitor_key,event_name,created_at').eq('merchant_id',m.id).gte('created_at',since);
    const sets={checkout_started:new Set(),checkout_details_submitted:new Set(),payment_redirected:new Set(),payment_cancelled:new Set(),purchase_completed:new Set()};(events||[]).forEach(e=>{if(sets[e.event_name])sets[e.event_name].add(e.visitor_key)});
    renderFunnel(root.querySelector('#zqFunnelChart'),{started:sets.checkout_started.size,details:sets.checkout_details_submitted.size,redirect:sets.payment_redirected.size,purchased:sets.purchase_completed.size,cancelled:sets.payment_cancelled.size});
  }
  setInterval(load,30000);load();
})();
