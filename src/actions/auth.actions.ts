'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginUserAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=missing_credentials')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=invalid_credentials')
  }

  // Giriş başarılı, ana dashboard'a aktar (Middleware rolünü kontrol eder)
  redirect('/sales/dashboard')
}

export async function logoutUserAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
