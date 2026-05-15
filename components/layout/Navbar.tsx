import React from 'react';
import {
  Store, ShoppingCart, LogIn, LogOut, Menu, X
} from 'lucide-react';
import { User } from '../../types';

interface NavbarProps {
  currentUser: User | null;
  activeSection: string;
  cartCount: number;
  onNavigate: (section: 'home' | 'orders' | 'dashboard' | 'auth') => void;
  onCartOpen: () => void;
  onLogout: () => void;
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export default function Navbar({
  currentUser, activeSection, cartCount,
  onNavigate, onCartOpen, onLogout, onMenuToggle, isMenuOpen,
}: NavbarProps) {
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

        <button className="md:hidden p-2" onClick={onMenuToggle}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </nav>
  );
}
