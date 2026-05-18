import React from 'react';
import { motion } from 'motion/react';
import {
  Search, ShoppingCart, PlusCircle, MessageCircle
} from 'lucide-react';
import { User, Product } from '../../types';

interface MarketplacePageProps {
  currentUser: User | null;
  filteredProducts: Product[];
  searchQuery: string;
  categoryFilter: 'all' | 'agriculture' | 'craft';
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: 'all' | 'agriculture' | 'craft') => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onStartChat: (product: Product) => void;
  onAddProductOpen: () => void;
  onEditProductOpen: (product: Product) => void;
}

export default function MarketplacePage({
  currentUser, filteredProducts, searchQuery, categoryFilter,
  onSearchChange, onCategoryChange, onAddToCart, onBuyNow, onStartChat, onAddProductOpen, onEditProductOpen,
}: MarketplacePageProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="mb-10 text-center py-10 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 tracking-tight">Marketplace</h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-8">
          Oriental Mindoro's digital hub for local farmers and craft producers.
        </p>
        <div className="max-w-xl mx-auto flex flex-col md:flex-row gap-4 px-4 bg-white p-3 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border-none focus:ring-0 text-gray-700"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value as any)}
            className="bg-gray-50 border-none rounded-xl focus:ring-0 text-gray-700 font-medium"
          >
            <option value="all">All Categories</option>
            <option value="agriculture">Agricultural</option>
            <option value="craft">Crafts</option>
          </select>
        </div>
        {currentUser && (currentUser.role === 'farmer' || currentUser.role === 'artisan') && (
          <button
            onClick={onAddProductOpen}
            className="mt-8 flex items-center gap-2 mx-auto bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
          >
            <PlusCircle size={20} /> Add Product
          </button>
        )}
      </header>

      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Search className="text-gray-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No products found</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            We couldn't find any products matching "{searchQuery}" in this category.
          </p>
          <button
            onClick={() => { onSearchChange(''); onCategoryChange('all'); }}
            className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-50 flex flex-col"
            >
              <div className="h-56 bg-gray-100 relative group">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
                  {product.category.toUpperCase()}
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-3 truncate">By {product.producer}</p>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-2xl font-black text-primary">₱{product.price}</span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <ProductActions
                    product={product}
                    currentUser={currentUser}
                    onAddToCart={onAddToCart}
                    onBuyNow={onBuyNow}
                    onStartChat={onStartChat}
                    onEditProductOpen={onEditProductOpen}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// --- Sub-component for product card actions ---

function ProductActions({
  product, currentUser, onAddToCart, onBuyNow, onStartChat, onEditProductOpen,
}: {
  product: Product;
  currentUser: User | null;
  onAddToCart: (p: Product) => void;
  onBuyNow: (p: Product) => void;
  onStartChat: (p: Product) => void;
  onEditProductOpen: (p: Product) => void;
}) {
  if (currentUser?.role === 'buyer') {
    return (
      <div className="flex flex-wrap sm:flex-nowrap gap-2">
        <button
          onClick={() => onBuyNow(product)}
          disabled={product.stock === 0}
          className="flex-grow bg-primary text-white py-3 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform disabled:bg-gray-300 disabled:scale-100 disabled:cursor-not-allowed uppercase tracking-wider text-xs whitespace-nowrap"
        >
          Order Now
        </button>
        <button
          onClick={() => onAddToCart(product)}
          disabled={product.stock === 0}
          className="p-3 bg-primary/10 text-primary rounded-2xl hover:bg-primary/20 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Add to Cart"
        >
          <ShoppingCart size={20} />
        </button>
        <button
          onClick={() => onStartChat(product)}
          className="p-3 bg-secondary/10 text-secondary rounded-2xl hover:bg-secondary/20 transition-colors flex-shrink-0"
          title="Message Seller"
        >
          <MessageCircle size={20} />
        </button>
      </div>
    );
  }

  if (currentUser?.id === product.producerId) {
    return (
      <button
        onClick={() => onEditProductOpen(product)}
        className="w-full py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold border-2 border-dashed border-gray-200 hover:bg-white hover:border-primary hover:text-primary transition-all"
      >
        Manage your {product.name}
      </button>
    );
  }

  if (currentUser?.role === 'farmer' || currentUser?.role === 'artisan') {
    return (
      <div className="w-full text-center text-xs font-bold text-gray-300 py-3 border border-gray-100 rounded-2xl">
        Market Listing View
      </div>
    );
  }

  return (
    <div className="w-full text-center text-sm italic text-gray-400 py-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
      Login to purchase
    </div>
  );
}
