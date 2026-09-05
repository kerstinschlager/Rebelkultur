(function(){
  const URL=window.__RK_SUPABASE_URL;
  const KEY=window.__RK_SUPABASE_KEY;
  if(!URL||!KEY||!window.supabase)return;
  const db=window.supabase.createClient(URL,KEY);
  const $=s=>document.querySelector(s);
  const toast=t=>window.toast?window.toast(t):alert(t);

  async function load(){
    if(!window.merchant?.id)return;
    const {data,error}=await db.from('merchant_shop_settings')
      .select('shop_name,shop_url,payment_provider,order_email')
      .eq('merchant_id',window.merchant.id).maybeSingle();
    if(error)return;
    const fallback=JSON.parse(localStorage.getItem(`rebel_settings_${window.merchant.id}`)||'{}');
    $('#settingShopName').value=data?.shop_name||fallback.shopName||window.merchant.shop_name||'';
    $('#settingShopUrl').value=data?.shop_url||fallback.shopUrl||'';
    $('#settingPayment').value=data?.payment_provider||fallback.payment||'';
    $('#settingOrderEmail').value=data?.order_email||fallback.orderEmail||window.currentUser?.email||'';
  }

  async function save(){
    if(!window.merchant?.id)return;
    const payload={
      merchant_id:window.merchant.id,
      shop_name:$('#settingShopName').value.trim(),
      shop_url:$('#settingShopUrl').value.trim(),
      payment_provider:$('#settingPayment').value,
      order_email:$('#settingOrderEmail').value.trim(),
      updated_at:new Date().toISOString()
    };
    const {error}=await db.from('merchant_shop_settings').upsert(payload,{onConflict:'merchant_id'});
    if(error){
      localStorage.setItem(`rebel_settings_${window.merchant.id}`,JSON.stringify({shopName:payload.shop_name,shopUrl:payload.shop_url,payment:payload.payment_provider,orderEmail:payload.order_email}));
      return toast(error.message);
    }
    localStorage.removeItem(`rebel_settings_${window.merchant.id}`);
    toast('Shop-Einstellungen gespeichert');
  }

  window.loadSettingsForm=load;
  window.saveSettings=save;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,300));
  else setTimeout(load,300);
})();
