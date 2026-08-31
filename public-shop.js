(function(){
  const SUPABASE_URL='https://oansbivjkczjbtxaknks.supabase.co';
  const SUPABASE_KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const shopDb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const base=location.origin+location.pathname.replace(/[^/]+$/,'');
  function slug(){return new URLSearchParams(location.search).get('shop')||''}
  async function load(){
    const s=slug(); if(!s)return;
    const {data,error}=await shopDb.rpc('public_merchant_shop',{p_slug:s});
    if(error){console.error(error);return showError('Der Händler-Shop konnte nicht geladen werden.')}
    if(!data?.merchant)return showError('Dieser Händler-Shop ist nicht veröffentlicht oder nicht verfügbar.');
    render(data.merchant,data.products||[]);
  }
  function showError(t){document.body.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:30px;font-family:system-ui"><div style="max-width:620px;text-align:center"><h1>${esc(t)}</h1><p>Zurück zu <a href="${base}">Rebelkultur Shops</a></p></div></main>`}
  function render(m,products){
    document.title=`${m.shop_name} – Rebelkultur Shops`;
    document.body.innerHTML=`<header class="site-header"><a class="brand" href="${base}"><span class="brand-mark">RK</span><span><strong>Rebelkultur</strong><small>SHOPS</small></span></a><nav><a class="nav-btn active" href="${base}">Shop</a><a class="nav-btn" href="${base}?shop=${encodeURIComponent(m.slug)}#shop-products">Dieser Shop</a></nav><div class="header-actions"><a class="cart-btn" href="${base}">Zum Marktplatz</a></div></header><main class="merchant-public"><section class="merchant-hero"><div class="merchant-brand">${m.logo_url?`<img src="${esc(m.logo_url)}" alt="${esc(m.shop_name)} Logo">`:'<div class="merchant-logo-fallback">RK</div>'}<div><p class="eyebrow">HÄNDLER-SHOP</p><h1>${esc(m.shop_name)}</h1><p>${esc(m.description||'Willkommen im Händler-Shop.')}</p></div></div><a class="primary" href="#shop-products">Produkte ansehen</a></section><section id="shop-products"><div class="page-head"><div><p class="eyebrow">SHOP</p><h2>Produkte von ${esc(m.shop_name)}</h2></div><span class="muted">${products.length} ${products.length===1?'Produkt':'Produkte'}</span></div><div class="product-grid">${products.map(p=>`<article class="product"><a href="${base}?shop=${encodeURIComponent(m.slug)}&product=${encodeURIComponent(p.id)}#shop-products" style="text-decoration:none;color:inherit">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'<div class="placeholder">RK</div>'}<div class="product-body"><div class="muted">${p.category_id?'Produkt':'Artikel'}</div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.description||'')}</p><div class="price">${money(p.price)}</div></div></a></article>`).join('')||'<p>Noch keine veröffentlichten Produkte.</p>'}</div></section><section class="merchant-contact"><div><h2>Händlerprofil</h2><p>${esc(m.shop_name)} ist Teil von Rebelkultur Shops.</p></div>${m.shop_url?`<a class="secondary" href="${esc(m.shop_url)}" target="_blank" rel="noopener">Externe Shop-Seite</a>`:''}</section></main>`;
    const style=document.createElement('style');style.textContent='.merchant-public{padding:40px 20px 80px;max-width:1180px;margin:auto}.merchant-hero{display:flex;justify-content:space-between;align-items:end;gap:30px;padding:50px;border-radius:28px;background:linear-gradient(135deg,#181522,#2c1b42);color:#fff;margin-bottom:40px}.merchant-brand{display:flex;align-items:center;gap:24px}.merchant-brand img,.merchant-logo-fallback{width:96px;height:96px;object-fit:contain;border-radius:22px;background:#d7ff18;display:grid;place-items:center;font-weight:900;font-size:40px;color:#121016}.merchant-hero h1{font-size:clamp(42px,7vw,72px);margin:4px 0}.merchant-hero p{max-width:700px}.merchant-contact{margin-top:50px;padding:30px;border:1px solid #ddd;border-radius:20px;display:flex;justify-content:space-between;align-items:center;gap:20px}.merchant-public .product a{display:block}.nav-btn{display:inline-flex;align-items:center;text-decoration:none}';document.head.appendChild(style);
  }
  if(slug())load();
})();