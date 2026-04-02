import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { extractSlugFromHost, isPublicRoute, isAdminRoute } from '@/lib/utils/routing'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'localhost'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (isPublicRoute(pathname)) {
    return response
  }

  if (isAdminRoute(pathname)) {
    if (!user || user.app_metadata?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  const slug = extractSlugFromHost(host, APP_DOMAIN)
  if (slug) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    response.headers.set('x-tenant-slug', slug)
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
