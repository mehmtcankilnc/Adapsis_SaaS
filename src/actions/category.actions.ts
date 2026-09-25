'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─── Yeni Kategori Oluşturma (admin-only) ───
// Her şirket kendi ürün türüne göre serbestçe kategori açabilsin diye —
// ürün oluşturma/düzenleme formundaki "+ Yeni Kategori Ekle" akışından çağrılır.
export async function createCategoryAction(data: { name: string; description?: string }) {
  try {
    const { organizationId } = await assertAdmin()

    const name = data.name?.trim()
    if (!name || name.length < 2) {
      return { success: false, error: 'Kategori adı en az 2 karakter olmalıdır.' }
    }

    const supabase = await createClient()

    const baseSlug = slugify(name) || 'kategori'
    // categories.slug organizasyon başına UNIQUE — aynı isimle ikinci bir
    // kategori denenirse çarpışmayı önlemek için kısa bir sayısal sonek eklenir.
    let slug = baseSlug
    let attempt = 0
    while (attempt < 5) {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .eq('organization_id', organizationId)
        .maybeSingle()
      if (!existing) break
      attempt++
      slug = `${baseSlug}-${attempt + 1}`
    }

    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug,
        description: data.description?.trim() || null,
        is_active: true,
        organization_id: organizationId,
      })
      .select('id, name')
      .single()

    if (error) throw error

    revalidatePath('/admin/products')
    revalidatePath('/admin/products/new')
    return { success: true, category: newCategory }
  } catch (error: unknown) {
    console.error('createCategoryAction hatası:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
