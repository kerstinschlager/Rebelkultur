(() => {
  const categories = [
    ['Mode & Kleidung','https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=82'],
    ['Schmuck','https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=82'],
    ['Beauty & Parfum','https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82'],
    ['Wohnen & Deko','https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=82'],
    ['Elektronik','https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=900&q=82'],
    ['Sport & Freizeit','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=82'],
    ['Personalisierte Produkte','https://images.unsplash.com/photo-1607007349804-8c5b1f9f2a0d?auto=format&fit=crop&w=900&q=82'],
    ['Digitale Produkte','https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=900&q=82']
  ];

  const css = document.createElement('style');
  css.textContent = `
    #zqVisualSection{margin:28px 0 34px}
    .zq-visual-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:16px}
    .zq-visual-head h2{margin:0;font-size:clamp(22px,3vw,34px);letter-spacing:-.02em}
    .zq-visual-head p{margin:5px 0 0;color:var(--muted,#9ca3af)}
    .zq-visual-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
    .zq-visual-card{position:relative;min-height:190px;border:1px solid rgba(255,255,255,.09);border-radius:20px;overflow:hidden;background:#111;box-shadow:0 12px 35px rgba(0,0,0,.22);cursor:pointer;transition:transform .2s ease,border-color .2s ease}
    .zq-visual-card:hover{transform:translateY(-4px);border-color:rgba(72,255,190,.55)}
    .zq-visual-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.72;transition:transform .35s ease,opacity .25s ease}
    .zq-visual-card:hover img{transform:scale(1.05);opacity:.86}
    .zq-visual-card:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 20%,rgba(0,0,0,.84) 100%)}
    .zq-visual-label{position:absolute;z-index:1;left:16px;right:12px;bottom:14px;font-weight:800;font-size:17px;letter-spacing:.01em;text-shadow:0 2px 12px #000}
    .zq-visual-label small{display:block;color:#65ffd0;font-size:10px;letter-spacing:.16em;margin-bottom:4px}
    @media(max-width:900px){.zq-visual-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.zq-visual-card{min-height:170px}}
    @media(max-width:520px){.zq-visual-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.zq-visual-card{min-height:145px;border-radius:15px}.zq-visual-label{font-size:14px;left:12px;bottom:11px}}
    .hero{position:relative;overflow:hidden}
    .hero:after{content:"";position:absolute;width:280px;height:280px;right:-100px;top:-130px;border-radius:50%;background:radial-gradient(circle,rgba(78,255,194,.22),transparent 68%);pointer-events:none}
  `;
  document.head.appendChild(css);

  function addVisuals(){
    const shop=document.getElementById('shopView');
    const toolbar=document.getElementById('products');
    if(!shop||!toolbar||document.getElementById('zqVisualSection')) return;
    const section=document.createElement('section');
    section.id='zqVisualSection';
    section.innerHTML=`<div class="zq-visual-head"><div><h2>Entdecke Zorqemi</h2><p>Stöbere durch verschiedene Welten und finde deinen nächsten Favoriten.</p></div></div><div class="zq-visual-grid"></div>`;
    const grid=section.querySelector('.zq-visual-grid');
    categories.forEach(([name,url])=>{
      const card=document.createElement('article');
      card.className='zq-visual-card';
      card.innerHTML=`<img loading="lazy" src="${url}" alt="${name}"><div class="zq-visual-label"><small>ZORQEMI</small>${name}</div>`;
      card.addEventListener('click',()=>{
        const filter=document.getElementById('categoryFilter');
        if(filter){filter.value=name;filter.dispatchEvent(new Event('change',{bubbles:true}));}
        toolbar.scrollIntoView({behavior:'smooth',block:'start'});
      });
      grid.appendChild(card);
    });
    toolbar.parentNode.insertBefore(section,toolbar);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addVisuals); else addVisuals();
  setTimeout(addVisuals,800);
})();