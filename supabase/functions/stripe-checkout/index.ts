import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://kerstinschlager.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

async function stripeGetV1Account(accountId: string) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in Supabase Edge Functions → Secrets.");
  const response = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.error?.code || `Stripe-Fehler (${response.status})`);
  return data;
}

async function stripeGetV2Account(accountId: string) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in Supabase Edge Functions → Secrets.");
  const params = new URLSearchParams();
  params.set("include[0]", "configuration.recipient");
  params.set("include[1]", "configuration.merchant");
  params.set("include[2]", "requirements");
  const response = await fetch(`https://api.stripe.com/v2/core/accounts/${encodeURIComponent(accountId)}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": "2026-08-26.dahlia",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.error?.code || `Stripe-Fehler (${response.status})`);
  return data;
}

async function stripePost(path: string, params: URLSearchParams) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in Supabase Edge Functions → Secrets.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.error?.code || `Stripe-Fehler (${response.status})`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let createdOrderId: number | null = null;
  let stockReserved = false;
  let stripeSessionId: string | null = null;

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Anmeldung erforderlich" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Supabase-Serverkonfiguration unvollständig.");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Ungültige Sitzung" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    if (!rawItems.length) return json({ error: "Warenkorb ist leer" }, 400);

    const items = rawItems.map((item: any) => ({
      product_id: Number(item?.product_id ?? item?.id),
      quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
    })).filter((item: any) => Number.isInteger(item.product_id));
    if (!items.length || new Set(items.map((item: any) => item.product_id)).size !== items.length) {
      return json({ error: "Ungültige Warenkorbpositionen" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const ids = items.map((item: any) => item.product_id);
    const { data: products, error: productError } = await admin
      .from("products")
      .select("id,name,price,stock,merchant_id,active,merchants(id,shop_name,status,stripe_account_id,commission_rate)")
      .in("id", ids).eq("active", true);
    if (productError) throw productError;
    if (!products || products.length !== ids.length) return json({ error: "Ein oder mehrere Produkte sind nicht verfügbar." }, 400);

    const merchantIds = [...new Set(products.map((p: any) => p.merchant_id))];
    if (merchantIds.length !== 1) return json({ error: "Bitte pro Bestellung nur Produkte eines Händlers kaufen." }, 400);
    const merchant = (products[0] as any).merchants;
    if (!merchant) return json({ error: "Händlerdaten fehlen." }, 400);
    if (merchant.status !== "approved") return json({ error: "Dieser Händler ist noch nicht freigegeben." }, 400);
    if (!merchant.stripe_account_id) return json({ error: "Der Händler hat Stripe noch nicht verbunden." }, 400);

    // Accounts v2 destination charges require the recipient stripe_transfers capability.
    const v2Account = await stripeGetV2Account(merchant.stripe_account_id);
    const recipientTransfers = v2Account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
    const isV2Account = v2Account?.object === "v2.core.account";
    if (isV2Account) {
      if (recipientTransfers !== "active") {
        return json({
          error: "Das Stripe-Händlerkonto ist verbunden, aber die erforderliche Stripe-Transfer-Funktion für Händlerauszahlungen ist noch nicht aktiv.",
          recipient_stripe_transfers: recipientTransfers || "inactive",
        }, 409);
      }
    } else {
      const v1Account = await stripeGetV1Account(merchant.stripe_account_id);
      if (v1Account?.capabilities?.transfers !== "active") {
        return json({ error: "Stripe ist verbunden, aber die Transfer-Funktion des Händlerkontos ist noch nicht aktiv." }, 409);
      }
    }

    let totalCents = 0;
    const stripeParams = new URLSearchParams();
    const orderItems: any[] = [];

    for (let index = 0; index < products.length; index++) {
      const product = products[index] as any;
      const cartItem = items.find((item: any) => item.product_id === product.id);
      const quantity = cartItem?.quantity ?? 1;
      if (quantity > Number(product.stock || 0)) return json({ error: `${product.name}: nicht genug Bestand.` }, 400);
      const unitAmount = Math.round(Number(product.price) * 100);
      if (!Number.isFinite(unitAmount) || unitAmount < 1) return json({ error: `${product.name}: ungültiger Preis.` }, 400);
      totalCents += unitAmount * quantity;
      stripeParams.append(`line_items[${index}][price_data][currency]`, "eur");
      stripeParams.append(`line_items[${index}][price_data][product_data][name]`, String(product.name));
      stripeParams.append(`line_items[${index}][price_data][unit_amount]`, String(unitAmount));
      stripeParams.append(`line_items[${index}][quantity]`, String(quantity));
      orderItems.push({ product_id: product.id, product_name: product.name, quantity, unit_price: Number(product.price) });
    }

    const commissionRate = Math.max(0, Math.min(100, Number(merchant.commission_rate) || 10));
    const commissionCents = Math.round((totalCents * commissionRate) / 100);

    const { data: order, error: orderError } = await admin.from("orders").insert({
      customer_id: user.id,
      customer_name: body.customer_name || user.user_metadata?.display_name || user.email?.split("@")[0] || null,
      customer_email: body.customer_email || user.email || null,
      shipping_address: body.shipping_address || null,
      merchant_id: merchant.id,
      shop_name: merchant.shop_name || null,
      stripe_account_id: merchant.stripe_account_id,
      status: "new", payment_status: "pending",
      total: totalCents / 100, commission_amount: commissionCents / 100, merchant_amount: (totalCents - commissionCents) / 100,
    }).select("id").single();
    if (orderError) throw orderError;
    if (!order?.id) throw new Error("Bestellung konnte nicht angelegt werden.");
    createdOrderId = Number(order.id);

    const { error: reserveError } = await admin.rpc("reserve_order_stock", { p_order_id: order.id, p_items: items });
    if (reserveError) throw reserveError;
    stockReserved = true;

    const { error: itemError } = await admin.from("order_items").insert(orderItems.map((item: any) => ({ ...item, order_id: order.id })));
    if (itemError) throw itemError;

    stripeParams.append("mode", "payment");
    stripeParams.append("success_url", "https://kerstinschlager.github.io/Rebelkultur/?payment=success&session_id={CHECKOUT_SESSION_ID}#payment-success");
    stripeParams.append("cancel_url", "https://kerstinschlager.github.io/Rebelkultur/#shop");
    stripeParams.append("customer_email", body.customer_email || user.email || "");
    stripeParams.append("payment_intent_data[application_fee_amount]", String(commissionCents));
    stripeParams.append("payment_intent_data[transfer_data][destination]", String(merchant.stripe_account_id));
    // Required for Accounts v2 destination charges: make the connected account the settlement merchant.
    stripeParams.append("payment_intent_data[on_behalf_of]", String(merchant.stripe_account_id));
    stripeParams.append("metadata[order_id]", String(order.id));
    stripeParams.append("metadata[merchant_id]", String(merchant.id));
    stripeParams.append("expires_at", String(Math.floor(Date.now() / 1000) + 1800));

    const session = await stripePost("checkout/sessions", stripeParams);
    stripeSessionId = typeof session.id === "string" ? session.id : null;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    const { error: updateError } = await admin.from("orders").update({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    }).eq("id", order.id).eq("payment_status", "pending");
    if (updateError) throw updateError;

    return json({ checkout_url: session.url, order_id: order.id });
  } catch (error) {
    console.error("stripe-checkout:", error);
    if (stripeSessionId) {
      try { await stripePost(`checkout/sessions/${stripeSessionId}/expire`, new URLSearchParams()); } catch (expireError) { console.error("Stripe session expire:", expireError); }
    }
    if (stockReserved) {
      try { await admin.rpc("release_order_stock", { p_order_id: createdOrderId }); } catch (releaseError) { console.error("release_order_stock:", releaseError); }
    }
    if (createdOrderId) {
      try { await admin.from("order_items").delete().eq("order_id", createdOrderId); } catch (cleanupError) { console.error("order_items cleanup:", cleanupError); }
      try { await admin.from("orders").delete().eq("id", createdOrderId).eq("payment_status", "pending"); } catch (cleanupError) { console.error("orders cleanup:", cleanupError); }
    }
    return json({ error: error instanceof Error ? error.message : "Stripe Checkout konnte nicht gestartet werden." }, 500);
  }
});
