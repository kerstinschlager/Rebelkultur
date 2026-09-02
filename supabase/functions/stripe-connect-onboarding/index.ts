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

async function stripeRequest(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY fehlt in Supabase.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    "Stripe-Version": "2026-08-26.preview",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`https://api.stripe.com/v2/core/${path}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.error?.message || data?.error?.code || `Stripe-Fehler (${res.status})`,
    );
  }

  return data;
}

function isComplete(account: any) {
  const merchantApplied = Array.isArray(account?.applied_configurations) &&
    account.applied_configurations.includes("merchant");

  const requirements = account?.requirements?.entries || [];
  const blockingRequirement = requirements.some(
    (entry: any) =>
      entry?.minimum_deadline?.status === "currently_due" ||
      entry?.minimum_deadline?.status === "past_due",
  );

  const cardStatus = account?.configuration?.merchant?.capabilities
    ?.card_payments?.status;

  return merchantApplied && !blockingRequirement && cardStatus === "active";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

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

    const body = await req.json().catch(() => ({}));
    const statusOnly = body?.status_only === true;

    const { data: merchant, error: merchantError } = await admin
      .from("merchants")
      .select("id,shop_name,contact_email,stripe_account_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (merchantError) throw merchantError;
    if (!merchant) {
      return json({ error: "Kein Händler-Shop vorhanden" }, 400);
    }

    let accountId = merchant.stripe_account_id as string | null;

    // Statusprüfung: vorhandenes Stripe-Konto direkt bei Stripe prüfen.
    if (statusOnly) {
      if (!accountId) {
        return json({
          connected: false,
          complete: false,
          account_id: null,
        });
      }

      const account = await stripeRequest(
        "GET",
        `accounts/${encodeURIComponent(accountId)}?include[0]=configuration.merchant&include[1]=requirements&include[2]=identity`,
      );

      const complete = isComplete(account);

      // Persistenter Status für das Händlerkonto.
      const { error: statusError } = await admin
        .from("merchants")
        .update({
          stripe_account_id: account.id,
          payout_method: "Stripe",
        })
        .eq("id", merchant.id)
        .eq("owner_id", user.id);

      if (statusError) throw statusError;

      return json({
        connected: true,
        complete,
        stripe_onboarding_complete: complete,
        account_id: account.id,
      });
    }

    // Neues Stripe-Konto nur erstellen, wenn noch keine Account-ID gespeichert ist.
    if (!accountId) {
      const account = await stripeRequest("POST", "accounts", {
        contact_email: merchant.contact_email || user.email || undefined,
        display_name: merchant.shop_name || "Rebelkultur Händler",
        dashboard: "express",
        identity: {
          country: "de",
        },
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
        include: ["configuration.merchant", "requirements", "identity"],
      });

      if (!account?.id) {
        throw new Error("Stripe hat keine Account-ID zurückgegeben.");
      }

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

    const link = await stripeRequest("POST", "account_links", {
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

    if (!link?.url) {
      throw new Error("Stripe hat keine Onboarding-URL zurückgegeben.");
    }

    return json({
      connected: false,
      complete: false,
      account_id: accountId,
      url: link.url,
    });
  } catch (error) {
    console.error("stripe-connect-onboarding:", error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe Connect konnte nicht gestartet werden.",
      },
      500,
    );
  }
});
