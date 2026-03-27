'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FolderSymlink, Loader2 } from 'lucide-react';

export default function GroupsPage() {
  const [stats, setStats] = useState<{group: string | null, count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Bulking states
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [sourceGroup, setSourceGroup] = useState<string>('NONE');
  const [targetGroup, setTargetGroup] = useState<string>('');
  const [moving, setMoving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('participants').select('group');
    if (!error && data) {
      const counts: Record<string, number> = { 'NONE': 0 };
      const uniqueG = new Set<string>();

      data.forEach(p => {
        const gName = p.group || 'NONE';
        counts[gName] = (counts[gName] || 0) + 1;
        if (p.group) uniqueG.add(p.group);
      });
      
      const statsArray = Object.keys(counts).map(key => ({
        group: key === 'NONE' ? null : key,
        count: counts[key]
      })).sort((a, b) => (a.group || '').localeCompare(b.group || ''));

      setStats(statsArray);
      
      const groupsList = Array.from(uniqueG).sort();
      setAvailableGroups(groupsList);
      if (groupsList.length > 0 && sourceGroup === 'NONE' && counts['NONE'] === 0) {
        setSourceGroup(groupsList[0]);
      }
    }
    setLoading(false);
  };

  const handleBulkMove = async () => {
    const finalTargetGroup = targetGroup.trim() === '' ? 'NONE' : targetGroup.trim();

    if (sourceGroup === finalTargetGroup) {
      alert("Source and Target groups must be different");
      return;
    }

    if (!confirm(`Are you sure you want to move all participants from ${sourceGroup === 'NONE' ? 'No Group' : sourceGroup} to ${finalTargetGroup === 'NONE' ? 'No Group' : finalTargetGroup}?`)) return;

    setMoving(true);
    
    let query = supabase.from('participants').update({
      group: finalTargetGroup === 'NONE' ? null : finalTargetGroup
    });
    
    if (sourceGroup === 'NONE') {
      query = query.is('group', null);
    } else {
      query = query.eq('group', sourceGroup);
    }

    const { error } = await query;
    if (error) {
      alert("Failed to move participants: " + error.message);
    } else {
      fetchStats();
      setTargetGroup('');
      alert("Migration complete!");
    }
    
    setMoving(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Groups</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Statistics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center justify-between">
            Group Distribution
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-sm">{stats.length} Groups</span>
          </h2>
          
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {stats.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 transition-colors hover:bg-gray-100">
                  <div className="font-medium text-gray-700 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${s.group ? 'bg-indigo-500' : 'bg-gray-400'}`}></div>
                    {s.group ? s.group : 'No Group (None)'}
                  </div>
                  <div className="text-gray-900 font-bold bg-white px-3 py-1 rounded-md shadow-sm border border-gray-100">
                    {s.count}
                  </div>
                </div>
              ))}
              {stats.length === 0 && (
                <div className="text-center text-gray-500 py-8">No participants found.</div>
              )}
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-fit">
          <div className="flex items-center gap-2 mb-6 text-gray-800">
            <FolderSymlink size={20} className="text-gold-500" />
            <h2 className="text-lg font-semibold">Bulk Migrate Participants</h2>
          </div>
          
          <p className="text-sm text-gray-500 mb-6">
            Move all participants from one group to another at once. Useful for advancing winners to the next stage or cleaning up.
          </p>

          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Group (From)</label>
              <select
                value={sourceGroup}
                onChange={(e) => setSourceGroup(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="NONE">None (No Group)</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center py-2 text-gray-400">
              <FolderSymlink size={24} className="transform rotate-90 md:rotate-0" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Group (To)</label>
              <input
                type="text"
                list="target-group-opts"
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                placeholder="Type new group or leave blank for None"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gold-500"
              />
              <datalist id="target-group-opts">
                {availableGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </datalist>
            </div>
          </div>

          <button
            onClick={handleBulkMove}
            disabled={moving || loading || (sourceGroup === targetGroup)}
            className="w-full mt-8 bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {moving ? <Loader2 className="animate-spin" size={20} /> : <FolderSymlink size={20} />}
            Migrate Group
          </button>
        </div>

      </div>
    </div>
  );
}
