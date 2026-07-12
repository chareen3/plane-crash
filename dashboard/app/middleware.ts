import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth middleware removed — dashboard is internal VPS use only.
// No Google OAuth required. All routes are open.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
