window.renderMerchantOrders=async function(target='#orders'){
  const el=document.querySelector(target); if(!el)return;
  const {data:sessionData}=await db.auth.getSession(); const user=sessionData?.session?.user;
  if(!user){el.innerHTML='<p class="muted">Bitte anmelden.</p>';return}
  const {data:merchantRow,error:merchantError}=await db.from('merchants').select('id').eq('owner_id',user.id).maybeSingle();
  if(merchantError||!merchantRow){el.innerHTML='<p class="muted">Kein Händler-Shop vorhanden.</p>';return}
  const {data,error}=await db.rpc('merchant_orders');
  if(error){console.error(error);el.innerHTML='<p class="muted">Bestellungen konnten nicht geladen werden.</p>';return}
  const orders=data||[];
  const labels={new:'Offen',paid:'Bezahlt',processing:'In Bearbeitung',shipped:'Versendet',completed:'Abgeschlossen',cancelled:'Storniert'};
  el.innerHTML=orders.map(o=>{
    const items=Array.isArray(o.items)?o.items:[];
    return `<div class="order-row rk-order-card"><div><strong>Bestellung #${o.id}</strong><div class="muted">${new Date(o.created_at).toLocaleString('de-DE')} · ${items.map(i=>`${esc(i.product_name)} × ${i.quantity}`).join(', ')}</div><div class="rk-shipping"><label>Status<select onchange="changeOrderStatus(${o.id},this.value)">${Object.entries(labels).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Versanddienstleister<input id="carrier-${o.id}" value="${esc(o.shipping_carrier||'')}" placeholder="z. B. DHL"></label><label>Sendungsnummer<input id="tracking-${o.id}" value="${esc(o.tracking_number||'')}" placeholder="Sendungsnummer"></label><label>Tracking-Link<input id="tracking-url-${o.id}" value="${esc(o.tracking_url||'')}" placeholder="https://…"></label><button class="secondary" type="button" onclick="saveShipping(${o.id})">Versanddaten speichern</button>${o.shipped_at?`<span class="muted">Versendet am ${new Date(o.shipped_at).toLocaleDateString('de-DE')}</span>`:''}</div></div><div><strong>${money(o.total)}</strong><div class="muted">${esc(labels[o.status]||o.status)}</div></div></div>`;
  }).join('')||'<p class="muted">Noch keine Bestellungen für diesen Shop.</p>';
};

window.changeOrderStatus=async function(id,status){
  const {error}=await db.rpc('merchant_set_order_status',{p_order_id:id,p_status:status});
  if(error){console.error(error);toast('Bestellstatus konnte nicht aktualisiert werden');return}
  toast('Bestellstatus aktualisiert'); await window.renderMerchantOrders('#orders'); const full=document.querySelector('#ordersFull'); if(full)await window.renderMerchantOrders('#ordersFull');
};

window.saveShipping=async function(id){
  const carrier=document.querySelector(`#carrier-${id}`)?.value.trim()||'';
  const tracking=document.querySelector(`#tracking-${id}`)?.value.trim()||'';
  const url=document.querySelector(`#tracking-url-${id}`)?.value.trim()||'';
  if(url && !/^https?:\/\//i.test(url))return toast('Tracking-Link muss mit http:// oder https:// beginnen');

  const {error}=await db.from('orders').update({
    shipping_carrier: carrier || null,
    tracking_number: tracking || null,
    tracking_url: url || null
  }).eq('id',id);

  if(error){
    console.error(error);
    toast(`Versanddaten konnten nicht gespeichert werden: ${error.message||'Fehler'}`);
    return;
  }

  toast('Versanddaten gespeichert');
  await window.renderMerchantOrders('#orders');
  const full=document.querySelector('#ordersFull'); if(full)await window.renderMerchantOrders('#ordersFull');
};

const shippingStyle=document.createElement('style');
shippingStyle.textContent='.rk-order-card{align-items:flex-start}.rk-shipping{margin-top:12px;display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:10px}.rk-shipping label{display:flex;flex-direction:column;gap:5px;font-size:13px}.rk-shipping input,.rk-shipping select{padding:9px;border:1px solid #d9d3e5;border-radius:8px;background:#fff}.rk-shipping button{align-self:end}.rk-shipping .muted{align-self:center}@media(max-width:800px){.rk-shipping{grid-template-columns:1fr}}';
document.head.appendChild(shippingStyle);
