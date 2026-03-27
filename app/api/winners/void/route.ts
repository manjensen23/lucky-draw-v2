import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { log_id, category } = await req.json()
    const supabaseAdmin = createAdminClient()

    // Flag log as voided
    const { error: voidError } = await supabaseAdmin
      .from('winner_logs')
      .update({ is_voided: true })
      .eq('id', log_id)

    if (voidError) throw voidError

    // Increment stock
    if (category) {
      const { data: catData } = await supabaseAdmin.from('winner_categories').select('stock').eq('name', category).single()
      if (catData) {
        await supabaseAdmin.from('winner_categories')
          .update({ stock: catData.stock + 1 })
          .eq('name', category)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
