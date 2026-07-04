import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Route protection
  if (user) {
    const isEditingOrCreating = request.nextUrl.pathname.match(/^\/admin\/products\/new|\/admin\/products\/[^/]+\/edit/)
    if (isEditingOrCreating) {
      // Check role directly via fetch since Supabase doesn't easily expose role in the session object unless stored in metadata.
      // But actually, we can check user_metadata if we stored the role there, otherwise we have to query the db.
      // Doing a DB query in middleware is possible but adds latency. Let's redirect conditionally in a wrapper instead.
      // Wait! Let's check user_metadata.role
      const role = user.user_metadata?.role || 'sales'
      if (role === 'sales') {
        const url = request.nextUrl.clone()
        url.pathname = '/sales/dashboard'
        url.search = '?error=unauthorized'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
