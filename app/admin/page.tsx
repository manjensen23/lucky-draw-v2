import { createClient } from '@/lib/supabase/server';
import { Users, Award, Database } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch stats concurrently
  const [
    { count: totalParticipants },
    { data: activeSettings },
    { count: totalLogs }
  ] = await Promise.all([
    supabase.from('participants').select('*', { count: 'exact', head: true }),
    supabase.from('settings').select('*').eq('id', 1).single(),
    supabase.from('winner_logs').select('*', { count: 'exact', head: true })
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-8">
        Dashboard Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Participants</p>
            <p className="text-3xl font-bold text-gray-900">{totalParticipants || 0}</p>
          </div>
        </div>

        {/* <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-gold-50 text-gold-600 rounded-xl">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Current Target Group</p>
            <p className="text-3xl font-bold text-gray-900">{activeSettings?.target_group || 'ALL'}</p>
            <p className="text-xs text-gray-400 mt-1">Winners per draw: {activeSettings?.winner_count || 1}</p>
          </div>
        </div> */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Database size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Draws Run</p>
            <p className="text-3xl font-bold text-gray-900">{totalLogs || 0}</p>
          </div>
        </div>
      </div>

      {/* Optionally list recent winners here */}
    </div>
  );
}
