(function(){
  const URL='https://oansbivjkczjbtxaknks.supabase.co';
  const KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const db=window.supabase.createClient(URL,KEY);
  const base=location.origin+location.pathname.replace(/[^/]+$/,'');
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function mount(){
    if(document.querySelector('#merchantDirectory'))return;
    const shop=document.querySelector('#shopView');
    if(!shop)return;
    const sec=document.createElement('section'); sec.id='merchantDirectory'; sec.className='merchant-directory';
    sec.innerHTML='<div class="page-head"><div><p class="eyebrow">HÄNDLER</p><h2>Unsere Händler</h2><p>Entdecke unabhängige Shops auf Rebelkultur.</p></div><span id="merchantCount" class="muted"></span></div><div id="merchantGrid" class="merchant-grid"><p class="muted">Händler werden geladen …</p></div>';
    shop.parentNode.appendChild(sec);
    const style=document.createElement('style');style.textContent='.merchant-directory{max-width:1180px;margin:55px auto 80px;padding:0 20px}.merchant-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.merchant-card{border:1px solid #ddd;border-radius:22px;padding:22px;background:rgba(255,255,255,.8);box-shadow:0 10px 30px rgba(20,15,35,.06)}.merchant-card-top{display:flex;gap:16px;align-items:center}.merchant-avatar{width:72px;height:72px;border-radius:18px;background:#d7ff18;display:grid;place-items:center;font-size:28px;font-weight:900;color:#121016;overflow:hidden}.merchant-avatar img{width:100%;height:100%;object-fit:contain}.merchant-card h3{margin:0}.merchant-card p{min-height:42px}.merchant-card .primary{display:inline-flex;text-decoration:none}.merchant-badge{font-size:11px;letter-spacing:.12em;font-weight:800;color:#79b900}.merchant-directory .page-head{margin-bottom:20px}';document.head.appendChild(style);
    load();
  }
  async function load(){
    const grid=document.querySelector('#merchantGrid'),count=document.querySelector('#merchantCount');
    const {data,error}=await db.from('public_merchants').select('id,shop_name,slug,status,description,logo_url,shop_url').order('shop_name',{ascending:true});
    if(error){console.error(error);grid.innerHTML='<p class="muted">Händler konnten nicht geladen werden.</p>';return}
    const rows=data||[];
    count.textContent=`${rows.length} ${rows.length===1?'Händler':'Händler'}`;
    grid.innerHTML=rows.map(m=>{const href=base+'shop/?shop='+encodeURIComponent(m.slug||'');const img=m.logo_url?`<img src="${esc(m.logo_url)}" alt="${esc(m.shop_name)} Logo">`:'RK';return `<article class="merchant-card"><div class="merchant-card-top"><div class="merchant-avatar">${img}</div><div><div class="merchant-badge">VERÖFFENTLICHT</div><h3>${esc(m.shop_name)}</h3></div></div><p>${esc(m.description||'Händler-Shop auf Rebelkultur.')}</p><a class="primary" href="${esc(href)}">Shop ansehen →</a></article>`}).join('')||'<p class="muted">Noch keine veröffentlichten Händler.</p>';
  }
  function loadFilterScript(){if(document.querySelector('script[data-marketplace-filters]'))return;const s=document.createElement('script');s.src=base+'marketplace-filters.js';s.dataset.marketplaceFilters='1';document.body.appendChild(s)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(mount,700);setTimeout(loadFilterScript,1200)});else{setTimeout(mount,700);setTimeout(loadFilterScript,1200)}
})();