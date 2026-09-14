(() => {
  function init() {
    if (document.getElementById('zqMobileHeader')) return;
    const header = document.querySelector('.site-header');
    if (!header) return;

    const bar = document.createElement('div');
    bar.id = 'zqMobileHeader';
    bar.className = 'zq-mobile-actions';
    bar.innerHTML = `
      <button type="button" data-zq-action="menu" aria-label="Menü öffnen" aria-expanded="false">☰<span>Menü</span></button>
      <button type="button" data-zq-action="search" aria-label="Produkte suchen">⌕<span>Suche</span></button>
      <button type="button" data-zq-action="cart" aria-label="Warenkorb öffnen">🛒<b id="zqMobileCartCount">0</b><span>Warenkorb</span></button>
      <button type="button" data-zq-action="account" aria-label="Konto öffnen">◯<span>Konto</span></button>`;

    const drawer = document.createElement('div');
    drawer.id = 'zqMobileMenu';
    drawer.className = 'zq-mobile-menu hidden';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="zq-mobile-menu-card">
        <div class="zq-mobile-menu-head"><strong>Zorqemi</strong><button type="button" data-zq-close aria-label="Menü schließen">×</button></div>
        <button type="button" data-zq-view="shop">Shop</button>
        <button type="button" data-zq-view="dashboard">Händlerbereich</button>
        <button type="button" data-zq-view="admin" id="zqMobileAdmin" class="hidden">Admin</button>
      </div>`;

    document.body.append(bar, drawer);

    const syncCart = () => {
      const source = document.getElementById('cartCount');
      const target = document.getElementById('zqMobileCartCount');
      if (source && target) target.textContent = source.textContent || '0';
    };
    const openMenu = () => { drawer.classList.remove('hidden'); drawer.setAttribute('aria-hidden', 'false'); bar.querySelector('[data-zq-action="menu"]')?.setAttribute('aria-expanded', 'true'); };
    const closeMenu = () => { drawer.classList.add('hidden'); drawer.setAttribute('aria-hidden', 'true'); bar.querySelector('[data-zq-action="menu"]')?.setAttribute('aria-expanded', 'false'); };

    bar.addEventListener('click', e => {
      const action = e.target.closest('[data-zq-action]')?.dataset.zqAction;
      if (action === 'menu') drawer.classList.contains('hidden') ? openMenu() : closeMenu();
      if (action === 'search') { closeMenu(); document.querySelector('[data-view="shop"]')?.click(); setTimeout(() => document.getElementById('search')?.focus(), 50); }
      if (action === 'cart') document.getElementById('cartBtn')?.click();
      if (action === 'account') document.getElementById('authBtn')?.click();
      syncCart();
    });
    drawer.addEventListener('click', e => {
      if (e.target.closest('[data-zq-close]')) return closeMenu();
      const view = e.target.closest('[data-zq-view]')?.dataset.zqView;
      if (!view) return;
      document.querySelector(`[data-view="${view}"]`)?.click();
      closeMenu();
    });
    document.getElementById('adminNavBtn')?.addEventListener('click', () => {
      const admin = document.getElementById('zqMobileAdmin');
      admin?.classList.toggle('hidden', document.getElementById('adminNavBtn')?.classList.contains('hidden'));
    });
    const observer = new MutationObserver(syncCart);
    const count = document.getElementById('cartCount');
    if (count) observer.observe(count, { childList: true, characterData: true, subtree: true });
    syncCart();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
