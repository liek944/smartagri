import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';

interface AddProductModalProps {
  isOpen: boolean;
  currentUser: User;
  productErrors: Record<string, string>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClearError: (field: string) => void;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export default function AddProductModal({
  isOpen, currentUser, productErrors,
  onClose, onSubmit, onClearError, onDescriptionChange,
}: AddProductModalProps) {
  const isFarmer = currentUser.role === 'farmer';
  const color = isFarmer ? { bg: 'bg-green-100', text: 'text-green-700', btn: 'bg-green-600 hover:bg-green-700' }
    : { bg: 'bg-purple-100', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative p-8 max-h-[90vh] overflow-y-auto">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${color.bg}`}>
              <span className="text-2xl">{isFarmer ? '🌾' : '🎨'}</span>
            </div>
            <h2 className={`text-3xl font-black mb-2 text-center ${color.text}`}>
              {isFarmer ? 'List a Harvest' : 'Showcase a Creation'}
            </h2>
            <p className="text-center text-gray-500 mb-8 font-medium italic">
              {isFarmer ? 'Share your fresh produce with Mindoro.' : 'Let your handcrafted work shine.'}
            </p>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Product Name</label>
                  <input name="name" required maxLength={80}
                    placeholder={isFarmer ? 'e.g. Organic Calamansi' : 'e.g. Woven Basket'}
                    onChange={() => onClearError('name')}
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 transition-all ${productErrors.name ? 'border-red-300 bg-red-50' : 'border-transparent focus:border-primary'}`} />
                  {productErrors.name && <p className="text-[10px] text-red-500 font-bold pl-1">{productErrors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Category</label>
                  <div className={`w-full px-4 py-3 rounded-2xl font-black text-sm flex items-center gap-2 ${isFarmer ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                    <span>{isFarmer ? '🌾' : '🎨'}</span>
                    <span>{isFarmer ? 'Farmers' : 'Craft Producers'}</span>
                    <span className="ml-auto text-[10px] opacity-50 font-bold">LOCKED</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Price (₱)</label>
                  <input name="price" type="number" required min={1} max={999999} step="0.01" placeholder="e.g. 150"
                    onChange={() => onClearError('price')}
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 transition-all ${productErrors.price ? 'border-red-300 bg-red-50' : 'border-transparent focus:border-primary'}`} />
                  {productErrors.price && <p className="text-[10px] text-red-500 font-bold pl-1">{productErrors.price}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">
                    {isFarmer ? 'Stock (kg / units)' : 'Stock (pieces)'}
                  </label>
                  <input name="stock" type="number" required min={1} max={99999} step="1" placeholder="e.g. 50"
                    onChange={() => onClearError('stock')}
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 transition-all ${productErrors.stock ? 'border-red-300 bg-red-50' : 'border-transparent focus:border-primary'}`} />
                  {productErrors.stock && <p className="text-[10px] text-red-500 font-bold pl-1">{productErrors.stock}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Product Image (Optional)</label>
                <input name="image" type="file" accept="image/*"
                  className={`w-full px-4 py-2 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 transition-all border-transparent focus:border-primary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:cursor-pointer cursor-pointer file:transition-colors ${isFarmer ? 'file:bg-green-100 file:text-green-700 hover:file:bg-green-200' : 'file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200'}`} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between pl-2 pr-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                  <span className="text-[10px] text-gray-300 font-bold" id="desc-counter">0/500</span>
                </div>
                <textarea name="description" rows={3} maxLength={500}
                  placeholder={isFarmer ? 'Describe your harvest — variety, freshness, farming method...' : 'Describe your craft — materials, technique, inspiration...'}
                  onChange={onDescriptionChange}
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 resize-none transition-all ${productErrors.description ? 'border-red-300 bg-red-50' : 'border-transparent focus:border-primary'}`} />
                {productErrors.description && <p className="text-[10px] text-red-500 font-bold pl-1">{productErrors.description}</p>}
              </div>
              <button type="submit" className={`w-full py-4 text-white rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform mt-4 ${color.btn}`}>
                {isFarmer ? 'List Harvest Now' : 'Showcase Creation Now'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
