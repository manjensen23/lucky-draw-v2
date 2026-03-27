import Sidebar from '@/components/admin/Sidebar';
import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-900 w-full">
      <Sidebar />
      <main className="flex-1 w-full max-w-full p-4 pt-20 md:p-8 md:pt-8 overflow-x-hidden min-h-screen">
        {children}
      </main>
    </div>
  );
}
