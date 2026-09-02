import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://kerstinschlager.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

async function stripe(path: string, params: URLSearchParams) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in Supabase.");

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Stripe-Fehler");
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Anmeldung erforderlich" }, 401);
    }

    const jwt = authHeader.slice("Bearer ".length);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Supabase-Serverkonfiguration unvollständig.");
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) {
      return json({ error: "Ungültige Sitzung" }, 401);
    }

    const user = userData.user;

    const { data: merchant, error: merchantError } = await admin
      .from("merchants")
      .select("id,shop_name,contact_email,stripe_account_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (merchantError) throw merchantError;
    if (!merchant) return json({ error: "Kein Händler-Shop vorhanden" }, 400);

    let accountId = merchant.stripe_account_id as string | null;

    if (!accountId) {
      const account = await stripe(
        "accounts",
        new URLSearchParams({
          type: "express",
          country: "DE",
          email: merchant.contact_email || user.email || "",
          "capabilities[card_payments][requested]": "true",
          "capabilities[transfers][requested]": "true",
        }),
      );

      accountId = account.id;

      const { error: updateError } = await admin
        .from("merchants")
        .update({
          stripe_account_id: accountId,
          payout_method: "Stripe",
        })
        .eq("id", merchant.id)
        .eq("owner_id", user.id);

      if (updateError) throw updateError;
    }

    const returnUrl = "https://kerstinschlager.github.io/Rebelkultur/#dashboard";
    const refreshUrl = "https://kerstinschlager.github.io/Rebelkultur/#dashboard";

    const link = await stripe(
      "account_links",
      new URLSearchParams({
        account: accountId,
        type: "account_onboarding",
        refresh_url: refreshUrl,
        return_url: returnUrl,
      }),
    );

    return json({
      connected: false,
      account_id: accountId,
      url: link.url,
    });
  } catch (error) {
    console.error("stripe-connect-onboarding:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      },
      500,
    );
  }
});
