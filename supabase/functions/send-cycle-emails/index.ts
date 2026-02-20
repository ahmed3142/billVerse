import { createClient } from "npm:@supabase/supabase-js@2.54.0";

type Recipient = {
  flat_id: string;
  flat_no: string;
  email: string;
};

type Body = {
  cycleId?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM") ?? "Building Bills <noreply@example.com>";
  const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "";

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables." }, 500);
  }

  if (!resendApiKey) {
    return json({ error: "Missing RESEND_API_KEY." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization header." }, 401);
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const {
    data: { user },
    error: userError
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "Unauthorized." }, 401);
  }

  const { data: callerProfile } = await callerClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (callerProfile?.role !== "admin") {
    return json({ error: "Admin access required." }, 403);
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.cycleId) {
    return json({ error: "Missing cycleId in request body." }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const [{ data: cycle }, { data: recipientsData, error: recipientsError }] = await Promise.all([
    serviceClient.from("billing_cycles").select("month").eq("id", body.cycleId).maybeSingle(),
    serviceClient.rpc("get_cycle_notification_recipients", {
      p_cycle_id: body.cycleId
    })
  ]);

  if (recipientsError) {
    return json({ error: recipientsError.message }, 500);
  }

  const recipients = ((recipientsData as Recipient[] | null) ?? []).filter((r) => !!r.email);

  if (recipients.length === 0) {
    return json({
      message: "No recipients found for this cycle.",
      cycleId: body.cycleId,
      sent: 0,
      failed: 0
    });
  }

  const month = cycle?.month ?? "";
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const subject = `Statement ready for ${month}`;
    const emailBody = `
      <p>Hello Flat ${recipient.flat_no},</p>
      <p>Your monthly building bill statement is now available.</p>
      <p>Cycle: <strong>${month}</strong></p>
      ${
        appBaseUrl
          ? `<p><a href="${appBaseUrl}/me/${month.slice(0, 7)}">View your statement</a></p>`
          : ""
      }
      <p>Thank you.</p>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [recipient.email],
        subject,
        html: emailBody
      })
    });

    const providerResponse = await resendResponse.json().catch(() => null);
    const status = resendResponse.ok ? "sent" : "failed";

    if (status === "sent") {
      sent += 1;
    } else {
      failed += 1;
    }

    await serviceClient.from("notifications").insert({
      cycle_id: body.cycleId,
      flat_id: recipient.flat_id,
      email: recipient.email,
      status,
      provider: "resend",
      provider_response: providerResponse
    });
  }

  return json({
    cycleId: body.cycleId,
    month,
    attempted: recipients.length,
    sent,
    failed
  });
});
