import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://kerstinschlager.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function stripeV2(path: string, body: unknown) {
  if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY fehlt in Supabase.");

  const res = await fetch(`https://api.stripe.com/v2/core/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/json",
      "Stripe-Version": "2026-08-26.preview",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error?.code || "Stripe-Fehler");
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase-Serverkonfiguration unvollständig.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Anmeldung erforderlich" }, 401);
    }

    const jwt = authHeader.slice("Bearer ".length);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
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
      const account = await stripeV2("accounts", {
        contact_email: merchant.contact_email || user.email || undefined,
        display_name: merchant.shop_name || "Rebelkultur Händler",
        dashboard: "express",
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
        },
        defaults: {
          responsibilities: {
            fees_collector: "application",
            losses_collector: "application",
          },
        },
        include: ["configuration.merchant", "requirements"],
      });

      accountId = account.id;
      const { error: updateError } = await admin
        .from("merchants")
        .update({ stripe_account_id: accountId, payout_method: "Stripe" })
        .eq("id", merchant.id)
        .eq("owner_id", user.id);

      if (updateError) throw updateError;
    }

    const returnUrl = "https://kerstinschlager.github.io/Rebelkultur/#dashboard";
    const refreshUrl = "https://kerstinschlager.github.io/Rebelkultur/#dashboard";

    const link = await stripeV2("account_links", {
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["merchant"],
          return_url: returnUrl,
          refresh_url: refreshUrl,
          collection_options: {
            fields: "currently_due",
            future_requirements: "omit",
          },
        },
      },
    });

    return json({
      connected: false,
      account_id: accountId,
      url: link.url,
    });
  } catch (error) {
    console.error("stripe-connect-onboarding:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Stripe Connect konnte nicht gestartet werden.",
      },
      500,
    );
  }
});
