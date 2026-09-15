import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'produkt'
async function providerFetch(url: string, token: string) { const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }); const text = await res.text(); let body:any={}; try { body=text?JSON.parse(text):{} } catch { body={raw:text} }; if(!res.ok) throw new Error(body?.message||body?.error||`Anbieter antwortete mit HTTP ${res.status}`); return body }
async function spreadFetch(url:string,token:string){ const res=await fetch(url,{headers:{'X-SPOD-ACCESS-TOKEN':token,Accept:'application/json'}}); const text=await res.text(); let body:any={}; try{body=text?JSON.parse(text):{}}catch{body={raw:text}}; if(!res.ok) throw new Error(body?.message||body?.error||`Spreadconnect antwortete mit HTTP ${res.status}`); return body }
Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors})
  try{
    const auth=req.headers.get('Authorization'); if(!auth) return json({error:'Anmeldung erforderlich.'},401)
    const userClient=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_ANON_KEY')??'',{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}})
    const {data:{user},error:authError}=await userClient.auth.getUser(); if(authError||!user) return json({error:'Nicht autorisiert.'},401)
    const body=await req.json().catch(()=>({})); const provider=String(body.provider||'').toLowerCase(); const token=String(body.api_token||'').trim(); const shopId=body.shop_id?String(body.shop_id).trim():''
    if(!['printify','spreadconnect'].includes(provider)) return json({error:'Unbekannter Anbieter.'},400); if(!token||token.length<10) return json({error:'Bitte einen gültigen API-Key eingeben.'},400)
    const admin=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:merchant,error:merchantError}=await admin.from('merchants').select('id,shop_name').eq('owner_id',user.id).limit(1).maybeSingle(); if(merchantError||!merchant) return json({error:'Kein Händlerkonto gefunden.'},403)
    let imported=0,updated=0,providerProducts=0
    if(provider==='printify'){
      let resolvedShopId=shopId; if(!resolvedShopId){const shops=await providerFetch('https://api.printify.com/v1/shops.json',token); resolvedShopId=String((Array.isArray(shops)?shops[0]?.id:shops?.data?.[0]?.id)||'')}
      if(!resolvedShopId) return json({error:'Keine Printify-Shop-ID gefunden. Bitte die Shop-ID angeben.'},400)
      const products:any[]=[]; for(let page=1;page<=10&&products.length<500;page++){const result=await providerFetch(`https://api.printify.com/v1/shops/${resolvedShopId}/products.json?limit=50&page=${page}`,token); const items=Array.isArray(result?.data)?result.data:[]; products.push(...items); if(!items.length||page>=Number(result?.last_page||page))break}
      providerProducts=products.length
      for(const p of products.slice(0,500)){
        const sourceId=String(p.id), variants=Array.isArray(p.variants)?p.variants.filter((v:any)=>v.is_enabled!==false):[], enabled=variants.filter((v:any)=>v.is_available!==false), priceCents=Number((enabled[0]||variants[0])?.price||0), image=Array.isArray(p.images)?(p.images.find((i:any)=>i.is_default)?.src||p.images[0]?.src||null):null, name=String(p.title||`Printify ${sourceId}`).trim(), slug=`printify-${slugify(sourceId)}-${sourceId.slice(-8)}`
        const payload={merchant_id:merchant.id,name,slug,description:p.description||'',price:Math.max(0,priceCents/100),stock:enabled.length?999999:0,image_url:image,active:p.visible!==false,updated_at:new Date().toISOString(),source_provider:'printify',source_product_id:sourceId}
        const {data:existing}=await admin.from('products').select('id').eq('merchant_id',merchant.id).eq('source_provider','printify').eq('source_product_id',sourceId).maybeSingle(); let productId:number
        if(existing?.id){const {error}=await admin.from('products').update(payload).eq('id',existing.id);if(error)throw error;productId=existing.id;updated++}else{const {data,error}=await admin.from('products').insert(payload).select('id').single();if(error)throw error;productId=data.id;imported++}
        for(const v of variants){const vp={product_id:productId,name:String(v.title||v.sku||`Variante ${v.id}`),sku:v.sku||null,price:Math.max(0,Number(v.price||0)/100),stock:v.is_available===false?0:999999,source_variant_id:String(v.id)}; const {data:ex}=await admin.from('product_variants').select('id').eq('product_id',productId).eq('source_variant_id',String(v.id)).maybeSingle(); if(ex?.id){const {error}=await admin.from('product_variants').update(vp).eq('id',ex.id);if(error)throw error}else{const {error}=await admin.from('product_variants').insert(vp);if(error)throw error}}
      }
      await admin.from('merchant_integrations').upsert({merchant_id:merchant.id,provider:'printify',status:'connected',external_store_id:resolvedShopId,sync_products:true,sync_stock:true,updated_at:new Date().toISOString(),last_sync_at:new Date().toISOString(),last_error:null},{onConflict:'merchant_id,provider'})
    }else{
      const stockMap:Record<string,number>={}; try{const stock=await spreadFetch('https://api.spreadconnect.app/stock?limit=10000&offset=0',token);const raw=stock?.items||stock?.stock||stock?.data||stock||{};if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const [sku,val] of Object.entries(raw))stockMap[sku]=Number(val)||0}catch{}
      const articles:any[]=[]; for(let offset=0;offset<10000;offset+=100){const result=await spreadFetch(`https://api.spreadconnect.app/articles?limit=100&offset=${offset}`,token);const items=Array.isArray(result?.items)?result.items:[];articles.push(...items);if(!items.length||items.length<100)break}
      providerProducts=articles.length
      for(const a of articles.slice(0,500)){
        const sourceId=String(a.id),variants=Array.isArray(a.variants)?a.variants:[],first=variants[0],price=Number(first?.d2cPrice||first?.b2bPrice||0),totalStock=variants.length?variants.reduce((sum:number,v:any)=>sum+(stockMap[String(v.sku)]??999999),0):999999,image=Array.isArray(a.images)?(a.images.find((i:any)=>i.perspective==='FRONT')?.imageUrl||a.images[0]?.imageUrl||null):null,name=String(a.title||`Spreadconnect ${sourceId}`).trim(),slug=`spreadconnect-${slugify(sourceId)}-${sourceId.slice(-8)}`
        const payload={merchant_id:merchant.id,name,slug,description:a.description||'',price:Math.max(0,price),stock:totalStock,image_url:image,active:true,updated_at:new Date().toISOString(),source_provider:'spreadconnect',source_product_id:sourceId}; const {data:existing}=await admin.from('products').select('id').eq('merchant_id',merchant.id).eq('source_provider','spreadconnect').eq('source_product_id',sourceId).maybeSingle(); let productId:number
        if(existing?.id){const {error}=await admin.from('products').update(payload).eq('id',existing.id);if(error)throw error;productId=existing.id;updated++}else{const {data,error}=await admin.from('products').insert(payload).select('id').single();if(error)throw error;productId=data.id;imported++}
        for(const v of variants){const vp={product_id:productId,name:[v.productTypeName,v.appearanceName,v.sizeName].filter(Boolean).join(' / ')||String(v.sku||v.id),sku:v.sku||null,price:Number(v.d2cPrice||v.b2bPrice||0),stock:stockMap[String(v.sku)]??999999,source_variant_id:String(v.id)};const {data:ex}=await admin.from('product_variants').select('id').eq('product_id',productId).eq('source_variant_id',String(v.id)).maybeSingle();if(ex?.id){const {error}=await admin.from('product_variants').update(vp).eq('id',ex.id);if(error)throw error}else{const {error}=await admin.from('product_variants').insert(vp);if(error)throw error}}
      }
      await admin.from('merchant_integrations').upsert({merchant_id:merchant.id,provider:'spreadconnect',status:'connected',sync_products:true,sync_stock:true,updated_at:new Date().toISOString(),last_sync_at:new Date().toISOString(),last_error:null},{onConflict:'merchant_id,provider'})
    }
    return json({ok:true,provider,provider_products:providerProducts,imported,updated,note:'Der API-Key wurde nur für diesen Import verwendet und nicht in Zorqemi gespeichert.'})
  }catch(error){console.error(error);return json({error:error instanceof Error?error.message:'Import fehlgeschlagen.'},400)}
})
