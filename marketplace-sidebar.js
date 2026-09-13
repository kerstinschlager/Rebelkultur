(()=>{
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function init(){
    const shop=document.querySelector('#shopView'), toolbar=document.querySelector('#shopView .toolbar'), grid=document.querySelector('#productGrid');
    if(!shop||!toolbar||!grid||document.querySelector('#rkShopLayout'))return false;
    const layout=document.createElement('div'); layout.id='rkShopLayout';
    layout.innerHTML=`<aside class="rk-shop-sidebar" aria-label="Shop-Navigation">
      <div class="rk-sidebar-title">SHOP ENTDECKEN</div>
      <button type="button" class="rk-side-item active" data-side="all">▦ Alle Produkte</button>
      <button type="button" class="rk-side-item" data-side="popular">🔥 Beliebt</button>
      <button type="button" class="rk-side-item" data-side="new">✨ Neu</button>
      <button type="button" class="rk-side-item" data-side="personal">♥ Für dich</button>
      <button type="button" class="rk-side-item" data-side="merchants">♙ Händler</button>
      <div class="rk-sidebar-divider"></div>
      <div class="rk-sidebar-title">KATEGORIEN</div>
      <div id="rkSideCategories" class="rk-side-categories"><span class="muted">Laden …</span></div>
    </aside>
    <div class="rk-shop-main"><div class="rk-side-mobile-title">PRODUKTE</div></div>`;
    const main=layout.querySelector('.rk-shop-main'); shop.insertBefore(layout,toolbar); main.append(toolbar,grid);
    const goMode=mode=>{
      document.querySelectorAll('.rk-side-item').forEach(b=>b.classList.toggle('active',b.dataset.side===mode));
      const tab=document.querySelector(`.rk-tab[data-mode="${mode}"]`);
      if(tab)tab.click(); else if(mode==='all')grid.scrollIntoView({behavior:'smooth',block:'start'});
      grid.scrollIntoView({behavior:'smooth',block:'start'});
    };
    layout.querySelectorAll('[data-side]').forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.side==='merchants'){document.querySelector('#merchantDirectory')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
      goMode(b.dataset.side);
    }));
    const renderCats=()=>{
      const products=window.products||[];
      const cats=[...new Set(products.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
      const el=document.querySelector('#rkSideCategories'); if(!el)return;
      el.innerHTML=cats.slice(0,18).map(c=>`<button type="button" class="rk-side-category" data-cat="${esc(c)}">${esc(c)}</button>`).join('')||'<span class="muted">Noch keine Kategorien</span>';
      el.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{
        const select=document.querySelector('#categoryFilter'); if(select){select.value=b.dataset.cat;select.dispatchEvent(new Event('change',{bubbles:true}));}
        grid.scrollIntoView({behavior:'smooth',block:'start'});
      }));
    };
    renderCats(); let tries=0; const tick=()=>{renderCats();if((window.products||[]).length||tries++>15)return;setTimeout(tick,400)};tick();
    return true;
  }
  const style=document.createElement('style'); style.textContent=`#rkShopLayout{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:230px minmax(0,1fr);gap:22px;align-items:start}.rk-shop-sidebar{position:sticky;top:18px;background:#fff;border:1px solid #e4ddea;border-radius:18px;padding:16px;box-shadow:0 8px 28px #2b173d0d}.rk-sidebar-title{font-size:10px;font-weight:900;letter-spacing:.14em;color:#817789;margin:3px 8px 10px}.rk-side-item,.rk-side-category{width:100%;text-align:left;border:0;background:transparent;border-radius:10px;padding:10px 11px;font-size:13px;cursor:pointer;color:#342d3b}.rk-side-item:hover,.rk-side-category:hover{background:#f5f1f8}.rk-side-item.active{background:#17131c;color:#fff;font-weight:800}.rk-sidebar-divider{height:1px;background:#eee8f1;margin:14px 0}.rk-side-categories{display:flex;flex-direction:column;gap:2px;max-height:390px;overflow:auto}.rk-side-category{font-size:12px;padding:8px 11px}.rk-shop-main{min-width:0}.rk-side-mobile-title{display:none;font-size:11px;font-weight:900;letter-spacing:.12em;color:#817789;margin:0 0 8px}.rk-shop-main>.toolbar{margin-top:0}.rk-shop-main>#productGrid{margin-top:16px}@media(max-width:850px){#rkShopLayout{grid-template-columns:1fr;margin:0 12px;gap:12px}.rk-shop-sidebar{position:relative;top:auto;padding:12px;display:flex;flex-wrap:wrap;gap:6px}.rk-sidebar-title{width:100%;margin:2px 5px 2px}.rk-side-item{width:auto;flex:1 1 auto}.rk-sidebar-divider{display:none}.rk-side-categories{width:100%;display:grid;grid-template-columns:repeat(2,1fr);max-height:170px;overflow:auto}.rk-side-category{background:#faf8fc}.rk-side-mobile-title{display:block}}`; document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1100));else setTimeout(init,1100);
})();