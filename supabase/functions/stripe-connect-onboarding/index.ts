import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_VERSION = "2026-08-26.dahlia";

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

function requireConfig() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase-Serverkonfiguration unvollständig.");
  }
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY fehlt in Supabase.");
  }
}

async function stripeRequest(path: string, options: RequestInit = {}) {
  requireConfig();

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${STRIPE_SECRET_KEY}`);
  headers.set("Stripe-Version", STRIPE_VERSION);

  const response = await fetch(`https://api.stripe.com/v2/core/${path}`, {
    ...options,
    headers,
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

async function createStripeResource(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey?: string,
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

  return stripeRequest(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function getStripeAccount(accountId: string) {
  return stripeRequest(
    `accounts/${encodeURIComponent(accountId)}?include%5B0%5D=configuration.merchant&include%5B1%5D=requirements&include%5B2%5D=identity`,
    { method: "GET" },
  );
}

function accountIsComplete(account: any) {
  const requirements = account?.requirements || {};
  const currentlyDue = Array.isArray(requirements.currently_due)
    ? requirements.currently_due
    : [];
  const pastDue = Array.isArray(requirements.past_due)
    ? requirements.past_due
    : [];

  const cardPaymentsStatus =
    account?.configuration?.merchant?.capabilities?.card_payments?.status;

  const hasBlockingRequirement = currentlyDue.length > 0 || pastDue.length > 0;
  const paymentsReady =
    cardPaymentsStatus === undefined || cardPaymentsStatus === "active";

  return !hasBlockingRequirement && paymentsReady;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    requireConfig();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Anmeldung erforderlich" }, 401);
    }

    const jwt = authHeader.slice("Bearer ".length);
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) {
      return json({ error: "Ungültige Sitzung" }, 401);
    }

    const user = userData.user;
    const body = await req.json().catch(() => ({}));
    const statusOnly = body?.status_only === true;

    const { data: merchant, error: merchantError } = await admin
      .from("merchants")
      .select(
        "id,shop_name,contact_email,stripe_account_id,stripe_onboarding_complete,payout_method",
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (merchantError) throw merchantError;
    if (!merchant) return json({ error: "Kein Händler-Shop vorhanden" }, 400);

    const accountId = merchant.stripe_account_id as string | null;

    // Reine Statusabfrage: niemals einen neuen Account erzeugen und
    // Stripe darf hier den Seitenaufbau nicht blockieren.
    if (statusOnly) {
      const connected = !!accountId;
      const complete = merchant.stripe_onboarding_complete === true;

      return json({
        connected,
        complete,
        stripe_onboarding_complete: complete,
        account_id: accountId,
      });
    }

    let activeAccountId = accountId;

    // Account V2 erstellen, falls noch keiner gespeichert ist.
    if (!activeAccountId) {
      const account = await createStripeResource(
        "accounts",
        {
          contact_email:
            merchant.contact_email || user.email || undefined,
          display_name:
            merchant.shop_name || "Rebelkultur Händler",
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
          include: [
            "configuration.merchant",
            "requirements",
            "identity",
          ],
        },
        `rebelkultur-merchant-${merchant.id}`,
      );

      if (!account?.id) {
        throw new Error("Stripe hat keine Account-ID zurückgegeben.");
      }

      activeAccountId = account.id;

      const { error: updateError } = await admin
        .from("merchants")
        .update({
          stripe_account_id: activeAccountId,
          stripe_onboarding_complete: false,
          payout_method: "Stripe",
        })
        .eq("id", merchant.id)
        .eq("owner_id", user.id);

      if (updateError) throw updateError;
    }

    const returnUrl =
      "https://kerstinschlager.github.io/Rebelkultur/#dashboard";
    const refreshUrl =
      "https://kerstinschlager.github.io/Rebelkultur/#dashboard";

    const link = await createStripeResource("account_links", {
      account: activeAccountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          collection_options: {
            fields: "eventually_due",
          },
          configurations: ["merchant"],
          return_url: returnUrl,
          refresh_url: refreshUrl,
        },
      },
    });

    if (!link?.url) {
      throw new Error("Stripe hat keine Onboarding-URL zurückgegeben.");
    }

    return json({
      connected: true,
      complete: merchant.stripe_onboarding_complete === true,
      account_id: activeAccountId,
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
