(function(){
  const URL='https://oansbivjkczjbtxaknks.supabase.co';
  const KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const db=window.supabase.createClient(URL,KEY);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const params=new URLSearchParams(location.search),slug=params.get('shop');
  if(!slug)return;
  async function init(){
    const shop=document.querySelector('#shopView');
    if(!shop||document.querySelector('#rkRecommendations'))return;
    const {data:merchant}=await db.from('public_merchants').select('id,shop_name,slug').eq('slug',slug).maybeSingle();
    if(!merchant)return;
    const {data:mine}=await db.from('products').select('id,name,description,price,category_id').eq('merchant_id',merchant.id).eq('active',true).limit(50);
    const own=mine||[], ownCats=new Set(own.map(p=>p.category_id).filter(Boolean));
    const {data:all}=await db.from('products').select('id,name,description,price,image_url,category_id,merchant_id,created_at').eq('active',true).gt('stock',0).neq('merchant_id',merchant.id).order('created_at',{ascending:false}).limit(80);
    if(!all?.length)return;
    const ids=[...new Set(all.map(p=>p.merchant_id).filter(Boolean))];
    const {data:ms}=await db.from('public_merchants').select('id,shop_name,slug').in('id',ids);
    const merchants={};(ms||[]).forEach(m=>merchants[m.id]=m);
    const ranked=all.map((p,i)=>{let score=0;if(ownCats.has(p.category_id))score+=100;const price=Number(p.price)||0;const avg=own.length?own.reduce((s,x)=>s+Number(x.price||0),0)/own.length:0;if(avg&&Math.abs(price-avg)/avg<0.35)score+=25;score+=Math.max(0,20-i/5);return {...p,score}}).sort((a,b)=>b.score-a.score);
    const list=ranked.slice(0,6);if(!list.length)return;
    const host=document.createElement('section');host.id='rkRecommendations';host.innerHTML=`<div class="rk-rec-head"><div><span class="rk-rec-kicker">AUCH INTERESSANT</span><h2>Das könnte dir auch gefallen</h2><p>Entdecke passende Produkte von anderen Rebelkultur-Händlern.</p></div></div><div class="rk-rec-grid">${list.map(p=>{const m=merchants[p.merchant_id];if(!m)return '';const href=`${location.pathname}?shop=${encodeURIComponent(m.slug||'')}#shop`;return `<article class="rk-rec-card"><a href="${esc(href)}"><div class="rk-rec-image">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'RK'}</div><div class="rk-rec-body"><strong>${esc(p.name)}</strong><small>${esc(m.shop_name)}</small><b>${money(p.price)}</b></div></a></article>`}).join('')}</div>`;
    const target=shop.querySelector('#productGrid');if(target?.parentNode)target.parentNode.appendChild(host);else shop.appendChild(host);
    const style=document.createElement('style');style.textContent=`#rkRecommendations{max-width:1180px;margin:48px auto 70px;padding:0 20px}.rk-rec-kicker{font-size:11px;font-weight:800;letter-spacing:.14em;color:#7d4dff}.rk-rec-head h2{margin:5px 0;font-size:24px}.rk-rec-head p{margin:0 0 18px;color:#6f6878}.rk-rec-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.rk-rec-card{border:1px solid #e2dce8;border-radius:16px;overflow:hidden;background:#fff;transition:.2s}.rk-rec-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px #2b173d12}.rk-rec-card a{text-decoration:none;color:inherit}.rk-rec-image{height:145px;background:#f0ebf7;display:grid;place-items:center;font-size:24px;font-weight:900;color:#7d4dff;overflow:hidden}.rk-rec-image img{width:100%;height:100%;object-fit:cover}.rk-rec-body{padding:11px}.rk-rec-body strong,.rk-rec-body small,.rk-rec-body b{display:block}.rk-rec-body strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rk-rec-body small{margin-top:4px;color:#756e7c;font-size:11px}.rk-rec-body b{margin-top:7px;color:var(--rk-theme-accent,#7d4dff)}body.theme-dark .rk-rec-card{background:#211e29;border-color:#3b3548;color:#f7f5fb}body.theme-dark .rk-rec-head p{color:#c7c1d2}@media(max-width:1000px){.rk-rec-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:620px){.rk-rec-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rk-rec-image{height:120px}}`;
    document.head.appendChild(style);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1800));else setTimeout(init,1800);
})();
