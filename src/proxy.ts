import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // SSR İstemci inşası (Auth Session Token tazelemek için kritik)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({
            request: { headers: request.headers },
          })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({
            request: { headers: request.headers },
          })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login')

  // --- KORUMA ALANI (PROTECTED ROUTES) ---
  const isProtected = pathname.startsWith('/sales') || pathname.startsWith('/admin')

  // 1. Durum: Kullanıcı giriş YAPMAMIŞ ve korunan sayfaya girmeye çalışıyor -> Login'e at
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Durum: Kullanıcı GİRİŞ YAPMIŞ
  if (user) {
    // Zaten giriş yaptıktan sonra tekrar Login'e gitmeye çalışıyorsa -> Panele at
    if (isAuthRoute || pathname === '/') {
      return NextResponse.redirect(new URL('/sales/dashboard', request.url))
    }

    // Role-Based Access Control (RBAC) Kontrolü
    if (isProtected) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = profile?.role || 'sales'

      // Sales rolüne sahip bir kullanıcı Admin sayfasına girmeye çalışıyorsa
      if (pathname.startsWith('/admin') && role !== 'admin') {
        // İzin verilen sayfalar: /admin/products ve /admin/inventory
        const isAllowedForSales = pathname === '/admin/products' || pathname === '/admin/inventory' || pathname.startsWith('/admin/inventory?') || pathname.startsWith('/admin/products?')
        
        // Ancak new veya edit sayfaları kesinlikle yasak
        const isRestrictedAction = pathname.match(/^\/admin\/products\/new|\/admin\/products\/[^/]+\/edit/)
        
        if (!isAllowedForSales || isRestrictedAction) {
          const errorUrl = new URL('/sales/dashboard?error=unauthorized', request.url)
          return NextResponse.redirect(errorUrl)
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
