import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: items, error } = await supabase
      .from('inventory')
      .select('id, item_name, sku, unit, stock_level, reserved_stock')
      .order('item_name')

    if (error) throw error

    return NextResponse.json({ items: items || [] })
  } catch (error: any) {
    return NextResponse.json({ items: [], error: error.message }, { status: 500 })
  }
}
