(function(){
  const SUPABASE_URL='https://oansbivjkczjbtxaknks.supabase.co';
  const SUPABASE_KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const shopDb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const base=location.origin+location.pathname.replace(/[^/]+$/,'');
  const marketplaceBase=base.replace(/shop\/$/,'');

  function slug(){return new URLSearchParams(location.search).get('shop')||''}

  async function load(){
    const s=slug();
    if(!s)return;
    const {data,error}=await shopDb.rpc('public_merchant_shop',{p_slug:s});
    if(error){
      console.error(error);
      return showError('Der Händler-Shop konnte nicht geladen werden.');
    }
    if(!data?.merchant)return showError('Dieser Händler-Shop ist nicht veröffentlicht oder nicht verfügbar.');
    render(data.merchant,data.products||[]);
  }

  function showError(t){
    document.body.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:30px;font-family:system-ui"><div style="max-width:620px;text-align:center"><h1>${esc(t)}</h1><p>Zurück zu <a href="${marketplaceBase}">Rebelkultur Shops</a></p></div></main>`;
  }

  function addToCart(product){
    const cart=JSON.parse(localStorage.getItem('rebel_cart')||'[]');
    const existing=cart.find(x=>Number(x.id)===Number(product.id));
    if(existing){
      const maxStock=Number(product.stock)||0;
      if(maxStock>0 && Number(existing.qty||0)>=maxStock){
        window.alert('Nicht mehr auf Lager.');
        return;
      }
      existing.qty=Number(existing.qty||0)+1;
    }else{
      cart.push({id:Number(product.id),qty:1});
    }
    localStorage.setItem('rebel_cart',JSON.stringify(cart));
    window.location.href=marketplaceBase+'#shop';
  }

  function render(m,products){
    document.title=`${m.shop_name} – Rebelkultur Shops`;
    document.body.innerHTML=`
      <header class="site-header">
        <a class="brand" href="${marketplaceBase}" aria-label="Rebelkultur Shops Startseite">
          <span class="brand-mark">RK</span>
          <span><strong>Rebelkultur</strong><small>SHOPS</small></span>
        </a>
        <nav>
          <a class="nav-btn active" href="${marketplaceBase}">Shop</a>
          <a class="nav-btn" href="${base}?shop=${encodeURIComponent(m.slug)}#shop-products">Dieser Shop</a>
        </nav>
        <div class="header-actions">
          <a class="cart-btn" href="${marketplaceBase}#shop">Zum Marktplatz</a>
        </div>
      </header>
      <main class="merchant-public">
        <section class="merchant-hero">
          <div class="merchant-brand">
            ${m.logo_url?`<img src="${esc(m.logo_url)}" alt="${esc(m.shop_name)} Logo">`:'<div class="merchant-logo-fallback">RK</div>'}
            <div>
              <p class="eyebrow">HÄNDLER-SHOP</p>
              <h1>${esc(m.shop_name)}</h1>
              <p>${esc(m.description||'Willkommen im Händler-Shop.')}</p>
            </div>
          </div>
          <a class="primary" href="#shop-products">Produkte ansehen</a>
        </section>

        <section id="shop-products">
          <div class="page-head">
            <div><p class="eyebrow">SHOP</p><h2>Produkte von ${esc(m.shop_name)}</h2></div>
            <span class="muted">${products.length} ${products.length===1?'Produkt':'Produkte'}</span>
          </div>
          <div class="product-grid">
            ${products.map(p=>`
              <article class="product">
                ${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'<div class="placeholder">RK</div>'}
                <div class="product-body">
                  <div class="muted">${p.category_id?'Produkt':'Artikel'}</div>
                  <h3>${esc(p.name)}</h3>
                  <p class="muted">${esc(p.description||'')}</p>
                  <div class="price">${money(p.price)}</div>
                  <button class="primary public-add-to-cart" type="button" data-product-id="${Number(p.id)}" ${Number(p.stock)<=0?'disabled':''}>
                    ${Number(p.stock)>0?'In den Warenkorb':'Ausverkauft'}
                  </button>
                </div>
              </article>
            `).join('')||'<p>Noch keine veröffentlichten Produkte.</p>'}
          </div>
        </section>

        <section class="merchant-contact">
          <div><h2>Händlerprofil</h2><p>${esc(m.shop_name)} ist Teil von Rebelkultur Shops.</p></div>
          ${m.shop_url?`<a class="secondary" href="${esc(m.shop_url)}" target="_blank" rel="noopener">Externe Shop-Seite</a>`:''}
        </section>
      </main>
    `;

    const style=document.createElement('style');
    style.textContent=`
      .merchant-public{padding:40px 20px 80px;max-width:1180px;margin:auto}
      .merchant-hero{display:flex;justify-content:space-between;align-items:end;gap:30px;padding:50px;border-radius:28px;background:linear-gradient(135deg,#181522,#2c1b42);color:#fff;margin-bottom:40px}
      .merchant-brand{display:flex;align-items:center;gap:24px}
      .merchant-brand img,.merchant-logo-fallback{width:96px;height:96px;object-fit:contain;border-radius:22px;background:#d7ff18;display:grid;place-items:center;font-weight:900;font-size:40px;color:#121016}
      .merchant-hero h1{font-size:clamp(42px,7vw,72px);margin:4px 0}
      .merchant-hero p{max-width:700px}
      .merchant-public .product-body{display:flex;flex-direction:column;gap:8px}
      .merchant-public .public-add-to-cart{margin-top:8px;width:100%;cursor:pointer}
      .merchant-public .public-add-to-cart:disabled{opacity:.55;cursor:not-allowed}
      .nav-btn{display:inline-flex;align-items:center;text-decoration:none}
    `;
    document.head.appendChild(style);

    document.querySelectorAll('.public-add-to-cart').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const id=Number(btn.dataset.productId);
        const product=products.find(p=>Number(p.id)===id);
        if(product)addToCart(product);
      });
    });
  }

  if(slug())load();
})();