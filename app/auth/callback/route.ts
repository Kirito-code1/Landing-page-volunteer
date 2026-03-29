import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildCompleteProfilePath, sanitizeNextPath } from '@/lib/auth/redirect'
import { hasRequiredPhone } from '@/lib/auth/phone'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (code) {
    // В Next.js 15 вызов cookies() нужно ожидать (await)
    const cookieStore = await cookies() 
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // В роутах (Route Handlers) мы можем устанавливать куки напрямую через cookieStore
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user && !hasRequiredPhone(user)) {
        return NextResponse.redirect(`${origin}${buildCompleteProfilePath(next)}`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_code_error`)
}
