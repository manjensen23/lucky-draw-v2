'use client';

import { WinnerLog } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Trash2, X, History, Loader2, Download } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WinnerHistoryProps {
  onClose: () => void;
}

export default function WinnerHistory({ onClose }: WinnerHistoryProps) {
  const [logs, setLogs] = useState<WinnerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('winner_logs')
      .select('*')
      .order('drawn_at', { ascending: false });

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  // const clearHistory = async () => {
  //   if (!confirm('Are you sure you want to permanently delete all winner history?')) return;

  //   setClearing(true);
  //   const supabase = createClient();
  //   const { error } = await supabase.from('winner_logs').delete().neq('id', 0); // deletes all
  //   if (!error) {
  //     setLogs([]);
  //   }
  //   setClearing(false);
  // };

  const exportCsv = () => {
    let csv = "ID,Batch ID,Drawn At,Prize Category,Winner Name,Target Group,Status\n";
    logs.forEach(log => {
      const status = log.is_voided ? "HANGUS" : "SAH";
      const cat = (log.category || "").replace(/"/g, '""');
      const group = (log.group || "").replace(/"/g, '""');
      const name = (log.winner_name || "").replace(/"/g, '""');
      csv += `${log.id},${log.batch_id},"${log.drawn_at}","${cat}","${name}","${group}",${status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `winner_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group logs by batch_id so we can display them together based on their draw category
  const groupedLogs = logs.reduce((acc, log) => {
    if (!acc[log.batch_id]) {
      acc[log.batch_id] = {
        winner_count: log.winner_count,
        drawn_at: log.drawn_at,
        category: log.category,
        winners: []
      };
    }
    acc[log.batch_id].winners.push(log);
    return acc;
  }, {} as Record<string, { winner_count: number, drawn_at: string, category?: string | null, winners: WinnerLog[] }>);

  // Sort groups by time (descending)
  const sortedBatches = Object.values(groupedLogs).sort((a, b) =>
    new Date(b.drawn_at).getTime() - new Date(a.drawn_at).getTime()
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div
        className="bg-gray-800 border border-white/20 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-gold-500/20 p-2 rounded-xl">
              <History className="text-gold-400" size={24} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">Winner History</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p>Loading records...</p>
            </div>
          ) : sortedBatches.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <History size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg">No winners have been drawn yet.</p>
            </div>
          ) : (
            sortedBatches.map((batch, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-black/20 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                  <span className="text-gold-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gold-500"></span>
                    {batch.category ? `${batch.category} (${batch.winner_count} Pemenang)` : `${batch.winner_count} Pemenang`}
                  </span>
                  <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded">
                    {new Date(batch.drawn_at).toLocaleString()}
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {batch.winners.map(w => (
                    <div key={w.id} className={`bg-white/5 px-4 py-3 rounded-xl flex items-center justify-between gap-3 hover:bg-white/10 transition-colors ${w.is_voided ? 'opacity-50 grayscale' : ''}`}>
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-yellow-600 flex items-center justify-center text-black font-bold text-sm shrink-0">
                          #
                        </div>
                        <div className="truncate">
                          <div className={`font-bold truncate ${w.is_voided ? 'text-gray-400 line-through' : 'text-white'}`}>{w.winner_name}</div>
                          {w.group && (
                            <div className="text-xs text-gray-400 truncate">{w.group}</div>
                          )}
                        </div>
                      </div>
                      {w.is_voided && (
                        <div className="bg-red-500/20 text-red-500 border border-red-500/30 text-[10px] font-black uppercase px-2 py-1 rounded shrink-0">
                          HANGUS
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {sortedBatches.length > 0 && (
          <div className="px-6 py-4 border-t border-white/10 bg-gray-900/50 flex flex-col sm:flex-row gap-4 justify-between">
            <button
              onClick={exportCsv}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/10 text-green-400 font-medium hover:bg-green-500/20 active:scale-95 transition-all w-full sm:w-auto"
            >
              <Download size={18} />
              Export CSV
            </button>

          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
