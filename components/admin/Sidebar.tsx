'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, Settings, LayoutDashboard, FolderKanban, LogOut, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Participants', href: '/admin/participants', icon: Users },
    { label: 'Groups', href: '/admin/groups', icon: FolderKanban },
    { label: 'Categories', href: '/admin/categories', icon: FolderKanban },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Menu Button - Fixed at top when sidebar is closed */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gray-900 flex items-center justify-between px-4 z-40 shadow-md">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold-400 to-yellow-200">
          Admin Panel
        </h2>
        <button onClick={() => setIsOpen(true)} className="text-white p-2">
          <Menu size={24} />
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 block transition-opacity" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-gray-900 text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out flex-shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold-400 to-yellow-200 hidden md:block">
            Admin Panel
          </h2>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold-400 to-yellow-200 block md:hidden">
            Menu
          </h2>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 hover:text-white p-2 transition-colors">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-gold-500/20 text-gold-400 font-medium' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-gray-800 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
