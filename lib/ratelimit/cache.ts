import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const CACHE_TTL_HOURS: Record<string, number> = {
  'ai-brain':      1,   // trip intent — 1 hour
  'trip-generate': 2,   // itineraries — 2 hours
  'destination':   24,  // destination info — 24 hours (changes rarely)
  'embassy':       48,  // embassy data — 48 hours
  'safety':        6,   // safety alerts — 6 hours
  'restaurants':   24,  // restaurants — 24 hours
  'chat':          0,   // never cache chat messages
};

function hashKey(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

export async function getCached(type: string, input: string): Promise<string | null> {
  if (CACHE_TTL_HOURS[type] === 0) return null;
  try {
    const supabase = createClient();
    const key      = hashKey(`${type}:${input}`);
    const { data } = await supabase
      .from('gemini_cache')
      .select('response, created_at')
      .eq('key', key)
      .single();

    if (!data) return null;

    const ageHours = (Date.now() - new Date(data.created_at).getTime()) / 3600000;
    if (ageHours > (CACHE_TTL_HOURS[type] || 1)) return null;

    return data.response;
  } catch {
    return null;
  }
}

export async function setCached(type: string, input: string, response: string): Promise<void> {
  if (CACHE_TTL_HOURS[type] === 0) return;
  try {
    const supabase = createClient();
    const key      = hashKey(`${type}:${input}`);
    await supabase.from('gemini_cache').upsert(
      { key, type, response, created_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch {}
}
