import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, limiters } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  // Rate limit first
  const limited = await checkRateLimit(req, limiters.approve);
  if (limited) return limited;

  // Then auth check
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const supabase = createClient();

  const { data, error } = await supabase
    .from('beta_testers')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('email', email.toLowerCase().trim())
    .select('id, name, email, status')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'User not found' }, { status: 404 });
  }

  await supabase.from('beta_events').insert({
    tester_id: data.id,
    email: data.email,
    event: 'approved',
    metadata: { approved_by: 'admin' },
  });

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'NomadPilot <hello@nomadpilot.app>',
      to: data.email,
      subject: "You're approved! Welcome to NomadPilot Beta ✈️",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#0a1628;font-family:'DM Sans',Arial,sans-serif;color:#ffffff;">
          <div style="max-width:520px;margin:40px auto;padding:0 24px;">
            <div style="text-align:center;padding:40px 32px;background:rgba(255,255,255,0.04);border-radius:20px;border:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:13px;font-weight:700;color:#e8a020;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:24px;">NomadPilot</div>
              <div style="font-size:52px;margin-bottom:16px;">✈️</div>
              <h1 style="font-size:26px;font-weight:700;margin:0 0 12px;color:#ffffff;">You're in, ${data.name ?? 'fellow traveller'}!</h1>
              <p style="color:rgba(255,255,255,0.6);line-height:1.6;margin:0 0 28px;">Your beta access to NomadPilot is now active. Sign in with the email and password you set when you joined the waitlist.</p>
              <a href="https://nomad-pilot.vercel.app" style="display:inline-block;padding:14px 32px;background:#e8a020;color:#0a1628;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:28px;">Open NomadPilot →</a>
              <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:0;">You're receiving this because you signed up for the NomadPilot beta.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (emailErr: any) {
    console.error('Approval email failed:', emailErr.message);
    return NextResponse.json({ success: true, warning: 'User approved but email failed: ' + emailErr.message, user: data });
  }

  return NextResponse.json({ success: true, user: data });
}
