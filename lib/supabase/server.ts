import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = () => {
  const cookieStore = cookies(); // In Next.js 15/16, this returns a Promise

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          // Await the promise to access the actual cookie methods
          return (await cookieStore).getAll();
        },
        async setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            const resolvedStore = await cookieStore;
            cookiesToSet.forEach(({ name, value, options }) =>
              resolvedStore.set(name, value, options)
            );
          } catch {
            // This can be ignored if the function is called from a Server Component
            // where cookies cannot be set after the response headers are sent.
          }
        },
      },
    }
  );
};
