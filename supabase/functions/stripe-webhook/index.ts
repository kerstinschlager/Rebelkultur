import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function hex(buf:ArrayBuffer){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function timingSafeEqual(a:string,b:string){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
async function verifySignature(payload:string,signature:string,secret:string){
  const parts=signature.split(',');const t=parts.find(x=>x.startsWith('t='))?.slice(2);const v1=parts.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));
  if(!t||!v1.length)return false;
  const signed=`${t}.${payload}`;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(signed)));
  return v1.some(x=>timingSafeEqual(x,digest));
}

Deno.serve(async req=>{
  if(req.method!=='POST')return new Response('Method Not Allowed',{status:405});
  try{
    const secret=Deno.env.get('STRIPE_WEBHOOK_SECRET');const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');const url=Deno.env.get('SUPABASE_URL');
    if(!secret||!serviceKey||!url)return new Response('Webhook secrets not configured',{status:500});
    const payload=await req.text();const sig=req.headers.get('Stripe-Signature')||'';
    if(!await verifySignature(payload,sig,secret))return new Response('Invalid signature',{status:400});
    const event=JSON.parse(payload);const admin=createClient(url,serviceKey);
    if(event.type==='checkout.session.completed'){
      const session=event.data.object;const orderId=Number(session.metadata?.order_id);
      if(Number.isInteger(orderId))await admin.from('orders').update({payment_status:'paid',status:'paid',paid_at:new Date().toISOString(),stripe_checkout_session_id:session.id,stripe_payment_intent_id:typeof session.payment_intent==='string'?session.payment_intent:null}).eq('id',orderId);
    }
    if(event.type==='payment_intent.payment_failed'){
      const pi=event.data.object;const order=await admin.from('orders').select('id').eq('stripe_payment_intent_id',pi.id).maybeSingle();
      if(order.data)await admin.from('orders').update({payment_status:'failed',status:'new'}).eq('id',order.data.id);
    }
    if(event.type==='charge.refunded'){
      const charge=event.data.object;const pi=typeof charge.payment_intent==='string'?charge.payment_intent:null;
      if(pi)await admin.from('orders').update({payment_status:'refunded'}).eq('stripe_payment_intent_id',pi);
    }
    return new Response(JSON.stringify({received:true}),{status:200,headers:{'Content-Type':'application/json'}});
  }catch(e){console.error(e);return new Response('Webhook error',{status:500})}
});
