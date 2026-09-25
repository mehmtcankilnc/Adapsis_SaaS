'use client'

import React, { useState } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'
import { loginUserAction } from '@/actions/auth.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageProvider'

export function LoginForm() {
  const [isPending, setIsPending] = useState(false)
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const { t } = useLanguage()

  const getErrorText = (code: string | null) => {
    if (code === 'missing_credentials') return t('login.errorMissingCredentials')
    if (code === 'invalid_credentials') return t('login.errorInvalidCredentials')
    if (code) return t('login.errorGeneric')
    return null
  }

  const errorMsg = getErrorText(errorCode)

  return (
    <form 
      action={async (formData) => {
        // Başarılı girişte redirect() sunucu tarafında sert bir sayfa geçişi
        // tetikliyor — bu geçiş bazen tek bir animasyon karesi bile
        // geçmeden gerçekleşiyor, yani normal setIsPending(true) DOM'a hiç
        // commit olmadan sayfa yenilenebiliyor (spinner hiç görünmüyor).
        // flushSync ile state'i senkron commit ederek en az bir paint şansı
        // garanti ediyoruz.
        flushSync(() => setIsPending(true))
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
        <Label htmlFor="email" className="block text-sm font-medium text-slate-700">{t('login.emailLabel')}</Label>
        <div className="mt-1">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t('login.emailPlaceholder')}
            className="w-full"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="password" className="block text-sm font-medium text-slate-700">{t('login.passwordLabel')}</Label>
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
            {t('login.rememberMe')}
          </label>
        </div>
        <div className="text-sm">
          <button
            type="button"
            onClick={() => toast.info(t('login.forgotPasswordToast'))}
            className="font-medium text-brand-600 hover:text-brand-500"
          >
            {t('login.forgotPasswordButton')}
          </button>
        </div>
      </div>

      <div>
        <Button
          type="submit"
          disabled={isPending}
          variant="primary"
          className="w-full shadow-md font-medium text-base h-11"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" /> {t('login.signingIn')}
            </>
          ) : (
            t('login.signIn')
          )}
        </Button>
      </div>
    </form>
  )
}
