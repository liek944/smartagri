import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ShoppingCart } from 'lucide-react';
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
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                    <div className="flex-grow">
                      <h4 className="font-bold text-gray-800">{item.name}</h4>
                      <p className="text-sm text-primary font-black">₱{item.price}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-500 p-2">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
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
