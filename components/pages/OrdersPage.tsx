import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Receipt, Package, Store, ShoppingBag, ChevronRight, XCircle } from 'lucide-react';
import { Order, User } from '../../types';

interface OrdersPageProps {
  orders: Order[];
  currentUser: User;
  onViewReceipt: (order: Order) => void;
  onGoShopping: () => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
}

const STATUS_COLORS: Record<Order['status'], string> = {
  pending: 'bg-orange-100 text-orange-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

// Producer's allowed status transitions
const PRODUCER_TRANSITIONS: Partial<Record<Order['status'], Order['status']>> = {
  pending: 'processing',
  processing: 'completed',
};

export default function OrdersPage({
  orders, currentUser, onViewReceipt, onGoShopping, onUpdateOrderStatus,
}: OrdersPageProps) {
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const purchases = orders.filter(o => o.userId === currentUser.id);
  const sales = orders.filter(o => o.items.some(i => i.producerId === currentUser.id) && o.userId !== currentUser.id);
  const displayOrders = activeTab === 'purchases' ? purchases : sales;

  const isProducer = currentUser.role === 'farmer' || currentUser.role === 'artisan';

  const handleStatusAdvance = async (order: Order) => {
    const nextStatus = PRODUCER_TRANSITIONS[order.status];
    if (!nextStatus) return;
    setLoadingOrderId(order.id);
    try {
      await onUpdateOrderStatus(order.id, nextStatus);
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleCancel = async (order: Order) => {
    if (confirmCancelId !== order.id) {
      setConfirmCancelId(order.id);
      return;
    }
    setLoadingOrderId(order.id);
    setConfirmCancelId(null);
    try {
      await onUpdateOrderStatus(order.id, 'cancelled');
    } finally {
      setLoadingOrderId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-primary flex items-center gap-3">
          <Receipt size={32} /> My Orders
        </h2>
        {isProducer && (
          <div className="flex bg-white rounded-full p-1 shadow-sm border border-gray-100">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'purchases' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <ShoppingBag size={16} /> Purchases
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'sales' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Store size={16} /> Sales
            </button>
          </div>
        )}
      </div>

      {displayOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <Package size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-500">
            {activeTab === 'purchases' ? 'No purchases yet' : 'No sales yet'}
          </h3>
          {activeTab === 'purchases' && (
            <button onClick={onGoShopping} className="mt-4 text-primary font-bold hover:underline">
              Start Shopping
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {displayOrders.map((order) => {
            const isSale = activeTab === 'sales';
            const displayItems = isSale
              ? order.items.filter(i => i.producerId === currentUser.id)
              : order.items;
            const displayTotal = isSale
              ? displayItems.reduce((acc, item) => acc + item.price * item.quantity, 0)
              : order.total;

            const nextStatus = PRODUCER_TRANSITIONS[order.status];
            const canAdvance = isSale && !!nextStatus;
            const canCancel = !isSale && order.status === 'pending';
            const isLoading = loadingOrderId === order.id;
            const awaitingConfirm = confirmCancelId === order.id;

            return (
              <motion.div
                key={order.id}
                layout
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:-translate-y-1 transition-transform"
              >
                <div className="flex justify-between items-start mb-6 border-b border-gray-50 pb-4">
                  <div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none flex items-center gap-2">
                      {order.id}
                      {isSale && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">
                          Buyer: {order.userName}
                        </span>
                      )}
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                    {isSale && order.deliveryLocation && (
                      <p className="text-xs text-gray-400 mt-0.5">📍 {order.deliveryLocation}</p>
                    )}
                    {isSale && order.phoneNumber && (
                      <p className="text-xs text-gray-400">📞 {order.phoneNumber}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                    {!isSale && (
                      <button
                        onClick={() => onViewReceipt(order)}
                        className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1"
                      >
                        <Receipt size={12} /> View Receipt
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {displayItems.map((item) => (
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

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 border-t border-gray-50">
                  <div className="text-sm text-gray-500 uppercase font-bold tracking-tighter">
                    {isSale ? 'Your Earnings from this order' : `Pay via ${order.paymentMethod.toUpperCase()}`}
                  </div>
                  <div className="text-xl font-black text-primary">
                    {isSale ? `₱${displayTotal}` : `Total: ₱${displayTotal}`}
                  </div>
                </div>

                {/* Producer status action */}
                {canAdvance && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      id={`advance-status-${order.id}`}
                      disabled={isLoading}
                      onClick={() => handleStatusAdvance(order)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl font-black text-sm shadow hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:scale-100"
                    >
                      {isLoading ? 'Updating...' : (
                        <>
                          Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Buyer cancel action */}
                {canCancel && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                    {awaitingConfirm ? (
                      <>
                        <span className="text-sm text-red-600 font-bold">Are you sure?</span>
                        <button
                          id={`confirm-cancel-${order.id}`}
                          disabled={isLoading}
                          onClick={() => handleCancel(order)}
                          className="px-4 py-2 bg-red-500 text-white rounded-xl font-black text-sm hover:bg-red-600 transition-colors disabled:opacity-60"
                        >
                          {isLoading ? 'Cancelling...' : 'Yes, Cancel'}
                        </button>
                        <button
                          onClick={() => setConfirmCancelId(null)}
                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                        >
                          Keep Order
                        </button>
                      </>
                    ) : (
                      <button
                        id={`cancel-order-${order.id}`}
                        onClick={() => handleCancel(order)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-2xl font-bold text-sm border border-red-100 hover:bg-red-100 transition-colors"
                      >
                        <XCircle size={16} /> Cancel Order
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
