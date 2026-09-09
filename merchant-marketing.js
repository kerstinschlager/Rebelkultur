(function(){
  const supa=()=>window.supabase.createClient(window.__RK_SUPABASE_URL,window.__RK_SUPABASE_KEY);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const baseUrl=()=>location.origin+location.pathname;
  const safeUrl=v=>{try{const u=new URL(v,location.href);return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}};
  async function load(){
    const panel=document.getElementById('dashboardMarketing'); if(!panel)return;
    const body=panel.querySelector('.panel'); if(!body)return;
    const db=supa();
    const {data:{session}}=await db.auth.getSession();
    if(!session){body.innerHTML='<h3>Marketing</h3><p class="muted">Bitte anmelden, um deine Marketing-Links zu sehen.</p>';return;}
    const {data:m}=await db.from('merchants').select('shop_name,slug,description,shop_url,logo_url,published').eq('owner_id',session.user.id).maybeSingle();
    if(!m){body.innerHTML='<h3>Marketing</h3><p class="muted">Kein Händlerprofil gefunden.</p>';return;}
    const shopLink=m.slug?baseUrl()+'?shop='+encodeURIComponent(m.slug)+'#shop':baseUrl()+'#shop';
    const text=`Entdecke ${m.shop_name||'meinen Shop'} bei Rebelkultur Shops: ${shopLink}`;
    body.innerHTML=`<h3>Marketing</h3>
      <p class="muted">Teile deinen Händler-Shop direkt mit Kunden. Der Link führt ausschließlich zu deinem öffentlichen Shop.</p>
      <div class="marketing-share">
        <label>Dein Shop-Link<input id="marketingShopLink" readonly value="${esc(shopLink)}"></label>
        <div class="marketing-actions"><button class="primary" type="button" id="copyShopLink">Shop-Link kopieren</button><button class="secondary" type="button" id="openShopLink">Shop öffnen</button></div>
        <label>Fertiger Social-Media-Text<textarea id="marketingSocialText" rows="3" readonly>${esc(text)}</textarea></label>
        <button class="secondary" type="button" id="copySocialText">Text kopieren</button>
      </div>
      <div class="marketing-grid">
        <div><strong>Social Media</strong><p>Verwende den Shop-Link in Instagram, TikTok, Facebook oder deinem Profil.</p></div>
        <div><strong>Direktmarketing</strong><p>Versende den Link per WhatsApp, Messenger oder Newsletter an deine Kunden.</p></div>
        <div><strong>Content</strong><p>Verknüpfe Produktvorstellungen, Videos und Beiträge mit deinem Händler-Shop.</p></div>
      </div>`;
    const copy=async(value,button)=>{try{await navigator.clipboard.writeText(value);button.textContent='Kopiert ✓';setTimeout(()=>button.textContent=button.dataset.label||'Kopieren',1400)}catch{const ta=document.createElement('textarea');ta.value=value;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();button.textContent='Kopiert ✓';setTimeout(()=>button.textContent=button.dataset.label||'Kopieren',1400)}};
    const b1=document.getElementById('copyShopLink');b1.dataset.label=b1.textContent;b1.onclick=()=>copy(shopLink,b1);
    const b2=document.getElementById('copySocialText');b2.dataset.label=b2.textContent;b2.onclick=()=>copy(text,b2);
    document.getElementById('openShopLink').onclick=()=>window.open(shopLink,'_blank','noopener');
  }
  function init(){setTimeout(load,500);document.addEventListener('click',e=>{const b=e.target.closest('[data-tab="marketing"]');if(b)setTimeout(load,100)});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
