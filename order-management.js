(() => {
  const db = window.supabase?.createClient(window.__RK_SUPABASE_URL, window.__RK_SUPABASE_KEY);
  if (!db) return;
  const money = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
  const esc = v => String(v ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const state = { orders: [], target: '#orders' };

  async function loadOrders() {
    const merchant = await getMerchant();
    if (!merchant) return [];
    const { data: prodIds, error: prodError } = await db.from('products').select('id').eq('merchant_id', merchant.id);
    if (prodError) throw prodError;
    const ids = (prodIds || []).map(p => p.id);
    if (!ids.length) return [];
    const { data: items, error } = await db.from('order_items').select('order_id,product_id,product_name,quantity,unit_price,orders(id,status,total,created_at)').in('product_id', ids);
    if (error) throw error;
    const grouped = {};
    (items || []).forEach(i => {
      const o = i.orders;
      if (!o) return;
      (grouped[o.id] ??= { ...o, items: [] }).items.push(i);
    });
    return Object.values(grouped).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function getMerchant() {
    const { data: session } = await db.auth.getSession();
    const uid = session.session?.user?.id;
    if (!uid) return null;
    const { data } = await db.from('merchants').select('*').eq('owner_id', uid).maybeSingle();
    return data || null;
  }

  function statusLabel(s) {
    return ({new:'Offen', paid:'Bezahlt', processing:'In Bearbeitung', shipped:'Versendet', completed:'Abgeschlossen', cancelled:'Storniert'})[s] || s;
  }

  function render(target, orders) {
    const root = document.querySelector(target);
    if (!root) return;
    const active = orders.filter(o => !['new','cancelled'].includes(o.status));
    const counts = {
      all: active.length,
      paid: active.filter(o => o.status === 'paid').length,
      processing: active.filter(o => o.status === 'processing').length,
      shipped: active.filter(o => o.status === 'shipped').length,
      completed: active.filter(o => o.status === 'completed').length
    };
    root.innerHTML = `
      <div class="order-management-head">
        <div>
          <strong>Bestellungen</strong>
          <div class="muted">Bezahlte und bearbeitete Bestellungen deines Shops</div>
        </div>
        <select id="rkOrderFilter" aria-label="Bestellstatus filtern">
          <option value="all">Alle (${counts.all})</option>
          <option value="paid">Bezahlt (${counts.paid})</option>
          <option value="processing">In Bearbeitung (${counts.processing})</option>
          <option value="shipped">Versendet (${counts.shipped})</option>
          <option value="completed">Abgeschlossen (${counts.completed})</option>
        </select>
      </div>
      <div class="order-summary">
        <span>Umsatz: <strong>${money(active.reduce((s,o) => s + Number(o.items.reduce((x,i)=>x + Number(i.unit_price)*Number(i.quantity),0)),0))}</strong></span>
        <span>Offene Bearbeitung: <strong>${counts.paid + counts.processing}</strong></span>
      </div>
      <div id="rkOrderList"></div>`;
    const filter = root.querySelector('#rkOrderFilter');
    const list = root.querySelector('#rkOrderList');
    const draw = () => {
      const value = filter.value;
      const shown = value === 'all' ? active : active.filter(o => o.status === value);
      list.innerHTML = shown.map(o => {
        const merchantTotal = o.items.reduce((s,i) => s + Number(i.unit_price) * Number(i.quantity), 0);
        return `<div class="order-row"><div><strong>Bestellung #${o.id}</strong><div class="muted">${new Date(o.created_at).toLocaleString('de-DE')} · ${o.items.map(i => `${esc(i.product_name)} × ${i.quantity}`).join(', ')}</div></div><div><strong>${money(merchantTotal)}</strong><select onchange="changeOrderStatus(${o.id},this.value)"><option ${o.status==='paid'?'selected':''} value="paid">Bezahlt</option><option ${o.status==='processing'?'selected':''} value="processing">In Bearbeitung</option><option ${o.status==='shipped'?'selected':''} value="shipped">Versendet</option><option ${o.status==='completed'?'selected':''} value="completed">Abgeschlossen</option><option ${o.status==='cancelled'?'selected':''} value="cancelled">Storniert</option></select><div class="muted">${statusLabel(o.status)}</div></div></div>`;
      }).join('') || '<p class="muted">Keine passenden Bestellungen.</p>';
    };
    filter.onchange = draw;
    draw();
  }

  window.renderMerchantOrders = async function(target = '#orders') {
    try {
      state.target = target;
      state.orders = await loadOrders();
      render(target, state.orders);
    } catch (e) {
      console.error(e);
      const root = document.querySelector(target);
      if (root) root.innerHTML = '<p class="muted">Bestellungen konnten nicht geladen werden.</p>';
    }
  };

  const originalChange = window.changeOrderStatus;
  window.changeOrderStatus = async (id, status) => {
    if (typeof originalChange === 'function') {
      await originalChange(id, status);
    } else {
      const { error } = await db.rpc('merchant_set_order_status', { p_order_id: id, p_status: status });
      if (error) return alert(error.message);
    }
    await window.renderMerchantOrders('#orders');
    await window.renderMerchantOrders('#ordersFull');
  };
})();
