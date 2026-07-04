'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCategoriesAction() {
  try {
    const supabase = await createClient()
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
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createProductAction(data: any) {
  try {
    const supabase = await createClient()

    // UUID (Category ID) Validasyonu
    if (!data.categoryId || typeof data.categoryId !== 'string' || data.categoryId.trim() === '') {
      return { success: false, error: 'Ürünü kaydetmek için lütfen geçerli bir kategori seçin.' }
    }

    // 1. Insert main product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: data.name,
        sku: data.sku || null,
        description: data.description || null,
        base_price: parseFloat(data.basePrice),
        base_currency: data.baseCurrency,
        category_id: data.categoryId,
        is_active: true,
        stock_recipe: data.stockRecipe || [],
      })
      .select()
      .single()

    if (productError) {
      console.error('Ürün Kayıt Hatası:', productError)
      return { success: false, error: productError.message }
    }

    // 2. Insert variants
    if (data.variants && data.variants.length > 0) {
      const variantsToInsert = data.variants.map((v: any, i: number) => ({
        product_id: product.id,
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
  } catch (error: any) {
    console.error('Action Failed:', error)
    return { success: false, error: error.message }
  }
}
