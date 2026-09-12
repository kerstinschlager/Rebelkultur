(function(){
  const URL='https://oansbivjkczjbtxaknks.supabase.co';
  const KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const db=window.supabase.createClient(URL,KEY);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const profileKey='rk_discovery_profile',wishKey='rk_wishlist';
  const getJSON=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}};
  const getProfile=()=>getJSON(profileKey,{products:{},categories:{},merchants:{}});
  const saveProfile=p=>localStorage.setItem(profileKey,JSON.stringify(p));
  const getWishlist=()=>getJSON(wishKey,[]);
  const saveWishlist=a=>localStorage.setItem(wishKey,JSON.stringify(a));
  const toastA=t=>{if(typeof toast==='function')toast(t)};
  async function init(){
    const shop=document.querySelector('#shopView'),grid=document.querySelector('#productGrid');
    if(!shop||!grid||document.querySelector('#rkDiscovery'))return;
    const currentShop=new URLSearchParams(location.search).get('shop');
    const host=document.createElement('section');host.id='rkDiscovery';
    host.innerHTML='<div class="rk-discovery-head"><div><span class="rk-kicker">REBELKULTUR ENTDECKEN</span><h2 id="rkDiscoveryTitle">Für dich entdeckt</h2><p id="rkDiscoveryText">Produkte aus verschiedenen Rebelkultur Shops – automatisch nach Relevanz zusammengestellt.</p></div><button type="button" class="secondary" id="rkShuffle">Neu entdecken</button></div><div class="rk-discovery-grid" id="rkDiscoveryGrid"><div class="muted">Entdecke gerade neue Produkte …</div></div>';
    const toolbar=shop.querySelector('.toolbar');if(toolbar)toolbar.parentNode.insertBefore(host,toolbar);else grid.parentNode.insertBefore(host,grid);
    const {data:rows,error}=await db.from('products').select('id,name,slug,description,price,stock,image_url,created_at,category_id,merchant_id').eq('active',true).gt('stock',0).order('created_at',{ascending:false}).limit(100);
    if(error||!rows?.length){host.remove();return;}
    const merchants={},cats={};
    const mids=[...new Set(rows.map(p=>p.merchant_id).filter(Boolean))],cids=[...new Set(rows.map(p=>p.category_id).filter(Boolean))];
    if(mids.length){const r=await db.from('public_merchants').select('id,shop_name,slug').in('id',mids);if(!r.error)(r.data||[]).forEach(m=>merchants[m.id]=m)}
    if(cids.length){const r=await db.from('categories').select('id,name').in('id',cids);if(!r.error)(r.data||[]).forEach(c=>cats[c.id]=c.name)}
    const profile=getProfile();let offset=0;
    const score=(p,q)=>{
      const query=(q||'').trim().toLowerCase(),text=(p.name+' '+(p.description||'')).toLowerCase(),cat=(cats[p.category_id]||'').toLowerCase();let s=0;
      if(query)query.split(/\s+/).filter(Boolean).forEach(w=>{if(text.includes(w))s+=30;if(cat.includes(w))s+=45});
      s+=(profile.products[p.id]||0)*10+(profile.categories[p.category_id]||0)*7+(profile.merchants[p.merchant_id]||0)*3;
      if(p.description)s+=3;if(p.image_url)s+=3;
      const age=Math.max(0,(Date.now()-new Date(p.created_at).getTime())/86400000);s+=Math.max(0,12-age*.4);
      return s;
    };
    const getCategory=()=>{const v=document.querySelector('#categoryFilter')?.value||'';return v==='all'?'':v};
    const render=()=>{
      const search=document.querySelector('#search')?.value||'',category=getCategory(),title=document.querySelector('#rkDiscoveryTitle'),text=document.querySelector('#rkDiscoveryText');
      if(search.trim()){title.textContent='Passend zu deiner Suche';text.textContent='Rebelkultur sucht Händler-übergreifend nach passenden Produkten.'}
      else if(category){title.textContent='Passend zur Kategorie';text.textContent='Weitere passende Produkte aus verschiedenen Rebelkultur Shops.'}
      else if(currentShop){title.textContent='Auch interessant';text.textContent='Produkte aus anderen Rebelkultur Shops, passend zu deinem Besuch.'}
      else{title.textContent='Für dich entdeckt';text.textContent='Automatisch nach Interesse, Aktualität und Relevanz zusammengestellt.'}
      const candidates=rows.filter(p=>!category||String(cats[p.category_id]||'')===String(category));
      const ranked=[...candidates].sort((a,b)=>score(b,search)-score(a,search));
      const pool=ranked.length?[...ranked.slice(offset),...ranked.slice(0,offset)]:[],list=[],used=new Set(),wishes=new Set(getWishlist());
      for(const p of pool){if(currentShop&&merchants[p.merchant_id]?.slug===currentShop)continue;if(list.length>=6)break;if(!used.has(p.merchant_id)||list.length>=4){list.push(p);used.add(p.merchant_id)}}
      document.querySelector('#rkDiscoveryGrid').innerHTML=list.map(p=>{const m=merchants[p.merchant_id],cat=cats[p.category_id]||'Produkte',href=m?.slug?`${location.pathname}?shop=${encodeURIComponent(m.slug)}#shop`:'#shop',saved=wishes.has(String(p.id));return `<article class="rk-discovery-card"><button type="button" class="rk-wish ${saved?'saved':''}" data-wish="${esc(p.id)}" aria-label="${saved?'Aus Merkliste entfernen':'Auf Merkliste setzen'}">${saved?'♥':'♡'}</button><a href="${esc(href)}" data-rk-product="${esc(p.id)}" data-rk-category="${esc(p.category_id||'')}" data-rk-merchant="${esc(p.merchant_id||'')}">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'<div class="rk-discovery-placeholder">RK</div>'}<div class="rk-discovery-body"><span>${esc(cat)}</span><strong>${esc(p.name)}</strong><small>${esc(m?.shop_name||'Rebelkultur Händler')}</small><b>${money(p.price)}</b></div></a></article>`}).join('')||'<div class="merchant-shop-empty"><strong>Keine passenden Empfehlungen.</strong><span>Ändere Suche oder Kategorie und entdecke weitere Produkte.</span></div>';
      document.querySelectorAll('[data-rk-product]').forEach(a=>a.addEventListener('click',()=>{const p=getProfile();p.products[a.dataset.rkProduct]=(p.products[a.dataset.rkProduct]||0)+1;if(a.dataset.rkCategory)p.categories[a.dataset.rkCategory]=(p.categories[a.dataset.rkCategory]||0)+1;if(a.dataset.rkMerchant)p.merchants[a.dataset.rkMerchant]=(p.merchants[a.dataset.rkMerchant]||0)+1;saveProfile(p)}));
      document.querySelectorAll('[data-wish]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const id=String(btn.dataset.wish),a=getWishlist(),i=a.indexOf(id);if(i>=0){a.splice(i,1);btn.textContent='♡';btn.classList.remove('saved');btn.setAttribute('aria-label','Auf Merkliste setzen');toastA('Aus der Merkliste entfernt')}else{a.unshift(id);btn.textContent='♥';btn.classList.add('saved');btn.setAttribute('aria-label','Aus Merkliste entfernen');toastA('Auf Merkliste gespeichert')}saveWishlist(a);if(window.rkRenderWishlist)window.rkRenderWishlist()}));
    };
    document.querySelector('#rkShuffle')?.addEventListener('click',()=>{const n=rows.filter(p=>!getCategory()||String(cats[p.category_id]||'')===String(getCategory())).length;offset=(offset+6)%Math.max(1,n);render()});
    document.querySelector('#search')?.addEventListener('input',()=>{offset=0;render()});
    document.querySelector('#categoryFilter')?.addEventListener('change',()=>{offset=0;render()});
    render();
  }
  const style=document.createElement('style');style.textContent=`#rkDiscovery{max-width:1180px;margin:26px auto 8px;padding:22px 20px;border:1px solid #e4ddeb;border-radius:20px;background:linear-gradient(135deg,#faf7ff,#fff)}.rk-discovery-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:16px}.rk-kicker{font-size:11px;font-weight:800;letter-spacing:.14em;color:#7d4dff}.rk-discovery-head h2{margin:5px 0 4px;font-size:25px}.rk-discovery-head p{margin:0;color:#6f6878}.rk-discovery-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.rk-discovery-card{position:relative;min-width:0;border:1px solid #e6e0eb;border-radius:15px;background:#fff;overflow:hidden}.rk-discovery-card a{text-decoration:none;color:inherit}.rk-discovery-card img,.rk-discovery-placeholder{width:100%;height:135px;object-fit:cover;display:block;background:#f0ebf7}.rk-discovery-placeholder{display:grid;place-items:center;font-weight:900;font-size:24px;color:#7d4dff}.rk-discovery-body{padding:10px}.rk-discovery-body span,.rk-discovery-body small{display:block;color:#777080;font-size:11px}.rk-discovery-body strong{display:block;margin:4px 0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rk-discovery-body b{display:block;margin-top:7px;font-size:15px}.rk-discovery-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px #2b173d12}.rk-discovery-card img{transition:transform .2s}.rk-discovery-card:hover img{transform:scale(1.03)}.rk-wish{position:absolute;z-index:3;top:8px;right:8px;width:34px;height:34px;border:0;border-radius:50%;background:#fff;box-shadow:0 2px 10px #0002;font-size:20px;line-height:1;cursor:pointer}.rk-wish.saved{background:#111;color:#fff}.rk-wish:focus-visible{outline:2px solid #7d4dff;outline-offset:2px}@media(max-width:1000px){.rk-discovery-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:620px){#rkDiscovery{margin-left:12px;margin-right:12px}.rk-discovery-head{align-items:flex-start;flex-direction:column}.rk-discovery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rk-discovery-card img,.rk-discovery-placeholder{height:120px}}`;document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1600));else setTimeout(init,1600);
})();