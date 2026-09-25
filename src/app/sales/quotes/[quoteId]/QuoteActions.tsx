'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Printer, Check, X, Loader2, ShieldAlert, ShieldCheck, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateQuoteStatusAction, approveDiscountAction } from '@/actions/quote.actions'
import { useLanguage } from '@/lib/i18n/LanguageProvider'

export default function QuoteActions({
  quoteId,
  status,
  role,
  discountPercentage,
  productId,
}: {
  quoteId: string,
  status: string,
  role: string,
  discountPercentage: number,
  productId: string,
}) {
  const router = useRouter()
  const { t } = useLanguage()
  const [isUpdating, setIsUpdating] = useState(false)
  const isAdmin = role === 'admin'
  const isPendingAdminApproval = status === 'pending_admin_approval'

  const handleUpdate = async (newStatus: 'accepted' | 'rejected') => {
    setIsUpdating(true)
    const res = await updateQuoteStatusAction(quoteId, newStatus)
    setIsUpdating(false)
    if (res.success) {
      toast.success(newStatus === 'accepted' ? t('sales.quotes.actions.quoteApproved') : t('sales.quotes.actions.quoteRejected'))
      router.refresh()
    } else {
      toast.error(t('sales.quotes.actions.statusUpdateFailed'), { description: res.error })
    }
  }

  const handleDiscountAction = async (action: 'approve' | 'reject') => {
    setIsUpdating(true)
    const res = await approveDiscountAction(quoteId, action)
    setIsUpdating(false)
    if (res.success) {
      toast.success(action === 'approve' ? t('sales.quotes.actions.discountApproved') : t('sales.quotes.actions.discountRejected'))
      router.refresh()
    } else {
      toast.error(t('sales.quotes.actions.discountActionFailed'), { description: res.error })
    }
  }

  // PDF/Yazdır: pending_admin_approval durumunda devre dışı
  const canPrint = status !== 'pending_admin_approval'

  return (
    <div className="flex gap-3 print:hidden flex-wrap">
      {/* Yazdır butonu */}
      <Button
        variant="outline"
        onClick={() => canPrint ? window.print() : toast.warning(t('sales.quotes.actions.printDisabledWarning'))}
        className={`bg-white border-slate-300 text-slate-700 ${!canPrint ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Printer className="mr-2 h-4 w-4" /> {t('sales.quotes.actions.print')}
      </Button>

      {/* Kopyala: aynı ürünün konfigüratörünü bu teklifin seçimleriyle önceden
          doldurulmuş açar. Durumdan bağımsız her zaman görünür — reddedilen
          bir teklifi yeniden teklif etmek için başlangıç noktası olabilir. */}
      <Button
        variant="outline"
        onClick={() => router.push(`/sales/configurator/${productId}?fromQuote=${quoteId}`)}
        className="bg-white border-slate-300 text-slate-700"
      >
        <Copy className="mr-2 h-4 w-4" /> {t('sales.quotes.actions.duplicate')}
      </Button>

      {/* Admin: İskonto Onay/Red Butonları */}
      {isPendingAdminApproval && isAdmin && (
        <>
          <Button
            variant="destructive"
            onClick={() => handleDiscountAction('reject')}
            disabled={isUpdating}
            className="bg-red-600 hover:bg-red-700"
          >
            {isUpdating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('sales.quotes.actions.processing')}</>
            ) : (
              <><ShieldAlert className="mr-2 h-4 w-4" /> {t('sales.quotes.actions.rejectDiscount')}</>
            )}
          </Button>
          <Button
            variant="default"
            className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
            onClick={() => handleDiscountAction('approve')}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('sales.quotes.actions.processing')}</>
            ) : (
              <><ShieldCheck className="mr-2 h-4 w-4" /> {`${t('sales.quotes.actions.approveDiscount')} (%${discountPercentage})`}</>
            )}
          </Button>
        </>
      )}
      
      {/* Normal Onayla/Reddet Butonları (sadece pending durumunda, admin_approval DEĞİL) */}
      {status === 'pending' && (
        <>
          <Button 
            variant="destructive" 
            onClick={() => handleUpdate('rejected')} 
            disabled={isUpdating}
          >
            {isUpdating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('sales.quotes.actions.processing')}</>
            ) : (
              <><X className="mr-2 h-4 w-4" /> {t('sales.quotes.actions.reject')}</>
            )}
          </Button>
          <Button
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            onClick={() => handleUpdate('accepted')}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('sales.quotes.actions.processing')}</>
            ) : (
              <><Check className="mr-2 h-4 w-4" /> {t('sales.quotes.actions.approve')}</>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
