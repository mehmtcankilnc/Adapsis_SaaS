'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth'
import { normalizeVariants } from '@/lib/variant-utils'
import { getErrorMessage } from '@/lib/utils'
import type { ProductVariant, StockRecipeItem } from '@/types/product.types'

export async function getCategoriesAction() {
  try {
    const supabase = await createClient()
    // RLS zaten organization_id = get_my_org_id() ile filtreliyor; ekstra
    // .eq gerekmiyor, ama okunabilirlik için burada not düşülüyor.
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      console.error('Kategori çekme hatası:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: categories }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export interface CreateProductInput {
  categoryId: string
  name: string
  sku?: string
  description?: string
  basePrice: number | string
  baseCurrency: string
  variants?: Partial<ProductVariant>[]
  stockRecipe?: StockRecipeItem[]
}

export async function createProductAction(data: CreateProductInput) {
  try {
    const { organizationId } = await assertAdmin()
    const supabase = await createClient()

    // UUID (Category ID) Validasyonu
    if (!data.categoryId || typeof data.categoryId !== 'string' || data.categoryId.trim() === '') {
      return { success: false, error: 'Ürünü kaydetmek için lütfen geçerli bir kategori seçin.' }
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return { success: false, error: 'Ürün adı zorunludur.' }
    }

    const basePrice = parseFloat(String(data.basePrice))
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return { success: false, error: 'Lütfen geçerli, sıfır veya pozitif bir taban fiyat girin.' }
    }

    // 1. Insert main product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: data.name,
        sku: data.sku || null,
        description: data.description || null,
        base_price: basePrice,
        base_currency: data.baseCurrency,
        category_id: data.categoryId,
        is_active: true,
        stock_recipe: data.stockRecipe || [],
        organization_id: organizationId,
      })
      .select()
      .single()

    if (productError) {
      console.error('Ürün Kayıt Hatası:', productError)
      return { success: false, error: productError.message }
    }

    // 2. Insert variants
    if (data.variants && data.variants.length > 0) {
      const normalizedVariants = normalizeVariants(data.variants)
      const variantsToInsert = normalizedVariants.map((v, i: number) => ({
        product_id: product.id,
        organization_id: organizationId,
        group_name: v.group_name || `Parametre ${i+1}`,
        sort_order: v.sort_order || i,
        is_required: v.is_required !== undefined ? v.is_required : true,
        options: v.options || []
      }))

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantsToInsert)

      if (variantError) {
        console.error('Varyasyon Kayıt Hatası:', variantError)
        // Eğer varyasyon hata verirse yarım kalmaması için ana ürünü de silebilirdik ama MVP için hata dönüyoruz.
        return { success: false, error: variantError.message }
      }
    }

    revalidatePath('/admin/products')
    return { success: true, data: product }
  } catch (error: unknown) {
    console.error('Action Failed:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
