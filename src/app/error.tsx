'use client'

import { useEffect } from 'react'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/LanguageProvider'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()

  useEffect(() => {
    // Burada dilersek bir tracking servisine (Sentry vb.) hata gönderebiliriz.
    console.error('Unhandled Rejection/Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center animate-in fade-in zoom-in duration-300">
        <div className="relative mx-auto w-20 h-20 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-60"></div>
          <div className="relative bg-red-50 w-full h-full rounded-full flex items-center justify-center border border-red-100 shadow-sm">
            <AlertOctagon className="h-10 w-10 text-red-500" strokeWidth={1.75} />
          </div>
        </div>
        
        <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">{t('error.title')}</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed px-4">
          {t('error.description')}
        </p>

        <div className="flex flex-col gap-3">
          <Button variant="primary" onClick={() => reset()} className="w-full h-12 font-medium text-base shadow-md transition-all">
            <RotateCcw className="mr-2 h-5 w-5" /> {t('error.reloadButton')}
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/sales/dashboard'} className="w-full h-12 font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100">
            <Home className="mr-2 h-5 w-5" /> {t('error.backToDashboardButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}
