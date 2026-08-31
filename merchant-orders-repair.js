window.renderMerchantOrders=async function(target='#orders'){
  const el=document.querySelector(target);
  if(!el)return;
  const {data:sessionData}=await db.auth.getSession();
  const user=sessionData?.session?.user;
  if(!user){el.innerHTML='<p class="muted">Bitte anmelden.</p>';return}
  const {data:merchantRow,error:merchantError}=await db.from('merchants').select('*').eq('owner_id',user.id).maybeSingle();
  if(merchantError){console.error(merchantError);el.innerHTML='<p class="muted">Händler-Shop konnte nicht geladen werden.</p>';return}
  if(!merchantRow){el.innerHTML='<p class="muted">Kein Händler-Shop vorhanden.</p>';return}
  const {data,error}=await db.rpc('merchant_orders');
  if(error){console.error(error);el.innerHTML='<p class="muted">Bestellungen konnten nicht geladen werden.</p>';return}
  const orders=data||[];
  el.innerHTML=orders.map(o=>{
    const items=Array.isArray(o.items)?o.items:[];
    return `<div class="order-row"><div><strong>Bestellung #${o.id}</strong><div class="muted">${new Date(o.created_at).toLocaleString('de-DE')} · ${items.map(i=>`${esc(i.product_name)} × ${i.quantity}`).join(', ')}</div></div><div><strong>${money(o.total)}</strong><select onchange="changeOrderStatus(${o.id},this.value)"><option ${o.status==='new'?'selected':''} value="new">Offen</option><option ${o.status==='paid'?'selected':''} value="paid">Bezahlt</option><option ${o.status==='processing'?'selected':''} value="processing">In Bearbeitung</option><option ${o.status==='shipped'?'selected':''} value="shipped">Versendet</option><option ${o.status==='completed'?'selected':''} value="completed">Abgeschlossen</option><option ${o.status==='cancelled'?'selected':''} value="cancelled">Storniert</option></select></div></div>`
  }).join('')||'<p class="muted">Noch keine Bestellungen für diesen Shop.</p>'
};

// Keep the order-status action working even after the main app is reloaded.
window.changeOrderStatus=async function(id,status){
  const {data:sessionData}=await db.auth.getSession();
  const user=sessionData?.session?.user;
  if(!user)return toast('Bitte anmelden');
  const {data:merchantRow}=await db.from('merchants').select('id').eq('owner_id',user.id).maybeSingle();
  if(!merchantRow)return toast('Kein Händler-Shop vorhanden');
  const {data,error}=await db.rpc('merchant_set_order_status',{p_order_id:id,p_status:status});
  if(error){console.error(error);toast('Bestellstatus konnte nicht aktualisiert werden');return}
  toast('Bestellstatus aktualisiert');
  await window.renderMerchantOrders('#orders');
  const full=document.querySelector('#ordersFull');
  if(full)await window.renderMerchantOrders('#ordersFull');
};
