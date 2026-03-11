'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useAuth() {
  const [user, setUser]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Clear local trips cache
    localStorage.removeItem('nomadpilot_trips');
  }, [supabase]);

  return { user, loading, signOut };
}
