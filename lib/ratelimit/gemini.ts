import { createClient } from '@/lib/supabase/server';

// Gemini 2.5 Flash free tier limits
const LIMITS = {
  RPM: 10,   // requests per minute
  RPD: 250,  // requests per day
  TPM: 250000, // tokens per minute (input)
};

// Safety margin — stop at 80% of limit to avoid edge cases
const SAFETY = 0.8;
const SAFE_RPM = Math.floor(LIMITS.RPM * SAFETY); // 8
const SAFE_RPD = Math.floor(LIMITS.RPD * SAFETY); // 200

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string; retryAfter?: number };

export async function checkGeminiRateLimit(userId?: string): Promise<RateLimitResult> {
  try {
    const supabase = createClient();
    const now      = new Date();
    const dayKey   = now.toISOString().slice(0, 10);           // "2026-03-12"
    const minKey   = now.toISOString().slice(0, 16);           // "2026-03-12T14:05"
    const globalId = 'global';

    // ── Check daily limit ──────────────────────────────────────
    const { data: dayRow } = await supabase
      .from('gemini_usage')
      .select('count')
      .eq('key', `day:${dayKey}`)
      .eq('scope', globalId)
      .single();

    const dayCount = dayRow?.count || 0;
    if (dayCount >= SAFE_RPD) {
      return {
        allowed: false,
        reason: `Daily AI limit reached (${dayCount}/${SAFE_RPD} requests used). Resets at midnight UTC.`,
      };
    }

    // ── Check per-minute limit ─────────────────────────────────
    const { data: minRow } = await supabase
      .from('gemini_usage')
      .select('count')
      .eq('key', `min:${minKey}`)
      .eq('scope', globalId)
      .single();

    const minCount = minRow?.count || 0;
    if (minCount >= SAFE_RPM) {
      const secondsLeft = 60 - now.getSeconds();
      return {
        allowed: false,
        reason: `Too many requests. Please wait ${secondsLeft} seconds and try again.`,
        retryAfter: secondsLeft,
      };
    }

    // ── Increment counters ─────────────────────────────────────
    await Promise.all([
      supabase.from('gemini_usage').upsert(
        { key: `day:${dayKey}`, scope: globalId, count: dayCount + 1, updated_at: now.toISOString() },
        { onConflict: 'key,scope' }
      ),
      supabase.from('gemini_usage').upsert(
        { key: `min:${minKey}`, scope: globalId, count: minCount + 1, updated_at: now.toISOString() },
        { onConflict: 'key,scope' }
      ),
    ]);

    return { allowed: true };
  } catch (err) {
    // If rate limit check itself fails, allow through to not break the app
    console.error('Rate limit check error:', err);
    return { allowed: true };
  }
}

export async function getUsageStats() {
  try {
    const supabase = createClient();
    const dayKey   = new Date().toISOString().slice(0, 10);
    const minKey   = new Date().toISOString().slice(0, 16);

    const [dayRes, minRes] = await Promise.all([
      supabase.from('gemini_usage').select('count').eq('key', `day:${dayKey}`).eq('scope', 'global').single(),
      supabase.from('gemini_usage').select('count').eq('key', `min:${minKey}`).eq('scope', 'global').single(),
    ]);

    return {
      today:      { used: dayRes.data?.count || 0,  limit: SAFE_RPD, pct: Math.round(((dayRes.data?.count || 0) / SAFE_RPD) * 100) },
      thisMinute: { used: minRes.data?.count || 0, limit: SAFE_RPM, pct: Math.round(((minRes.data?.count || 0) / SAFE_RPM) * 100) },
    };
  } catch {
    return { today: { used: 0, limit: SAFE_RPD, pct: 0 }, thisMinute: { used: 0, limit: SAFE_RPM, pct: 0 } };
  }
}
