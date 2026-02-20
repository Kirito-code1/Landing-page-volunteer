import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

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
      // Проверяем, является ли путь относительным, чтобы избежать Open Redirect уязвимости
      const isInternalRedirect = next.startsWith('/')
      return NextResponse.redirect(`${origin}${isInternalRedirect ? next : '/dashboard'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}