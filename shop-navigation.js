(() => {
  const style = document.createElement('style');
  style.textContent = `
    .rk-simple-nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 22px;padding:8px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;box-shadow:0 4px 18px rgba(15,23,42,.05)}
    .rk-simple-nav button{border:0;background:transparent;padding:11px 15px;border-radius:10px;cursor:pointer;font-weight:700;color:#4b5563}
    .rk-simple-nav button:hover{background:#f3f4f6;color:#111827}.rk-simple-nav button.active{background:#111827;color:#fff}
    .rk-simple-nav .rk-more{margin-left:auto;position:relative}.rk-more-menu{display:none;position:absolute;right:0;top:46px;z-index:20;min-width:210px;padding:7px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.14)}
    .rk-more.open .rk-more-menu{display:block}.rk-more-menu button{display:block;width:100%;text-align:left}.rk-nav-hint{font-size:12px;color:#6b7280;margin:7px 2px 0}@media(max-width:700px){.rk-simple-nav{display:grid;grid-template-columns:repeat(2,1fr)}.rk-simple-nav .rk-more{margin-left:0}.rk-more-menu{left:0;right:auto}}
  `;
  document.head.appendChild(style);

  function go(tab){
    // Design & Website is a custom panel, not an app.js dash-tab.
    if(tab==='design' || tab==='customization'){
      if(typeof window.openDesign==='function'){ window.openDesign(); }
      else document.querySelector('.dash-tab[data-tab="design"]')?.click();
      document.querySelectorAll('.rk-simple-nav [data-rk-tab]').forEach(b => b.classList.toggle('active', b.dataset.rkTab === 'design'));
      return;
    }
    if(typeof window.setDashTab==='function') window.setDashTab(tab);
    else document.querySelector(`.dash-tab[data-tab="${tab}"]`)?.click();
    document.querySelectorAll('.rk-simple-nav [data-rk-tab]').forEach(b => b.classList.toggle('active', b.dataset.rkTab === tab));
  }

  function build(){
    const old = document.getElementById('dashboardNav');
    if (!old || document.getElementById('rkSimpleNav')) return;
    old.style.display = 'none';
    const nav = document.createElement('div');
    nav.id = 'rkSimpleNav'; nav.className = 'rk-simple-nav'; nav.setAttribute('aria-label','Händler-Navigation');
    nav.innerHTML = `
      <button type="button" data-rk-tab="overview" class="active">Start</button>
      <button type="button" data-rk-tab="products">Produkte</button>
      <button type="button" data-rk-tab="orders">Bestellungen</button>
      <button type="button" data-rk-tab="design">Shop gestalten</button>
      <div class="rk-more"><button type="button" data-more>Mehr ▾</button><div class="rk-more-menu">
        <button type="button" data-rk-tab="settings">Einstellungen</button>
        <button type="button" data-rk-tab="legal">Rechtliches</button>
        <button type="button" data-rk-tab="checklist">Start-Checkliste</button>
        <button type="button" data-rk-tab="marketing">Marketing</button>
        <button type="button" data-rk-tab="faq">FAQ & Support</button>
      </div></div>`;
    old.parentNode.insertBefore(nav, old);

    nav.addEventListener('click', e => {
      const more = e.target.closest('[data-more]');
      if (more) { more.parentElement.classList.toggle('open'); return; }
      const b = e.target.closest('[data-rk-tab]'); if (!b) return;
      e.preventDefault(); go(b.dataset.rkTab); nav.querySelector('.rk-more')?.classList.remove('open');
    });
    document.addEventListener('click', e => { if (!e.target.closest('.rk-more')) nav.querySelector('.rk-more')?.classList.remove('open'); });
  }

  const oldSet = window.setDashTab;
  if(typeof oldSet==='function') window.setDashTab=function(tab){ const r=oldSet.apply(this,arguments); setTimeout(()=>document.querySelectorAll('#rkSimpleNav [data-rk-tab]').forEach(b=>b.classList.toggle('active',b.dataset.rkTab===tab)),0); return r; };
  setTimeout(build,100);
  document.addEventListener('click',e=>{if(e.target.closest('[data-view="dashboard"]'))setTimeout(build,100);});
})();
