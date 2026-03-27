import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { isAllGroups, targetGroups, count, category } = await req.json()

    // We use the service role client (admin client) to bypass RLS policies
    // This allows the public page to trigger the draw without needing full user auth,
    // though the endpoint should ideally be protected against abuse.
    const supabaseAdmin = createAdminClient()

    // 1. Validate Stock
    if (!category) {
      return NextResponse.json({ error: 'Kategori Hadiah harus dipilih' }, { status: 400 })
    }

    const { data: catData, error: catError } = await supabaseAdmin
      .from('winner_categories')
      .select('stock, group_allocations')
      .eq('name', category)
      .single()

    if (catError || !catData) {
      return NextResponse.json({ error: 'Kategori Hadiah tidak ditemukan' }, { status: 400 })
    }

    const actualCountToDraw = Math.min(count, catData.stock)

    if (actualCountToDraw < 1) {
      return NextResponse.json({ error: 'Stok Hadiah sudah habis!' }, { status: 400 })
    }

    let allocationPayload: any[] = [];
    const effectiveGroups = isAllGroups ? null : (targetGroups.length > 0 ? targetGroups : null);

    if (catData.group_allocations && catData.group_allocations.data && Object.keys(catData.group_allocations.data).length > 0) {
      const type = catData.group_allocations.type;
      const dataMap = catData.group_allocations.data;

      // 1. Get history of winners for this category to calculate remaining quotas
      const { data: logs } = await supabaseAdmin
        .from('winner_logs')
        .select('group')
        .eq('category', category)
        .eq('is_voided', false);

      const alreadyWonPerGroup: Record<string, number> = {};
      let totalAlreadyWon = 0;
      (logs || []).forEach(log => {
        if (log.group) {
          alreadyWonPerGroup[log.group] = (alreadyWonPerGroup[log.group] || 0) + 1;
          totalAlreadyWon++;
        }
      });

      const initialTotalStock = catData.stock + totalAlreadyWon;
      const remainingQuotas: Record<string, number> = {};
      let totalRemainingQuota = 0;

      // 2. Calculate Remaining Quotas with STRICT intersection
      const configuredGroups = Object.keys(dataMap);

      for (const grp of configuredGroups) {
        // Must be in global targets if global targets exist
        if (effectiveGroups && !effectiveGroups.includes(grp)) continue;

        let targetQuota = 0;
        if (type === 'fixed') {
          targetQuota = dataMap[grp] as number;
        } else if (type === 'percent') {
          targetQuota = Math.floor(((dataMap[grp] as number) / 100) * initialTotalStock);
        }

        const remaining = Math.max(0, targetQuota - (alreadyWonPerGroup[grp] || 0));
        // We track even 0-remaining groups if they are in the config, to keep them eligible for Opsi B later
        remainingQuotas[grp] = remaining;
        totalRemainingQuota += remaining;
      }

      // 3. Perform Weighted Random Selection
      const eligibleForThisCategory = Object.keys(remainingQuotas); // Only groups in config AND global targets

      if (eligibleForThisCategory.length === 0) {
        // return NextResponse.json({ error: 'Tidak ada grup yang memenuhi syarat (Periksa Target Filter vs Seting Kategori).' }, { status: 400 });
        return NextResponse.json({ error: 'Error' }, { status: 400 });

      }

      if (totalRemainingQuota > 0) {
        let tempRemainingQuotas = { ...remainingQuotas };
        let tempTotalRemaining = totalRemainingQuota;
        const selectedGroups: Record<string, number> = {};

        for (let i = 0; i < actualCountToDraw; i++) {
          if (tempTotalRemaining <= 0) break;

          let random = Math.random() * tempTotalRemaining;
          let cumulative = 0;
          let pickedGroup = '';

          for (const [grp, weight] of Object.entries(tempRemainingQuotas)) {
            cumulative += weight;
            if (random < cumulative) {
              pickedGroup = grp;
              break;
            }
          }

          if (pickedGroup) {
            selectedGroups[pickedGroup] = (selectedGroups[pickedGroup] || 0) + 1;
            tempRemainingQuotas[pickedGroup]--;
            tempTotalRemaining--;
          }
        }

        for (const [grp, countNum] of Object.entries(selectedGroups)) {
          allocationPayload.push({ groups: [grp], count: countNum });
        }

        // Residue logic (Opsi B - Strict): fill remaining SLOTS using only groups from THIS category config
        const currentAllocatedTotal = allocationPayload.reduce((s, a) => s + a.count, 0);
        const diff = actualCountToDraw - currentAllocatedTotal;
        if (diff > 0) {
          allocationPayload.push({ groups: eligibleForThisCategory, count: diff });
        }
      } else {
        // All quotas exhausted? Fill remainder strictly from configured groups
        allocationPayload.push({ groups: eligibleForThisCategory, count: actualCountToDraw });
      }
    } else {
      // Standard draw fallback (Category has NO specific group rules defined)
      if (effectiveGroups) {
        allocationPayload.push({ groups: effectiveGroups, count: actualCountToDraw });
      } else {
        allocationPayload.push({ groups: [], count: actualCountToDraw });
      }
    }

    const { data: session } = await supabaseAdmin.auth.getSession()

    const { data, error } = await supabaseAdmin.rpc('select_winners_advanced', {
      p_allocations: allocationPayload,
      p_category: category || null
    })

    if (error) {
      console.error('Database error in select_winners_advanced:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rawWinners = data || [];
    const shuffledWinners = rawWinners.sort(() => Math.random() - 0.5);

    const formattedWinners = shuffledWinners.map((w: any) => ({
      id: w.id,
      name: w.winner_name,
      group: w.winner_group
    }))

    return NextResponse.json({ winners: formattedWinners })
  } catch (err: any) {
    console.error('API error in /api/draw/select:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
