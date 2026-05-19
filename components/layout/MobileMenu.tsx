import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';

interface MobileMenuProps {
  isOpen: boolean;
  currentUser: User | null;
  onNavigate: (section: 'home' | 'orders' | 'dashboard' | 'auth' | 'admin') => void;
  onLogout: () => void;
}

export default function MobileMenu({ isOpen, currentUser, onNavigate, onLogout }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden bg-primary text-white shadow-xl absolute w-full z-40 p-4 space-y-4"
        >
          <button
            onClick={() => onNavigate('home')}
            className="block w-full text-left py-2 border-b border-white/10"
          >
            Marketplace
          </button>
          {currentUser && currentUser.role && (
            <>
              <button
                onClick={() => onNavigate('orders')}
                className="block w-full text-left py-2 border-b border-white/10"
              >
                Orders
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="block w-full text-left py-2 border-b border-white/10"
              >
                Dashboard
              </button>
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="block w-full text-left py-2 border-b border-white/10 text-yellow-300 font-bold"
                >
                  Admin Area
                </button>
              )}
              <button
                onClick={() => { onLogout(); }}
                className="block w-full text-left py-2 text-red-200"
              >
                Logout
              </button>
            </>
          )}
          {!currentUser && (
            <button
              onClick={() => onNavigate('auth')}
              className="block w-full text-left py-2"
            >
              Login / Register
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
