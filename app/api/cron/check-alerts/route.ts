/**
 * GET /api/cron/check-alerts
 * Runs every 15 minutes via Vercel Cron.
 * Checks all active price alerts, fires push + email if price dropped.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const KIWI_API = 'https://api.tequila.kiwi.com/v2/search';

// ── Fetch cheapest price for a route from Kiwi ─────────────────────────────
async function fetchPrice(origin: string, destination: string, date: string, currency: string): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      fly_from:     origin,
      fly_to:       destination,
      date_from:    date,
      date_to:      date,
      adults:       '1',
      currency:     currency,
      limit:        '1',
      sort:         'price',
      asc:          '1',
      one_for_city: '1',
    });

    const res = await fetch(`${KIWI_API}?${params}`, {
      headers: { apikey: process.env.KIWI_API_KEY || '' },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const price = data.data?.[0]?.price;
    return price ? parseFloat(price) : null;
  } catch {
    return null;
  }
}

// ── Send push notification ──────────────────────────────────────────────────
async function sendPush(userId: string, title: string, body: string, url: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://nomad-pilot.vercel.app'}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body, url }),
    });
  } catch (e) {
    console.error('Push failed:', e);
  }
}

// ── Send approval email via Resend ─────────────────────────────────────────
async function sendAlertEmail(
  email: string,
  origin: string,
  destination: string,
  date: string,
  newPrice: number,
  oldPrice: number,
  currency: string,
  deepLink: string
) {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const drop = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

    await resend.emails.send({
      from: 'NomadPilot Alerts <alerts@nomadpilot.app>',
      to:   email,
      subject: `✈️ Price drop! ${origin} → ${destination} now ${currency} ${newPrice}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#0a1628;font-family:'DM Sans',Arial,sans-serif;color:#ffffff;">
          <div style="max-width:520px;margin:40px auto;padding:0 24px;">
            <div style="text-align:center;padding:40px 32px;background:rgba(255,255,255,0.04);border-radius:20px;border:1px solid rgba(255,255,255,0.1);">
              <div style="margin-bottom:16px;">
                <img src="https://nomad-pilot.vercel.app/NP_Logo.jpg" alt="NomadPilot" style="width:48px;height:48px;border-radius:10px;" />
              </div>
              <div style="font-size:13px;font-weight:700;color:#e8a020;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:20px;">Price Alert</div>
              <div style="font-size:48px;margin-bottom:16px;">📉</div>
              <h1 style="font-size:24px;font-weight:700;margin:0 0 8px;">Price dropped ${drop}%!</h1>
              <p style="color:rgba(255,255,255,0.6);font-size:18px;margin:0 0 24px;">
                <strong style="color:#fff;">${origin} → ${destination}</strong><br/>
                ${date}
              </p>
              <div style="background:rgba(45,212,160,0.1);border:1px solid rgba(45,212,160,0.3);border-radius:12px;padding:20px;margin-bottom:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:4px;">WAS</div>
                    <div style="font-size:20px;color:rgba(255,255,255,0.4);text-decoration:line-through;">${currency} ${oldPrice}</div>
                  </div>
                  <div style="font-size:28px;">→</div>
                  <div>
                    <div style="font-size:12px;color:#2dd4a0;margin-bottom:4px;">NOW</div>
                    <div style="font-size:28px;font-weight:700;color:#2dd4a0;">${currency} ${newPrice}</div>
                  </div>
                </div>
              </div>
              <a href="${deepLink}" style="display:inline-block;padding:14px 32px;background:#e8a020;color:#0a1628;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:20px;">
                View & Book Now →
              </a>
              <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:0;">
                Prices change fast — book soon to lock this in.<br/>
                <a href="https://nomad-pilot.vercel.app" style="color:rgba(255,255,255,0.4);">Manage your alerts</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (e) {
    console.error('Email failed:', e);
  }
}

// ── Main cron handler ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (not a random visitor)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  // Fetch all active, non-triggered alerts
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('active', true)
    .eq('triggered', false)
    .gte('date', new Date().toISOString().slice(0, 10)); // only future dates

  if (error) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ checked: 0, triggered: 0 });
  }

  let triggered = 0;

  for (const alert of alerts) {
    try {
      const currentPrice = await fetchPrice(
        alert.origin,
        alert.destination,
        alert.date,
        alert.currency || 'USD'
      );

      if (!currentPrice) continue;

      const lastPrice    = alert.last_price;
      const targetPrice  = alert.target_price;

      // Determine if we should fire the alert
      const hitTarget    = targetPrice && currentPrice <= targetPrice;
      const priceDrop10  = lastPrice && currentPrice < lastPrice * 0.9; // 10% drop
      const firstCheck   = !lastPrice && targetPrice && currentPrice <= targetPrice;

      const shouldFire = hitTarget || priceDrop10 || firstCheck;

      // Always update last_price
      await supabase
        .from('price_alerts')
        .update({
          last_price:  currentPrice,
          last_checked: new Date().toISOString(),
          ...(shouldFire ? { triggered: true, triggered_at: new Date().toISOString() } : {}),
        })
        .eq('id', alert.id);

      if (shouldFire) {
        triggered++;
        const oldPrice = lastPrice || targetPrice || currentPrice * 1.15;
        const deepLink = `https://nomad-pilot.vercel.app/?from=${alert.origin}&to=${alert.destination}&date=${alert.date}`;

        // Fire push notification
        await sendPush(
          alert.user_id,
          `✈️ Price drop! ${alert.origin} → ${alert.destination}`,
          `Now ${alert.currency} ${currentPrice} — down from ${alert.currency} ${Math.round(oldPrice)}`,
          deepLink
        );

        // Fire email
        if (alert.email) {
          await sendAlertEmail(
            alert.email,
            alert.origin,
            alert.destination,
            alert.date,
            currentPrice,
            Math.round(oldPrice),
            alert.currency || 'USD',
            deepLink
          );
        }
      }

    } catch (e) {
      console.error(`Alert ${alert.id} failed:`, e);
    }
  }

  return NextResponse.json({
    checked:   alerts.length,
    triggered,
    timestamp: new Date().toISOString(),
  });
}
