import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
import {locales} from '@/config';

export const routing = defineRouting({
  locales: locales,
 
  defaultLocale: 'es'
});

// Lightweight wrappers around Next.js' navigation APIs
export const {Link, redirect, usePathname, useRouter} =
  createNavigation({ defaultLocale: routing.defaultLocale });