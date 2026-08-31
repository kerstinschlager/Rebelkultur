(function(){
  async function renderPayoutControls(){
    if(typeof adminIsAdmin!=='undefined' && !adminIsAdmin)return;
    const start=typeof periodStart==='function'?periodStart():null;
    const {data,error}=await adminDb.rpc('admin_payouts',{p_start:start});
    if(error){notifyAdmin(error.message);return}
    const rows=data||[];
    admin$('#payoutTable').innerHTML=rows.map(p=>`<div class="admin-table-row"><div><strong>${adminEsc(p.merchant_name||'Händler')}</strong><span>${new Date(p.created_at).toLocaleDateString('de-DE')} · Auszahlung #${p.id}</span></div><div><strong>${adminMoney(p.amount)}</strong><small>${adminEsc(p.status)}</small>${p.status==='pending'?`<button type="button" class="secondary payout-paid-btn" data-payout-id="${p.id}">Als bezahlt markieren</button>`:`<span class="muted">Bezahlt am ${p.paid_at?new Date(p.paid_at).toLocaleDateString('de-DE'):'–'}</span>`}</div></div>`).join('')||'<p class="muted">Noch keine Auszahlungen.</p>';
    admin$('#payoutTable').querySelectorAll('[data-payout-id]').forEach(b=>b.addEventListener('click',async()=>{
      const {error:e}=await adminDb.rpc('admin_mark_payout_paid',{p_payout_id:Number(b.dataset.payoutId)});
      if(e)notifyAdmin(e.message);else{notifyAdmin('Auszahlung als bezahlt markiert');await window.loadAdminStats();}
    }));
  }
  window.createAdminPayout=async function(merchantId){
    const {data,error}=await adminDb.rpc('admin_create_payout',{p_merchant_id:merchantId});
    if(error){notifyAdmin(error.message);return}
    const r=Array.isArray(data)?data[0]:data;
    notifyAdmin(`Auszahlung #${r.payout_id} erstellt: ${adminMoney(r.amount)}`);
    await window.loadAdminStats();
  };
  function addMerchantButtons(){
    admin$('#merchantTable')?.querySelectorAll('[data-merchant-status]').forEach(sel=>{
      if(sel.parentElement.querySelector('[data-create-payout]'))return;
      const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Auszahlung erstellen';b.dataset.createPayout=sel.dataset.merchantStatus;
      b.addEventListener('click',()=>window.createAdminPayout(sel.dataset.merchantStatus));
      sel.parentElement.appendChild(b);
    });
  }
  const originalLoad=window.loadAdminStats;
  if(typeof originalLoad==='function'){
    window.loadAdminStats=async function(){await originalLoad();addMerchantButtons();await renderPayoutControls();};
  }
  const observer=new MutationObserver(()=>{addMerchantButtons()});
  observer.observe(document.body,{subtree:true,childList:true});
  setTimeout(()=>{addMerchantButtons();renderPayoutControls()},500);
})();
