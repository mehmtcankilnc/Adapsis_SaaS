import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search, FileText, ChevronRight } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuotesListClient } from './QuotesListClient'
import { markQuotesAsReadAction } from '@/actions/quote.actions'

export const dynamic = 'force-dynamic'

export default async function QuotesPage() {
  const supabase = await createClient()

  // Kullanıcı ve rol bilgisi
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  const role = profile?.role || 'sales'

  // Mark quotes as read
  await markQuotesAsReadAction(role as "admin" | "sales")

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      id,
      customer_company,
      customer_contact,
      final_price,
      currency,
      status,
      created_at,
      discount_percentage,
      created_by,
      products ( name )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Teklifler çekilemedi:', error.message)
  }

  const { data: settings } = await supabase
    .from('global_settings')
    .select('discount_approval_threshold')
    .limit(1)
    .maybeSingle()
  const discountApprovalThreshold = Number(settings?.discount_approval_threshold ?? 5)

  // Admin görüntüsü: Satış Temsilcisi bilgisini profiles JOIN ile çek
  let quotesWithProfiles = quotes || []
  if (role === 'admin' && quotesWithProfiles.length > 0) {
    // Benzersiz created_by ID'lerini topla
    const userIds = [...new Set(quotesWithProfiles.map(q => q.created_by).filter(Boolean))]
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      const profileMap = new Map(
        (profilesData || []).map(p => [p.id, p.full_name || 'Bilinmeyen'])
      )

      quotesWithProfiles = quotesWithProfiles.map(q => ({
        ...q,
        creator_name: q.created_by ? (profileMap.get(q.created_by) || 'Bilinmeyen') : 'Sistem'
      }))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Üst Bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between h-auto py-4 sm:h-20 sm:py-0 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tüm Teklifler</h1>
              <p className="text-sm text-slate-500 mt-1">Sistemdeki tüm aktif ve geçmiş teklif kayıtları.</p>
            </div>
            
            <Link href="/sales/new-quote">
              <Button variant="primary" className="bg-brand-600 hover:bg-brand-700 shadow-sm text-white">
                <Plus className="mr-2 h-4 w-4" /> Yeni Teklif Oluştur
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Ana Liste (Arama + Tablo) */}
      <QuotesListClient quotes={quotesWithProfiles} role={role} discountApprovalThreshold={discountApprovalThreshold} />
    </div>
  )
}
