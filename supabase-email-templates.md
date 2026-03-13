# Supabase Email Templates

Paste these into: Supabase → Authentication → Email Templates

---

## 1. Confirm Signup

**Subject:** `Confirm your NomadPilot account`

```html
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a1628;font-family:Arial,sans-serif;color:#fff;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;text-align:center;">
    <div style="font-size:11px;font-weight:700;color:#e8a020;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:32px;">
      ✈ NOMADPILOT
    </div>
    <h1 style="font-size:26px;font-weight:700;margin-bottom:12px;">Confirm your email</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin-bottom:32px;">
      Click below to confirm your NomadPilot account and start planning your next trip.
    </p>
    <a href="{{ .ConfirmationURL }}"
      style="display:inline-block;padding:14px 36px;background:#e8a020;color:#0a1628;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">
      Confirm Email Address →
    </a>
    <p style="color:rgba(255,255,255,0.25);font-size:12px;margin-top:32px;">
      If you didn't create a NomadPilot account, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
```

---

## 2. Reset Password

**Subject:** `Reset your NomadPilot password`

```html
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a1628;font-family:Arial,sans-serif;color:#fff;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;text-align:center;">
    <div style="font-size:11px;font-weight:700;color:#e8a020;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:32px;">
      ✈ NOMADPILOT
    </div>
    <h1 style="font-size:26px;font-weight:700;margin-bottom:12px;">Reset your password</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin-bottom:32px;">
      We received a request to reset your NomadPilot password.<br/>
      Click below to choose a new password.
    </p>
    <a href="{{ .ConfirmationURL }}"
      style="display:inline-block;padding:14px 36px;background:#e8a020;color:#0a1628;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">
      Reset Password →
    </a>
    <p style="color:rgba(255,255,255,0.25);font-size:12px;margin-top:32px;">
      This link expires in 1 hour. If you didn't request this, ignore this email.
    </p>
  </div>
</body>
</html>
```

---

## 3. Magic Link (disable this — you're using passwords)

Supabase → Authentication → Providers → Email → Disable "Enable Email OTP"

---

## Custom SMTP Setup (send FROM your domain)

Without custom SMTP, emails come from noreply@mail.supabase.io
With custom SMTP, emails come from hello@nomadpilot.app (or your domain)

### Option A — Resend (recommended, free tier: 3,000 emails/month)
1. Go to resend.com → sign up
2. Add your domain → verify DNS (add 3 DNS records to your domain registrar)
3. Get your API key
4. Supabase → Project Settings → Auth → SMTP Settings:
   - Host: smtp.resend.com
   - Port: 465
   - User: resend
   - Password: your Resend API key
   - Sender email: hello@nomadpilot.app
   - Sender name: NomadPilot

### Option B — SendGrid (free tier: 100/day)
1. sendgrid.com → sign up → Settings → API Keys → Create
2. Supabase SMTP:
   - Host: smtp.sendgrid.net
   - Port: 465
   - User: apikey
   - Password: your SendGrid API key

### Vercel env vars to add:
```
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=hello@nomadpilot.app
NEXT_PUBLIC_APP_URL=https://nomadpilot.app
```
