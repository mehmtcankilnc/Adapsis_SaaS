'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'

export async function updateStockLevelAction(itemId: string, changeAmount: number) {
  try {
    await assertAdmin()
    const supabase = await createClient()

    // Anlık stoğu çek
    const { data: item, error: fetchErr } = await supabase
      .from('inventory')
      .select('stock_level')
      .eq('id', itemId)
      .single()
      
    if (fetchErr) throw fetchErr

    const newLevel = Number(item.stock_level) + Number(changeAmount)
    if (newLevel < 0) {
      return { success: false, error: 'Kritik Hata: Stok seviyesi 0\'ın altına düşemez.' }
    }

    const { error: updErr } = await supabase
      .from('inventory')
      .update({ stock_level: newLevel })
      .eq('id', itemId)
      
    if (updErr) throw updErr

    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) }
  }
}

export async function editInventoryItemAction(itemId: string, data: { item_name: string, sku: string, unit: string }) {
  try {
    await assertAdmin()
    const supabase = await createClient()

    const { error } = await supabase
      .from('inventory')
      .update({ 
        item_name: data.item_name, 
        sku: data.sku, 
        unit: data.unit 
      })
      .eq('id', itemId)
      
    if (error) throw error
    
    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) }
  }
}

export async function createInventoryItemAction(data: { item_name: string, sku: string, unit: string, stock_level: number }) {
  try {
    await assertAdmin()
    const supabase = await createClient()

    if (!data.item_name || !data.sku || !data.unit) {
      return { success: false, error: 'İsim, SKU ve Birim alanları zorunludur.' }
    }
    
    const { error } = await supabase
      .from('inventory')
      .insert([data])
      
    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Bu stok kodu (SKU) sistemde zaten mevcut.' }
      }
      throw error
    }
    
    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) }
  }
}
