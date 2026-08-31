async function createAdminPayout(merchantId){
  if(!window.adminIsAdmin && typeof adminIsAdmin!=='undefined' && !adminIsAdmin)return;
  const {data,error}=await adminDb.rpc('admin_create_payout',{p_merchant_id:merchantId});
  if(error){notifyAdmin(error.message);return}
  const row=Array.isArray(data)?data[0]:data;
  notifyAdmin(`Auszahlung #${row.payout_id} erstellt: ${adminMoney(row.amount)}`);
  await loadAdminStats();
}
async function markAdminPayoutPaid(payoutId){
  const {error}=await adminDb.rpc('admin_mark_payout_paid',{p_payout_id:Number(payoutId)});
  if(error){notifyAdmin(error.message);return}
  notifyAdmin('Auszahlung als bezahlt markiert');
  await loadAdminStats();
}
function decoratePayoutUI(){
  const merchantTable=admin$('#merchantTable');
  if(merchantTable){
    merchantTable.querySelectorAll('[data-merchant-status]').forEach(sel=>{
      const id=sel.dataset.merchantStatus;
      const wrap=sel.parentElement;
      if(id && wrap && !wrap.querySelector('[data-create-payout]')){
        const b=document.createElement('button');
        b.type='button'; b.textContent='Auszahlung erstellen'; b.className='secondary'; b.dataset.createPayout=id;
        b.addEventListener('click',()=>createAdminPayout(id));
        wrap.appendChild(b);
      }
    });
  }
  const payoutTable=admin$('#payoutTable');
  if(payoutTable){
    payoutTable.querySelectorAll('.admin-table-row').forEach(row=>{
      if(row.querySelector('[data-mark-paid]'))return;
      const status=row.querySelector('small');
      const text=(status?.textContent||'').trim().toLowerCase();
      const strong=row.querySelector('strong');
      const idText=(row.textContent.match(/Händler #[^\n]+/)||[])[0];
      const parts=row.querySelectorAll('strong');
      if(text==='pending'){
        const buttons=row.querySelectorAll('button');
        if(!buttons.length){
          const allStrong=Array.from(row.querySelectorAll('strong'));
          const merchantLabel=allStrong[0]?.textContent||'';
          const dateLabel=allStrong[0]?.parentElement?.querySelector('span')?.textContent||'';
          const amount=allStrong[1]?.textContent||'';
        }
      }
    });
  }
}
const payoutObserver=new MutationObserver(()=>decoratePayoutUI());
payoutObserver.observe(document.body,{subtree:true,childList:true});
setTimeout(decoratePayoutUI,300);
