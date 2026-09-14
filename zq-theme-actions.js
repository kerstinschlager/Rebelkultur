(function(){
  const URL=window.__RK_SUPABASE_URL||'https://oansbivjkczjbtxaknks.supabase.co';
  const KEY=window.__RK_SUPABASE_KEY||'sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  if(!window.supabase?.createClient)return;
  const db=window.supabase.createClient(URL,KEY);
  let working=false;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const names={modern:'Modern',elegant:'Elegant',minimal:'Minimalistisch',dark:'Dark',nature:'Natur',lifestyle:'Lifestyle',business:'Business',creative:'Kreativ',shop:'Shop',custom:'Individuell'};
  function toast(msg){if(typeof window.toast==='function')window.toast(msg);else{let e=document.querySelector('#toast');if(e){e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2600)}}}
  async function getMerchant(){const {data:{user}}=await db.auth.getUser();if(!user)return null;const {data,error}=await db.from('merchants').select('*').eq('owner_id',user.id).maybeSingle();if(error)throw error;return data}
  async function saveWebsite(theme){
    if(working)return;
    working=true;
    try{
      const m=await getMerchant();
      if(!m){toast('Bitte zuerst deinen Händler-Shop einrichten.');return}
      let saved=false;
      const rpc=await db.rpc('merchant_set_theme',{p_merchant_id:m.id,p_theme:theme});
      if(!rpc.error)saved=true;
      if(!saved){
        const up=await db.from('merchants').update({theme}).eq('id',m.id).eq('owner_id',m.owner_id);
        if(up.error)throw up.error;
        saved=true;
      }
      const settings={merchant_id:String(m.id),shop_name:m.shop_name||'Dein Shop',shop_url:m.shop_url||'',updated_at:new Date().toISOString()};
      const su=await db.from('merchant_shop_settings').upsert(settings,{onConflict:'merchant_id'});
      if(su.error)console.warn('shop settings',su.error);
      const link=location.origin+location.pathname.replace(/[^/]+$/,'')+'shop/?shop='+encodeURIComponent(m.slug||'');
      const modal=document.querySelector('#zqThemePreviewModal');
      if(modal){
        const head=modal.querySelector('.zq-fp-head');
        if(head&&!head.querySelector('.zq-use-theme')){
          const b=document.createElement('button');b.className='zq-use-theme';b.type='button';b.textContent='✓ Dieses Design verwenden';
          b.style.cssText='margin-left:auto;margin-right:10px;border:0;border-radius:10px;padding:10px 14px;background:#7d4dff;color:#fff;font-weight:800;cursor:pointer';
          b.onclick=async()=>{b.disabled=true;b.textContent='Gespeichert ✓';toast('Design gespeichert. Deine Webseite ist als Shop-Seite vorbereitet.');setTimeout(()=>window.open(link,'_blank','noopener'),450)};
          head.insertBefore(b,head.querySelector('.zq-fp-close'));
        }
      }
      toast('Design gespeichert – Webseite vorbereitet.');
      const hint=document.querySelector('#themeHint');if(hint)hint.innerHTML='Design <strong>'+esc(names[theme]||theme)+'</strong> gespeichert. <a href="'+esc(link)+'" target="_blank" rel="noopener">Webseite öffnen</a>';
    }catch(e){console.error('Zorqemi theme action',e);toast('Das Design konnte nicht gespeichert werden: '+(e.message||e))}
    finally{working=false}
  }
  function wire(){
    document.addEventListener('click',e=>{
      const card=e.target.closest('.theme-card');
      if(card){
        const id=card.dataset.theme||card.dataset.id||card.getAttribute('data-theme-id');
        if(id){setTimeout(()=>saveWebsite(id),120)}
      }
      const save=e.target.closest('#saveTheme');
      if(save){
        const selected=document.querySelector('.theme-card.selected');
        const id=selected?.dataset.theme||selected?.dataset.id||selected?.getAttribute('data-theme-id');
        if(id)saveWebsite(id);else toast('Bitte zuerst ein Design auswählen.');
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();
