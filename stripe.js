(function(){
  const URL='https://oansbivjkczjbtxaknks.supabase.co';
  const KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const db=window.supabase.createClient(URL,KEY);
  const FN=(name)=>`${URL}/functions/v1/${name}`;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const toast=t=>window.toast?window.toast(t):alert(t);

  async function session(){return (await db.auth.getSession()).data.session||null}
  async function call(name,body){
    const s=await session();
    if(!s) throw new Error('Bitte zuerst anmelden.');
    const r=await fetch(FN(name),{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body||{})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||'Serverfehler');
    return data;
  }

  function injectStripeCard(){
    const panel=$('#dashboardSettings'); if(!panel||$('#stripeConnectCard'))return;
    const card=document.createElement('article');card.id='stripeConnectCard';card.className='panel';card.style.marginTop='18px';
    card.innerHTML=`<h3>Stripe-Zahlungen</h3><p id="stripeConnectStatus" class="muted">Stripe Connect für deinen Händler-Shop einrichten.</p><button id="stripeConnectBtn" class="primary" type="button">Stripe verbinden</button><p class="muted" style="margin-top:10px">Für echte Zahlungen benötigt die Plattform einen Stripe-Schlüssel und einen verbundenen Händler-Account.</p>`;
    panel.appendChild(card);
    $('#stripeConnectBtn').addEventListener('click',async()=>{
      try{
        $('#stripeConnectBtn').disabled=true;$('#stripeConnectStatus').textContent='Stripe-Verbindung wird vorbereitet …';
        const data=await call('stripe-connect-onboarding',{});
        if(!data.url)throw new Error('Keine Stripe-Onboarding-URL erhalten.');
        window.location.href=data.url;
      }catch(e){$('#stripeConnectStatus').textContent=e.message;toast(e.message)}finally{$('#stripeConnectBtn').disabled=false}
    });
  }

  async function cartProducts(){
    const raw=JSON.parse(localStorage.getItem('rebel_cart')||'[]');
    if(!raw.length)throw new Error('Warenkorb ist leer.');
    const ids=raw.map(x=>Number(x.id)).filter(Number.isInteger);
    const {data,error}=await db.from('products').select('id,name,price,stock,merchant_id,active').in('id',ids).eq('active',true);
    if(error)throw error;
    if(!data||data.length!==ids.length)throw new Error('Ein Produkt ist nicht mehr verfügbar.');
    const merchants=[...new Set(data.map(p=>p.merchant_id))];
    if(merchants.length!==1)throw new Error('Bitte pro Bestellung nur Produkte eines Händlers kaufen.');
    return {raw,data};
  }

  function patchCheckout(){
    const btn=$('#checkoutBtn');const form=$('#checkoutForm');
    if(!btn||!form||btn.dataset.stripePatched)return;
    const newBtn=btn.cloneNode(true);btn.replaceWith(newBtn);newBtn.dataset.stripePatched='1';
    const newForm=form.cloneNode(true);form.replaceWith(newForm);
    newBtn.addEventListener('click',async()=>{
      try{
        const s=await session();if(!s){toast('Bitte anmelden, bevor du bezahlst.');$('#authModal')?.classList.remove('hidden');return}
        const {raw,data}=await cartProducts();
        $('#cartModal')?.classList.add('hidden');
        $('#checkoutName').value=s.user.user_metadata?.display_name||s.user.email?.split('@')[0]||'';
        $('#checkoutEmail').value=s.user.email||'';
        $('#checkoutAddress').value='';
        $('#checkoutModal')?.classList.remove('hidden');
        newForm.dataset.items=JSON.stringify(raw); newForm.dataset.productIds=JSON.stringify(data.map(p=>p.id));
      }catch(e){toast(e.message)}
    });
    newForm.addEventListener('submit',async e=>{
      e.preventDefault();
      try{
        const raw=JSON.parse(newForm.dataset.items||'[]');
        const items=raw.map(x=>({product_id:Number(x.id),quantity:Number(x.qty)||1}));
        const data=await call('stripe-checkout',{items,customer_name:$('#checkoutName').value.trim(),customer_email:$('#checkoutEmail').value.trim(),shipping_address:$('#checkoutAddress').value.trim()});
        if(!data.checkout_url)throw new Error('Stripe Checkout konnte nicht gestartet werden.');
        window.location.href=data.checkout_url;
      }catch(e){toast(e.message)}
    });
  }

  async function paymentReturn(){
    const hash=window.location.hash||'';
    const m=hash.match(/^#payment-success\?session_id=([^&]+)/);
    if(!m)return;
    try{
      const data=await call('stripe-session-status',{session_id:decodeURIComponent(m[1])});
      if(data.paid){
        localStorage.removeItem('rebel_cart');
        window.history.replaceState({},'',window.location.pathname+'#shop');
        const modal=$('#successModal');
        if(modal){const text=$('#successText');if(text)text.textContent=`Zahlung erfolgreich. Bestellung #${data.order_id} wurde bezahlt.`;modal.classList.remove('hidden')}
        else toast(`Zahlung erfolgreich. Bestellung #${data.order_id} wurde bezahlt.`);
      }
    }catch(e){toast(e.message)}
  }

  function watch(){
    injectStripeCard();patchCheckout();
    if(location.hash.startsWith('#payment-success'))paymentReturn();
    setTimeout(()=>{injectStripeCard();patchCheckout()},800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
  window.addEventListener('hashchange',paymentReturn);
})();
