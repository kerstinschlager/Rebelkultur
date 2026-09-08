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
    const error = data?.error || {};
    const err = new Error(
      error?.message || error?.code || `Stripe-Fehler (${response.status})`,
    );
    (err as any).stripeCode = error?.code;
    throw err;
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
    `accounts/${encodeURIComponent(accountId)}?include%5B0%5D=configuration.merchant&include%5B1%5D=configuration.recipient&include%5B2%5D=requirements&include%5B3%5D=identity`,
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

  return currentlyDue.length === 0 && pastDue.length === 0;
}

function normalizedConfigurations(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value: unknown) =>
    ["customer", "merchant", "recipient", "storer"].includes(String(value)),
  );
}

function uniqueConfigurationSets(sets: string[][]): string[][] {
  const seen = new Set<string>();
  const result: string[][] = [];

  for (const set of sets) {
    const normalized = [...new Set(set)].sort();
    if (!normalized.length) continue;
    const key = normalized.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

async function createExistingAccountUpdateLink(
  accountId: string,
  account: any,
  returnUrl: string,
  refreshUrl: string,
) {
  const applied = normalizedConfigurations(account?.applied_configurations);

  // Stripe requires account_links to use exactly the configuration(s) that
  // are applied to the v2 account. We therefore try the reported set first
  // and then safe combinations as a fallback for accounts where the GET
  // response omits applied_configurations.
  const candidates = uniqueConfigurationSets([
    applied,
    ["merchant"],
    ["merchant", "recipient"],
    ["recipient"],
  ]);

  let lastError: unknown = null;

  for (const configurations of candidates) {
    try {
      const link = await createStripeResource("account_links", {
        account: accountId,
        use_case: {
          type: "account_update",
          account_update: {
            collection_options: {
              fields: "eventually_due",
            },
            configurations,
            return_url: returnUrl,
            refresh_url: refreshUrl,
          },
        },
      });

      if (link?.url) {
        return { link, configurations };
      }

      throw new Error("Stripe hat keine Onboarding-URL zurückgegeben.");
    } catch (error) {
      lastError = error;
      if ((error as any)?.stripeCode !== "configs_must_match_to_use_account_links") {
        throw error;
      }
    }
  }

  throw lastError || new Error("Passende Stripe-Konfiguration für das Konto nicht gefunden.");
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

    if (statusOnly) {
      if (!accountId) {
        return json({
          connected: false,
          complete: false,
          stripe_onboarding_complete: false,
          account_id: null,
        });
      }

      const account = await getStripeAccount(accountId);
      const complete = accountIsComplete(account);

      const { error: updateError } = await admin
        .from("merchants")
        .update({
          stripe_onboarding_complete: complete,
          payout_method: "Stripe",
        })
        .eq("id", merchant.id)
        .eq("owner_id", user.id);

      if (updateError) throw updateError;

      return json({
        connected: true,
        complete,
        stripe_onboarding_complete: complete,
        account_id: accountId,
      });
    }

    let activeAccountId = accountId;
    let createdNow = false;

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
      createdNow = true;

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

    let link: any;
    let configurations: string[];

    if (createdNow) {
      configurations = ["merchant"];
      link = await createStripeResource("account_links", {
        account: activeAccountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            collection_options: {
              fields: "eventually_due",
            },
            configurations,
            return_url: returnUrl,
            refresh_url: refreshUrl,
          },
        },
      });
    } else {
      const account = await getStripeAccount(activeAccountId!);
      const result = await createExistingAccountUpdateLink(
        activeAccountId!,
        account,
        returnUrl,
        refreshUrl,
      );
      link = result.link;
      configurations = result.configurations;
    }

    if (!link?.url) {
      throw new Error("Stripe hat keine Onboarding-URL zurückgegeben.");
    }

    return json({
      connected: true,
      complete: false,
      account_id: activeAccountId,
      configurations,
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
