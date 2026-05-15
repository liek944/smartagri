import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle } from 'lucide-react';
import { Order } from '../../types';

interface ReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onViewOrders: () => void;
}

export default function ReceiptModal({ isOpen, order, onClose, onViewOrders }: ReceiptModalProps) {
  if (!order) return null;
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative p-8 flex flex-col items-center max-h-[90vh] overflow-y-auto">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"><CheckCircle size={32} /></div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Order Successful!</h2>
            <p className="text-gray-500 text-sm mb-8">Thank you for supporting local traders.</p>
            <div className="w-full border-2 border-dashed border-gray-100 rounded-3xl p-6 bg-gray-50/50 mb-8 font-mono text-sm">
              <div className="flex justify-between mb-4 border-b pb-4">
                <span className="font-bold text-gray-400">Order ID:</span>
                <span className="text-gray-800 uppercase">{order.id?.slice(-8)}</span>
              </div>
              <div className="space-y-2 mb-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>₱{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2 font-bold">
                <div className="flex justify-between text-gray-500 text-xs"><span>Subtotal</span><span>₱{order.subtotal}</span></div>
                <div className="flex justify-between text-gray-500 text-xs"><span>Delivery</span><span>₱{order.deliveryFee}</span></div>
                <div className="flex justify-between text-primary text-lg"><span>TOTAL</span><span>₱{order.total}</span></div>
              </div>
              <div className="mt-4 pt-4 border-t-2 border-white text-[10px] text-gray-400 text-center uppercase tracking-widest leading-relaxed">
                Delivery: {(order as any).deliveryLocation}<br />
                Contact: {(order as any).phoneNumber || 'N/A'}<br />
                {new Date(order.orderDate).toLocaleString()}
              </div>
            </div>
            <div className="mt-8 w-full">
              <button onClick={onViewOrders} className="w-full py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest">View My Orders</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
