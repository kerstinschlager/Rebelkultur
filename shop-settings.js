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

  window.loadSettingsForm=load;
  window.saveSettings=save;
})();
