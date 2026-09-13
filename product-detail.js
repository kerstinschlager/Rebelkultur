(function(){
  const URL='https://oansbivjkczjbtxaknks.supabase.co';
  const KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const db=window.supabase.createClient(URL,KEY);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const params=new URLSearchParams(location.search),key=params.get('product');
  if(!key)return;
  async function init(){
    const shop=document.querySelector('#shopView');
    if(!shop)return;
    const numericId=/^\d+$/.test(key)?Number(key):null;
    let query=db.from('products').select('id,name,slug,description,price,stock,image_url,created_at,category_id,merchant_id').eq('active',true);
    const {data:p,error}=numericId?await query.eq('id',numericId).maybeSingle():await query.eq('slug',key).maybeSingle();
    if(error||!p){shop.innerHTML='<section class="rk-product-detail rk-product-empty"><span>PRODUKT</span><h1>Produkt nicht gefunden.</h1><p>Dieses Produkt ist nicht mehr verfügbar oder wurde noch nicht veröffentlicht.</p><a href="'+esc(location.pathname)+'#products">← Zurück zum Marktplatz</a></section>';return;}
    let category='Produkte',merchantName='Rebelkultur Händler';
    if(p.category_id){const r=await db.from('categories').select('name').eq('id',p.category_id).maybeSingle();category=r.data?.name||category}
    if(p.merchant_id){const r=await db.from('public_merchants').select('shop_name,slug').eq('id',p.merchant_id).maybeSingle();if(r.data)merchantName=r.data.shop_name}
    document.title=`${p.name} | Rebelkultur Shops`;
    const image=p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'<div class="rk-detail-placeholder"><strong>RK</strong><span>REBELKULTUR SHOPS</span></div>';
    shop.innerHTML=`<section class="rk-product-detail"><a class="rk-back" href="${esc(location.pathname)}#products">← ZURÜCK ZUM MARKTPLATZ</a><div class="rk-detail-grid"><div class="rk-detail-media">${image}</div><div class="rk-detail-info"><span class="rk-detail-kicker">${esc(category)} · ${esc(merchantName)}</span><h1>${esc(p.name)}</h1><p class="rk-detail-price">${money(p.price)}</p><p class="rk-detail-description">${esc(p.description||'Entdecke dieses Produkt von einem unabhängigen Händler auf Rebelkultur.')}</p><div class="rk-detail-stock">${Number(p.stock)>0?`<b>${Number(p.stock)} auf Lager</b>`:'<b>Ausverkauft</b>'}</div><button class="rk-detail-add" ${Number(p.stock)<=0?'disabled':''}>${Number(p.stock)>0?'IN DEN WARENKORB':'AUSVERKAUFT'}</button><a class="rk-detail-shop" href="${esc(location.pathname)}?shop=${encodeURIComponent('')}#shop" data-merchant-shop>HÄNDLER-SHOP ANSEHEN →</a></div></div></section>`;
    const shopLink=shop.querySelector('[data-merchant-shop]');
    if(shopLink&&p.merchant_id){const r=await db.from('public_merchants').select('slug').eq('id',p.merchant_id).maybeSingle();if(r.data?.slug)shopLink.href=`${location.pathname}?shop=${encodeURIComponent(r.data.slug)}#shop`;else shopLink.remove()}
    shop.querySelector('.rk-detail-add')?.addEventListener('click',()=>{
      let cart=JSON.parse(localStorage.getItem('rebel_cart')||'[]');const item=cart.find(x=>x.id===p.id);
      if(item){if(item.qty>=Number(p.stock)){window.toast?.('Nicht mehr auf Lager');return}item.qty++}else cart.push({id:p.id,qty:1});
      localStorage.setItem('rebel_cart',JSON.stringify(cart));document.querySelector('#cartCount')&&(document.querySelector('#cartCount').textContent=cart.reduce((s,x)=>s+x.qty,0));window.toast?.('Produkt hinzugefügt');
    });
    const s=document.createElement('style');s.textContent=`
      .rk-product-detail{max-width:1200px;margin:0 auto;padding:38px 5% 90px}.rk-back{display:inline-block;color:#111;text-decoration:none;font-size:10px;font-weight:950;letter-spacing:.12em;border-bottom:2px solid #111;padding-bottom:4px}.rk-detail-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(320px,.92fr);gap:7%;align-items:center;margin-top:38px}.rk-detail-media{min-height:560px;border:1px solid #111;background:#f1f0ea;display:grid;place-items:center;overflow:hidden}.rk-detail-media img{width:100%;height:100%;min-height:560px;object-fit:cover;display:block}.rk-detail-placeholder{width:100%;height:100%;min-height:560px;background:linear-gradient(135deg,#17131d 0 48%,#b7ff18 48% 57%,#7d4dff 57%);display:grid;place-items:center;color:#fff;text-align:center}.rk-detail-placeholder strong{font-size:130px;line-height:.7;color:#b7ff18;text-shadow:5px 5px 0 #050505}.rk-detail-placeholder span{font-size:10px;letter-spacing:.2em;font-weight:900}.rk-detail-kicker{font-size:10px;letter-spacing:.16em;font-weight:900}.rk-detail-info h1{font-size:clamp(48px,6vw,82px);line-height:.86;letter-spacing:-.065em;font-weight:500;margin:18px 0}.rk-detail-price{font-size:27px;font-weight:900;margin:0 0 22px}.rk-detail-description{font-size:15px;line-height:1.65;color:#555;max-width:520px}.rk-detail-stock{font-size:12px;margin:24px 0}.rk-detail-add{width:100%;padding:17px 20px;border:1px solid #111;background:#111;color:#fff;font-weight:950;letter-spacing:.08em;cursor:pointer}.rk-detail-add:hover:not(:disabled){background:#7d4dff}.rk-detail-add:disabled{opacity:.45;cursor:not-allowed}.rk-detail-shop{display:block;text-align:center;margin-top:16px;color:#111;text-decoration:none;font-size:11px;font-weight:950}.rk-product-empty{text-align:center;min-height:55vh;display:grid;place-items:center;align-content:center}.rk-product-empty h1{font-size:clamp(45px,7vw,80px);margin:15px 0}.rk-product-empty p{max-width:500px;color:#666}.rk-product-empty a{color:#111;font-weight:900}.rk-product-detail~#merchantDirectory{display:none}@media(max-width:800px){.rk-detail-grid{grid-template-columns:1fr;gap:35px}.rk-detail-media,.rk-detail-media img,.rk-detail-placeholder{min-height:380px}.rk-detail-placeholder strong{font-size:90px}}
    `;document.head.appendChild(s);
    document.querySelector('#merchantDirectory')?.remove();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1500));else setTimeout(init,1500);
})();
