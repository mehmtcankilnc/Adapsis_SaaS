'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Search, CheckCircle2, XCircle, MessageSquare, Package, Layers, Loader2, Inbox } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { updateSystemRequestAction } from '@/actions/request.actions'
import type { SystemRequest } from '@/types/product.types'

export function RequestsTableClient({ requests }: { requests: SystemRequest[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  // Review dialog
  const [reviewItem, setReviewItem] = useState<SystemRequest | null>(null)
  const [adminResponse, setAdminResponse] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const statusMap: Record<string, { label: string, variant: "warning" | "success" | "destructive" }> = {
    'pending': { label: 'Bekliyor', variant: 'warning' },
    'approved': { label: 'Onaylandı', variant: 'success' },
    'rejected': { label: 'Reddedildi', variant: 'destructive' },
  }

  const typeMap: Record<string, { label: string, icon: typeof Package }> = {
    'product': { label: 'Ürün', icon: Package },
    'inventory': { label: 'Envanter', icon: Layers },
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateStr))
  }

  const filteredRequests = requests.filter(r => {
    const matchesSearch = !search || 
      r.item_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.request_note?.toLowerCase().includes(search.toLowerCase()) ||
      r.requester_name?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || r.status === filter
    return matchesSearch && matchesFilter
  })

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!reviewItem) return
    setIsProcessing(true)
    setActionError(null)

    const result = await updateSystemRequestAction(reviewItem.id, status, adminResponse)
    setIsProcessing(false)

    if (result.success) {
      setReviewItem(null)
      setAdminResponse('')
    } else {
      setActionError(result.error || 'İşlem başarısız.')
    }
  }

  return (
    <>
      {/* Kontrol çubuğu */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Talep içeriği, ürün adı veya kişiye göre ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => {
            const labels: Record<string, string> = { all: 'Tümü', pending: 'Bekleyen', approved: 'Onaylanan', rejected: 'Reddedilen' }
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  filter === f 
                    ? 'bg-brand-600 text-white border-brand-600' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {labels[f]}
              </button>
            )
          })}
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tip</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kalem</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Talep Eden</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider max-w-xs">Açıklama</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Durum</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Eylemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-0 py-0 bg-slate-50/30">
                    <EmptyState
                      icon={Inbox}
                      title={search || filter !== 'all' ? "Sonuç Bulunamadı" : "Henüz Talep Yok"}
                      description={search || filter !== 'all' ? "Filtrelere uygun talep bulunamadı." : "Satış personelinden henüz bir güncelleme talebi gelmemiş."}
                      action={search || filter !== 'all' ? (
                        <Button variant="outline" onClick={() => { setSearch(''); setFilter('all') }}>
                          Filtreleri Temizle
                        </Button>
                      ) : undefined}
                    />
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const stat = statusMap[req.status] || { label: req.status, variant: 'warning' as const }
                  const typeInfo = typeMap[req.request_type] || { label: req.request_type, icon: Package }
                  const TypeIcon = typeInfo.icon

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            req.request_type === 'product' ? 'bg-blue-100' : 'bg-purple-100'
                          }`}>
                            <TypeIcon className={`h-3.5 w-3.5 ${
                              req.request_type === 'product' ? 'text-blue-600' : 'text-purple-600'
                            }`} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{typeInfo.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                        {req.item_name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {(req.requester_name || 'U')[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-700">{req.requester_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-slate-600 truncate" title={req.request_note}>
                          {req.request_note}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={stat.variant}>{stat.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === 'pending' ? (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setReviewItem(req)
                              setAdminResponse('')
                              setActionError(null)
                            }}
                            className="h-8 text-xs font-semibold px-3 bg-white hover:bg-brand-50 hover:text-brand-700 border-slate-200"
                          >
                            <MessageSquare className="h-3 w-3 mr-1.5" /> İncele
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {req.admin_response ? 'Yanıt verildi' : 'İşlendi'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* İnceleme Modalı */}
      {reviewItem && (
        <Dialog open={!!reviewItem} onOpenChange={(v) => !v && setReviewItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Talep İnceleme</DialogTitle>
              <DialogDescription>
                <strong className="text-slate-800">{reviewItem.requester_name}</strong> tarafından gönderildi.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-5">
              {actionError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
                  {actionError}
                </div>
              )}

              {/* Talep Detayı */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Tip</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {typeMap[reviewItem.request_type]?.label || reviewItem.request_type}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Kalem</span>
                  <span className="font-semibold text-slate-800">{reviewItem.item_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Tarih</span>
                  <span className="text-slate-700">{formatDate(reviewItem.created_at)}</span>
                </div>
              </div>

              {/* Açıklama */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Talep Açıklaması</Label>
                <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
                  {reviewItem.request_note}
                </div>
              </div>

              {/* Admin Yanıtı */}
              <div className="space-y-2">
                <Label>Admin Yanıtı (Opsiyonel)</Label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={3}
                  placeholder="Talep hakkında bir yanıt ekleyin..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 leading-relaxed">
                <strong>Not:</strong> Onaylamak yalnızca bu talebi kapatır ve satış temsilcisine bildirim gönderir.
                İlgili ürün/envanter kaydındaki değişikliği ayrı olarak siz{' '}
                <strong>Ürün Kataloğu</strong> veya <strong>Envanter</strong> sayfasından uygulamalısınız — sistem
                otomatik bir güncelleme yapmaz.
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                variant="destructive"
                onClick={() => handleAction('rejected')}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> İşleniyor...</>
                ) : (
                  <><XCircle className="mr-2 h-4 w-4" /> Reddet</>
                )}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAction('approved')}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 hover:text-emerald-50 text-white"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> İşleniyor...</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Talebi Onayla (Otomatik Uygulanmaz)</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
