'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { loginUserAction } from '@/actions/auth.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export function LoginForm() {
  const [isPending, setIsPending] = useState(false)
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')

  const getErrorText = (code: string | null) => {
    if (code === 'missing_credentials') return 'Lütfen tüm alanları doldurun.'
    if (code === 'invalid_credentials') return 'Hatalı e-posta veya şifre girdiniz.'
    if (code) return 'Sistemde bir hata oluştu, tekrar deneyin.'
    return null
  }
  
  const errorMsg = getErrorText(errorCode)

  return (
    <form 
      action={async (formData) => {
        setIsPending(true)
        await loginUserAction(formData)
        // Redirect yapacağı için setIsPending(false) çağırmaya gerek yok (form sayfadan ayrılacak)
      }} 
      className="space-y-6"
    >
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm font-medium border border-red-100">
          {errorMsg}
        </div>
      )}

      <div>
        <Label htmlFor="email" className="block text-sm font-medium text-slate-700">Evrak / Sistem E-postası</Label>
        <div className="mt-1">
          <Input 
            id="email" 
            name="email" 
            type="email" 
            autoComplete="email" 
            required 
            placeholder="ornek@adapsis.com" 
            className="w-full"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="password" className="block text-sm font-medium text-slate-700">Sistem Şifresi</Label>
        <div className="mt-1">
          <Input 
            id="password" 
            name="password" 
            type="password" 
            autoComplete="current-password" 
            required 
            placeholder="••••••••" 
            className="w-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
            Beni Hatırla
          </label>
        </div>
        <div className="text-sm">
          <button 
            type="button" 
            onClick={() => toast.info("Güvenlik protokolü gereği parolalar sistem yöneticisi (Admin) tarafından yönetilir. Şifrenizi sıfırlamak için lütfen IT departmanınızla veya yöneticinizle irtibata geçiniz.")}
            className="font-medium text-brand-600 hover:text-brand-500"
          >
            Sistem Şifremi Unuttum
          </button>
        </div>
      </div>

      <div>
        <Button
          type="submit"
          disabled={isPending}
          variant="primary"
          className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md font-medium text-base h-11"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" /> Giriş Yapılıyor...
            </>
          ) : (
            "Sisteme Giriş Yap"
          )}
        </Button>
      </div>
    </form>
  )
}
