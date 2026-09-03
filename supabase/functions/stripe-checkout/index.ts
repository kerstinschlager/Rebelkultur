import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://kerstinschlager.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function stripePost(path: string, params: URLSearchParams) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY ist in Supabase noch nicht hinterlegt.");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Stripe-Fehler");
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Anmeldung erforderlich" }, 401);

    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return json({ error: "Warenkorb ist leer" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "Ungültige Sitzung" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const ids = items.map((x: any) => Number(x.product_id)).filter(Number.isInteger);
    if (!ids.length || new Set(ids).size !== ids.length) return json({ error: "Ungültige Warenkorbpositionen" }, 400);

    const { data: products, error: productError } = await admin
      .from("products")
      .select("id,name,price,stock,merchant_id,active,merchants(id,shop_name,status,stripe_account_id,commission_rate)")
      .in("id", ids)
      .eq("active", true);
    if (productError) throw productError;
    if (!products?.length || products.length !== ids.length) return json({ error: "Ein oder mehrere Produkte sind nicht verfügbar" }, 400);

    const merchantIds = [...new Set(products.map((p: any) => p.merchant_id))];
    if (merchantIds.length !== 1) return json({ error: "Bitte pro Bestellung nur Produkte eines Händlers kaufen." }, 400);
    const merchant = (products[0] as any).merchants;
    if (!merchant || merchant.status !== "approved") return json({ error: "Dieser Händler ist noch nicht freigegeben." }, 400);
    if (!merchant.stripe_account_id) return json({ error: "Der Händler hat Stripe noch nicht verbunden." }, 400);

    let totalCents = 0;
    const checkoutParams = new URLSearchParams();
    const orderItems: any[] = [];
    let idx = 0;
    for (const p of products as any[]) {
      const rawQty = items.find((x: any) => Number(x.product_id) === p.id)?.quantity;
      const qty = Math.max(1, Math.floor(Number(rawQty) || 1));
      if (qty > p.stock) return json({ error: `${p.name}: nicht genug Bestand.` }, 400);
      const unitCents = Math.round(Number(p.price) * 100);
      if (!Number.isFinite(unitCents) || unitCents < 1) return json({ error: `${p.name}: ungültiger Preis.` }, 400);
      totalCents += unitCents * qty;
      checkoutParams.append(`line_items[${idx}][price_data][currency]`, "eur");
      checkoutParams.append(`line_items[${idx}][price_data][product_data][name]`, p.name);
      checkoutParams.append(`line_items[${idx}][price_data][unit_amount]`, String(unitCents));
      checkoutParams.append(`line_items[${idx}][quantity]`, String(qty));
      orderItems.push({ product_id: p.id, product_name: p.name, quantity: qty, unit_price: Number(p.price) });
      idx++;
    }

    const commissionRate = Math.max(0, Math.min(100, Number(merchant.commission_rate) || 10));
    const commissionCents = Math.round(totalCents * commissionRate / 100);

    const { data: order, error: orderError } = await admin.from("orders").insert({
      customer_id: user.id,
      customer_name: body.customer_name || user.user_metadata?.display_name || user.email?.split("@")[0] || null,
      customer_email: body.customer_email || user.email || null,
      shipping_address: body.shipping_address || null,
      status: "new",
      payment_status: "pending",
      total: totalCents / 100,
      commission_amount: commissionCents / 100,
      merchant_amount: (totalCents - commissionCents) / 100,
    }).select("id").single();
    if (orderError) throw orderError;

    try {
      checkoutParams.append("mode", "payment");
      checkoutParams.append("success_url", "https://kerstinschlager.github.io/Rebelkultur/?payment=success&session_id={CHECKOUT_SESSION_ID}#payment-success");
      checkoutParams.append("cancel_url", "https://kerstinschlager.github.io/Rebelkultur/#shop");
      checkoutParams.append("payment_intent_data[application_fee_amount]", String(commissionCents));
      checkoutParams.append("payment_intent_data[transfer_data][destination]", merchant.stripe_account_id);
      checkoutParams.append("metadata[order_id]", String(order.id));
      checkoutParams.append("metadata[merchant_id]", String(merchant.id));
      checkoutParams.append("customer_email", body.customer_email || user.email || "");

      const session = await stripePost("checkout/sessions", checkoutParams);
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

      const { error: itemError } = await admin.from("order_items").insert(orderItems.map((item: any) => ({ ...item, order_id: order.id })));
      if (itemError) {
        console.error("order_items insert failed", itemError);
        return json({ error: "Bestellung konnte nicht vorbereitet werden." }, 500);
      }

      const { error: updateError } = await admin.from("orders").update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
      }).eq("id", order.id).eq("payment_status", "pending");
      if (updateError) throw updateError;

      return json({ checkout_url: session.url, order_id: order.id });
    } catch (e) {
      await admin.from("order_items").delete().eq("order_id", order.id);
      await admin.from("orders").delete().eq("id", order.id).eq("payment_status", "pending");
      throw e;
    }
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }, 500);
  }
});
