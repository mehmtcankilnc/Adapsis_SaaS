'use client'

import React, { useState } from 'react'
import { MessageSquarePlus, Send, Loader2, Check, Package, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { createSystemRequestAction } from '@/actions/request.actions'

interface RequestUpdateButtonProps {
  requestType: 'product' | 'inventory'
  itemId: string
  itemName: string
}

export function RequestUpdateButton({ requestType, itemId, itemName }: RequestUpdateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const result = await createSystemRequestAction({
      request_type: requestType,
      item_id: itemId,
      item_name: itemName,
      request_note: note,
    })

    setIsSubmitting(false)

    if (result.success) {
      setSuccessMsg('Talebiniz başarıyla iletildi!')
      setTimeout(() => {
        setIsOpen(false)
        setNote('')
        setSuccessMsg(null)
      }, 2000)
    } else {
      setErrorMsg(result.error || 'Talep oluşturulamadı.')
    }
  }

  const typeLabel = requestType === 'product' ? 'Ürün' : 'Envanter'
  const TypeIcon = requestType === 'product' ? Package : Layers
  const accentColor = requestType === 'product' ? 'blue' : 'purple'

  return (
    <>
      <Button
        variant="outline"
        onClick={() => { setIsOpen(true); setErrorMsg(null); setSuccessMsg(null) }}
        className="h-8 text-xs font-semibold px-3 bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border-slate-200 transition-colors"
      >
        <MessageSquarePlus className="h-3 w-3 mr-1.5" /> Güncelleme Talep Et
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{typeLabel} Güncelleme Talebi</DialogTitle>
            <DialogDescription>
              Güncelleme talebinizi aşağıda açıklayın. Admin ekibi tarafından incelenecektir.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-4">

              {/* Durum Mesajları */}
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200 flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Kalem Bilgisi */}
              <div className={`rounded-lg border p-3 flex items-center gap-3 ${
                accentColor === 'blue'
                  ? 'bg-blue-50/50 border-blue-100'
                  : 'bg-purple-50/50 border-purple-100'
              }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  accentColor === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  <TypeIcon className={`h-4 w-4 ${
                    accentColor === 'blue' ? 'text-blue-600' : 'text-purple-600'
                  }`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{itemName}</p>
                  <p className="text-xs text-slate-500">{typeLabel} Güncellemesi</p>
                </div>
              </div>

              {/* Açıklama Alanı */}
              <div className="flex flex-col gap-1.5">
                <Label>Açıklama</Label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder={
                    requestType === 'product'
                      ? 'Örn: Fiyat güncellenmeli, açıklama değiştirilmeli...'
                      : 'Örn: Stok miktarı yanlış, yeni parti eklenmeli...'
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">Minimum 5 karakter gereklidir.</p>
              </div>

            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting || !!successMsg}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-brand-600 hover:bg-brand-700"
              onClick={handleSubmit}
              disabled={isSubmitting || note.trim().length < 5 || !!successMsg}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Gönderiliyor...</>
              ) : (
                <><Send className="mr-1.5 h-3.5 w-3.5" /> Talebi Gönder</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
