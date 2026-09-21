import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Box, PackageOpen, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { RequestUpdateButton } from '@/components/shared/RequestUpdateButton'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const supabase = await createClient()

  // Role kontrolü için profile çekiliyor
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  const role = profile?.role || 'sales'

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, base_price, base_currency, created_at, is_active')
    .order('created_at', { ascending: false })

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(new Date(dateStr))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between h-auto py-5 sm:h-20 sm:py-0 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
                <Box className="h-6 w-6 text-brand-600 mr-2" /> Ürün Kataloğu
              </h1>
              <p className="text-sm text-slate-500 mt-1">Sistemdeki tüm satılabilir ana ürünler ve konfigürasyon modellemeleri.</p>
            </div>
            <div className="flex gap-2">
              {role !== 'sales' && (
                <Link href="/admin/products/new">
                  <Button variant="primary" className="font-medium">
                    <Plus className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Açıklama / Ürün Adı</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Taban Fiyat</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Oluşturulma</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Durum</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Eylemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!products || products.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="px-0 py-0 bg-slate-50/30">
                      <EmptyState 
                        icon={PackageOpen} 
                        title="Henüz Ürün Eklenmemiş" 
                        description="Kataloğunuz şu anda boş. Satışlara ve konfigürasyonlara başlamak için sisteminize ilk ürününüzü ekleyin." 
                        action={
                        role !== 'sales' ? (
                          <Link href="/admin/products/new">
                            <Button variant="primary" className="mt-2 shadow-md">
                              <Plus className="h-4 w-4 mr-2"/> Ürün Oluştur
                            </Button>
                          </Link>
                        ) : null
                        } 
                      />
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-500 font-medium">{p.sku || '-'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{p.name}</td>
                      <td className="px-6 py-4 text-sm font-bold text-brand-700 text-right">{formatPrice(p.base_price, p.base_currency)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">{formatDate(p.created_at)}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={p.is_active ? 'success' : 'secondary'} className="px-3 border-none bg-opacity-20 shadow-none">
                          {p.is_active ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {role !== 'sales' ? (
                          <Link href={`/admin/products/${p.id}/edit`}>
                            <Button variant="outline" className="h-8 text-xs font-semibold px-3 bg-white hover:bg-brand-50 hover:text-brand-700 border-slate-200">
                              <Pencil className="h-3 w-3 mr-1.5" /> Düzenle
                            </Button>
                          </Link>
                        ) : (
                          <RequestUpdateButton 
                            requestType="product" 
                            itemId={p.id} 
                            itemName={p.name} 
                          />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  )
}
