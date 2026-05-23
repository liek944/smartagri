import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Minus, Plus, Leaf, ShoppingBag } from 'lucide-react';
import { CartItem } from '../../types';

interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  cartSubtotal: number;
  cartTotal: number;
  onClose: () => void;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onCheckout: () => void;
}

export default function CartModal({
  isOpen, cart, cartSubtotal, cartTotal,
  onClose, onRemove, onUpdateQuantity, onCheckout,
}: CartModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col h-[80vh] md:h-auto md:max-h-[80vh]"
          >
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-2xl font-black text-primary">Shopping Cart</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
                <X />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400 italic">Your cart is empty</div>
              ) : (
                cart.map((item) => {
                  const isFarmer = item.category === 'agriculture';
                  const unitLabel = isFarmer ? 'kg' : 'pcs';
                  const UnitIcon = isFarmer ? Leaf : ShoppingBag;
                  return (
                    <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-gray-800 truncate">{item.name}</h4>
                        <div className="flex items-center gap-1 mt-0.5 mb-2">
                          <UnitIcon size={10} className={isFarmer ? 'text-green-500' : 'text-orange-500'} />
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${isFarmer ? 'text-green-500' : 'text-orange-500'}`}>
                            {isFarmer ? 'Farmer' : 'Craft Producer'} · {unitLabel}
                          </span>
                        </div>
                        <p className="text-sm text-primary font-black">₱{item.price}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-90 transition-all"
                          >
                            <Minus size={12} />
                          </button>
                          <div className="w-14 text-center">
                            <span className="text-sm font-black text-gray-800">{item.quantity}</span>
                            <span className="text-[9px] font-bold text-gray-400 ml-0.5">{unitLabel}</span>
                          </div>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-90 transition-all"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between flex-shrink-0">
                        <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-500 p-1">
                          <Trash2 size={18} />
                        </button>
                        <span className="text-sm font-black text-gray-700">₱{item.price * item.quantity}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-white border-t space-y-4">
                <div className="flex justify-between font-bold text-gray-600">
                  <span>Subtotal</span>
                  <span>₱{cartSubtotal}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-600">
                  <span>Delivery Fee</span>
                  <span>₱50</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-primary">
                  <span>Total</span>
                  <span>₱{cartTotal}</span>
                </div>
                <button
                  onClick={onCheckout}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
