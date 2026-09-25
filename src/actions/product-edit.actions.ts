'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth'
import { normalizeVariants } from '@/lib/variant-utils'
import { getErrorMessage } from '@/lib/utils'
import type { ProductVariant } from '@/types/product.types'

export async function getProductByIdAction(productId: string) {
  try {
    const supabase = await createClient()
    const { data: product, error } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', productId)
      .single()

    if (error) throw error
    return { success: true, data: product }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export interface UpdateProductInput {
  name: string
  sku?: string
  description?: string
  basePrice: number | string
  baseCurrency: string
  categoryId: string
  isActive?: boolean
  variants?: Partial<ProductVariant>[]
}

export async function updateProductAction(productId: string, data: UpdateProductInput) {
  try {
    const { organizationId } = await assertAdmin()
    const supabase = await createClient()

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return { success: false, error: 'Ürün adı zorunludur.' }
    }

    const basePrice = parseFloat(String(data.basePrice))
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return { success: false, error: 'Lütfen geçerli, sıfır veya pozitif bir taban fiyat girin.' }
    }

    const { error: productError } = await supabase
      .from('products')
      .update({
        name: data.name,
        sku: data.sku || null,
        description: data.description || null,
        base_price: basePrice,
        base_currency: data.baseCurrency,
        category_id: data.categoryId,
        is_active: data.isActive !== undefined ? data.isActive : true,
      })
      .eq('id', productId)

    if (productError) {
      console.error('Ürün Güncelleme Hatası:', productError)
      return { success: false, error: productError.message }
    }

    // Mevcut varyasyonları güncelle. `product_variants` tablosunda
    // (product_id, group_name) üzerinde UNIQUE kısıtlama var — bu yüzden
    // "önce tümünü sil, sonra ekle" (veri kaybı riski) ya da "önce ekle,
    // sonra sil" (grup adı değişmeden kalan gruplarda unique constraint
    // ihlali) yaklaşımlarının ikisi de sorunlu. Bunun yerine:
    // 1) Yeni listeyi (product_id, group_name) üzerinden UPSERT ederiz —
    //    değişmeyen/aynı isimli gruplar güncellenir, yeni gruplar eklenir.
    // 2) Sadece artık listede olmayan (kaldırılmış) eski grupları, önceden
    //    kaydedilmiş id'leri üzerinden sileriz.
    if (data.variants !== undefined) {
      const { data: oldVariants } = await supabase
        .from('product_variants')
        .select('id, group_name')
        .eq('product_id', productId)

      const normalizedVariants = normalizeVariants(data.variants || [])

      if (normalizedVariants.length > 0) {
        const variantsToUpsert = normalizedVariants.map((v, i: number) => ({
          product_id: productId,
          organization_id: organizationId,
          group_name: v.group_name || `Parametre ${i + 1}`,
          sort_order: v.sort_order || i,
          is_required: v.is_required !== undefined ? v.is_required : true,
          options: v.options || [],
        }))

        const { error: variantError } = await supabase
          .from('product_variants')
          .upsert(variantsToUpsert, { onConflict: 'product_id,group_name' })

        if (variantError) {
          console.error('Varyasyon Güncelleme Hatası:', variantError)
          return { success: false, error: variantError.message }
        }
      }

      const newGroupNames = new Set(
        normalizedVariants.map((v, i: number) => v.group_name || `Parametre ${i + 1}`),
      )
      const idsToDelete = (oldVariants || [])
        .filter((v) => !newGroupNames.has(v.group_name))
        .map((v) => v.id)

      if (idsToDelete.length > 0) {
        await supabase.from('product_variants').delete().in('id', idsToDelete)
      }
    }

    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${productId}/edit`)
    return { success: true }
  } catch (error: unknown) {
    console.error('Update Action Failed:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
