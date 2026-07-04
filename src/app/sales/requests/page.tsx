import { createClient } from '@/lib/supabase/server'
import { ClipboardList, MessageSquareText, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'

export const dynamic = 'force-dynamic'

export default async function SalesRequestsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Sadece kendi taleplerini çek (RLS de bunu garanti eder)
  const { data: requests, error } = await supabase
    .from('system_requests')
    .select('*')
    .eq('requested_by', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Talepler çekilemedi:', error.message)
  }

  const myRequests = requests || []

  const statusConfig: Record<string, { label: string, variant: "warning" | "success" | "destructive", icon: typeof Clock }> = {
    pending: { label: 'Bekliyor', variant: 'warning', icon: Clock },
    approved: { label: 'Onaylandı', variant: 'success', icon: CheckCircle2 },
    rejected: { label: 'Reddedildi', variant: 'destructive', icon: XCircle },
  }

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr))

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
                <ClipboardList className="h-6 w-6 text-brand-600 mr-2" /> Taleplerim
              </h1>
              <p className="text-sm text-slate-500 mt-1">Gönderdiğiniz güncelleme talepleri ve admin yanıtları.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center bg-white border border-slate-200 rounded-lg px-4 py-2">
                <p className="text-lg font-bold text-slate-900">{myRequests.length}</p>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Toplam</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {myRequests.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <EmptyState
              icon={ClipboardList}
              title="Henüz Talebiniz Yok"
              description="Ürün Kataloğu veya Envanter sayfalarından 'Güncelleme Talep Et' butonunu kullanarak ilk talebinizi oluşturabilirsiniz."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {myRequests.map((req) => {
              const cfg = statusConfig[req.status] || statusConfig.pending
              const StatusIcon = cfg.icon
              const hasResponse = req.admin_response && req.admin_response.trim().length > 0

              return (
                <Card key={req.id} className="border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5">
                    {/* Üst satır: Tip + Kalem + Tarih + Durum */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          req.request_type === 'product' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          <MessageSquareText className={`h-4 w-4 ${
                            req.request_type === 'product' ? 'text-blue-600' : 'text-purple-600'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{req.item_name}</p>
                          <p className="text-xs text-slate-500">
                            {req.request_type === 'product' ? 'Ürün' : 'Envanter'} Güncellemesi • {formatDate(req.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={cfg.variant} className="shrink-0 flex items-center gap-1.5 px-3">
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* Talep Açıklaması */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Talebiniz</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{req.request_note}</p>
                    </div>

                    {/* Admin Yanıtı */}
                    {hasResponse && (
                      <div className={`rounded-lg p-4 border ${
                        req.status === 'approved'
                          ? 'bg-emerald-50 border-emerald-200'
                          : req.status === 'rejected'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-blue-50 border-blue-200'
                      }`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${
                          req.status === 'approved'
                            ? 'text-emerald-500'
                            : req.status === 'rejected'
                              ? 'text-amber-500'
                              : 'text-blue-500'
                        }`}>
                          Admin Yanıtı
                        </p>
                        <p className={`text-sm leading-relaxed ${
                          req.status === 'approved'
                            ? 'text-emerald-800'
                            : req.status === 'rejected'
                              ? 'text-amber-800'
                              : 'text-blue-800'
                        }`}>
                          {req.admin_response}
                        </p>
                      </div>
                    )}

                    {/* Yanıt yok + işlendi durumu */}
                    {!hasResponse && req.status !== 'pending' && (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <p className="text-xs text-slate-400 italic text-center">
                          Admin yanıt eklenmeden işleme alındı.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
