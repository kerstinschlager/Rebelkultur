import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://kerstinschlager.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

async function stripePost(path: string, params: URLSearchParams) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in Supabase Edge Functions → Secrets.");

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      data?.error?.code ||
      `Stripe-Fehler (${response.status})`,
    );
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Anmeldung erforderlich" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      throw new Error("Supabase-Serverkonfiguration unvollständig.");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "Ungültige Sitzung" }, 401);
    }

    const user = userData.user;
    const body = await req.json().catch(() => ({}));
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (!rawItems.length) {
      return json({ error: "Warenkorb ist leer" }, 400);
    }

    const normalizedItems = rawItems
      .map((item: any) => ({
        product_id: Number(item?.product_id ?? item?.id),
        quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
      }))
      .filter((item: any) => Number.isInteger(item.product_id));

    if (!normalizedItems.length) {
      return json({ error: "Ungültige Warenkorbpositionen" }, 400);
    }

    const ids = normalizedItems.map((item: any) => item.product_id);
    if (new Set(ids).size !== ids.length) {
      return json({ error: "Ungültige Warenkorbpositionen" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: products, error: productError } = await admin
      .from("products")
      .select(
        "id,name,price,stock,merchant_id,active,merchants(id,shop_name,status,stripe_account_id,commission_rate)",
      )
      .in("id", ids)
      .eq("active", true);

    if (productError) throw productError;

    if (!products?.length || products.length !== ids.length) {
      return json({ error: "Ein oder mehrere Produkte sind nicht verfügbar" }, 400);
    }

    const merchantIds = [...new Set(products.map((p: any) => p.merchant_id))];
    if (merchantIds.length !== 1) {
      return json({ error: "Bitte pro Bestellung nur Produkte eines Händlers kaufen." }, 400);
    }

    const merchant = (products[0] as any).merchants;
    if (!merchant || merchant.status !== "approved") {
      return json({ error: "Dieser Händler ist noch nicht freigegeben." }, 400);
    }

    if (!merchant.stripe_account_id) {
      return json({ error: "Der Händler hat Stripe noch nicht verbunden." }, 400);
    }

    let totalCents = 0;
    const checkoutParams = new URLSearchParams();
    const orderItems: any[] = [];

    for (let index = 0; index < (products as any[]).length; index++) {
      const product = (products as any[])[index];
      const cartItem = normalizedItems.find((item: any) => item.product_id === product.id);
      const quantity = cartItem?.quantity ?? 1;

      // Fast validation for a useful error. The RPC below performs the
      // authoritative atomic reservation under concurrency.
      if (quantity > Number(product.stock || 0)) {
        return json({ error: `${product.name}: nicht genug Bestand.` }, 400);
      }

      const unitCents = Math.round(Number(product.price) * 100);
      if (!Number.isFinite(unitCents) || unitCents < 1) {
        return json({ error: `${product.name}: ungültiger Preis.` }, 400);
      }

      totalCents += unitCents * quantity;

      checkoutParams.append(`line_items[${index}][price_data][currency]`, "eur");
      checkoutParams.append(
        `line_items[${index}][price_data][product_data][name]`,
        String(product.name),
      );
      checkoutParams.append(
        `line_items[${index}][price_data][unit_amount]`,
        String(unitCents),
      );
      checkoutParams.append(`line_items[${index}][quantity]`, String(quantity));

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: Number(product.price),
      });
    }

    const commissionRate = Math.max(
      0,
      Math.min(100, Number(merchant.commission_rate) || 10),
    );
    const commissionCents = Math.round(totalCents * commissionRate / 100);

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        customer_id: user.id,
        customer_name:
          body.customer_name ||
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          null,
        customer_email: body.customer_email || user.email || null,
        shipping_address: body.shipping_address || null,
        status: "new",
        payment_status: "pending",
        total: totalCents / 100,
        commission_amount: commissionCents / 100,
        merchant_amount: (totalCents - commissionCents) / 100,
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    let stockReserved = false;

    try {
      // Atomic UPDATE ... WHERE stock >= quantity prevents two concurrent
      // checkouts from selling more units than are actually available.
      const { error: reserveError } = await admin.rpc("reserve_product_stock", {
        p_items: normalizedItems,
      });
      if (reserveError) throw reserveError;
      stockReserved = true;

      checkoutParams.append("mode", "payment");
      checkoutParams.append(
        "success_url",
        "https://kerstinschlager.github.io/Rebelkultur/?payment=success&session_id={CHECKOUT_SESSION_ID}#payment-success",
      );
      checkoutParams.append(
        "cancel_url",
        "https://kerstinschlager.github.io/Rebelkultur/#shop",
      );
      checkoutParams.append(
        "payment_intent_data[application_fee_amount]",
        String(commissionCents),
      );
      checkoutParams.append(
        "payment_intent_data[transfer_data][destination]",
        String(merchant.stripe_account_id),
      );
      checkoutParams.append("metadata[order_id]", String(order.id));
      checkoutParams.append("metadata[merchant_id]", String(merchant.id));
      checkoutParams.append("customer_email", body.customer_email || user.email || "");

      const session = await stripePost("checkout/sessions", checkoutParams);
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      const { error: itemError } = await admin
        .from("order_items")
        .insert(
          orderItems.map((item: any) => ({
            ...item,
            order_id: order.id,
          })),
        );

      if (itemError) throw itemError;

      const { error: updateError } = await admin
        .from("orders")
        .update({
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq("id", order.id)
        .eq("payment_status", "pending");

      if (updateError) throw updateError;

      return json({
        checkout_url: session.url,
        order_id: order.id,
      });
    } catch (error) {
      if (stockReserved) {
        await admin.rpc("release_product_stock", { p_items: normalizedItems });
      }
      await admin.from("order_items").delete().eq("order_id", order.id);
      await admin
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("payment_status", "pending");
      throw error;
    }
  } catch (error) {
    console.error("stripe-checkout:", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe Checkout konnte nicht gestartet werden.",
      },
      500,
    );
  }
});
