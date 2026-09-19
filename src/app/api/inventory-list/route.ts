import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: items, error } = await supabase
      .from('inventory')
      .select('id, item_name, sku, unit, stock_level, reserved_stock')
      .order('item_name')

    if (error) throw error

    return NextResponse.json({ items: items || [] })
  } catch (error: unknown) {
    return NextResponse.json({ items: [], error: getErrorMessage(error) }, { status: 500 })
  }
}
