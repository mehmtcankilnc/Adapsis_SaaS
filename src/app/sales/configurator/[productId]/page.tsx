import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ConfiguratorClient from './ConfiguratorClient'
import { configurationToSelections } from '@/lib/quote-config'

export default async function ConfiguratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ fromQuote?: string }>
}) {
  const resolvedParams = await params
  const productId = resolvedParams.productId
  const { fromQuote } = await searchParams

  const supabase = await createClient()

  // Ürünü ve altına bağlı dinamik varyasyonları (product_variants tablosu) çekiyoruz
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (*)
    `)
    .eq('id', productId)
    .single()

  if (error || !product) {
    console.error('Ürün bulunamadı:', error?.message)
    return notFound()
  }

  // Varyasyonları sort_order'a göre sırala
  if (product.product_variants) {
    product.product_variants.sort(
      (a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order || 0) - (b.sort_order || 0),
    )
  }

  // Stok kontrolü için envanter listesini çek (reserved_stock dahil —
  // bekleyen tekliflerce ayrılmış miktar da hesaba katılmalı)
  const { data: inventoryList } = await supabase
    .from('inventory')
    .select('id, item_name, stock_level, reserved_stock')

  // Müşterileri çek
  const { data: customers } = await supabase
    .from('customers')
    .select('id, company_name')
    .order('company_name')

  // İskonto onay eşiği (admin tarafından Ayarlar sayfasından yapılandırılabilir)
  const { data: settings } = await supabase
    .from('global_settings')
    .select('discount_approval_threshold')
    .limit(1)
    .maybeSingle()
  const discountApprovalThreshold = Number(settings?.discount_approval_threshold ?? 5)

  // "Kopyala" akışı: ?fromQuote=<quoteId> ile gelindiyse o teklifin
  // konfigürasyonunu çek ve önceden doldurulmuş seçim olarak geçir. Farklı
  // bir ürüne ait bir teklifse (URL elle değiştirilmişse) sessizce yoksay —
  // farklı ürünün varyant id'leri bu ürünle karışmasın.
  let initialSelections: Record<string, string> | undefined
  if (fromQuote) {
    const { data: sourceQuote } = await supabase
      .from('quotes')
      .select('product_id, configuration')
      .eq('id', fromQuote)
      .maybeSingle()

    if (sourceQuote && sourceQuote.product_id === productId) {
      initialSelections = configurationToSelections(sourceQuote.configuration)
    }
  }

  // Bu ürüne ait kayıtlı şablonlar — ekip çapında görünür (bkz. migration 030)
  const { data: templates } = await supabase
    .from('quote_templates')
    .select('id, name, configuration, created_by')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-slate-50">
      <ConfiguratorClient
        product={product}
        inventoryList={inventoryList || []}
        customers={customers || []}
        discountApprovalThreshold={discountApprovalThreshold}
        initialSelections={initialSelections}
        templates={templates || []}
        currentUserId={user?.id || ''}
      />
    </div>
  )
}
