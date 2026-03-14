/**
 * POST /api/welcome
 * Sends a welcome email via Resend (nomadpilot domain)
 * Called client-side right after successful signup
 * 
 * Requires: RESEND_API_KEY in Vercel env vars
 * From domain: hello@nomadpilot.app (or whatever your domain is)
 * Setup: resend.com → add domain → verify DNS → get API key
 */
import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY  = process.env.RESEND_API_KEY  || '';
const FROM_EMAIL      = process.env.FROM_EMAIL       || 'hello@nomadpilot.app';
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL || 'https://nomadpilot.app';

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    if (!RESEND_API_KEY) {
      console.warn('[Welcome Email] RESEND_API_KEY not set — skipping email');
      return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not configured' });
    }

    const firstName = name?.split(' ')[0] || 'Traveler';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to NomadPilot</title>
</head>
<body style="margin:0;padding:0;background:#0a1628;font-family:'Segoe UI',Arial,sans-serif;color:#ffffff;">
  <div style="max-width:580px;margin:0 auto;padding:40px 24px;">

    <!-- Logo / Brand -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:11px;font-weight:700;color:#e8a020;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">
        ✈ NOMADPILOT
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.08em;text-transform:uppercase;">
        AI-Powered Travel Planning
      </div>
    </div>

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,rgba(232,160,32,0.12) 0%,rgba(10,22,40,0) 100%);border:1px solid rgba(232,160,32,0.2);border-radius:16px;padding:36px 32px;margin-bottom:28px;text-align:center;">
      <div style="font-size:42px;margin-bottom:16px;">🌍</div>
      <h1 style="font-size:28px;font-weight:700;margin:0 0 12px;line-height:1.2;color:#ffffff;">
        Welcome aboard, ${firstName}
      </h1>
      <p style="font-size:16px;color:rgba(255,255,255,0.65);margin:0;line-height:1.6;">
        Your AI-powered travel planner is ready.<br/>
        Search flights, hotels and more — in your currency.
      </p>
    </div>

    <!-- What you can do -->
    <div style="margin-bottom:28px;">
      <p style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;">
        What you can do with NomadPilot
      </p>
      <div style="display:grid;gap:12px;">
        ${[
          ['✈', 'Search real flights', 'Live prices from Kiwi, Aviasales and more'],
          ['🏨', 'Find hotels',         'Booking.com, Agoda, Hotels.com in one search'],
          ['🤖', 'AI trip planning',    'Just type your trip in plain English'],
          ['💱', 'Your currency',       '25+ currencies — prices shown your way'],
          ['🛂', 'Visa checker',        'Instant requirements for your passport'],
        ].map(([icon, title, desc]) => `
        <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
          <span style="font-size:20px;flex-shrink:0;">${icon}</span>
          <div>
            <div style="font-weight:600;font-size:14px;margin-bottom:3px;">${title}</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.45);">${desc}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <!-- CTA button -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${APP_URL}" style="display:inline-block;padding:14px 36px;background:#e8a020;color:#0a1628;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
        Start Planning Your Trip →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;text-align:center;">
      <p style="font-size:12px;color:rgba(255,255,255,0.25);margin:0 0 8px;">
        You're receiving this because you created a NomadPilot account.
      </p>
      <p style="font-size:12px;color:rgba(255,255,255,0.25);margin:0;">
        © ${new Date().getFullYear()} NomadPilot · 
        <a href="${APP_URL}/unsubscribe" style="color:rgba(232,160,32,0.6);text-decoration:none;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `NomadPilot <${FROM_EMAIL}>`,
        to:      [email],
        subject: '✈ Welcome to NomadPilot — your AI travel planner',
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Resend error');

    return NextResponse.json({ success: true, id: data.id });

  } catch (err: any) {
    console.error('[Welcome Email]', err.message);
    // Don't fail the signup flow if email fails
    return NextResponse.json({ success: false, error: err.message }, { status: 200 });
  }
}
