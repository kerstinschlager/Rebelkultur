import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://kerstinschlager.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function stripe(path: string, params: URLSearchParams) {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "Ungültige Sitzung" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: merchant, error: merchantError } = await admin
      .from("merchants")
      .select("id,shop_name,stripe_account_id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (merchantError) throw merchantError;
    if (!merchant) return json({ error: "Kein Händler-Shop vorhanden" }, 400);

    let accountId = merchant.stripe_account_id as string | null;
    if (!accountId) {
      const account = await stripe("accounts", new URLSearchParams({
        type: "express",
        country: "DE",
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        email: user.email || "",
      }));
      accountId = account.id;
      await admin.from("merchants").update({ stripe_account_id: accountId, payout_method: "Stripe" }).eq("id", merchant.id);
    }

    const returnUrl = "https://kerstinschlager.github.io/Rebelkultur/#dashboard";
    const refreshUrl = "https://kerstinschlager.github.io/Rebelkultur/#dashboard";
    const link = await stripe("account_links", new URLSearchParams({
      account: accountId,
      type: "account_onboarding",
      refresh_url: refreshUrl,
      return_url: returnUrl,
    }));

    return json({ url: link.url });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }, 500);
  }
});
