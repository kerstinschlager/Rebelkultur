(()=>{
  const $=s=>document.querySelector(s);
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  async function refreshOverview(){
    if(!window.currentUser||!window.merchant)return;
    const m=window.merchant;
    const {data:products}=await window.db.from('products').select('id,price,stock').eq('merchant_id',m.id);
    const mine=products||[];
    const ids=mine.map(p=>p.id);
    let orders=[];
    if(ids.length){
      const {data:items}=await window.db.from('order_items').select('order_id,product_id,quantity,unit_price,orders(id,status,created_at)').in('product_id',ids);
      const grouped={};
      (items||[]).forEach(i=>{const o=i.orders;if(!o||['new','cancelled'].includes(o.status))return;(grouped[o.id]??={...o,items:[]}).items.push(i)});
      orders=Object.values(grouped);
    }
    const revenue=orders.reduce((s,o)=>s+o.items.reduce((x,i)=>x+Number(i.unit_price||0)*Number(i.quantity||0),0),0);
    const open=orders.filter(o=>['paid','processing'].includes(o.status)).length;
    const stock=mine.reduce((s,p)=>s+Number(p.stock||0),0);
    const stockValue=mine.reduce((s,p)=>s+Number(p.stock||0)*Number(p.price||0),0);
    const stats=$('#stats');
    if(!stats)return;
    stats.innerHTML=`<div class="stat"><strong>${mine.length}</strong><span>Produkte</span></div><div class="stat"><strong>${orders.length}</strong><span>Bestellungen</span></div><div class="stat"><strong>${money(revenue)}</strong><span>Umsatz</span></div><div class="stat"><strong>${open}</strong><span>Offene Bestellungen</span></div><div class="stat"><strong>${stock}</strong><span>Artikel auf Lager</span></div><div class="stat"><strong>${money(stockValue)}</strong><span>Lagerwert</span></div>`;
  }
  const original=window.renderDashboard;
  window.renderDashboard=async function(){
    if(original)await original();
    await refreshOverview();
  };
})();
