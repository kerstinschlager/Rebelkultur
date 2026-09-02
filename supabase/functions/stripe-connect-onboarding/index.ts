import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function stripePost(path: string, params: URLSearchParams) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in Supabase.");

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
    throw new Error(data?.error?.message || `Stripe-Fehler (${response.status})`);
  }
  return data;
}

async function stripeGetAccount(accountId: string) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in Supabase.");

  const response = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (response.ok) return response.json();
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

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
      return json({ error: "Ungültige oder abgelaufene Sitzung" }, 401);
    }

    const user = userData.user;

    const { data: merchant, error: merchantError } = await admin
      .from("merchants")
      .select("id,shop_name,contact_email,stripe_account_id,payout_method")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (merchantError) throw merchantError;
    if (!merchant) return json({ error: "Kein Händler-Shop vorhanden" }, 400);

    let accountId = merchant.stripe_account_id as string | null;

    // Reuse the existing Stripe account only if it is still accessible
    // with the current platform secret key. This prevents stale IDs from
    // an old/test Stripe platform from breaking onboarding.
    if (accountId) {
      const existing = await stripeGetAccount(accountId);
      if (!existing || (existing.type && existing.type !== "express")) {
        accountId = null;
        const { error: clearError } = await admin
          .from("merchants")
          .update({ stripe_account_id: null })
          .eq("id", merchant.id)
          .eq("owner_id", user.id);
        if (clearError) throw clearError;
      }
    }

    if (!accountId) {
      const account = await stripePost(
        "accounts",
        new URLSearchParams({
          type: "express",
          country: "DE",
          email: merchant.contact_email || user.email || "",
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

    const baseUrl = "https://kerstinschlager.github.io/Rebelkultur/#dashboard";

    const link = await stripePost(
      "account_links",
      new URLSearchParams({
        account: accountId,
        type: "account_onboarding",
        refresh_url: baseUrl,
        return_url: baseUrl,
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
        error: error instanceof Error
          ? error.message
          : "Stripe Connect konnte nicht gestartet werden.",
      },
      500,
    );
  }
});
