import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const hasClerk = Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const isApiRoute = createRouteMatcher(['/api(.*)']);
const protectedApiMiddleware = clerkMiddleware(async (auth, request) => {
  if (isApiRoute(request)) await auth.protect();
  return NextResponse.next();
});

export default function proxy(request, event) {
  if (!hasClerk || !isApiRoute(request)) return NextResponse.next();
  return protectedApiMiddleware(request, event);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)'
  ]
};
