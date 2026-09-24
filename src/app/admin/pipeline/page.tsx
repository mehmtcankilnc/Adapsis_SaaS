import { createClient } from '@/lib/supabase/server'
import { TrendingUp, ShieldCheck } from 'lucide-react'
import { getPipelineAnalyticsAction } from '@/actions/pipeline-analytics.actions'
import { PipelineAnalyticsClient } from './PipelineAnalyticsClient'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">Erişim Engellendi</h2>
          <p className="text-sm text-slate-500 mt-1">Bu sayfa sadece admin kullanıcılar içindir.</p>
        </div>
      </div>
    )
  }

  const result = await getPipelineAnalyticsAction()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between h-auto py-5 sm:h-20 sm:py-0 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
                <TrendingUp className="h-6 w-6 text-brand-600 mr-2" /> Satış Hattı & Gelir Tahmini
              </h1>
              <p className="text-sm text-slate-500 mt-1">Açık fırsatların ağırlıklı değeri, aylık gelir tahmini ve hedef karşılaştırması.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PipelineAnalyticsClient
          opportunities={result.opportunities}
          targets={result.targets}
          acceptedQuotes={result.acceptedQuotes}
          error={result.success ? undefined : result.error}
        />
      </main>
    </div>
  )
}
