import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Hexagon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import QuoteActions from './QuoteActions'
import { markQuotesAsReadAction } from '@/actions/quote.actions'
import type { PriceEffect, ProductVariant, QuoteConfigurationItem } from '@/types/product.types'

interface QuoteDetailProduct {
  name: string
  sku: string | null
  description: string | null
  base_price: number
  base_currency: string
  product_variants: ProductVariant[]
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const resolvedParams = await params
  const quoteId = resolvedParams.quoteId

  const supabase = await createClient()

  // Kullanıcı rolünü al
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  const role = userProfile?.role || 'sales'

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      customers ( company_name ),
      products (
        name, sku, description, base_price, base_currency,
        product_variants (*)
      )
    `)
    .eq('id', quoteId)
    .single()

  if (quote) {
    await markQuotesAsReadAction(role as "admin" | "sales", quoteId)
  }

  const { data: settings } = await supabase.from('global_settings').select('*').limit(1).single()

  if (error || !quote) {
    return notFound()
  }

  // Teklifi oluşturan kişi bilgisi
  let creatorName = 'Bilinmeyen'
  if (quote.created_by) {
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', quote.created_by)
      .single()
    creatorName = creatorProfile?.full_name || 'Bilinmeyen'
  }

  const { products: product, configuration, final_price, base_price_snapshot, currency, discount_percentage } = quote as unknown as {
    products: QuoteDetailProduct | null
    configuration: QuoteConfigurationItem[] | Record<string, string> | null
    final_price: number
    base_price_snapshot: number
    currency: string
    discount_percentage: number
  }
  const variants = product?.product_variants || []
  const discountPct = Number(discount_percentage) || 0

  const customerCompany = quote.customers?.company_name || quote.customer_company || 'Bilinmiyor'

  const companyName = settings?.company_name || 'ADAPSIS A.Ş.'
  const companyAddress = settings?.company_address || 'Endüstriyel Üretim Sistemleri'
  const taxRate = settings?.tax_rate || 20
  const footerText = settings?.quote_footer_text || 'Bu teklif belgesi bilgilendirme amaçlıdır.'
  const discountApprovalThreshold = Number(settings?.discount_approval_threshold ?? 5)

  // Yardımcı Formatlayıcılar — tr-TR locale, doğru para sembolü (₺, $, €, £)
  const formatPrice = (amount: number, forceCurrency?: string) => {
    const cur = forceCurrency || currency
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatEffectStr = (effect: PriceEffect | undefined) => {
    if (!effect || effect.amount === 0) return ''
    if (effect.type === 'fixed') return effect.amount > 0 ? `+${effect.amount}` : `${effect.amount}`
    if (effect.type === 'multiplier') return `x${effect.amount}`
    if (effect.type === 'percentage') return `+%${effect.amount}`
    return ''
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: 'long', year: 'numeric'
    }).format(new Date(dateStr))
  }

  const statusMap: Record<string, { label: string, variant: "success" | "warning" | "destructive" | "brand" }> = {
    'pending': { label: 'Değerlendirmede', variant: 'warning' },
    'accepted': { label: 'Satış Onaylandı', variant: 'success' },
    'rejected': { label: 'Teklif Reddedildi', variant: 'destructive' },
    'pending_admin_approval': { label: 'İskonto Onayı Bekliyor', variant: 'brand' },
  }
  const stat = statusMap[quote.status] || { label: quote.status, variant: 'warning' }

  // ============================================================
  // Konfigürasyon verisini parse et
  // Yeni format: JSONB array → [{ variant_id, selected_value, label, ... }]
  // Eski format: JSONB object → { variant_id: option_value }
  // Her ikisini de destekle:
  // ============================================================
  type ConfigRow = {
    groupName: string
    optionLabel: string
    effectStr: string
  }

  const configRows: ConfigRow[] = []

  if (Array.isArray(configuration)) {
    // YENİ FORMAT: Array of objects
    for (const item of configuration) {
      // variant bilgisini product_variants'tan bul
      const variant = variants.find((v) => v.id === item.variant_id)
      const groupName = variant?.group_name || item.variant_id || '—'

      // option bilgisini bul
      let optionLabel = item.label || item.selected_value || '—'
      let effectStr = ''

      if (variant && variant.options) {
        const opt = variant.options.find((o) => o.value === item.selected_value)
        if (opt) {
          optionLabel = opt.label || item.selected_value
          effectStr = formatEffectStr(opt.price_effect)
        }
      }

      configRows.push({ groupName, optionLabel, effectStr })
    }
  } else if (configuration && typeof configuration === 'object') {
    // ESKİ FORMAT: Object { variant_id: option_value }
    for (const [variantId, optionValue] of Object.entries(configuration)) {
      const variant = variants.find((v) => v.id === variantId)
      const groupName = variant?.group_name || variantId
      let optionLabel = String(optionValue)
      let effectStr = ''

      if (variant && variant.options) {
        const opt = variant.options.find((o) => o.value === optionValue)
        if (opt) {
          optionLabel = opt.label || String(optionValue)
          effectStr = formatEffectStr(opt.price_effect)
        }
      }

      configRows.push({ groupName, optionLabel, effectStr })
    }
  }

  // İndirim öncesi fiyat hesapla (discountPct === 100 durumunda bölme hatasını önle)
  const priceBeforeDiscount =
    discountPct > 0 && discountPct < 100
      ? final_price / (1 - discountPct / 100)
      : final_price
  const discountAmount = priceBeforeDiscount - final_price

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
      
      {/* Üst Navigasyon (Yazdırırken Gizlenir) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 print:hidden flex items-center justify-between">
        <Link href="/sales/quotes" className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Tekliflere Dön
        </Link>
        <QuoteActions quoteId={quote.id} status={quote.status} role={role} discountPercentage={discountPct} productId={quote.product_id} />
      </div>

      {/* A4 Kağıdı Görünümlü Kart */}
      <div className="max-w-5xl mx-auto bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
        
        {/* Antetli Kısım (Header) */}
        <div className="p-5 sm:p-8 lg:p-12 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center">
            <div className="bg-brand-600 p-3 rounded-lg mr-4">
              <Hexagon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{companyName}</h1>
              <p className="text-sm text-slate-500">{companyAddress}</p>
            </div>
          </div>
          
          <div className="text-left md:text-right">
            <h2 className="text-3xl font-light text-slate-300 uppercase tracking-widest mb-2">PROFORMA</h2>
            <div className="space-y-1 text-sm">
              <p className="text-slate-600"><span className="font-medium">Tarih:</span> {formatDate(quote.created_at)}</p>
              <p className="text-slate-600"><span className="font-medium">Teklif No:</span> {quote.id.split('-')[0].toUpperCase()}</p>
              {role === 'admin' && (
                <p className="text-slate-600"><span className="font-medium">Temsilci:</span> {creatorName}</p>
              )}
              <div className="pt-2 flex items-center gap-2 md:justify-end">
                <Badge variant={stat.variant} className="text-xs px-2 py-0.5">{stat.label}</Badge>
                {discountPct > 0 && (
                  <Badge
                    variant={discountPct > discountApprovalThreshold ? "destructive" : "success"}
                    className="text-xs px-2 py-0.5"
                  >
                    %{discountPct} İskonto
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* İskonto Onay Uyarı Bandı */}
        {quote.status === 'pending_admin_approval' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-5 sm:px-8 lg:px-12 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-amber-600 text-lg font-bold">%</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Bu teklif %{discountPct} iskonto içermektedir ve admin onayı beklemektedir.
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Stok bu teklif için zaten rezerve edilmiştir; indirim onaylanmadan yalnızca PDF çıktısı alınamayacaktır.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Müşteri ve Ürün Kısa Bilgisi */}
        <div className="p-5 sm:p-8 lg:p-12 border-b border-slate-100 flex flex-col md:flex-row gap-12">
          <div className="flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Müşteri Bilgileri</h3>
            <div className="text-slate-900 font-semibold text-lg">{customerCompany}</div>
            {quote.customer_contact && (
              <div className="text-slate-600 mt-1">{quote.customer_contact}</div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Teklif Edilen Ürün</h3>
            <div className="text-slate-900 font-semibold text-lg">{product?.name || '—'}</div>
            <div className="text-slate-600 mt-1">SKU: <span className="font-mono">{product?.sku || 'N/A'}</span></div>
          </div>
        </div>

        {/* Konfigürasyon Kalemleri (Tablo) */}
        <div className="p-5 sm:p-8 lg:p-12">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">Özelleştirilmiş Konfigürasyon Detayları</h3>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[480px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 font-semibold text-slate-600">Parametre / Kategori</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Seçilen Opsiyon</th>
                  <th className="px-6 py-3 font-semibold text-slate-600 text-right">Etki Oranı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {configRows.length > 0 ? (
                  configRows.map((row, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-6 py-4 text-slate-500 font-medium">{row.groupName}</td>
                      <td className="px-6 py-4 text-slate-900 font-semibold">{row.optionLabel}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-right">{row.effectStr || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Özelleştirilmiş opsiyon bulunmuyor. Ek donanım seçilmedi.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Toplam Fiyat Dökümü */}
          <div className="mt-8 flex justify-end">
            <div className="w-full sm:w-1/2 lg:w-1/3 space-y-4">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Taban Ürün Fiyatı:</span>
                <span className="font-semibold text-slate-900">{formatPrice(base_price_snapshot)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Opsiyonlar ve Kur Farkı:</span>
                <span className="font-semibold text-slate-900">{formatPrice(priceBeforeDiscount - base_price_snapshot)}</span>
              </div>
              {discountPct > 0 && (
                <>
                  <div className="flex justify-between text-sm text-slate-500 border-t border-dashed border-slate-200 pt-3">
                    <span>Ara Toplam:</span>
                    <span className="font-semibold text-slate-900">{formatPrice(priceBeforeDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 font-medium flex items-center gap-1">
                      İskonto (%{discountPct}):
                    </span>
                    <span className="font-bold text-red-600">-{formatPrice(discountAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                <span className="text-base font-bold text-slate-900">ARA TOPLAM:</span>
                <span className="text-lg font-bold text-slate-900 tracking-tight">{formatPrice(final_price)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-semibold text-slate-500">KDV (%{taxRate}):</span>
                <span className="text-sm font-semibold text-slate-500 tracking-tight">{formatPrice(final_price * (taxRate / 100))}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                <span className="text-base font-bold text-slate-900">GENEL TOPLAM:</span>
                <span className="text-2xl font-black text-brand-600 tracking-tight">{formatPrice(final_price * (1 + taxRate / 100))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alt Bilgi (Footer) */}
        <div className="bg-slate-50/50 p-5 sm:p-8 lg:p-12 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
          <p className="mb-2"><strong className="text-slate-500">Şartlar &amp; Koşullar:</strong> {footerText}</p>
          {settings?.iban && <p className="mb-2"><strong className="text-slate-500">Banka IBAN:</strong> {settings.iban}</p>}
          <p>Yazılım Otomasyonu: ADAPSIS B2B Sistemleri üzerinden üretilmiştir.</p>
        </div>

      </div>
    </div>
  )
}
