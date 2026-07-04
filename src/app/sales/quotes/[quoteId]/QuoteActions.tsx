'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Check, X, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateQuoteStatusAction, approveDiscountAction } from '@/actions/quote.actions'

export default function QuoteActions({ 
  quoteId, 
  status, 
  role,
  discountPercentage 
}: { 
  quoteId: string, 
  status: string, 
  role: string,
  discountPercentage: number
}) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const isAdmin = role === 'admin'
  const isPendingAdminApproval = status === 'pending_admin_approval'

  const handleUpdate = async (newStatus: 'accepted' | 'rejected') => {
    setIsUpdating(true)
    const res = await updateQuoteStatusAction(quoteId, newStatus)
    setIsUpdating(false)
    if (res.success) {
      router.refresh()
    } else {
      alert('Durum güncellenirken bir hata oluştu: ' + res.error)
    }
  }

  const handleDiscountAction = async (action: 'approve' | 'reject') => {
    setIsUpdating(true)
    const res = await approveDiscountAction(quoteId, action)
    setIsUpdating(false)
    if (res.success) {
      router.refresh()
    } else {
      alert('İskonto işlemi sırasında hata: ' + res.error)
    }
  }

  // PDF/Yazdır: pending_admin_approval durumunda devre dışı
  const canPrint = status !== 'pending_admin_approval'

  return (
    <div className="flex gap-3 print:hidden flex-wrap">
      {/* Yazdır butonu */}
      <Button 
        variant="outline" 
        onClick={() => canPrint ? window.print() : alert('İskonto onayı bekleyen teklifler için PDF çıktısı alınamaz.')} 
        className={`bg-white border-slate-300 text-slate-700 ${!canPrint ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Printer className="mr-2 h-4 w-4" /> Yazdır / PDF
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
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
            İskontoyu Reddet
          </Button>
          <Button
            variant="default"
            className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
            onClick={() => handleDiscountAction('approve')}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            İskontoyu Onayla (%{discountPercentage})
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
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
            Reddet
          </Button>
          <Button 
            variant="default" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            onClick={() => handleUpdate('accepted')} 
            disabled={isUpdating} 
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Onayla
          </Button>
        </>
      )}
    </div>
  )
}
