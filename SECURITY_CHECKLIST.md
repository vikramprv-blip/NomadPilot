# NomadPilot Security Checklist

## ✅ Already in place
- Supabase RLS on all tables
- Server-side API routes (no keys exposed client-side)
- Admin routes protected by session auth
- Beta gate protects app access

## 🔧 Password Auth Fix (Supabase Dashboard — no code change needed)
1. Go to supabase.com → your project → Authentication → Providers
2. Under Email: DISABLE "Enable Email OTP / Magic Links"
3. ENABLE "Enable Email Signup" with password
4. Under Auth → Email Templates: customize confirmation email
5. Under Auth → URL Configuration: set Site URL to your Vercel domain

## 🔐 Security layers built in this update

### 1. Sensitive data never stored in plaintext
- Passport numbers: masked in UI, never logged, never stored in Supabase
- Only passed to Amadeus booking API server-side, never client-side

### 2. Input sanitization on all booking fields
- Passport number: alphanumeric only, max 20 chars
- Date of birth: validated format
- Phone: digits/spaces/+/- only

### 3. Rate limiting on booking API
- Max 3 booking attempts per user per hour
- Prevents abuse of traveler data collection

### 4. HTTPS-only sensitive fields
- autocomplete="off" on passport fields
- autocomplete="new-password" on password fields
- Prevents browser from storing passport numbers

### 5. Auth required before booking
- Cannot reach BookingStage without being signed in
- Passport data tied to authenticated user session only

### 6. Content Security Policy headers
- Added to next.config.js

## ⚠️ Before going to production with real payments
- [ ] Complete Stripe PCI compliance questionnaire
- [ ] Never store raw card numbers — use Stripe Elements only
- [ ] Add GDPR/privacy policy page
- [ ] Enable Supabase SSL enforcement
- [ ] Rotate all API keys
- [ ] Enable 2FA on Supabase, Vercel, RapidAPI accounts
