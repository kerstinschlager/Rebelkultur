(function(){
  const db=window.supabase.createClient(window.__RK_SUPABASE_URL,window.__RK_SUPABASE_KEY);
  const q=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  function toastA(t){if(typeof toast==='function')toast(t)}
  function mount(){
    const header=document.querySelector('.header-actions'); if(!header||q('#accountBtn'))return;
    const b=document.createElement('button');b.id='accountBtn';b.className='cart-btn';b.textContent='Mein Konto';header.insertBefore(b,q('#authBtn'));b.addEventListener('click',openAccount);
    const s=document.createElement('section');s.id='accountView';s.className='view hidden';
    s.innerHTML='<div class="page-head"><div><p class="eyebrow">KUNDENKONTO</p><h2>Mein Konto</h2><p>Deine Bestellungen, Versandstatus und Benachrichtigungen.</p></div></div><div class="panel" id="customerNotificationsPanel"><div class="panel-head"><h3>Benachrichtigungen</h3><span id="customerNotificationCount"></span></div><div id="customerNotifications"><p class="muted">Wird geladen …</p></div></div><div class="panel" id="customerOrdersPanel"><div class="panel-head"><h3>Meine Bestellungen</h3><span id="customerOrderCount"></span></div><div id="customerOrders"><p class="muted">Wird geladen …</p></div></div>';
    document.querySelector('main').appendChild(s);
    const st=document.createElement('style');st.textContent='#accountView{max-width:1180px;margin:50px auto 80px;padding:0 20px}.customer-order{border-top:1px solid #ddd;padding:18px 0;display:flex;justify-content:space-between;gap:20px}.customer-order:first-child{border-top:0}.customer-status{display:inline-flex;padding:6px 10px;border-radius:999px;background:#eef7d6;font-weight:700}.customer-items{margin-top:8px;color:#6b6873}.customer-total{font-size:18px;font-weight:800}.customer-shipping{margin-top:10px;padding:10px 12px;border:1px solid #ddd;border-radius:10px}.customer-notice{border-top:1px solid #ddd;padding:12px 0}.customer-notice:first-child{border-top:0}.customer-notice strong{display:block}.customer-notice span{color:#6b6873}.tracking-link{display:inline-block;margin-top:7px;font-weight:700}.rk-unread{font-weight:800}@media(max-width:700px){.customer-order{flex-direction:column}}';document.head.appendChild(st);
  }
  async function openAccount(){
    const {data}=await db.auth.getSession();if(!data.session){toastA('Bitte zuerst anmelden');q('#authModal')?.classList.remove('hidden');if(typeof setAuthMode==='function')setAuthMode('login');return}
    document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));q('#accountView').classList.remove('hidden');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));await loadOrdersAndNotifications();window.scrollTo({top:0,behavior:'smooth'});
  }
  async function loadOrdersAndNotifications(){await Promise.all([loadOrders(),loadNotifications()])}
  async function loadNotifications(){
    const box=q('#customerNotifications'),count=q('#customerNotificationCount');
    const {data,error}=await db.from('order_notifications').select('id,order_id,title,message,created_at,read_at').order('created_at',{ascending:false}).limit(20);
    if(error){console.error(error);box.innerHTML='<p class="muted">Benachrichtigungen konnten nicht geladen werden.</p>';return}
    const rows=data||[];count.textContent=`${rows.filter(x=>!x.read_at).length} neu`;
    box.innerHTML=rows.map(n=>`<div class="customer-notice ${n.read_at?'':'rk-unread'}"><strong>${esc(n.title)} · Bestellung #${n.order_id}</strong><span>${esc(n.message)} · ${new Date(n.created_at).toLocaleString('de-DE')}</span></div>`).join('')||'<p class="muted">Keine Benachrichtigungen.</p>';
  }
  async function loadOrders(){
    const box=q('#customerOrders'),count=q('#customerOrderCount');
    const {data,error}=await db.rpc('customer_orders');if(error){console.error(error);box.innerHTML='<p class="muted">Bestellungen konnten nicht geladen werden.</p>';return}
    const orders=Array.isArray(data)?data:(data||[]);count.textContent=`${orders.length} ${orders.length===1?'Bestellung':'Bestellungen'}`;
    const labels={new:'Offen',paid:'Bezahlt',processing:'In Bearbeitung',shipped:'Versendet',completed:'Abgeschlossen',cancelled:'Storniert'};
    box.innerHTML=orders.map(o=>{const shipping=(o.tracking_number||o.shipping_carrier||o.tracking_url)?`<div class="customer-shipping"><strong>Versand</strong>${o.shipping_carrier?`<div>${esc(o.shipping_carrier)}</div>`:''}${o.tracking_number?`<div>Sendungsnummer: ${esc(o.tracking_number)}</div>`:''}${o.tracking_url?`<a class="tracking-link" href="${esc(o.tracking_url)}" target="_blank" rel="noopener">Sendung verfolgen</a>`:''}${o.shipped_at?`<div class="muted">Versendet am ${new Date(o.shipped_at).toLocaleDateString('de-DE')}</div>`:''}</div>`:'';return `<div class="customer-order"><div><strong>Bestellung #${o.id}</strong><div class="muted">${new Date(o.created_at).toLocaleString('de-DE')}</div><div class="customer-items">${(o.items||[]).map(i=>`${esc(i.product_name)} × ${i.quantity} · ${money(i.unit_price)}`).join('<br>')}</div>${shipping}</div><div><div class="customer-status">${esc(labels[o.status]||o.status)}</div><div class="customer-total">${money(o.total)}</div></div></div>`}).join('')||'<p class="muted">Du hast noch keine Bestellungen.</p>';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();