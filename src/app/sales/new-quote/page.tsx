import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Box } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function NewQuoteSelectPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, base_price, base_currency, description')
    .eq('is_active', true)
    .order('name')

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ürün Seçimi</h1>
          <p className="text-sm text-slate-500 mt-1">Konfigüratörü başlatmak için aktif kataloğunuzdan bir ürün seçin.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!products || products.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
              Şu an sistemde satışa açık (aktif) hiçbir ürün modeli bulunmuyor. Lütfen yöneticiyle iletişime geçin.
            </div>
          ) : (
            products.map((p) => (
              <Card key={p.id} className="border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all group flex flex-col justify-between">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-brand-50 p-3 rounded-lg text-brand-600">
                      <Box className="h-6 w-6" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{p.sku || 'SKU-YOK'}</div>
                      <div className="text-lg font-black text-slate-800">{formatPrice(p.base_price, p.base_currency)} taban</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{p.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{p.description || 'Açıklama bulunmuyor.'}</p>
                  </div>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Link href={`/sales/configurator/${p.id}`} className="block w-full">
                    <Button variant="primary" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium">
                      Konfigürasyona Başla
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
