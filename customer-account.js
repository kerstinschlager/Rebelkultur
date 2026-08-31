(function(){
  const db=window.supabase.createClient(window.__RK_SUPABASE_URL,window.__RK_SUPABASE_KEY);
  const q=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  function toastA(t){if(typeof toast==='function')toast(t)}
  function mount(){
    const header=document.querySelector('.header-actions');
    if(!header||q('#accountBtn')) return;
    const b=document.createElement('button');b.id='accountBtn';b.className='cart-btn';b.textContent='Mein Konto';
    header.insertBefore(b,q('#authBtn'));
    b.addEventListener('click',openAccount);
    const s=document.createElement('section');s.id='accountView';s.className='view hidden';
    s.innerHTML='<div class="page-head"><div><p class="eyebrow">KUNDENKONTO</p><h2>Mein Konto</h2><p>Deine Bestellungen und Bestellstatus auf einen Blick.</p></div></div><div class="panel" id="customerOrdersPanel"><div class="panel-head"><h3>Meine Bestellungen</h3><span id="customerOrderCount"></span></div><div id="customerOrders"><p class="muted">Wird geladen …</p></div></div>';
    document.querySelector('main').appendChild(s);
    const st=document.createElement('style');st.textContent='#accountView{max-width:1180px;margin:50px auto 80px;padding:0 20px}.customer-order{border-top:1px solid #ddd;padding:18px 0;display:flex;justify-content:space-between;gap:20px}.customer-order:first-child{border-top:0}.customer-status{display:inline-flex;padding:6px 10px;border-radius:999px;background:#eef7d6;font-weight:700}.customer-items{margin-top:8px;color:#6b6873}.customer-total{font-size:18px;font-weight:800}@media(max-width:700px){.customer-order{flex-direction:column}}';document.head.appendChild(st);
  }
  async function openAccount(){
    const {data}=await db.auth.getSession();
    if(!data.session){toastA('Bitte zuerst anmelden');q('#authModal')?.classList.remove('hidden');if(typeof setAuthMode==='function')setAuthMode('login');return;}
    document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));q('#accountView').classList.remove('hidden');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));await loadOrders();window.scrollTo({top:0,behavior:'smooth'});
  }
  async function loadOrders(){
    const box=q('#customerOrders'),count=q('#customerOrderCount');
    const {data,error}=await db.rpc('customer_orders');
    if(error){console.error(error);box.innerHTML='<p class="muted">Bestellungen konnten nicht geladen werden.</p>';return}
    const orders=Array.isArray(data)?data:(data||[]);count.textContent=`${orders.length} ${orders.length===1?'Bestellung':'Bestellungen'}`;
    const labels={new:'Offen',paid:'Bezahlt',processing:'In Bearbeitung',shipped:'Versendet',completed:'Abgeschlossen',cancelled:'Storniert'};
    box.innerHTML=orders.map(o=>`<div class="customer-order"><div><strong>Bestellung #${o.id}</strong><div class="muted">${new Date(o.created_at).toLocaleString('de-DE')}</div><div class="customer-items">${(o.items||[]).map(i=>`${esc(i.product_name)} × ${i.quantity} · ${money(i.unit_price)}`).join('<br>')}</div></div><div><div class="customer-status">${esc(labels[o.status]||o.status)}</div><div class="customer-total">${money(o.total)}</div></div></div>`).join('')||'<p class="muted">Du hast noch keine Bestellungen.</p>';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();