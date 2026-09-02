(function(){
  const URL='https://oansbivkjczjbtxaknks.supabase.co';
  const KEY='sb_publishable_9tDZPZ9KmCjHZqVXBmO-1g_8Aqpu8qE';
  const db=window.supabase.createClient(URL,KEY);
  const $=s=>document.querySelector(s);
  const toast=t=>window.toast?window.toast(t):alert(t);

  async function session(){
    return (await db.auth.getSession()).data.session||null;
  }

  async function call(name,body){
    const s=await session();
    if(!s)throw new Error('Bitte zuerst anmelden.');

    const {data,error}=await db.functions.invoke(name,{body:body||{}});
    if(error){
      let message=error.message||'Serverfehler';
      try{
        if(error.context){
          const payload=await error.context.json();
          if(payload?.error)message=payload.error;
        }
      }catch(_e){}
      throw new Error(message);
    }
    return data||{};
  }

  async function getStripeStatus(){
    try{
      const data=await call('stripe-connect-onboarding',{status_only:true});
      return {
        connected:!!data.connected,
        complete:data.complete===true || data.stripe_onboarding_complete===true,
        account_id:data.account_id||data.stripe_account_id||null
      };
    }catch(_e){
      return {connected:false,complete:false,account_id:null};
    }
  }

  function renderStripeStatus(status){
    const text=$('#stripeConnectStatus');
    const btn=$('#stripeConnectBtn');
    if(!text||!btn)return;

    if(status.connected && status.complete){
      text.textContent='Stripe ist verbunden und vollständig eingerichtet.';
      btn.textContent='Stripe verbunden';
      btn.disabled=true;
      btn.title='Stripe ist bereits verbunden.';
      return;
    }

    if(status.connected && !status.complete){
      text.textContent='Stripe ist verbunden, die Händler-Verifizierung ist noch nicht vollständig abgeschlossen.';
      btn.textContent='Stripe-Onboarding fortsetzen';
      btn.disabled=false;
      return;
    }

    text.textContent='Verbinde deinen Händler-Shop mit Stripe, damit Kunden online bezahlen können.';
    btn.textContent='Stripe verbinden';
    btn.disabled=false;
  }

  async function injectStripeCard(){
    const panel=$('#dashboardSettings');
    if(!panel||$('#stripeConnectCard'))return;

    const card=document.createElement('article');
    card.id='stripeConnectCard';
    card.className='panel';
    card.style.marginTop='18px';
    card.innerHTML=`<h3>Stripe-Zahlungen</h3><p id="stripeConnectStatus" class="muted">Stripe-Status wird geprüft …</p><button id="stripeConnectBtn" class="primary" type="button">Stripe verbinden</button><p class="muted" style="margin-top:10px">Die Stripe-Schlüssel bleiben ausschließlich in Supabase Edge Functions → Secrets.</p>`;
    panel.appendChild(card);

    renderStripeStatus(await getStripeStatus());

    $('#stripeConnectBtn').addEventListener('click',async()=>{
      try{
        $('#stripeConnectBtn').disabled=true;
        $('#stripeConnectStatus').textContent='Stripe-Verbindung wird vorbereitet …';
        const data=await call('stripe-connect-onboarding',{});

        if(data.connected && data.url){
          window.location.href=data.url;
          return;
        }

        if(data.connected){
          renderStripeStatus({connected:true,complete:data.complete===true});
          return;
        }

        if(data.url){
          window.location.href=data.url;
          return;
        }

        throw new Error('Keine Stripe-Onboarding-URL erhalten.');
      }catch(e){
        $('#stripeConnectStatus').textContent=e.message;
        toast(e.message);
        $('#stripeConnectBtn').disabled=false;
      }
    });
  }

  function patchCheckout(){
    const btn=$('#checkoutBtn'),form=$('#checkoutForm');
    if(!btn||!form||btn.dataset.stripePatched)return;

    const newBtn=btn.cloneNode(true);
    btn.replaceWith(newBtn);
    const newForm=form.cloneNode(true);
    form.replaceWith(newForm);
    newBtn.dataset.stripePatched='1';

    newBtn.addEventListener('click',async()=>{
      try{
        const s=await session();
        if(!s){
          toast('Bitte anmelden, bevor du bezahlst.');
          $('#authModal')?.classList.remove('hidden');
          return;
        }
        const raw=JSON.parse(localStorage.getItem('rebel_cart')||'[]');
        if(!raw.length)return toast('Warenkorb ist leer.');
        const ids=raw.map(x=>Number(x.id));
        const {data,error}=await db.from('products').select('id,merchant_id').in('id',ids).eq('active',true);
        if(error)throw error;
        if(!data?.length)return toast('Ein Produkt ist nicht mehr verfügbar.');
        if([...new Set(data.map(p=>p.merchant_id))].length!==1)return toast('Bitte pro Bestellung nur Produkte eines Händlers kaufen.');
        $('#cartModal')?.classList.add('hidden');
        $('#checkoutName').value=s.user.user_metadata?.display_name||s.user.email?.split('@')[0]||'';
        $('#checkoutEmail').value=s.user.email||'';
        $('#checkoutAddress').value='';
        newForm.dataset.items=JSON.stringify(raw);
        $('#checkoutModal')?.classList.remove('hidden');
      }catch(e){toast(e.message)}
    });

    newForm.addEventListener('submit',async e=>{
      e.preventDefault();
      const btn2=newForm.querySelector('button[type="submit"]');
      try{
        const raw=JSON.parse(newForm.dataset.items||localStorage.getItem('rebel_cart')||'[]');
        const data=await call('stripe-checkout',{
          items:raw,
          customer_name:$('#checkoutName').value.trim(),
          customer_email:$('#checkoutEmail').value.trim(),
          shipping_address:$('#checkoutAddress').value.trim()
        });
        if(!data.checkout_url)throw new Error('Stripe Checkout konnte nicht gestartet werden.');
        if(btn2){btn2.disabled=true;btn2.textContent='Weiter zu Stripe …'}
        window.location.href=data.checkout_url;
      }catch(e){
        toast(e.message);
        if(btn2){btn2.disabled=false;btn2.textContent='Mit Stripe bezahlen'}
      }
    });
  }

  async function paymentReturn(){
    let qs=new URLSearchParams(location.search);
    if(!qs.has('payment')&&location.hash.includes('?')){
      const hashQuery=location.hash.split('?')[1];
      qs=new URLSearchParams(hashQuery);
    }
    const payment=qs.get('payment'),sid=qs.get('session_id');
    if(payment==='cancelled'){toast('Die Zahlung wurde abgebrochen.');return}
    if(payment!=='success'||!sid)return;
    try{
      const data=await call('stripe-session-status',{session_id:sid});
      if(data.paid){
        localStorage.removeItem('rebel_cart');
        window.history.replaceState({},'',window.location.pathname+'#shop');
        const text=$('#successText');
        if(text)text.textContent=`Zahlung erfolgreich. Bestellung #${data.order_id} wurde bezahlt.`;
        $('#successModal')?.classList.remove('hidden');
      }
    }catch(e){toast(e.message)}
  }

  async function watch(){
    await injectStripeCard();
    patchCheckout();
    paymentReturn();
    setTimeout(async()=>{
      if($('#stripeConnectCard'))renderStripeStatus(await getStripeStatus());
      patchCheckout();
    },900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();
