/**
 * Vault 2FA — TOTP setup and verification
 * Uses speakeasy-compatible TOTP (works with Google Authenticator, Authy)
 * 
 * GET  /api/vault/2fa        — get 2FA status + setup QR if not enabled
 * POST /api/vault/2fa/verify — verify TOTP code
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple TOTP implementation (no external deps)
function base32Encode(buf: Buffer): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0, val = 0;
for (let i = 0; i < buf.length; i++) {
  const byte = buf[i];
  val = (val << 8) | byte;
  bits += 8;
  while (bits >= 5) {
    result += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.charAt((val >> (bits - 5)) & 31);
    bits -= 5;
  }
}
  if (bits > 0) result += CHARS[(val << (5 - bits)) & 31];
  return result;
}

function base32Decode(str: string): Buffer {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, val = 0;
  const result: number[] = [];
  for (const c of str.replace(/=/g,'').toUpperCase()) {
    const idx = CHARS.indexOf(c);
    if (idx < 0) continue;
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) { result.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(result);
}

async function generateTOTP(secret: string, window = 0): Promise<string> {
  const { createHmac } = await import('crypto');
  const key    = base32Decode(secret);
  const counter = Math.floor(Date.now() / 30000) + window;
  const buf    = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac   = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code   = ((hmac[offset] & 0x7f) << 24 | hmac[offset+1] << 16 | hmac[offset+2] << 8 | hmac[offset+3]) % 1_000_000;
  return code.toString().padStart(6, '0');
}

async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  for (const w of [-1, 0, 1]) {
    if (await generateTOTP(secret, w) === token) return true;
  }
  return false;
}

function generateSecret(): string {
  const { randomBytes } = require('crypto');
  return base32Encode(randomBytes(20));
}

function generateBackupCodes(): string[] {
  const { randomBytes } = require('crypto');
  return Array.from({ length: 10 }, () => randomBytes(4).toString('hex').toUpperCase());
}

// GET — 2FA status
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: twofa } = await supabase
    .from('vault_2fa')
    .select('totp_enabled, setup_at, last_verified')
    .eq('user_id', user.id)
    .single();

  if (twofa?.totp_enabled) {
    return NextResponse.json({ enabled: true, setup_at: twofa.setup_at, last_verified: twofa.last_verified });
  }

  // Generate new secret for setup
  const secret    = generateSecret();
  const email     = user.email || 'user';
  const issuer    = 'NomadPilot';
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

  // Temporarily store secret (not enabled yet — activated on first verify)
  await supabase.from('vault_2fa').upsert({ user_id: user.id, totp_secret: secret, totp_enabled: false });

  return NextResponse.json({ enabled: false, secret, qrUrl, otpauthUrl });
}

// POST — verify TOTP code (enables 2FA on first use, unlocks vault on subsequent)
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, action } = await req.json(); // action: 'setup' | 'unlock' | 'verify_backup'
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const { data: twofa } = await supabase
    .from('vault_2fa')
    .select('totp_secret, totp_enabled, backup_codes')
    .eq('user_id', user.id)
    .single();

  if (!twofa?.totp_secret) {
    return NextResponse.json({ error: 'No 2FA setup found. Please set up 2FA first.' }, { status: 400 });
  }

  // Check backup code
  if (action === 'verify_backup') {
    const { createHash } = await import('crypto');
    const hashed = createHash('sha256').update(code.toUpperCase()).digest('base64');
    const idx    = (twofa.backup_codes || []).indexOf(hashed);
    if (idx === -1) {
      await supabase.from('vault_access_log').insert({ user_id: user.id, action: 'failed_2fa' });
      return NextResponse.json({ success: false, error: 'Invalid backup code' });
    }
    // Consume backup code (one-time use)
    const updated = [...(twofa.backup_codes || [])];
    updated.splice(idx, 1);
    await supabase.from('vault_2fa').update({ backup_codes: updated, last_verified: new Date().toISOString() }).eq('user_id', user.id);
    return NextResponse.json({ success: true, backupCodesRemaining: updated.length });
  }

  // Verify TOTP
  const valid = await verifyTOTP(twofa.totp_secret, code.replace(/\s/g, ''));
  if (!valid) {
    await supabase.from('vault_access_log').insert({ user_id: user.id, action: 'failed_2fa' });
    return NextResponse.json({ success: false, error: 'Invalid code. Please try again.' });
  }

  // First verify → enable 2FA and generate backup codes
  if (!twofa.totp_enabled || action === 'setup') {
    const backupCodes = generateBackupCodes();
    const { createHash } = await import('crypto');
    const hashedCodes = backupCodes.map(c => createHash('sha256').update(c).digest('base64'));
    await supabase.from('vault_2fa').update({
      totp_enabled:  true,
      backup_codes:  hashedCodes,
      setup_at:      new Date().toISOString(),
      last_verified: new Date().toISOString(),
    }).eq('user_id', user.id);
    return NextResponse.json({ success: true, enabled: true, backupCodes }); // show backup codes once
  }

  // Subsequent verify → just unlock
  await supabase.from('vault_2fa').update({ last_verified: new Date().toISOString() }).eq('user_id', user.id);
  await supabase.from('vault_access_log').insert({ user_id: user.id, action: 'unlock' });
  return NextResponse.json({ success: true });
}
