'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Participant } from '@/types';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [filterGroup, setFilterGroup] = useState<string>('ALL');
  
  // Single Add Form
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<string>('');

  // Bulk Add Form
  const [bulkNames, setBulkNames] = useState('');
  const [bulkGroup, setBulkGroup] = useState<string>('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [adding, setAdding] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchParticipants();
  }, [filterGroup]);

  const fetchParticipants = async () => {
    setLoading(true);
    
    // Fetch unique groups for filters and suggestions
    const { data: groupData } = await supabase.from('participants').select('group');
    if (groupData) {
      const groups = Array.from(new Set(groupData.map(p => p.group).filter(Boolean))) as string[];
      setAvailableGroups(groups.sort());
    }

    // Fetch participants list
    let query = supabase.from('participants').select('*').order('created_at', { ascending: false });
    
    if (filterGroup !== 'ALL') {
      if (filterGroup === 'NONE') {
        query = query.is('group', null);
      } else {
        query = query.eq('group', filterGroup);
      }
    }

    const { data, error } = await query;
    if (!error && data) {
      setParticipants(data);
    }
    setLoading(false);
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setAdding(true);
    const groupValue = newGroup.trim() === '' ? null : newGroup.trim();

    const { error } = await supabase
      .from('participants')
      .insert([{ name: newName.trim(), group: groupValue }]);

    if (!error) {
      setNewName('');
      fetchParticipants();
    } else {
      alert('Error adding participant: ' + error.message);
    }
    setAdding(false);
  };

  const handleAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkNames.trim()) return;

    setAdding(true);
    const groupValue = bulkGroup.trim() === '' ? null : bulkGroup.trim();
    
    // Split by actual newline (Enter) and remove empty lines
    const names = bulkNames.split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) {
      setAdding(false);
      return;
    }

    const payload = names.map(name => ({
      name,
      group: groupValue
    }));

    const { error } = await supabase
      .from('participants')
      .insert(payload);

    if (!error) {
      setBulkNames('');
      fetchParticipants();
      setIsBulkMode(false);
      alert(`Successfully added ${names.length} participants!`);
    } else {
      alert('Error adding participants: ' + error.message);
    }
    setAdding(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this participant?')) return;
    
    const { error } = await supabase.from('participants').delete().eq('id', id);
    if (!error) {
      setParticipants(p => p.filter(x => x.id !== id));
      // Re-evaluate available groups if they deleted the last one
      fetchParticipants();
    }
  };

  const handleDeleteAll = async () => {
    const isFiltered = filterGroup !== 'ALL';
    const message = isFiltered 
      ? `Are you sure you want to delete ALL participants currently showing in the list (Group: ${filterGroup})?` 
      : 'Are you sure you want to delete ALL participants? This action cannot be undone!';

    if (!confirm(message)) return;
    
    setLoading(true);
    let query = supabase.from('participants').delete();

    if (filterGroup === 'NONE') {
      query = query.is('group', null);
    } else if (filterGroup !== 'ALL') {
      query = query.eq('group', filterGroup);
    } else {
      query = query.neq('id', 0); // Delete all
    }

    const { error } = await query;
    if (!error) {
      fetchParticipants();
    } else {
      alert('Failed to delete participants: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Participants</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            {isBulkMode ? 'Bulk Add Participants' : 'Add New Participant'}
          </h2>
          <button 
            onClick={() => setIsBulkMode(!isBulkMode)}
            className="text-sm font-medium text-gold-600 hover:text-gold-700 bg-gold-50 px-3 py-1.5 rounded-lg flex items-center gap-2"
          >
            <Users size={16} />
            {isBulkMode ? 'Switch to Single Add' : 'Switch to Bulk Add'}
          </button>
        </div>

        {!isBulkMode ? (
          <form onSubmit={handleAddSingle} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                placeholder="John Doe"
                required
              />
            </div>
            <div className="w-full sm:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">Group (Optional)</label>
              <input
                type="text"
                list="group-suggestions"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                placeholder="e.g. Sales, Team A"
              />
              <datalist id="group-suggestions">
                {availableGroups.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="bg-gray-900 text-white w-full sm:w-auto px-6 py-2 rounded-lg font-medium hover:bg-gray-800 flex justify-center items-center gap-2 h-[42px] disabled:opacity-50"
            >
              {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Add
            </button>
          </form>
        ) : (
          <form onSubmit={handleAddBulk} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Names (One per line)</label>
              <textarea
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 outline-none font-mono text-sm"
                placeholder="Paste names here, one per line (separated by exactly Enter)..."
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="w-full sm:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Group (Optional)</label>
                <input
                  type="text"
                  list="group-suggestions-bulk"
                  value={bulkGroup}
                  onChange={(e) => setBulkGroup(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  placeholder="Applies to all..."
                />
                <datalist id="group-suggestions-bulk">
                  {availableGroups.map(g => <option key={g} value={g} />)}
                </datalist>
              </div>
              <button
                type="submit"
                disabled={adding}
                className="bg-gray-900 text-white w-full sm:w-auto px-8 py-2 rounded-lg font-medium hover:bg-gray-800 flex justify-center items-center gap-2 h-[42px] disabled:opacity-50"
              >
                {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Add All
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            Participant List <span className="text-sm font-normal text-gray-500">({participants.length})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Filter by Group:</span>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 outline-none font-medium"
              >
                <option value="ALL">All Groups</option>
                <option value="NONE">No Group</option>
                {availableGroups.map(g => (
                  <option key={g} value={g}>Group {g}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleDeleteAll}
              disabled={participants.length === 0}
              className="text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete all showing participants"
            >
              <Trash2 size={16} />
              Delete {filterGroup === 'ALL' ? 'All' : 'Filtered'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Group</th>
                  <th className="px-6 py-3 font-medium">Added On</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No participants found.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-900 font-medium">{p.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-[8px] whitespace-nowrap ${
                          p.group ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {p.group || 'None'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
