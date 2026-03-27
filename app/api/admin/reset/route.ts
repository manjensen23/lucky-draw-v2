import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch (e) {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if user is admin
    const adminClient = createAdminClient()
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || roleData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 403 })
    }

    // 1. Delete all winner logs
    const { error: deleteError } = await adminClient
      .from('winner_logs')
      .delete()
      .neq('id', 0) // Delete all

    if (deleteError) throw deleteError

    // 2. Reset stocks to initial_stock
    const { data: categories } = await adminClient
      .from('winner_categories')
      .select('id, initial_stock')

    if (categories) {
      for (const cat of categories) {
        await adminClient
          .from('winner_categories')
          .update({ stock: cat.initial_stock })
          .eq('id', cat.id)
      }
    }

    return NextResponse.json({ message: 'Lucky draw has been reset successfully' })
  } catch (err: any) {
    console.error('Reset error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
