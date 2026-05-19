import React from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard, PlusCircle, MapPin, MessageSquare, Edit2, Trash2, Tag, Box, AlertTriangle
} from 'lucide-react';
import { User, Product, Order, Conversation } from '../../types';

interface DashboardPageProps {
  currentUser: User;
  products: Product[];
  orders: Order[];
  conversations: Conversation[];
  cartSubtotal: number;
  onAddProductOpen: () => void;
  onEditProductOpen: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onOpenConversation: (conv: Conversation) => void;
}

export default function DashboardPage({
  currentUser, products, orders, conversations, cartSubtotal,
  onAddProductOpen, onEditProductOpen, onDeleteProduct, onOpenConversation,
}: DashboardPageProps) {
  const isProducer = currentUser.role === 'farmer' || currentUser.role === 'artisan';
  const isFarmer = currentUser.role === 'farmer';
  const myProducts = products.filter((p) => p.producerId === currentUser.id);
  const colorScheme = isFarmer
    ? { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', btn: 'bg-green-600 hover:bg-green-700' }
    : { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-3xl font-black text-primary mb-10 flex items-center gap-3">
        <LayoutDashboard size={32} /> Dashboard
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50 text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl font-black text-primary">{currentUser.fullName[0]}</span>
            </div>
            <h3 className="text-xl font-black text-gray-800">{currentUser.fullName}</h3>
            <p
              className={`text-xs font-black uppercase tracking-widest mt-2 px-4 py-1 rounded-full inline-block ${
                isFarmer
                  ? 'bg-green-100 text-green-700'
                  : currentUser.role === 'artisan'
                    ? 'bg-purple-100 text-purple-700'
                    : currentUser.role === 'buyer'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
              }`}
            >
              {currentUser.role === 'artisan' ? 'craft producer' : currentUser.role}
            </p>
            <div className="mt-6 pt-6 border-t border-gray-50 space-y-3 text-left">
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} /> {currentUser.location}
              </p>
              <p className="text-xs text-gray-400 text-center">Joined {currentUser.joinedDate}</p>
            </div>
          </div>
        </div>

        {/* Stats + Chats */}
        <div className="md:col-span-3 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {isProducer ? (
              <>
                <StatCard
                  label={isFarmer ? 'Harvest Revenue' : 'Craft Revenue'}
                  value={`₱${myProducts.reduce((acc, p) => acc + p.sold * p.price, 0).toLocaleString()}`}
                  className={`${colorScheme.bg} ${colorScheme.border}`}
                  textClass={colorScheme.text}
                />
                <StatCard
                  label={isFarmer ? 'Units Harvested' : 'Pieces Crafted'}
                  value={String(myProducts.reduce((acc, p) => acc + p.sold, 0))}
                  className={`${colorScheme.bg} ${colorScheme.border}`}
                  textClass={colorScheme.text}
                />
                <StatCard
                  label={isFarmer ? 'Active Harvests' : 'Active Creations'}
                  value={String(myProducts.length)}
                  className={`${colorScheme.bg} ${colorScheme.border}`}
                  textClass={colorScheme.text}
                />
                <button
                  onClick={onAddProductOpen}
                  className={`text-white p-6 rounded-3xl shadow-lg flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform ${colorScheme.btn}`}
                >
                  <PlusCircle size={32} />
                  <span className="font-black uppercase tracking-widest text-xs">
                    {isFarmer ? 'List a Harvest' : 'Showcase a Creation'}
                  </span>
                </button>
              </>
            ) : (
              <>
                <StatCard
                  label="Orders Placed"
                  value={String(orders.length)}
                  className="bg-white border-gray-50"
                  textClass="text-primary"
                />
                <StatCard
                  label="Items Bought"
                  value={String(orders.reduce((acc, o) => acc + o.items.reduce((ia, i) => ia + i.quantity, 0), 0))}
                  className="bg-white border-gray-50"
                  textClass="text-primary"
                />
                <StatCard
                  label="Cart Value"
                  value={`₱${cartSubtotal}`}
                  className="bg-white border-gray-50"
                  textClass="text-primary"
                />
              </>
            )}
          </div>

          {/* Sales Chart */}
          {isProducer && myProducts.length > 0 && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50 mt-8">
              <h4 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <Box size={20} className={colorScheme.text} /> Sales by Product
              </h4>
              <div className="space-y-4">
                {myProducts.sort((a, b) => b.sold - a.sold).map(p => {
                   const maxSold = Math.max(...myProducts.map(x => x.sold), 1);
                   const percentage = (p.sold / maxSold) * 100;
                   return (
                     <div key={p.id}>
                       <div className="flex justify-between text-sm mb-1">
                         <span className="font-bold text-gray-700">{p.name}</span>
                         <span className="text-gray-500">{p.sold} sold (₱{(p.sold * p.price).toLocaleString()})</span>
                       </div>
                       <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                         <div className={`${isFarmer ? 'bg-green-500' : 'bg-purple-500'} h-full rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>
          )}

          {/* Manage Products (Farmers/Craft Producers) */}
          {isProducer && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50 mt-8">
              <h4 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <Box size={20} className={colorScheme.text} /> Manage Listings
              </h4>
              {myProducts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 italic">No items listed yet</div>
              ) : (
                <div className="space-y-4">
                  {myProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <img src={p.image} alt={p.name} className="w-16 h-16 object-cover rounded-xl" />
                        <div>
                          <p className="font-bold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                            <Tag size={12} /> ₱{p.price} | Stock: {p.stock}
                            {p.stock <= 5 && (
                              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold ml-1">
                                <AlertTriangle size={12} /> Restock soon
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onEditProductOpen(p)} className="p-3 bg-white text-gray-600 hover:text-blue-600 rounded-xl shadow-sm hover:shadow-md transition-all">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => { if(window.confirm('Delete this product?')) onDeleteProduct(p); }} className="p-3 bg-white text-gray-600 hover:text-red-600 rounded-xl shadow-sm hover:shadow-md transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Chats */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
            <h4 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
              <MessageSquare size={20} className="text-primary" /> Recent Chats
            </h4>
            {conversations.length === 0 ? (
              <div className="text-center py-10 text-gray-400 italic">No conversations yet</div>
            ) : (
              <div className="space-y-4">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onOpenConversation(conv)}
                    className="w-full text-left p-4 bg-gray-50 rounded-2xl flex justify-between items-center hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-gray-800">
                        {Object.entries(conv.participantNames).find(([uid]) => uid !== currentUser.id)?.[1] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                    </div>

                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Sub-component ---

function StatCard({
  label, value, className, textClass,
}: {
  label: string; value: string; className: string; textClass: string;
}) {
  return (
    <div className={`p-6 rounded-3xl shadow-sm border ${className}`}>
      <p className="text-xs font-bold text-gray-400 uppercase mb-2">{label}</p>
      <p className={`text-3xl font-black ${textClass}`}>{value}</p>
    </div>
  );
}
