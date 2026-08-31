(function(){
  const BASE='https://oansbivjkczjbtxaknks.supabase.co/functions/v1/';
  const headers=()=>({Authorization:`Bearer ${window.__RK_SUPABASE_TOKEN||''}`, 'Content-Type':'application/json'});
  async function getToken(){
    if(typeof db!=='undefined'){
      const {data}=await db.auth.getSession();
      return data.session?.access_token||'';
    }
    return '';
  }
  async function call(name,payload){
    const token=await getToken();
    const r=await fetch(BASE+name,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload||{})});
    const d=await r.json().catch(()=>({error:'Ungültige Serverantwort'}));
    if(!r.ok) throw new Error(d.error||`HTTP ${r.status}`);
    return d;
  }
  function toastP(t){if(typeof toast==='function')toast(t);else alert(t)}

  function addConnectButton(){
    const box=document.querySelector('#merchantProfileFields');
    if(!box||document.querySelector('#stripeConnectBtn'))return;
    const wrap=document.createElement('div');
    wrap.style.cssText='margin-top:16px;padding-top:16px;border-top:1px solid #e4e1ea';
    wrap.innerHTML='<strong>Stripe-Zahlungen</strong><p class="muted">Verbinde deinen Händler-Shop mit Stripe, damit Kundenzahlungen online abgewickelt werden können.</p><button id="stripeConnectBtn" class="primary" type="button">Mit Stripe verbinden</button><span id="stripeConnectStatus" class="muted" style="margin-left:12px"></span>';
    box.appendChild(wrap);
    document.querySelector('#stripeConnectBtn').addEventListener('click',async()=>{
      const b=document.querySelector('#stripeConnectBtn');b.disabled=true;b.textContent='Stripe wird geöffnet …';
      try{const d=await call('stripe-connect-onboard',{});if(d.connected){document.querySelector('#stripeConnectStatus').textContent='Stripe ist verbunden.';b.textContent='Stripe verbunden';}else if(d.onboarding_url)location.href=d.onboarding_url;else throw new Error('Keine Stripe-Onboarding-URL erhalten');}
      catch(e){toastP(e.message);b.disabled=false;b.textContent='Mit Stripe verbinden'}
    });
  }

  async function startStripeCheckout(e){
    e.preventDefault();e.stopImmediatePropagation();
    if(!currentUser)return toastP('Bitte anmelden, bevor du bezahlst');
    if(!cart.length)return toastP('Warenkorb ist leer');
    const name=document.querySelector('#checkoutName')?.value.trim()||'';
    const email=document.querySelector('#checkoutEmail')?.value.trim()||currentUser.email||'';
    const address=document.querySelector('#checkoutAddress')?.value.trim()||'';
    const btn=document.querySelector('#checkoutForm button[type="submit"]');
    if(btn){btn.disabled=true;btn.textContent='Weiter zu Stripe …'}
    try{
      const d=await call('stripe-create-checkout',{cart:cart.map(x=>({id:x.id,qty:x.qty})),name,email,address});
      if(!d.checkout_url)throw new Error('Keine Stripe-Checkout-URL erhalten');
      location.href=d.checkout_url;
    }catch(err){toastP(err.message);if(btn){btn.disabled=false;btn.textContent='Mit Stripe bezahlen'}}
  }

  function patchCheckoutButton(){
    const form=document.querySelector('#checkoutForm');
    if(form&&!form.dataset.stripePatched){
      form.dataset.stripePatched='1';
      form.querySelector('button[type="submit"]').textContent='Mit Stripe bezahlen';
      form.addEventListener('submit',startStripeCheckout,true);
    }
  }
  function patchCart(){
    const form=document.querySelector('#checkoutForm');
    if(form)patchCheckoutButton();
    const box=document.querySelector('#merchantProfileFields');
    if(box)addConnectButton();
  }
  setInterval(patchCart,600);
  window.addEventListener('load',patchCart);

  const qs=new URLSearchParams(location.search);
  if(qs.get('payment')==='success')toastP('Zahlung erfolgreich. Deine Bestellung wird jetzt bestätigt.');
  if(qs.get('payment')==='cancelled')toastP('Die Zahlung wurde abgebrochen. Die Bestellung bleibt offen.');
})();
