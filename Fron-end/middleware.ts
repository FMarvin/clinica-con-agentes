import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {locales} from '@/config';

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/clinic/')) return NextResponse.next();
    return NextResponse.json({ message: 'Ruta no encontrada.' }, { status: 404 });
  }

  const localeMiddleware = createMiddleware({ locales, defaultLocale: 'es' });
  const response = localeMiddleware(request);
  const localePath = pathname.startsWith('/es/') ? pathname.slice(3) : pathname === '/es' ? '/' : pathname;

  if (localePath !== '/' && localePath !== '/dashboard/clinic') {
    const destination = request.nextUrl.clone();
    destination.pathname = '/es/dashboard/clinic';
    destination.search = '';
    return NextResponse.redirect(destination);
  }
  return response;
}
 
export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']
};