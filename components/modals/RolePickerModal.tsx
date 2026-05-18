import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, CheckCircle, Edit } from 'lucide-react';
import { UserRole } from '../../types';

interface RolePickerModalProps {
  isOpen: boolean;
  onPickRole: (role: UserRole) => void;
}

const ROLES = [
  { id: 'buyer' as UserRole, title: 'Buyer', desc: 'Shop for fresh goods and unique crafts', icon: ShoppingCart },
  { id: 'farmer' as UserRole, title: 'Farmer', desc: 'Sell your local harvests directly', icon: CheckCircle },
  { id: 'artisan' as UserRole, title: 'Craft Producer', desc: 'Showcase your handcrafted creations', icon: Edit },
];

export default function RolePickerModal({ isOpen, onPickRole }: RolePickerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative p-10 text-center"
          >
            <h2 className="text-3xl font-black text-primary mb-4">Select Your Identity</h2>
            <p className="text-gray-500 mb-10 font-medium italic">
              How will you participate in the marketplace?
            </p>
            <div className="space-y-4 text-left">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => onPickRole(role.id)}
                  className="w-full flex items-center justify-between group p-6 bg-gray-50 rounded-3xl hover:bg-primary hover:text-white transition-all text-gray-800"
                >
                  <div>
                    <span className="block text-lg font-black">{role.title}</span>
                    <span className="text-xs opacity-60 font-medium group-hover:opacity-80">{role.desc}</span>
                  </div>
                  <role.icon className="group-hover:scale-125 transition-transform" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
