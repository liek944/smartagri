import React from 'react';
import {
  Store, ShoppingCart, LogIn, LogOut, Menu, X, Bell, MessageSquare
} from 'lucide-react';
import { User } from '../../types';

interface NavbarProps {
  currentUser: User | null;
  activeSection: string;
  cartCount: number;
  onNavigate: (section: 'home' | 'orders' | 'dashboard' | 'auth' | 'admin' | 'messages') => void;
  onCartOpen: () => void;
  onLogout: () => void;
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  notifications?: any[];
  onMarkNotificationsRead?: () => void;
}

export default function Navbar({
  currentUser, activeSection, cartCount,
  onNavigate, onCartOpen, onLogout, onMenuToggle, isMenuOpen,
  notifications = [], onMarkNotificationsRead,
}: NavbarProps) {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  return (
    <nav className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="bg-white p-1 rounded-lg">
            <Store className="text-primary h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">SmartAgriCraft</span>
        </div>

        <div className="hidden md:flex items-center gap-8 font-medium">
          <button
            onClick={() => onNavigate('home')}
            className={`hover:bg-white/10 px-3 py-2 rounded-md transition-colors ${activeSection === 'home' ? 'bg-white/20' : ''}`}
          >
            Marketplace
          </button>
          {currentUser && currentUser.role && (
            <button
              onClick={() => onNavigate('messages')}
              className={`hover:bg-white/10 px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${activeSection === 'messages' ? 'bg-white/20' : ''}`}
            >
              <MessageSquare size={16} /> Messages
            </button>
          )}
          {currentUser && currentUser.role && (
            <>
              <button
                onClick={() => onNavigate('orders')}
                className={`hover:bg-white/10 px-3 py-2 rounded-md transition-colors ${activeSection === 'orders' ? 'bg-white/20' : ''}`}
              >
                Orders
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`hover:bg-white/10 px-3 py-2 rounded-md transition-colors ${activeSection === 'dashboard' ? 'bg-white/20' : ''}`}
              >
                Dashboard
              </button>
            </>
          )}
          {currentUser && currentUser.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`hover:bg-white/10 px-3 py-2 rounded-md transition-colors ${activeSection === 'admin' ? 'bg-white/20 text-yellow-300 font-bold' : 'text-yellow-100'}`}
            >
              Admin Area
            </button>
          )}
          {!currentUser ? (
            <button
              onClick={() => onNavigate('auth')}
              className="flex items-center gap-2 bg-secondary/80 hover:bg-secondary px-4 py-2 rounded-full transition-all shadow-sm"
            >
              <LogIn size={18} /> Login
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                {currentUser.fullName}
              </span>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications && onMarkNotificationsRead) {
                      onMarkNotificationsRead();
                    }
                  }}
                  className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-primary">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl text-gray-800 py-2 border border-gray-100 z-50 max-h-96 overflow-y-auto">
                    <h4 className="px-4 py-2 font-bold border-b border-gray-50 flex justify-between items-center">
                      Notifications
                    </h4>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${n.read ? 'opacity-60' : 'bg-blue-50/50'}`}>
                          <p className="text-sm">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(n.time).toLocaleTimeString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {currentUser.role === 'buyer' && (
                <button
                  onClick={onCartOpen}
                  className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ShoppingCart size={22} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-primary">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={onLogout}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut size={22} />
              </button>
            </div>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          {currentUser?.role === 'buyer' && (
            <button
              onClick={onCartOpen}
              className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-primary">
                  {cartCount}
                </span>
              )}
            </button>
          )}
          <button className="p-2" onClick={onMenuToggle}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </nav>
  );
}
