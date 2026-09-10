(function(){
  const URL='https://oansbivjkczjbtxaknks.supabase.co';
  const KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const db=window.supabase.createClient(URL,KEY);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=v=>{try{const u=new URL(String(v||''),location.href);return /^https?:$/.test(u.protocol)?u.href:''}catch(e){return ''}};
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const params=new URLSearchParams(location.search),slug=params.get('shop');
  if(!slug)return;
  async function init(){
    const shopView=document.querySelector('#shopView'),grid=document.querySelector('#productGrid');
    if(!shopView||!grid)return;
    const {data:merchant,error}=await db.from('public_merchants').select('id,shop_name,slug,description,logo_url,shop_url').eq('slug',slug).maybeSingle();
    if(error||!merchant){document.title='Händler-Shop | Rebelkultur Shops';grid.innerHTML='<div class="merchant-shop-empty"><strong>Dieser Händler-Shop ist nicht verfügbar.</strong><span>Der Link ist möglicherweise abgelaufen oder der Shop wurde nicht veröffentlicht.</span><a class="secondary" href="? #shop">← Zur Händlerübersicht</a></div>';return;}
    document.title=`${merchant.shop_name} | Rebelkultur Shops`;
    let meta=document.querySelector('meta[name="description"]');
    if(!meta){meta=document.createElement('meta');meta.name='description';document.head.appendChild(meta)}
    meta.content=`${merchant.shop_name} – Produkte und Angebote auf Rebelkultur Shops. ${merchant.description||''}`.slice(0,160);
    const external=safeUrl(merchant.shop_url);
    const hero=shopView.querySelector('.hero');
    if(hero)hero.innerHTML=`<div><p class="eyebrow">HÄNDLER-SHOP</p><h1>${esc(merchant.shop_name)}</h1><p>${esc(merchant.description||'Entdecke die Produkte dieses Händlers auf Rebelkultur.')}</p><div class="merchant-shop-actions"><a class="secondary" href="?shop=${encodeURIComponent(merchant.slug)}#shop">Shop-Start</a>${external?`<a class="secondary" href="${esc(external)}" target="_blank" rel="noopener noreferrer">Externe Shop-Website öffnen</a>`:''}</div></div><div class="hero-card merchant-shop-logo">${merchant.logo_url?`<img src="${esc(merchant.logo_url)}" alt="${esc(merchant.shop_name)} Logo">`:'RK'}</div>`;
    const toolbar=shopView.querySelector('.toolbar');
    if(toolbar&&!toolbar.previousElementSibling?.classList.contains('merchant-shop-title')){const title=document.createElement('div');title.className='merchant-shop-title';title.innerHTML=`<strong>Produkte von ${esc(merchant.shop_name)}</strong>`;toolbar.parentNode.insertBefore(title,toolbar);}
    const {data:rows,error:prodError}=await db.from('products').select('id,name,slug,description,price,stock,image_url,created_at,category_id').eq('active',true).eq('merchant_id',merchant.id).order('created_at',{ascending:false});
    if(prodError){grid.innerHTML='<div class="merchant-shop-empty"><strong>Produkte konnten nicht geladen werden.</strong><span>Bitte versuche es später erneut.</span></div>';return;}
    const products=rows||[];
    const ids=[...new Set(products.map(p=>p.category_id).filter(Boolean))];let cats={};
    if(ids.length){const r=await db.from('categories').select('id,name').in('id',ids);if(!r.error)(r.data||[]).forEach(c=>cats[c.id]=c.name)}
    const render=()=>{
      const q=(document.querySelector('#search')?.value||'').toLowerCase().trim(),cat=document.querySelector('#categoryFilter')?.value||'all',sort=document.querySelector('#sort')?.value||'new';
      let list=products.map(p=>({...p,category:cats[p.category_id]||'Produkte'})).filter(p=>(p.name+' '+(p.description||'')).toLowerCase().includes(q)&&(cat==='all'||p.category===cat));
      if(sort==='priceAsc')list.sort((a,b)=>a.price-b.price);else if(sort==='priceDesc')list.sort((a,b)=>b.price-a.price);
      grid.innerHTML=list.map(p=>`<article class="product">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'<div class="placeholder">RK</div>'}<div class="product-body"><div class="muted">${esc(p.category)}</div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.description||'')}</p><div class="price">${money(p.price)}</div><button class="add" ${Number(p.stock)<=0?'disabled':''} onclick="addToCart(${p.id})">${Number(p.stock)>0?'In den Warenkorb':'Ausverkauft'}</button></div></article>`).join('')||'<div class="merchant-shop-empty"><strong>Keine passenden Produkte.</strong><span>Dieser Händler hat für diese Auswahl keine Produkte.</span></div>';
    };
    const cf=document.querySelector('#categoryFilter');
    if(cf){const values=[...new Set(products.map(p=>cats[p.category_id]||'Produkte'))].sort();cf.innerHTML='<option value="all">Alle Kategorien</option>'+values.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');}
    ['search','categoryFilter','sort'].forEach(id=>document.querySelector('#'+id)?.addEventListener('input',render));
    const dir=document.querySelector('#merchantDirectory');if(dir)dir.remove();
    const style=document.createElement('style');style.textContent='.merchant-shop-title{max-width:1180px;margin:28px auto -35px;padding:0 20px;font-size:18px}.merchant-shop-logo{overflow:hidden}.merchant-shop-logo img{width:100%;height:100%;object-fit:contain;border-radius:16px}.merchant-shop-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.merchant-shop-actions a{text-decoration:none}.merchant-shop-empty{padding:32px 20px;margin:20px 0;border:1px dashed #d7d0e2;border-radius:16px;background:#ffffffb8;text-align:center}.merchant-shop-empty strong{display:block;margin-bottom:6px}.merchant-shop-empty span{display:block;color:#6f6878;margin-bottom:15px}.merchant-shop-empty a{display:inline-block;text-decoration:none}';document.head.appendChild(style);
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1300));else setTimeout(init,1300);
})();
