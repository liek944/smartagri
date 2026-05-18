import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingCart, MessageCircle, Package, Tag, User } from 'lucide-react';
import { Product, User as UserType } from '../../types';

interface ProductDetailModalProps {
  product: Product | null;
  currentUser: UserType | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onStartChat: (product: Product) => void;
  onEditProductOpen: (product: Product) => void;
}

export default function ProductDetailModal({
  product,
  currentUser,
  onClose,
  onAddToCart,
  onBuyNow,
  onStartChat,
  onEditProductOpen,
}: ProductDetailModalProps) {
  if (!product) return null;

  const isOwner = currentUser?.id === product.producerId;
  const isBuyer = currentUser?.role === 'buyer';
  const isOutOfStock = product.stock === 0;

  return (
    <AnimatePresence>
      {product && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal panel */}
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Close button */}
            <button
              id="product-detail-close"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white hover:scale-110 transition-all"
            >
              <X size={18} className="text-gray-600" />
            </button>

            {/* Hero image */}
            <div className="h-72 bg-gray-100 flex-shrink-0 relative">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {/* Category badge */}
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-primary shadow-sm uppercase tracking-wider">
                  {product.category}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${
                    isOutOfStock
                      ? 'bg-red-100 text-red-600'
                      : product.stock <= 5
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-grow p-6 sm:p-8 space-y-6">
              {/* Name + price row */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                    {product.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 font-medium">
                    <User size={14} />
                    <span>By {product.producer}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-black text-primary">₱{product.price}</div>
                  {product.sold > 0 && (
                    <div className="text-xs text-gray-400 font-bold mt-0.5">
                      {product.sold} sold
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    <Tag size={12} />
                    About this product
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Stock indicator */}
              {!isOutOfStock && (
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Package size={16} className="text-primary flex-shrink-0" />
                  <span>
                    <span className="font-black text-gray-800">{product.stock}</span> units available
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 space-y-3">
                {isBuyer && (
                  <>
                    <button
                      id="product-detail-buy-now"
                      onClick={() => { onBuyNow(product); onClose(); }}
                      disabled={isOutOfStock}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest disabled:bg-gray-300 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Order Now'}
                    </button>
                    <div className="flex gap-3">
                      <button
                        id="product-detail-add-to-cart"
                        onClick={() => { onAddToCart(product); onClose(); }}
                        disabled={isOutOfStock}
                        className="flex-1 py-3 flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-2xl font-bold hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        <ShoppingCart size={18} /> Add to Cart
                      </button>
                      <button
                        id="product-detail-message"
                        onClick={() => { onStartChat(product); onClose(); }}
                        className="flex-1 py-3 flex items-center justify-center gap-2 bg-secondary/10 text-secondary rounded-2xl font-bold hover:bg-secondary/20 transition-colors"
                      >
                        <MessageCircle size={18} /> Message Seller
                      </button>
                    </div>
                  </>
                )}

                {isOwner && (
                  <button
                    id="product-detail-manage"
                    onClick={() => { onEditProductOpen(product); onClose(); }}
                    className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold border-2 border-dashed border-gray-200 hover:bg-white hover:border-primary hover:text-primary transition-all"
                  >
                    Manage this listing
                  </button>
                )}

                {!currentUser && (
                  <p className="text-center text-sm italic text-gray-400 py-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    Log in to purchase this product
                  </p>
                )}

                {currentUser && !isBuyer && !isOwner && (
                  <p className="text-center text-xs font-bold text-gray-300 py-3 border border-gray-100 rounded-2xl">
                    Market Listing View
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
