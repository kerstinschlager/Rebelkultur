(function(){
  const URL=window.__RK_SUPABASE_URL;
  const KEY=window.__RK_SUPABASE_KEY;
  if(!URL||!KEY||!window.supabase)return;
  const db=window.supabase.createClient(URL,KEY);
  const $=s=>document.querySelector(s);
  const toast=t=>window.toast?window.toast(t):alert(t);

  async function getContext(){
    const {data:{session}}=await db.auth.getSession();
    if(!session?.user)return null;
    const {data:merchant}=await db.from('merchants').select('id,shop_name').eq('owner_id',session.user.id).maybeSingle();
    return merchant?{merchant,user:session.user}:null;
  }

  async function load(){
    const ctx=await getContext();
    if(!ctx)return;
    const {merchant,user}=ctx;
    const {data,error}=await db.from('merchant_shop_settings')
      .select('shop_name,shop_url,payment_provider,order_email')
      .eq('merchant_id',merchant.id).maybeSingle();
    if(error)return;
    const fallback=JSON.parse(localStorage.getItem(`rebel_settings_${merchant.id}`)||'{}');
    $('#settingShopName').value=data?.shop_name||fallback.shopName||merchant.shop_name||'';
    $('#settingShopUrl').value=data?.shop_url||fallback.shopUrl||'';
    $('#settingPayment').value=data?.payment_provider||fallback.payment||'';
    $('#settingOrderEmail').value=data?.order_email||fallback.orderEmail||user.email||'';
  }

  async function save(){
    const ctx=await getContext();
    if(!ctx)return;
    const {merchant}=ctx;
    const payload={
      merchant_id:merchant.id,
      shop_name:$('#settingShopName').value.trim(),
      shop_url:$('#settingShopUrl').value.trim(),
      payment_provider:$('#settingPayment').value,
      order_email:$('#settingOrderEmail').value.trim(),
      updated_at:new Date().toISOString()
    };
    const {error}=await db.from('merchant_shop_settings').upsert(payload,{onConflict:'merchant_id'});
    if(error){
      localStorage.setItem(`rebel_settings_${merchant.id}`,JSON.stringify({shopName:payload.shop_name,shopUrl:payload.shop_url,payment:payload.payment_provider,orderEmail:payload.order_email}));
      return toast(error.message);
    }
    localStorage.removeItem(`rebel_settings_${merchant.id}`);
    toast('Shop-Einstellungen gespeichert');
  }

  const legalFields={Impressum:'impressum',Datenschutz:'datenschutz',AGB:'agb',Widerruf:'widerruf'};
  let legalData={impressum:'',datenschutz:'',agb:'',widerruf:''};
  let activeLegal='impressum';

  function ensureLegalModal(){
    if($('#legalModal'))return;
    const m=document.createElement('div');
    m.id='legalModal';m.className='modal hidden';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
    m.innerHTML='<div class="modal-card"><button class="close" type="button" id="legalClose">×</button><h2 id="legalTitle">Rechtstext bearbeiten</h2><label>Text<textarea id="legalText" rows="14" required></textarea></label><button class="primary full" type="button" id="legalSave">Speichern</button></div>';
    document.body.appendChild(m);
    $('#legalClose').onclick=()=>m.classList.add('hidden');
    $('#legalSave').onclick=saveLegal;
  }

  async function loadLegal(){
    const ctx=await getContext();
    if(!ctx)return null;
    const {data,error}=await db.from('merchant_legal_settings').select('impressum,datenschutz,agb,widerruf').eq('merchant_id',ctx.merchant.id).maybeSingle();
    if(error){toast(error.message);return null;}
    legalData=data||{impressum:'',datenschutz:'',agb:'',widerruf:''};
    return ctx;
  }

  async function openLegal(label){
    const key=legalFields[label];
    if(!key)return;
    const ctx=await loadLegal();
    if(!ctx)return toast('Bitte zuerst anmelden');
    activeLegal=key;ensureLegalModal();
    $('#legalTitle').textContent=label+' bearbeiten';
    $('#legalText').value=legalData[key]||'';
    $('#legalModal').classList.remove('hidden');
  }

  async function saveLegal(){
    const ctx=await getContext();
    if(!ctx)return toast('Bitte zuerst anmelden');
    legalData[activeLegal]=$('#legalText').value.trim();
    const payload={merchant_id:ctx.merchant.id,impressum:legalData.impressum||'',datenschutz:legalData.datenschutz||'',agb:legalData.agb||'',widerruf:legalData.widerruf||''};
    const {error}=await db.from('merchant_legal_settings').upsert(payload,{onConflict:'merchant_id'});
    if(error)return toast(error.message);
    $('#legalModal').classList.add('hidden');
    toast('Rechtstext gespeichert');
  }

  function bindLegal(){
    document.querySelectorAll('.legal-grid > div').forEach(card=>{
      if(card.dataset.legalBound)return;
      card.dataset.legalBound='1';card.style.cursor='pointer';
      card.addEventListener('click',()=>openLegal(card.childNodes[0].textContent.trim()));
    });
  }

  window.loadSettingsForm=load;
  window.saveSettings=save;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindLegal);else bindLegal();
  document.addEventListener('click',e=>{if(e.target.closest('.dash-tab[data-tab="legal"]'))setTimeout(bindLegal,50);});
})();
