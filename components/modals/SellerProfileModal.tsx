import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, MapPin, Calendar, Tag, Search, ShoppingBag, Eye } from 'lucide-react';
import { User as UserType, Product } from '../../types';

interface SellerProfileModalProps {
  isOpen: boolean;
  seller: UserType | null;
  products: Product[];
  currentUser: UserType;
  onClose: () => void;
  onStartChat: (seller: UserType) => void;
}

export default function SellerProfileModal({
  isOpen,
  seller,
  products,
  currentUser,
  onClose,
  onStartChat,
}: SellerProfileModalProps) {
  const [productSearch, setProductSearch] = useState('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  if (!seller) return null;

  const isFarmer = seller.role === 'farmer';
  const roleDisplay = seller.role === 'artisan' ? 'Craft Producer' : 'Farmer';

  // Filter products for this specific seller
  const sellerProducts = products.filter(
    (p) => p.producerId === seller.id
  );

  // Search filtered products
  const filteredProducts = sellerProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden border border-gray-100"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white hover:scale-110 transition-all border border-gray-100"
            >
              <X size={18} className="text-gray-600" />
            </button>

            {/* Profile Header */}
            <div className={`p-8 shrink-0 bg-gradient-to-br ${
              isFarmer
                ? 'from-green-500/10 via-emerald-500/5 to-transparent'
                : 'from-purple-500/10 via-indigo-500/5 to-transparent'
            } border-b border-gray-50 flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-10`}>
              
              {/* Profile Avatar */}
              <div className={`w-24 h-24 rounded-full flex items-center justify-center font-black text-4xl shadow-xl shrink-0 ${
                isFarmer
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                  : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
              }`}>
                {seller.fullName[0]}
              </div>

              {/* Profile Details */}
              <div className="flex-grow text-center sm:text-left space-y-3">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">
                      {seller.fullName}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider self-center sm:self-auto ${
                      isFarmer 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {roleDisplay}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 mt-1">
                    @{seller.username}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} className="text-gray-400" />
                    {seller.location || 'Roxas, Oriental Mindoro'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    Joined {seller.joinedDate || 'Recently'}
                  </span>
                </div>
              </div>
            </div>

            {/* Products List Body */}
            <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-primary" />
                  Store Listings
                  <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-full font-bold text-gray-500">
                    {sellerProducts.length}
                  </span>
                </h3>

                {sellerProducts.length > 0 && (
                  <div className="relative max-w-xs w-full sm:w-64">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search listings..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 border-none"
                    />
                  </div>
                )}
              </div>

              {sellerProducts.length === 0 ? (
                <div className="text-center py-12 px-4 bg-gray-50 rounded-3xl border border-dashed border-gray-100">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag size={20} className="text-gray-400" />
                  </div>
                  <p className="font-bold text-gray-500">No items listed yet</p>
                  <p className="text-xs text-gray-400 mt-1">This seller hasn't posted any products for sale.</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-bold text-sm bg-gray-50 rounded-3xl">
                  No listings match "{productSearch}"
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => {
                    const isExpanded = expandedProductId === product.id;
                    return (
                      <div
                        key={product.id}
                        className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden group ${
                          isExpanded 
                            ? 'border-primary ring-2 ring-primary/10 shadow-md' 
                            : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                        }`}
                      >
                        {/* Product Row */}
                        <div className="flex p-3 gap-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-50 border border-gray-50"
                          />
                          <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              <h4 className="font-bold text-gray-800 text-sm truncate leading-tight group-hover:text-primary transition-colors">
                                {product.name}
                              </h4>
                              <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                {product.category}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-black text-primary text-base">₱{product.price}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                product.stock > 10 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                              }`}>
                                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible details toggle */}
                        {product.description && (
                          <button
                            onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                            className="w-full text-left px-3 py-1.5 bg-gray-50/50 hover:bg-gray-50 border-t border-gray-50 text-[10px] font-bold text-gray-400 hover:text-primary flex items-center justify-between transition-colors"
                          >
                            <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                            <Eye size={12} />
                          </button>
                        )}

                        {/* Collapsible description */}
                        {isExpanded && product.description && (
                          <div className="px-3 pb-3 pt-2 bg-gray-50/50 border-t border-gray-50 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap animate-fadeIn">
                            <div className="font-bold text-[9px] uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1">
                              <Tag size={10} /> Description
                            </div>
                            {product.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-6 sm:p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between shrink-0">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-200 text-gray-600 rounded-2xl font-bold text-sm hover:bg-white hover:border-gray-300 transition-colors bg-white shadow-sm"
              >
                Close
              </button>

              {currentUser.id !== seller.id && (
                <button
                  onClick={() => {
                    onStartChat(seller);
                    onClose();
                  }}
                  className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-lg hover:scale-105 transition-transform flex items-center gap-2 uppercase tracking-wider"
                >
                  <MessageSquare size={16} />
                  Message Seller
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
