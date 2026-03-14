import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require beta approval
const PROTECTED_ROUTES = ['/', '/flights', '/trips', '/dashboard', '/vault', '/pricing'];

// Routes that are always public
const PUBLIC_ROUTES = ['/beta', '/auth', '/api'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through without any checks
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Only gate routes we care about
  const isProtected = PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );
  if (!isProtected) return NextResponse.next();

  // Build a Supabase client that works in middleware
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Not logged in → send to home (which has the auth modal)
  if (!session) {
    return NextResponse.redirect(new URL('/?auth=login', request.url));
  }

  // Check beta approval
  const { data: tester } = await supabase
    .from('beta_testers')
    .select('status')
    .eq('email', session.user.email!)
    .single();

  const approved = tester?.status === 'approved' || tester?.status === 'active';

  if (!approved) {
    return NextResponse.redirect(new URL('/beta-status', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static, _next/image, favicon.ico, public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
