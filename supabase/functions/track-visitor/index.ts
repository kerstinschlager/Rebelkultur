import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '';
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveCountry(ip: string) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return { code: null, name: null };
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { headers: { accept: 'application/json' } });
    if (!r.ok) return { code: null, name: null };
    const d = await r.json();
    if (!d?.success || !/^[A-Z]{2}$/.test(String(d.country_code || ''))) return { code: null, name: null };
    return { code: String(d.country_code), name: String(d.country || '') || null };
  } catch (_) {
    return { code: null, name: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const slug = String(body?.slug || '').trim().toLowerCase();
    const visitorKey = String(body?.visitor_key || '').trim();
    const resolve = body?.resolve !== false;

    if (!/^[a-z0-9][a-z0-9-]{1,120}$/.test(slug)) return json({ error: 'Invalid shop' }, 400);
    if (!validUuid(visitorKey)) return json({ error: 'Invalid visitor' }, 400);

    const { data: merchant, error: merchantError } = await db
      .from('merchants')
      .select('id')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();
    if (merchantError || !merchant) return json({ error: 'Shop not found' }, 404);

    let country = { code: null as string | null, name: null as string | null };
    const { data: existing } = await db
      .from('visitor_sessions')
      .select('country_code,country_name')
      .eq('merchant_id', merchant.id)
      .eq('visitor_key', visitorKey)
      .maybeSingle();

    if (existing) {
      country = { code: existing.country_code, name: existing.country_name };
    } else if (resolve) {
      country = await resolveCountry(getClientIp(req));
    }

    const { error } = await db.rpc('touch_visitor_session', {
      p_merchant_id: merchant.id,
      p_visitor_key: visitorKey,
      p_country_code: country.code,
      p_country_name: country.name,
    });
    if (error) return json({ error: 'Tracking unavailable' }, 500);

    return json({ ok: true });
  } catch (_) {
    return json({ error: 'Invalid request' }, 400);
  }
});
