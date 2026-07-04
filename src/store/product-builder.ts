import { create } from 'zustand'
import { ProductVariant, VariantOption, PriceEffectType } from '@/types/product.types'

export interface BuilderState {
  name: string
  sku: string
  description: string
  categoryId: string
  basePrice: number
  baseCurrency: string
  variants: Partial<ProductVariant>[]
  
  setBaseInfo: (info: Partial<Omit<BuilderState, 'variants' | 'setBaseInfo' | 'addVariantGroup' | 'updateVariantGroup' | 'removeVariantGroup' | 'addOption' | 'updateOption' | 'removeOption' | 'reset'>>) => void
  addVariantGroup: () => void
  updateVariantGroup: (index: number, data: Partial<ProductVariant>) => void
  removeVariantGroup: (index: number) => void
  addOption: (groupIndex: number) => void
  updateOption: (groupIndex: number, optionIndex: number, data: Partial<VariantOption>) => void
  removeOption: (groupIndex: number, optionIndex: number) => void
  reset: () => void
}

const emptyOption: VariantOption = {
  label: '',
  value: '',
  price_effect: { type: 'fixed', amount: 0 },
  is_default: false
}

export const useProductBuilderStore = create<BuilderState>((set) => ({
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  basePrice: 0,
  baseCurrency: 'USD',
  variants: [],

  setBaseInfo: (info) => set((state) => ({ ...state, ...info })),

  addVariantGroup: () => set((state) => ({
    variants: [
      ...state.variants,
      {
        group_name: '',
        is_required: true,
        sort_order: state.variants.length,
        options: [{...emptyOption}]
      }
    ]
  })),

  updateVariantGroup: (index, data) => set((state) => {
    const newVariants = [...state.variants]
    newVariants[index] = { ...newVariants[index], ...data }
    return { variants: newVariants }
  }),

  removeVariantGroup: (index) => set((state) => {
    const newVariants = [...state.variants]
    newVariants.splice(index, 1)
    return { variants: newVariants }
  }),

  addOption: (groupIndex) => set((state) => {
    const newVariants = [...state.variants]
    const group = newVariants[groupIndex]
    if (!group) return state
    
    group.options = [...(group.options || []), {...emptyOption}]
    return { variants: newVariants }
  }),

  updateOption: (groupIndex, optionIndex, data) => set((state) => {
    const newVariants = [...state.variants]
    const group = newVariants[groupIndex]
    if (!group || !group.options) return state

    const newOptions = [...group.options]
    newOptions[optionIndex] = { ...newOptions[optionIndex], ...data }
    group.options = newOptions

    return { variants: newVariants }
  }),

  removeOption: (groupIndex, optionIndex) => set((state) => {
    const newVariants = [...state.variants]
    const group = newVariants[groupIndex]
    if (!group || !group.options) return state

    const newOptions = [...group.options]
    newOptions.splice(optionIndex, 1)
    group.options = newOptions

    return { variants: newVariants }
  }),

  reset: () => set({
    name: '', sku: '', description: '', categoryId: '', basePrice: 0, baseCurrency: 'USD', variants: []
  })
}))
