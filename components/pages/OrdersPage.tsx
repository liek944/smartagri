import React from 'react';
import { motion } from 'motion/react';
import { Receipt, Package } from 'lucide-react';
import { Order } from '../../types';

interface OrdersPageProps {
  orders: Order[];
  onViewReceipt: (order: Order) => void;
  onGoShopping: () => void;
}

export default function OrdersPage({ orders, onViewReceipt, onGoShopping }: OrdersPageProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-black text-primary mb-8 flex items-center gap-3">
        <Receipt size={32} /> My Orders
      </h2>
      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <Package size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-500">No orders yet</h3>
          <button onClick={onGoShopping} className="mt-4 text-primary font-bold hover:underline">
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:-translate-y-1 transition-transform"
            >
              <div className="flex justify-between items-start mb-6 border-b border-gray-50 pb-4">
                <div>
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">
                    {order.id}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {order.status}
                  </span>
                  <button
                    onClick={() => onViewReceipt(order)}
                    className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1"
                  >
                    <Receipt size={12} /> View Receipt
                  </button>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-bold">₱{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <div className="text-sm text-gray-500 uppercase font-bold tracking-tighter">
                  Pay via {order.paymentMethod.toUpperCase()}
                </div>
                <div className="text-xl font-black text-primary">Total: ₱{order.total}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
