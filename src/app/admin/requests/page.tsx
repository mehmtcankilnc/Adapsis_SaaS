import { createClient } from '@/lib/supabase/server'
import { Inbox, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RequestsTableClient } from './RequestsTableClient'
import { T } from '@/components/layout/T'
import { dictionary } from '@/lib/i18n/dictionary'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const supabase = await createClient()

  // Admin kontrolü
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  
  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700"><T k="admin.requests.accessDeniedTitle" /></h2>
          <p className="text-sm text-slate-500 mt-1"><T k="admin.requests.accessDeniedDescription" /></p>
        </div>
      </div>
    )
  }

  // Tüm talepleri çek
  const { data: requests, error } = await supabase
    .from('system_requests')
    .select('*')
    .order('created_at', { ascending: false })

  // Talep oluşturanların isimlerini al
  let requestsWithNames = requests || []
  if (requestsWithNames.length > 0) {
    const userIds = [...new Set(requestsWithNames.map(r => r.requested_by).filter(Boolean))]

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      const profileMap = new Map(
        (profilesData || []).map(p => [p.id, p.full_name || dictionary.tr['admin.requests.unknownUser']])
      )

      requestsWithNames = requestsWithNames.map(r => ({
        ...r,
        requester_name: r.requested_by ? (profileMap.get(r.requested_by) || dictionary.tr['admin.requests.unknownUser']) : dictionary.tr['admin.requests.systemLabel'],
      }))
    }
  }

  // İstatistik kartları
  const pendingCount = requestsWithNames.filter(r => r.status === 'pending').length
  const approvedCount = requestsWithNames.filter(r => r.status === 'approved').length
  const rejectedCount = requestsWithNames.filter(r => r.status === 'rejected').length

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between h-auto py-5 sm:h-20 sm:py-0 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
                <Inbox className="h-6 w-6 text-brand-600 mr-2" /> <T k="admin.requests.pageTitle" />
              </h1>
              <p className="text-sm text-slate-500 mt-1"><T k="admin.requests.pageDescription" /></p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-amber-700">{pendingCount} <T k="admin.requests.pendingSuffix" /></span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-emerald-700">{approvedCount} <T k="admin.requests.processedSuffix" /></span>
              </div>
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-red-700">{rejectedCount} <T k="admin.requests.statusRejected" /></span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RequestsTableClient requests={requestsWithNames} />
      </main>
    </div>
  )
}
