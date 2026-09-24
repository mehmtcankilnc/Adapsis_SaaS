'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, X, Rocket } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Step {
  key: string
  title: string
  description: string
  href: string
  cta: string
  done: boolean
}

export function OnboardingChecklist({
  productCount,
  customerCount,
  salesUserCount,
  userId,
}: {
  productCount: number
  customerCount: number
  salesUserCount: number
  userId: string
}) {
  const storageKey = `onboarding_dismissed_${userId}`
  const [dismissed, setDismissed] = useState(true)

  // Sunucu tarafında localStorage yok, bu yüzden varsayılan "dismissed=true"
  // ile başlanır (banner çakma yok) ve mount sonrası gerçek durum okunur.
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        setDismissed(window.localStorage.getItem(storageKey) === 'true')
      } catch {
        setDismissed(false)
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [storageKey])

  const steps: Step[] = [
    {
      key: 'product',
      title: 'İlk ürününüzü oluşturun',
      description: 'Satacağınız ürünü/hizmeti tanımlayın, fiyatını ve varyasyonlarını belirleyin.',
      href: '/admin/products/new',
      cta: 'Ürün Oluştur',
      done: productCount > 0,
    },
    {
      key: 'customer',
      title: 'İlk müşterinizi ekleyin',
      description: 'Teklif göndereceğiniz firma bilgilerini kaydedin.',
      href: '/shared/customers',
      cta: 'Müşteri Ekle',
      done: customerCount > 0,
    },
    {
      key: 'sales-user',
      title: 'Bir satış kullanıcısı oluşturun',
      description: 'Ekip üyelerinizin teklif oluşturabilmesi için satış rolünde bir hesap açın.',
      href: '/admin/settings',
      cta: 'Kullanıcı Ekle',
      done: salesUserCount > 0,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length
  const activeStep = steps.find((s) => !s.done)

  function handleSkip() {
    setDismissed(true)
    try {
      window.localStorage.setItem(storageKey, 'true')
    } catch {
      // localStorage yoksa yalnızca bu oturumda gizlenir.
    }
  }

  if (dismissed || allDone) return null

  return (
    <Card className="border-brand-200 bg-brand-50/40 shadow-sm mb-8">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="bg-brand-100 p-2 rounded-full">
              <Rocket className="h-4 w-4 text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sisteme Hoş Geldiniz</h3>
              <p className="text-xs text-slate-500">
                {completedCount}/{steps.length} adım tamamlandı — başlamak için aşağıdaki adımları izleyin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            title="Atla"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {steps.map((step) => {
            const isActive = step.key === activeStep?.key
            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  step.done
                    ? 'border-emerald-100 bg-emerald-50/50'
                    : isActive
                      ? 'border-brand-300 bg-white shadow-sm'
                      : 'border-slate-100 bg-white/50 opacity-60'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-500' : 'text-slate-300'}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${step.done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {step.title}
                  </p>
                  {!step.done && <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>}
                </div>
                {!step.done && isActive && (
                  <Link href={step.href} className="shrink-0">
                    <Button variant="primary" size="sm">
                      {step.cta}
                    </Button>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
