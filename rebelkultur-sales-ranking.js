(()=>{
  const U=window.__RK_SUPABASE_URL,K=window.__RK_SUPABASE_KEY;if(!U||!K||!window.supabase?.createClient)return;
  const db=window.supabase.createClient(U,K);let sales=new Map();
  async function load(){const {data,error}=await db.rpc('public_product_sales_signals',{p_limit:200});if(error||!data)return;sales=new Map(data.map(x=>[String(x.product_id),Number(x.sold_count||0)]));apply()}
  function apply(){document.querySelectorAll('#rkDiscoveryGrid .rk-discovery-card').forEach(card=>{const id=card.querySelector('[data-rk-product]')?.dataset.rkProduct,count=sales.get(String(id))||0;let badge=card.querySelector('.rk-sales-badge');if(count>=3){if(!badge){badge=document.createElement('span');badge.className='rk-sales-badge';card.appendChild(badge)}badge.textContent=count>=10?'🔥 Top-Seller':`🔥 ${count} verkauft`}else if(badge)badge.remove()})}
  const style=document.createElement('style');style.textContent='.rk-sales-badge{position:absolute;left:8px;top:8px;z-index:2;padding:5px 8px;border-radius:999px;background:#111;color:#fff;font-size:10px;font-weight:800;box-shadow:0 2px 8px #0003}';document.head.appendChild(style);
  new MutationObserver(apply).observe(document.body,{subtree:true,childList:true});setTimeout(load,2200);
})();