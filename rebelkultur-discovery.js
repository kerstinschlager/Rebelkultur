(function(){
  const URL='https://oansbivjkczjbtxaknks.supabase.co';
  const KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const db=window.supabase.createClient(URL,KEY);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  async function init(){
    const shop=document.querySelector('#shopView'),grid=document.querySelector('#productGrid');
    if(!shop||!grid||location.search.includes('shop='))return;
    const host=document.createElement('section');host.id='rkDiscovery';host.innerHTML=`<div class="rk-discovery-head"><div><span class="rk-kicker">REBELKULTUR ENTDECKEN</span><h2>Produkte, die zu dir passen</h2><p>Rebelkultur bringt interessante Produkte und Händler automatisch zusammen.</p></div><button type="button" class="secondary" id="rkShuffle">Neu entdecken</button></div><div class="rk-discovery-grid" id="rkDiscoveryGrid"><div class="muted">Entdecke gerade neue Produkte …</div></div>`;
    const toolbar=shop.querySelector('.toolbar');
    if(toolbar)toolbar.parentNode.insertBefore(host,toolbar);else grid.parentNode.insertBefore(host,grid);
    const {data:rows,error}=await db.from('products').select('id,name,slug,description,price,stock,image_url,created_at,category_id,merchant_id').eq('active',true).gt('stock',0).order('created_at',{ascending:false}).limit(60);
    if(error||!rows?.length){host.remove();return;}
    const merchantIds=[...new Set(rows.map(p=>p.merchant_id).filter(Boolean))];let merchants={};
    if(merchantIds.length){const r=await db.from('public_merchants').select('id,shop_name,slug').in('id',merchantIds);if(!r.error)(r.data||[]).forEach(m=>merchants[m.id]=m)}
    const ids=[...new Set(rows.map(p=>p.category_id).filter(Boolean))];let cats={};
    if(ids.length){const r=await db.from('categories').select('id,name').in('id',ids);if(!r.error)(r.data||[]).forEach(c=>cats[c.id]=c.name)}
    let offset=0;
    const render=()=>{
      const list=[];const pool=rows.slice(offset).concat(rows.slice(0,offset));
      pool.forEach(p=>{if(list.length>=6)return;list.push(p)});
      document.querySelector('#rkDiscoveryGrid').innerHTML=list.map(p=>{const m=merchants[p.merchant_id],cat=cats[p.category_id]||'Produkte';const href=`${location.pathname}?shop=${encodeURIComponent(m?.slug||'')}#shop`;return `<article class="rk-discovery-card"><a href="${esc(href)}" aria-label="${esc(p.name)} ansehen">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'<div class="rk-discovery-placeholder">RK</div>'}<div class="rk-discovery-body"><span>${esc(cat)}</span><strong>${esc(p.name)}</strong><small>${esc(m?.shop_name||'Rebelkultur Händler')}</small><b>${money(p.price)}</b></div></a></article>`}).join('');
    };
    document.querySelector('#rkShuffle')?.addEventListener('click',()=>{offset=(offset+6)%rows.length;render()});
    render();
  }
  const style=document.createElement('style');style.textContent=`
    #rkDiscovery{max-width:1180px;margin:26px auto 8px;padding:22px 20px;border:1px solid #e4ddeb;border-radius:20px;background:linear-gradient(135deg,#faf7ff,#fff)}
    .rk-discovery-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:16px}.rk-kicker{font-size:11px;font-weight:800;letter-spacing:.14em;color:#7d4dff}.rk-discovery-head h2{margin:5px 0 4px;font-size:25px}.rk-discovery-head p{margin:0;color:#6f6878}.rk-discovery-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.rk-discovery-card{min-width:0;border:1px solid #e6e0eb;border-radius:15px;background:#fff;overflow:hidden}.rk-discovery-card a{text-decoration:none;color:inherit}.rk-discovery-card img,.rk-discovery-placeholder{width:100%;height:135px;object-fit:cover;display:block;background:#f0ebf7}.rk-discovery-placeholder{display:grid;place-items:center;font-weight:900;font-size:24px;color:#7d4dff}.rk-discovery-body{padding:10px}.rk-discovery-body span,.rk-discovery-body small{display:block;color:#777080;font-size:11px}.rk-discovery-body strong{display:block;margin:4px 0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rk-discovery-body b{display:block;margin-top:7px;font-size:15px}.rk-discovery-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px #2b173d12}.rk-discovery-card img{transition:transform .2s}.rk-discovery-card:hover img{transform:scale(1.03)}
    @media(max-width:1000px){.rk-discovery-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:620px){.rk-discovery{margin-left:12px;margin-right:12px}.rk-discovery-head{align-items:flex-start;flex-direction:column}.rk-discovery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rk-discovery-card img,.rk-discovery-placeholder{height:120px}}
  `;document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1600));else setTimeout(init,1600);
})();
