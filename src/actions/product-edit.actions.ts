'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateProductAction(productId: string, data: any) {
  try {
    const supabase = await createClient()

    const { error: productError } = await supabase
      .from('products')
      .update({
        name: data.name,
        sku: data.sku || null,
        description: data.description || null,
        base_price: parseFloat(data.basePrice),
        base_currency: data.baseCurrency,
        category_id: data.categoryId,
        is_active: data.isActive !== undefined ? data.isActive : true,
      })
      .eq('id', productId)

    if (productError) {
      console.error('Ürün Güncelleme Hatası:', productError)
      return { success: false, error: productError.message }
    }

    // Mevcut varyasyonları sil ve yenilerini ekle (upsert yerine temiz yaklaşım)
    if (data.variants !== undefined) {
      // Önce mevcut varyasyonları sil
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId)

      // Yenilerini ekle
      if (data.variants && data.variants.length > 0) {
        const variantsToInsert = data.variants.map((v: any, i: number) => ({
          product_id: productId,
          group_name: v.group_name || `Parametre ${i + 1}`,
          sort_order: v.sort_order || i,
          is_required: v.is_required !== undefined ? v.is_required : true,
          options: v.options || [],
        }))

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantsToInsert)

        if (variantError) {
          console.error('Varyasyon Güncelleme Hatası:', variantError)
          return { success: false, error: variantError.message }
        }
      }
    }

    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${productId}/edit`)
    return { success: true }
  } catch (error: any) {
    console.error('Update Action Failed:', error)
    return { success: false, error: error.message }
  }
}
