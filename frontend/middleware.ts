import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/login', '/signup'];
const KID_ROUTES = ['/chat'];
const PARENT_ROUTES = ['/dashboard'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
        return NextResponse.next();
    }

    // Read the httpOnly cookie — now accessible in server-side middleware
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Decode payload without verifying signature (middleware has no SECRET_KEY).
    // Full cryptographic verification happens in FastAPI on every API call.
    try {
        const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64url').toString()
        );

        const isKid = payload.type === 'kid';
        const isParent = payload.type === 'parent';

        if (KID_ROUTES.some(r => pathname.startsWith(r)) && !isKid) {
            return NextResponse.redirect(new URL(isParent ? '/dashboard' : '/login', request.url));
        }
        if (PARENT_ROUTES.some(r => pathname.startsWith(r)) && !isParent) {
            return NextResponse.redirect(new URL(isKid ? '/chat' : '/login', request.url));
        }
    } catch {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
