import { create } from 'zustand'
import { ProductVariant } from '@/types/product.types'

/**
 * Büyük rakamları (300M+ TRY) güvenli şekilde 2 ondalık basamağa yuvarlar.
 * JavaScript number tipi ~9 katrilyona kadar tam sayıları güvenli temsil eder (Number.MAX_SAFE_INTEGER = 9007199254740991).
 * Ancak kayan nokta aritmetiği (0.1 + 0.2 ≠ 0.3) hatalarını önlemek için 
 * hesaplama sonuçlarını açıkça yuvarlarız.
 */
function safeRound(value: number, decimals: number = 2): number {
  // Number.EPSILON tabanlı yuvarlama: kayan nokta hatalarını absorbe eder
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export interface SalesConfiguratorState {
  basePrice: number
  baseCurrency: string
  activeCurrency: string
  exchangeRates: Record<string, number>

  variants: ProductVariant[]
  selections: Record<string, string> // variant_id -> option_value
  selectedCustomerId: string | null
  
  initialize: (basePrice: number, baseCurrency: string, variants: ProductVariant[]) => void
  initializeWithPriorSelections: (
    basePrice: number,
    baseCurrency: string,
    variants: ProductVariant[],
    priorSelections: Record<string, string>,
  ) => void
  setSelection: (variantId: string, optionValue: string) => void
  setSelectedCustomer: (customerId: string | null) => void
  setActiveCurrency: (currency: string) => void
  setExchangeRates: (rates: Record<string, number>) => void
  
  getTotalPrice: () => number
  getConvertedTotal: () => number
}

export const useSalesConfiguratorStore = create<SalesConfiguratorState>((set, get) => ({
  basePrice: 0,
  baseCurrency: 'USD',
  activeCurrency: 'USD',
  exchangeRates: {},
  variants: [],
  selections: {},
  selectedCustomerId: null,

  initialize: (basePrice, baseCurrency, variants) => {
    const defaultSelections: Record<string, string> = {}
    
    variants.forEach(v => {
      const defaultOpt = v.options?.find(o => o.is_default)
      if (defaultOpt) {
        defaultSelections[v.id] = defaultOpt.value
      } else if (v.options && v.options.length > 0) {
        if (v.is_required) {
          defaultSelections[v.id] = v.options[0].value
        }
      }
    })

    set({ basePrice, baseCurrency, activeCurrency: baseCurrency, variants, selections: defaultSelections })
  },

  // Teklif kopyalama / şablon uygulama: her variant için önceki seçim hâlâ
  // geçerli bir opsiyonsa onu kullan, değilse (ürün varyantları o teklif
  // oluşturulduktan sonra değişmiş olabilir) initialize()'daki varsayılan/
  // ilk-seçenek mantığına düş.
  initializeWithPriorSelections: (basePrice, baseCurrency, variants, priorSelections) => {
    const seededSelections: Record<string, string> = {}

    variants.forEach(v => {
      const priorValue = priorSelections[v.id]
      const isPriorStillValid = priorValue && v.options?.some(o => o.value === priorValue)

      if (isPriorStillValid) {
        seededSelections[v.id] = priorValue
        return
      }

      const defaultOpt = v.options?.find(o => o.is_default)
      if (defaultOpt) {
        seededSelections[v.id] = defaultOpt.value
      } else if (v.options && v.options.length > 0) {
        if (v.is_required) {
          seededSelections[v.id] = v.options[0].value
        }
      }
    })

    set({ basePrice, baseCurrency, activeCurrency: baseCurrency, variants, selections: seededSelections })
  },

  setActiveCurrency: (currency) => set({ activeCurrency: currency }),
  setExchangeRates: (rates) => set({ exchangeRates: rates }),

  setSelection: (variantId, optionValue) => set((state) => ({
    selections: { ...state.selections, [variantId]: optionValue }
  })),

  setSelectedCustomer: (customerId) => set({ selectedCustomerId: customerId }),

  getTotalPrice: () => {
    const state = get()
    let total = Number(state.basePrice) || 0
    let fixedAdds = 0
    let multipliers = 1
    let percentages = 0

    state.variants.forEach(variant => {
      const selectedValue = state.selections[variant.id]
      if (selectedValue) {
        const option = variant.options?.find(o => o.value === selectedValue)
        if (option && option.price_effect) {
          const effect = option.price_effect
          if (effect.type === 'fixed') {
            fixedAdds += Number(effect.amount) || 0
          } else if (effect.type === 'multiplier') {
            multipliers *= Number(effect.amount) || 1
          } else if (effect.type === 'percentage') {
            percentages += Number(effect.amount) || 0
          }
        }
      }
    })

    total = total + fixedAdds
    total = total * multipliers
    total = total + (total * (percentages / 100))

    return safeRound(total)
  },

  getConvertedTotal: () => {
    const state = get()
    const rawTotal = state.getTotalPrice()
    const rate = Number(state.exchangeRates[state.activeCurrency]) || 1
    return safeRound(rawTotal * rate)
  }
}))

