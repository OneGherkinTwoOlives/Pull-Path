import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type InviteRequest = {
  toEmail?: string;
  subject?: string;
  text?: string;
  html?: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const senderEmail = Deno.env.get("INVITE_SENDER_EMAIL") || "PullPath <noreply@pullpath.app>";

  if (!resendApiKey) {
    return json(500, { error: "Missing RESEND_API_KEY secret" });
  }

  let payload: InviteRequest;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON payload" });
  }

  const toEmail = String(payload.toEmail || "").trim().toLowerCase();
  const subject = String(payload.subject || "").trim();
  const text = String(payload.text || "").trim();
  const html = String(payload.html || "").trim();

  if (!toEmail || !subject || (!text && !html)) {
    return json(400, { error: "toEmail, subject, and text/html are required" });
  }

  const emailPayload = {
    from: senderEmail,
    to: [toEmail],
    subject,
    text: text || undefined,
    html: html || undefined,
  };

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!resendResponse.ok) {
    const details = await resendResponse.text().catch(() => "");
    return json(502, { error: "Email provider error", details });
  }

  const responseJson = await resendResponse.json().catch(() => ({}));
  return json(200, { ok: true, data: responseJson });
});
