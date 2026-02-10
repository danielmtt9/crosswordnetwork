import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isPublicRoute = ['/', '/waitlist', '/signin', '/signup'].includes(nextUrl.pathname);

  if (isApiAuthRoute || isPublicRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/signin', nextUrl));
  }
  
  return NextResponse.next();
});

export const config = {
  // Allow static assets through without auth so puzzle iframes can load bridge scripts.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|scripts|puzzles).*)'],
};
