window.renderMerchantOrders=async function(target='#orders'){
  if(!window.merchant){document.querySelector(target).innerHTML='<p class="muted">Kein Händler-Shop vorhanden.</p>';return}
  const {data,error}=await db.rpc('merchant_orders');
  if(error){console.error(error);document.querySelector(target).innerHTML='<p class="muted">Bestellungen konnten nicht geladen werden.</p>';return}
  const orders=data||[];
  document.querySelector(target).innerHTML=orders.map(o=>{
    const items=Array.isArray(o.items)?o.items:[];
    return `<div class="order-row"><div><strong>Bestellung #${o.id}</strong><div class="muted">${new Date(o.created_at).toLocaleString('de-DE')} · ${items.map(i=>`${esc(i.product_name)} × ${i.quantity}`).join(', ')}</div></div><div><strong>${money(o.total)}</strong><select onchange="changeOrderStatus(${o.id},this.value)"><option ${o.status==='new'?'selected':''} value="new">Offen</option><option ${o.status==='paid'?'selected':''} value="paid">Bezahlt</option><option ${o.status==='processing'?'selected':''} value="processing">In Bearbeitung</option><option ${o.status==='shipped'?'selected':''} value="shipped">Versendet</option><option ${o.status==='completed'?'selected':''} value="completed">Abgeschlossen</option><option ${o.status==='cancelled'?'selected':''} value="cancelled">Storniert</option></select></div></div>`
  }).join('')||'<p class="muted">Noch keine Bestellungen für diesen Shop.</p>'
}
