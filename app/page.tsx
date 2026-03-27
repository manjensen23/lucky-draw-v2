'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, Participant, Winner } from '@/types';
import DrawAnimation from '@/components/public/DrawAnimation';
import WinnerDisplay from '@/components/public/WinnerDisplay';
import WinnerHistory from '@/components/public/WinnerHistory';
import { History, LogOut, Trash2 } from 'lucide-react';

export default function Home() {
  const [settings, setSettings] = useState<Settings | null>(null);

  // participants holds ONLY the eligible participants for the current draw
  const [participants, setParticipants] = useState<Participant[]>([]);
  // allParticipants holds everyone to display the total count in footer
  const [totalParticipants, setTotalParticipants] = useState<number>(0);

  const [winners, setWinners] = useState<Winner[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingFinished, setDrawingFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Per-draw settings
  const [categories, setCategories] = useState<{ id: number, name: string, stock: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [winnerCountOverride, setWinnerCountOverride] = useState<number | null>(null);

  const supabase = createClient();
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchInitialData();

    // Subscribe to settings changes
    const settingsChannel = supabase
      .channel('public:settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'settings', filter: 'id=eq.1' },
        () => {
          fetchInitialData();
        }
      )
      .subscribe();

    // Subscribe to category/prize changes (real-time stock & reset)
    const categoriesChannel = supabase
      .channel('categories-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'winner_categories' },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    // Subscribe to winner logs changes (reset / manual deletes / new wins)
    const logsChannel = supabase
      .channel('logs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'winner_logs' },
        () => {
          // IMPORTANT: When a winner is logged or logs are cleared (reset), 
          // we must re-evaluate participants and categories immediately.
          fetchInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(logsChannel);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, []);

  const fetchCategories = async () => {
    const { data: catData } = await supabase.from('winner_categories').select('*').order('name');
    if (catData) setCategories(catData);
  };

  const fetchInitialData = async () => {
    const { data: setts, error: err } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (err) {
      console.error('Error fetching settings:', err);
      return;
    }

    fetchCategories();

    setSettings(setts);

    // Fallback if settings don't have new shape yet
    fetchParticipants(
      setts.is_all_groups ?? (setts.target_group === 'ALL'),
      setts.target_groups ?? (setts.target_group === 'ALL' ? [] : [setts.target_group])
    );
  };

  const fetchParticipants = async (isAllGroups: boolean, targetGroups: string[]) => {
    try {
      // 1. Fetch eligible people from the database view
      // This view already excludes all people from winner_logs (any status)
      let query = supabase.from('v_eligible_participants').select('*');
      
      if (!isAllGroups) {
        if (targetGroups.length > 0) {
          query = query.in('group', targetGroups);
        } else {
          query = query.eq('group', 'UNMATCHABLE_GROUP_FLAG_xyz');
        }
      }
      
      const { data: eligibleData, error: pError } = await query.limit(1000);
      if (!pError && eligibleData) {
        setParticipants(eligibleData);
      }

      // 2. Fetch the ACCURATE count of all eligible participants across all groups
      const { count, error: countError } = await supabase
        .from('v_eligible_participants')
        .select('*', { count: 'exact', head: true });
      
      if (!countError && count !== null) {
        setTotalParticipants(count);
      }
    } catch (err) {
      console.error('Error fetching participants from view:', err);
    }
  };

  // Called manually by the button or automatically by the timer to stop
  const stopDraw = async (currentSettings: Settings) => {
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    setIsDrawing(false);

    try {
      const res = await fetch('/api/draw/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAllGroups: currentSettings.is_all_groups ?? (currentSettings.target_group === 'ALL'),
          targetGroups: currentSettings.target_groups ?? [currentSettings.target_group],
          count: winnerCountOverride !== null ? winnerCountOverride : currentSettings.winner_count,
          category: selectedCategory || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to select winners');

      setWinners(data.winners);
      setDrawingFinished(true);

      // Remove the winner(s) from local eligible state and update total
      const winnerNames = data.winners.map((w: Winner) => w.name);
      setParticipants(prev => prev.filter(p => !winnerNames.includes(p.name)));
      setTotalParticipants(prev => Math.max(0, prev - data.winners.length));

    } catch (err: any) {
      setError(err.message);
    }
  };

  const startDraw = () => {
    if (!settings) return;
    setError(null);
    setDrawingFinished(false);
    setWinners([]);
    setIsDrawing(true);

    // Auto-stop after configured duration
    const duration = settings.draw_duration || 3000;
    stopTimeoutRef.current = setTimeout(() => {
      stopDraw(settings);
    }, duration);
  };

  const toggleDraw = () => {
    if (isDrawing) {
      // Manual interrupt
      if (settings) stopDraw(settings);
    } else {
      startDraw();
    }
  };


  const handleVoidWinner = async (winnerId: number) => {
    const res = await fetch('/api/winners/void', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: winnerId, category: selectedCategory })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Refresh categories to update stock manually
    fetchCategories();
  };

  const resetDraw = () => {
    setDrawingFinished(false);
    setWinners([]);
    fetchCategories();
  };

  if (!settings) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full"></div></div>;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 lg:p-8 overflow-hidden relative">
      {/* Dynamic Background */}
      <div
        className={`absolute inset-0 z-0 ${settings.background_url ? '' : 'bg-gradient-to-br from-gray-900 to-gray-800'}`}
        style={settings.background_url ? {
          backgroundImage: `url('${settings.background_url}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#111827'
        } : undefined}
      >
        {settings.background_url && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
        )}
      </div>

      {/* Top right buttons */}
      <div className="absolute top-4 right-4 lg:top-6 lg:right-6 z-50 flex items-center gap-3">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 backdrop-blur-md text-red-100 px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          <LogOut size={15} />
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          <History size={15} />
        </button>
      </div>

      {showHistory && (
        <WinnerHistory onClose={() => setShowHistory(false)} />
      )}

      <div className="relative z-10 w-full flex flex-col items-center justify-center max-w-[1920px] mx-auto h-full">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-yellow-200 tracking-wider mb-4 lg:mb-8 drop-shadow-2xl text-center">
          UNDIAN DOORPRIZE
        </h1>


        <div className="w-full max-w-8xl flex-1 min-h-[300px] lg:min-h-[400px] flex flex-col items-center justify-center relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6 lg:p-12 shadow-2xl">
          {error && (
            <div className="absolute top-4 bg-red-500/80 text-white px-4 py-2 rounded-lg z-50">
              Error: {error}
            </div>
          )}

          {!drawingFinished && (
            <DrawAnimation
              isDrawing={isDrawing}
              participants={participants}
              speed={settings.animation_speed}
            />
          )}

          {drawingFinished && (
            <WinnerDisplay winners={winners} showGroup={settings.show_winner_group} onVoidWinner={handleVoidWinner} />
          )}

        </div>

        <div className="mt-6 lg:mt-8 space-y-6 flex flex-col items-center w-full max-w-5xl">
          {!isDrawing && !drawingFinished && (
            <div className="w-full bg-black/40 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-center justify-between shadow-2xl z-10 transition-all">
              <div className="flex-1 w-full">
                <label className="block text-gold-300 text-sm font-bold tracking-wider mb-3 uppercase">Kategori Hadiah <span className="text-red-400">*wajib</span></label>
                <div className="flex gap-3">
                  <select
                    className="flex-1 bg-gray-900 border border-white/10 text-white rounded-xl px-5 py-3 focus:border-gold-400 focus:ring-1 focus:ring-gold-400 outline-none appearance-none font-medium shadow-inner transition-colors"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">-- Pilih Hadiah --</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name} (Sisa: {c.stock})</option>)}
                  </select>
                </div>
              </div>

              <div className="w-full md:w-56">
                <label className="block text-gold-300 text-sm font-bold tracking-wider mb-3 uppercase">Jumlah Pemenang</label>
                <input
                  type="number"
                  min="1"
                  max={categories.find(c => c.name === selectedCategory)?.stock || undefined}
                  value={winnerCountOverride !== null ? winnerCountOverride : settings.winner_count}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const maxStock = categories.find(c => c.name === selectedCategory)?.stock || 9999;
                    setWinnerCountOverride(isNaN(val) ? 1 : Math.min(Math.max(1, val), maxStock));
                  }}
                  className="w-full bg-gray-900 border border-white/10 text-white rounded-xl px-5 py-3 focus:border-gold-400 focus:ring-1 focus:ring-gold-400 outline-none font-bold text-center text-xl shadow-inner transition-colors"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col items-center space-y-4">
            {participants.length === 0 && !drawingFinished ? (
              <div className="text-2xl font-bold rounded-full bg-gray-800/80 text-gray-400 px-12 py-4 shadow-inner border border-white/5">
                TIDAK ADA PARTISIPAN
              </div>
            ) : (
              !drawingFinished ? (
                <button
                  onClick={toggleDraw}
                  disabled={!selectedCategory && !isDrawing}
                  className={`text-3xl font-bold rounded-full px-20 py-6 transition-all transform z-20 hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(255,215,0,0.15)] ${!selectedCategory && !isDrawing
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-none hover:scale-100 hover:shadow-none pointer-events-none opacity-80 border-4 border-gray-700'
                    : isDrawing
                      ? 'bg-red-500 text-white shadow-red-500/50'
                      : 'bg-gradient-to-r from-gold-400 to-yellow-300 hover:from-gold-300 hover:to-yellow-200 text-gray-900 shadow-gold-500/30'
                    }`}
                >
                  {!selectedCategory && !isDrawing ? 'PILIH HADIAH DULU' : (isDrawing ? 'STOP UNDIAN' : 'MULAI UNDIAN')}
                </button>
              ) : (
                <button
                  onClick={resetDraw}
                  className="text-2xl font-bold bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white rounded-full px-16 py-5 transition-all hover:scale-105 active:scale-95 shadow-xl"
                >
                  KEMBALI KE PENGATURAN
                </button>
              )
            )}
          </div>

          <div className="text-gray-300 font-medium tracking-wide bg-black/40 px-6 py-2 rounded-full backdrop-blur-md">
            Total Partisipan: <span className="text-white font-bold">{totalParticipants}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
