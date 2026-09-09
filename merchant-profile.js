(function(){
  function q(s){return document.querySelector(s)}
  function setVal(id,v){const e=q(id);if(e)e.value=v??''}
  function toastP(t){if(typeof toast==='function')toast(t)}
  let filling=false;
  let saveInProgress=false;

  function publicShopUrl(slug){return location.origin+location.pathname.replace(/[^/]+$/,'')+'shop/?shop='+encodeURIComponent(slug||'')}

  function inject(){
    const panel=q('#dashboardSettings');
    if(!panel || q('#merchantProfileFields')) return;
    const box=document.createElement('div');
    box.id='merchantProfileFields';
    box.className='panel';
    box.style.marginTop='18px';
    box.innerHTML=`<h3>Händlerprofil & Auszahlung</h3>
      <div class="settings-grid">
        <label>Kontakt-E-Mail<input id="profileContactEmail" type="email" placeholder="shop@example.com"></label>
        <label>Logo-URL<input id="profileLogoUrl" type="url" placeholder="https://…"></label>
        <label>Öffentliche Shop-URL<input id="profileShopUrl" type="url" placeholder="https://…"></label>
        <label>Auszahlungsmethode<select id="profilePayoutMethod"><option value="">Noch nicht festgelegt</option><option value="Banküberweisung">Banküberweisung</option><option value="PayPal">PayPal</option><option value="Stripe">Stripe</option></select></label>
        <label>Auszahlungs-E-Mail<input id="profilePayoutEmail" type="email" placeholder="auszahlung@example.com"></label>
        <label class="full-width">Shop-Beschreibung<textarea id="profileDescription" rows="4" placeholder="Beschreibe deinen Shop …"></textarea></label>
      </div>
      <label style="display:flex;align-items:center;gap:10px;margin-top:14px"><input id="profilePublished" type="checkbox"> Öffentlichen Händler-Shop veröffentlichen</label>
      <div id="publicShopLinkBox" class="muted" style="margin-top:12px"></div>
      <button id="saveMerchantProfile" class="primary" type="button" style="margin-top:14px">Händlerprofil speichern</button>
      <div class="muted" style="margin-top:10px">Zahlungsdaten werden hier nicht als geheime Zugangsdaten gespeichert. Die echte Zahlungsanbindung erfolgt später über den jeweiligen Anbieter.</div>`;
    panel.appendChild(box);
    q('#saveMerchantProfile').addEventListener('click',save);
  }

  async function getMerchant(){
    if(typeof db==='undefined') return null;
    const {data:userData}=await db.auth.getSession();
    const u=userData.session?.user;
    if(!u)return null;
    const {data,error}=await db.from('merchants').select('*').eq('owner_id',u.id).maybeSingle();
    if(error){console.error('merchant profile load',error);toastP('Händlerprofil konnte nicht geladen werden');return null}
    return data||null;
  }

  function renderMerchant(m){
    if(!m)return;
    setVal('profileContactEmail',m.contact_email||'');
    setVal('profileLogoUrl',m.logo_url||'');
    setVal('profileShopUrl',m.shop_url||'');
    setVal('profilePayoutMethod',m.payout_method||'');
    setVal('profilePayoutEmail',m.payout_email||'');
    setVal('profileDescription',m.description||'');
    const pub=q('#profilePublished');if(pub)pub.checked=!!m.published;
    const link=q('#publicShopLinkBox');
    if(link && m.slug){
      const href=publicShopUrl(m.slug);
      link.innerHTML=`Öffentlicher Händler-Shop: <a href="${href.replace(/"/g,'&quot;')}" target="_blank" rel="noopener">${href.replace(/&/g,'&amp;')}</a>`;
    } else if(link) link.textContent='';
  }

  async function fill(){
    if(filling || saveInProgress)return;
    filling=true;
    try{inject();const m=await getMerchant();if(m)renderMerchant(m)}finally{filling=false}
  }

  async function save(){
    if(saveInProgress)return;
    saveInProgress=true;
    const button=q('#saveMerchantProfile');
    if(button){button.disabled=true;button.textContent='Speichert …'}
    try{
      const m=await getMerchant();
      if(!m){toastP('Kein Händler-Shop vorhanden');return}
      const payload={
        description:(q('#profileDescription')?.value||'').trim(),
        logo_url:(q('#profileLogoUrl')?.value||'').trim(),
        shop_url:(q('#profileShopUrl')?.value||'').trim(),
        contact_email:(q('#profileContactEmail')?.value||'').trim(),
        payout_method:q('#profilePayoutMethod')?.value||'',
        payout_email:(q('#profilePayoutEmail')?.value||'').trim(),
        published:!!q('#profilePublished')?.checked
      };
      const {data:saved,error}=await db.from('merchants').update(payload).eq('id',m.id).select('*').single();
      if(error){
        console.error('merchant profile direct save',error);
        toastP('Speichern fehlgeschlagen: '+error.message);
        return;
      }
      const ok=saved && saved.contact_email===payload.contact_email &&
        saved.logo_url===payload.logo_url && saved.shop_url===payload.shop_url &&
        saved.payout_method===payload.payout_method && saved.payout_email===payload.payout_email &&
        saved.description===payload.description && !!saved.published===payload.published;
      if(!ok){console.error('merchant profile read-back mismatch',{payload,saved});toastP('Speichern wurde nicht bestätigt');return}
      renderMerchant(saved);
      toastP('Händlerprofil gespeichert');
    }finally{
      saveInProgress=false;
      if(button){button.disabled=false;button.textContent='Händlerprofil speichern'}
    }
  }

  const originalSetDashTab=window.setDashTab;
  if(typeof originalSetDashTab==='function'){
    window.setDashTab=function(tab){const r=originalSetDashTab.apply(this,arguments);if(tab==='settings')setTimeout(fill,250);return r};
  }
  document.addEventListener('click',e=>{if(e.target.closest('.dash-tab[data-tab="settings"]'))setTimeout(fill,250)});
  setTimeout(fill,1000);
})();