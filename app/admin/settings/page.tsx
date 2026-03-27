'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings as SettingsType } from '@/types';
import { Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);

  // Form states
  const [winnerCount, setWinnerCount] = useState<number>(1);
  const [isAllGroups, setIsAllGroups] = useState<boolean>(true);
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [animationSpeed, setAnimationSpeed] = useState<number>(100);
  const [showWinnerGroup, setShowWinnerGroup] = useState<boolean>(true);
  const [drawDuration, setDrawDuration] = useState<number>(3000);
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Settings
    const { data: setts } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (setts) {
      setSettings(setts);
      setWinnerCount(setts.winner_count);
      // Fallback for older data reading pattern
      if (setts.is_all_groups !== undefined) {
        setIsAllGroups(setts.is_all_groups);
        setTargetGroups(setts.target_groups || []);
      } else {
        setIsAllGroups(setts.target_group === 'ALL');
        setTargetGroups(setts.target_group === 'ALL' ? [] : [setts.target_group]);
      }
      setAnimationSpeed(setts.animation_speed);
      setShowWinnerGroup(setts.show_winner_group ?? true);
      setDrawDuration(setts.draw_duration ?? 3000);
      setBackgroundUrl(setts.background_url || '');
    }

    // Fetch Unique Groups
    const { data: participantsData } = await supabase.from('participants').select('group');
    if (participantsData) {
      const uniqueGroups = Array.from(new Set(participantsData.map(p => p.group).filter(Boolean))) as string[];
      setAvailableGroups(uniqueGroups.sort());
    }

    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    if (winnerCount < 1) {
      alert("Winner count must be at least 1");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('settings')
      .update({
        winner_count: winnerCount,
        is_all_groups: isAllGroups,
        target_groups: targetGroups,
        // keep legacy field working if something else expects it, though unused now.
        target_group: isAllGroups ? 'ALL' : (targetGroups[0] || 'ALL'),
        animation_speed: animationSpeed,
        show_winner_group: showWinnerGroup,
        draw_duration: drawDuration,
        background_url: backgroundUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      alert('Failed to save settings: ' + error.message);
    } else {
      await fetchData();
      alert('Settings updated successfully!');
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={48} />
      </div>
    );
  }

  // Deduplicate and combine ALL with dynamic groups
  const groupOptions = ['ALL', ...availableGroups];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Draw Settings</h1>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative pb-20">
        <div className="p-8 space-y-8">
          
          {/* Winner Count */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Number of Winners per Draw
            </label>
            <p className="text-sm text-gray-500 mb-4">
              How many participants will be selected when the draw finishes?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <input
                type="number"
                min="1"
                value={winnerCount}
                onChange={(e) => setWinnerCount(parseInt(e.target.value) || 1)}
                className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500 outline-none"
              />
              {settings && winnerCount !== settings.winner_count && (
                <button type="submit" disabled={saving} className="bg-gold-500 text-gray-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gold-400 animate-in fade-in zoom-in duration-300 shrink-0">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
                </button>
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Target Group */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-900">
                Target Groups
              </label>
              
              {/* Toggle Target All Groups */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Select ALL Groups</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isAllGroups}
                    onChange={(e) => setIsAllGroups(e.target.checked)}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${isAllGroups ? 'bg-gold-500' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAllGroups ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              {isAllGroups 
                ? "All participants from every group will be included. Group selections below are disabled." 
                : "Select one or more specific groups to be included in the draw."}
            </p>
            
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-300 ${isAllGroups ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {!isAllGroups && availableGroups.length === 0 && (
                <div className="col-span-full text-sm text-gray-400 italic">No groups found in your participant list.</div>
              )}
              {availableGroups.map((opt) => (
                <label 
                  key={opt}
                  className={`
                    border rounded-xl p-4 flex items-center justify-center cursor-pointer transition-all text-center select-none
                    ${targetGroups.includes(opt) ? 'border-gold-500 bg-gold-50 text-gold-700 font-bold shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}
                  `}
                >
                  <input
                    type="checkbox"
                    value={opt}
                    checked={targetGroups.includes(opt)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetGroups([...targetGroups, opt]);
                      } else {
                        setTargetGroups(targetGroups.filter(g => g !== opt));
                      }
                    }}
                    className="sr-only"
                  />
                  Group {opt}
                </label>
              ))}
            </div>
            {!isAllGroups && targetGroups.length === 0 && availableGroups.length > 0 && (
              <p className="mt-3 text-sm text-red-500 font-medium">Please select at least one group, otherwise no one will be drawn.</p>
            )}

            {settings && (
              isAllGroups !== (settings.is_all_groups ?? (settings.target_group === 'ALL')) ||
              JSON.stringify([...targetGroups].sort()) !== JSON.stringify([...(settings.target_groups || (settings.target_group === 'ALL' ? [] : [settings.target_group]))].sort())
            ) && (
              <div className="mt-4 animate-in fade-in zoom-in duration-300">
                <button type="submit" disabled={saving} className="bg-gold-500 text-gray-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gold-400 w-full sm:w-auto justify-center">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Target Group
                </button>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />
          
          {/* Draw Duration (Auto-stop) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Auto-stop Duration (Seconds)
            </label>
            <p className="text-sm text-gray-500 mb-4">
              How long should the randomizing animation run before automatically picking the winner?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <input
                type="number"
                min="1"
                max="60"
                value={drawDuration / 1000}
                onChange={(e) => setDrawDuration((parseInt(e.target.value) || 3) * 1000)}
                className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500 outline-none"
              />
              {settings && drawDuration !== (settings.draw_duration ?? 3000) && (
                <button type="submit" disabled={saving} className="bg-gold-500 text-gray-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gold-400 animate-in fade-in zoom-in duration-300 shrink-0">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
                </button>
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Animation Speed */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Animation Speed
            </label>
            <p className="text-sm text-gray-500 mb-4">
              How fast should the names swap during the drawing animation?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Slow', value: 200, desc: 'Easier to read passing names' },
                { label: 'Medium', value: 100, desc: 'Balanced visual effect' },
                { label: 'Fast', value: 50, desc: 'Rapid spinning blur' }
              ].map((opt) => (
                <label 
                  key={opt.value}
                  className={`
                    border rounded-xl p-4 cursor-pointer transition-all
                    ${animationSpeed === opt.value ? 'border-gold-500 bg-gold-50' : 'border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="animSpeed"
                      value={opt.value}
                      checked={animationSpeed === opt.value}
                      onChange={() => setAnimationSpeed(opt.value)}
                      className="w-4 h-4 text-gold-600 focus:ring-gold-500 cursor-pointer"
                    />
                    <div>
                      <span className={`block font-semibold ${animationSpeed === opt.value ? 'text-gold-700' : 'text-gray-900'}`}>{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.desc}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {settings && animationSpeed !== settings.animation_speed && (
              <div className="mt-4 animate-in fade-in zoom-in duration-300">
                <button type="submit" disabled={saving} className="bg-gold-500 text-gray-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gold-400 w-full sm:w-auto justify-center">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Kecepatan
                </button>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Show Winner Group */}
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="block text-sm font-semibold text-gray-900 mb-1">
                  Show Group Name on Winner Display
                </span>
                <span className="text-sm text-gray-500">
                  Toggle whether the group name appears under the winner's name.
                </span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={showWinnerGroup}
                  onChange={(e) => setShowWinnerGroup(e.target.checked)}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${showWinnerGroup ? 'bg-gold-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showWinnerGroup ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </label>
            {settings && showWinnerGroup !== (settings.show_winner_group ?? true) && (
              <div className="mt-6 animate-in fade-in zoom-in duration-300">
                <button type="submit" disabled={saving} className="bg-gold-500 text-gray-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gold-400 w-full sm:w-auto justify-center">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Tampilan
                </button>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />
          
          {/* Background URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Background Image URL
            </label>
            <p className="text-sm text-gray-500 mb-4">
              Enter an image URL to replace the default background on the Draw page. Leave empty for default.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={backgroundUrl}
                onChange={(e) => setBackgroundUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500 outline-none"
              />
              {settings && backgroundUrl !== (settings.background_url || '') && (
                <button type="submit" disabled={saving} className="bg-gold-500 text-gray-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gold-400 animate-in fade-in zoom-in duration-300 shrink-0">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
                </button>
              )}
            </div>
            {backgroundUrl && (
              <div className="mt-4 p-4 border rounded-xl overflow-hidden relative w-full h-32 bg-gray-100 flex items-center justify-center">
                <img src={backgroundUrl} alt="Background Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <span className="relative z-10 text-gray-800 font-bold bg-white/80 px-3 py-1 rounded">Preview</span>
              </div>
            )}
          </div>

        </div>

        <div className="bg-gray-50 p-6 flex items-center justify-end border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 shadow-md shadow-gray-900/10 flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
