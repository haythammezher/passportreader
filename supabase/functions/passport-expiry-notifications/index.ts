import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const NOTIFICATION_THRESHOLDS = [0, 30, 60, 90]; // days until expiry

function getNotificationType(daysUntilExpiry: number): string | null {
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry === 0) return "expired";
  if (daysUntilExpiry <= 30) return "30_days";
  if (daysUntilExpiry <= 60) return "60_days";
  if (daysUntilExpiry <= 90) return "90_days";
  return null;
}

function getDaysUntilExpiry(expiryDateStr: string): number {
  // Handle YYMMDD (MRZ format) and YYYY-MM-DD formats
  let expiryDate: Date;
  if (expiryDateStr.length === 6) {
    const year = parseInt(expiryDateStr.substring(0, 2));
    const month = parseInt(expiryDateStr.substring(2, 4)) - 1;
    const day = parseInt(expiryDateStr.substring(4, 6));
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    expiryDate = new Date(fullYear, month, day);
  } else {
    expiryDate = new Date(expiryDateStr);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffMs = expiryDate.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function buildEmailHtml(
  holderName: string,
  passportNumber: string,
  expiryDate: string,
  daysUntilExpiry: number,
  notificationType: string
): string {
  const isExpired = notificationType === "expired";
  const urgencyColor = isExpired ? "#dc2626" : daysUntilExpiry <= 30 ? "#ea580c" : daysUntilExpiry <= 60 ? "#d97706" : "#2563eb";
  const urgencyLabel = isExpired
    ? "EXPIRED"
    : `${daysUntilExpiry} DAYS REMAINING`;

  const statusMessage = isExpired
    ? `Your passport (${passportNumber}) has expired. Please renew it immediately to avoid travel disruptions.`
    : `Your passport (${passportNumber}) will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}. We recommend starting the renewal process as soon as possible.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Passport Expiry Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e293b;padding:32px 40px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">🛂</div>
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">PassportReader</h1>
              <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Passport Management System</p>
            </td>
          </tr>
          <!-- Alert Badge -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="display:inline-block;background-color:${urgencyColor};color:#ffffff;padding:8px 20px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:1px;">
                ⚠️ ${urgencyLabel}
              </div>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px;">Passport Expiry Alert</h2>
              <p style="color:#475569;margin:0 0 24px;font-size:15px;line-height:1.6;">Dear <strong>${holderName}</strong>,</p>
              <p style="color:#475569;margin:0 0 24px;font-size:15px;line-height:1.6;">${statusMessage}</p>
              <!-- Passport Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Passport Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-size:14px;width:140px;">Passport Holder</td>
                        <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${holderName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-size:14px;">Passport Number</td>
                        <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${passportNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-size:14px;">Expiry Date</td>
                        <td style="padding:6px 0;color:${urgencyColor};font-size:14px;font-weight:700;">${expiryDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748b;font-size:14px;">Status</td>
                        <td style="padding:6px 0;">
                          <span style="background-color:${urgencyColor}20;color:${urgencyColor};padding:2px 10px;border-radius:12px;font-size:13px;font-weight:600;">
                            ${isExpired ? "Expired" : `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- CTA -->
              <p style="color:#475569;margin:0 0 16px;font-size:14px;line-height:1.6;">
                ${isExpired
                  ? "Contact your local passport authority immediately to begin the renewal process." :"We recommend contacting your local passport authority to begin the renewal process well in advance."}
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#1e293b;border-radius:8px;padding:12px 24px;">
                    <a href="https://passportre6161.builtwithrocket.new/passport-records" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View Passport Records →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="color:#94a3b8;margin:0;font-size:12px;">This is an automated notification from PassportReader. You are receiving this because you have a passport record registered in the system.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all passport records with user email via profiles
    const { data: passports, error: fetchError } = await supabase
      .from("passport_records")
      .select(`
        id,
        holder_name,
        passport_number,
        expiry_date,
        user_id
      `)
      .not("user_id", "is", null)
      .not("expiry_date", "is", null);

    if (fetchError) {
      throw new Error(`Failed to fetch passport records: ${fetchError.message}`);
    }

    if (!passports || passports.length === 0) {
      return new Response(JSON.stringify({ message: "No passport records found", sent: 0 }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(passports.map((p: { user_id: string }) => p.user_id))];

    // Fetch user emails from auth.users via admin API
    const emailMap: Record<string, string> = {};
    for (const userId of userIds) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId as string);
      if (!userError && userData?.user?.email) {
        emailMap[userId as string] = userData.user.email;
      }
    }

    let sentCount = 0;
    const results: { passport_id: string; status: string; reason?: string }[] = [];

    for (const passport of passports as {
      id: string;
      holder_name: string;
      passport_number: string;
      expiry_date: string;
      user_id: string;
    }[]) {
      const daysUntilExpiry = getDaysUntilExpiry(passport.expiry_date);
      const notificationType = getNotificationType(daysUntilExpiry);

      // Only notify for passports within 90 days of expiry or already expired
      if (!notificationType) {
        results.push({ passport_id: passport.id, status: "skipped", reason: "not_due" });
        continue;
      }

      const userEmail = emailMap[passport.user_id];
      if (!userEmail) {
        results.push({ passport_id: passport.id, status: "skipped", reason: "no_email" });
        continue;
      }

      // Check if notification already sent today for this passport + type
      const today = new Date().toISOString().split("T")[0];
      const { data: existingLog } = await supabase
        .from("passport_notification_log")
        .select("id")
        .eq("passport_id", passport.id)
        .eq("notification_type", notificationType)
        .gte("sent_at", `${today}T00:00:00.000Z`)
        .maybeSingle();

      if (existingLog) {
        results.push({ passport_id: passport.id, status: "skipped", reason: "already_sent_today" });
        continue;
      }

      // Build subject line
      const subject = notificationType === "expired"
        ? `🚨 Passport Expired: ${passport.holder_name} (${passport.passport_number})`
        : `⚠️ Passport Expiry Alert: ${daysUntilExpiry} days remaining — ${passport.holder_name}`;

      // Format expiry date for display
      let displayExpiry = passport.expiry_date;
      if (passport.expiry_date.length === 6) {
        const y = parseInt(passport.expiry_date.substring(0, 2));
        const m = passport.expiry_date.substring(2, 4);
        const d = passport.expiry_date.substring(4, 6);
        const fullYear = y < 50 ? 2000 + y : 1900 + y;
        displayExpiry = `${d}/${m}/${fullYear}`;
      }

      // Send email via Resend
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: [userEmail],
          subject,
          html: buildEmailHtml(
            passport.holder_name,
            passport.passport_number,
            displayExpiry,
            daysUntilExpiry,
            notificationType
          ),
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        results.push({ passport_id: passport.id, status: "failed", reason: errBody });
        continue;
      }

      // Log the notification
      await supabase.from("passport_notification_log").insert({
        passport_id: passport.id,
        user_id: passport.user_id,
        notification_type: notificationType,
        email_address: userEmail,
      });

      sentCount++;
      results.push({ passport_id: passport.id, status: "sent" });
    }

    return new Response(
      JSON.stringify({ message: "Notification run complete", sent: sentCount, results }),
      {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
