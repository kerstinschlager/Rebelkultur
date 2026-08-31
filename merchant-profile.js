(function(){
  function q(s){return document.querySelector(s)}
  function setVal(id,v){const e=q(id);if(e)e.value=v??''}
  function escp(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function toastP(t){if(typeof toast==='function')toast(t);}
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
      <button id="saveMerchantProfile" class="primary" type="button" style="margin-top:14px">Händlerprofil speichern</button>
      <div class="muted" style="margin-top:10px">Zahlungsdaten werden hier nicht als geheime Zugangsdaten gespeichert. Die echte Zahlungsanbindung erfolgt später über den jeweiligen Anbieter.</div>`;
    panel.appendChild(box);
    q('#saveMerchantProfile').addEventListener('click',save);
  }
  async function getMerchant(){
    if(typeof db==='undefined') return null;
    const {data:userData}=await db.auth.getSession();
    const u=userData.session?.user;if(!u)return null;
    const {data,error}=await db.from('merchants').select('*').eq('owner_id',u.id).maybeSingle();
    if(error){console.error(error);return null}
    return data||null;
  }
  async function fill(){
    const m=await getMerchant();if(!m)return;
    setVal('profileContactEmail',m.contact_email||'');
    setVal('profileLogoUrl',m.logo_url||'');
    setVal('profileShopUrl',m.shop_url||'');
    setVal('profilePayoutMethod',m.payout_method||'');
    setVal('profilePayoutEmail',m.payout_email||'');
    setVal('profileDescription',m.description||'');
    const pub=q('#profilePublished');if(pub)pub.checked=!!m.published;
  }
  async function save(){
    const m=await getMerchant();if(!m){toastP('Kein Händler-Shop vorhanden');return}
    const {data,error}=await db.rpc('update_merchant_profile',{
      p_shop_name:(q('#settingShopName')?.value||m.shop_name||'').trim(),
      p_description:q('#profileDescription')?.value||null,
      p_logo_url:q('#profileLogoUrl')?.value||null,
      p_shop_url:q('#profileShopUrl')?.value||null,
      p_contact_email:q('#profileContactEmail')?.value||null,
      p_payout_method:q('#profilePayoutMethod')?.value||null,
      p_payout_email:q('#profilePayoutEmail')?.value||null,
      p_published:!!q('#profilePublished')?.checked
    });
    if(error){toastP(error.message);return}
    if(typeof merchant!=='undefined') merchant=data;
    toastP('Händlerprofil gespeichert');
  }
  const originalSetDashTab=window.setDashTab;
  window.setDashTab=function(tab){
    const r=originalSetDashTab.apply(this,arguments);
    if(tab==='settings')setTimeout(()=>{inject();fill()},60);
    return r;
  };
  setTimeout(inject,500);
})();
