import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Truck } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  cartCount: number;
  cartSubtotal: number;
  cartTotal: number;
  deliveryLocation: string;
  phoneNumber: string;
  selectedPaymentMethod: 'gcash' | 'credit' | 'cod';
  phoneError: string;
  deliveryError: string;
  onClose: () => void;
  onDeliveryChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhonePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onPaymentMethodChange: (method: 'gcash' | 'credit' | 'cod') => void;
  onConfirm: () => void;
}

export default function CheckoutModal({
  isOpen, cartCount, cartSubtotal, cartTotal,
  deliveryLocation, phoneNumber, selectedPaymentMethod,
  phoneError, deliveryError,
  onClose, onDeliveryChange, onPhoneChange, onPhonePaste,
  onPaymentMethodChange, onConfirm,
}: CheckoutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative flex flex-col max-h-[90vh]"
          >
            <div className="p-8 pb-0">
              <h2 className="text-3xl font-black text-primary mb-2 text-center">Complete Your Order</h2>
              <p className="text-center text-gray-500 mb-4 font-medium italic">Support local, stay digital.</p>
            </div>
            <div className="overflow-y-auto flex-grow px-8">
              <div className="space-y-6 pb-4">
                {/* Order summary */}
                <div className="bg-gray-50 p-6 rounded-3xl space-y-3">
                  <div className="flex justify-between text-sm text-gray-500 font-bold">
                    <span>Items ({cartCount})</span>
                    <span>₱{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 font-bold">
                    <span>Delivery</span>
                    <span>₱50</span>
                  </div>
                  <div className="flex justify-between text-xl font-black text-primary pt-2 border-t border-gray-200">
                    <span>Grand Total</span>
                    <span>₱{cartTotal}</span>
                  </div>
                </div>

                {/* Delivery + phone inputs */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">
                      Delivery Barangay
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={deliveryLocation}
                        onChange={onDeliveryChange}
                        className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 transition-all ${
                          deliveryError
                            ? 'border-red-300 bg-red-50'
                            : deliveryLocation
                              ? 'border-green-300'
                              : 'border-orange-100'
                        }`}
                      >
                        <option value="" disabled>Select your Barangay</option>
                        <option value="Bagumbayan (Poblacion)">Bagumbayan (Poblacion)</option>
                        <option value="Cantil">Cantil</option>
                        <option value="Dangay">Dangay</option>
                        <option value="Libertad">Libertad</option>
                        <option value="Libtong">Libtong</option>
                        <option value="Little Tanauan">Little Tanauan</option>
                        <option value="Mabuhay">Mabuhay</option>
                        <option value="Odiong">Odiong</option>
                        <option value="Paclasan (Poblacion)">Paclasan (Poblacion)</option>
                        <option value="San Aquilino">San Aquilino</option>
                        <option value="San Isidro">San Isidro</option>
                        <option value="San Mariano">San Mariano</option>
                        <option value="San Miguel">San Miguel</option>
                        <option value="San Rafael">San Rafael</option>
                        <option value="Uyao">Uyao</option>
                        <option value="Victoria">Victoria</option>
                        <option value="Happy Valley">Happy Valley</option>
                        <option value="Maraska">Maraska</option>
                        <option value="San Jose">San Jose</option>
                        <option value="San Vicente">San Vicente</option>
                        <option value="Dangay Port / Dalahican">Dangay Port / Dalahican</option>
                        <option value="Uyao North">Uyao North</option>
                      </select>
                      {deliveryError ? (
                        <p className="mt-1 ml-2 text-[10px] text-red-500 font-bold">{deliveryError}</p>
                      ) : (
                        deliveryLocation && (
                          <div className="mt-2 ml-2 text-[10px] text-primary font-black uppercase tracking-tighter opacity-70">
                            Full Address: {deliveryLocation}, Roxas, Or. Mindoro
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">
                      GCash / Contact Number
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="09xx xxxxxxx"
                      value={phoneNumber}
                      maxLength={11}
                      inputMode="numeric"
                      onChange={onPhoneChange}
                      onPaste={onPhonePaste}
                      className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 tracking-widest transition-all ${
                        phoneError
                          ? 'border-red-300 bg-red-50'
                          : phoneNumber.length === 11
                            ? 'border-green-300'
                            : !phoneNumber
                              ? 'border-orange-100'
                              : 'border-orange-200'
                      }`}
                    />
                    <div className="flex items-center justify-between px-1">
                      {phoneError ? (
                        <p className="text-[10px] text-red-500 font-bold">{phoneError}</p>
                      ) : phoneNumber.length === 11 ? (
                        <p className="text-[10px] text-green-600 font-bold">✓ Valid number</p>
                      ) : (
                        <p className="text-[10px] text-gray-400">{phoneNumber.length}/11 digits</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onPaymentMethodChange('gcash')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                        selectedPaymentMethod === 'gcash'
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-gray-50'
                      }`}
                    >
                      <Smartphone className={selectedPaymentMethod === 'gcash' ? 'text-primary' : 'text-gray-400'} />
                      <span className={`text-[10px] font-black uppercase ${selectedPaymentMethod === 'gcash' ? 'text-primary' : 'text-gray-400'}`}>
                        GCash
                      </span>
                    </button>
                    <button
                      onClick={() => onPaymentMethodChange('cod')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                        selectedPaymentMethod === 'cod'
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-gray-50'
                      }`}
                    >
                      <Truck className={selectedPaymentMethod === 'cod' ? 'text-primary' : 'text-gray-400'} />
                      <span className={`text-[10px] font-black uppercase ${selectedPaymentMethod === 'cod' ? 'text-primary' : 'text-gray-400'}`}>
                        COD
                      </span>
                    </button>
                  </div>
                </div>

                {/* Payment instructions */}
                <AnimatePresence mode="wait">
                  {selectedPaymentMethod === 'gcash' && (
                    <motion.div
                      key="gcash-info"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-2"
                    >
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">GCash Instructions</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs">P0V</div>
                        <div className="flex-grow">
                          <p className="text-sm font-bold text-blue-900 leading-tight">Pay to: 0912-345-6789</p>
                          <p className="text-[10px] text-blue-500 font-bold uppercase">Account Name: ROXAS_MARKET_ADMIN</p>
                        </div>
                      </div>
                      <p className="text-[9px] text-blue-400 font-bold italic leading-tight">
                        Please take a screenshot of your receipt. Our rider will verify it upon arrival or via chat.
                      </p>
                    </motion.div>
                  )}
                  {selectedPaymentMethod === 'cod' && (
                    <motion.div
                      key="cod-info"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-green-50 rounded-2xl border border-green-100 space-y-2"
                    >
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">COD Instructions</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-black text-xs">POV</div>
                        <div className="flex-grow">
                          <p className="text-sm font-bold text-green-900 leading-tight">Prepare: ₱{cartTotal}</p>
                          <p className="text-[10px] text-green-500 font-bold uppercase">Pay directly to our Roxas Rider</p>
                        </div>
                      </div>
                      <p className="text-[9px] text-green-400 font-bold italic leading-tight">
                        Rider will contact you once the order is out for delivery. Stay reachable!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-4">
                  <button
                    onClick={onConfirm}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
                  >
                    Confirm Purchase
                  </button>
                </div>
              </div>
            </div>
            <div className="px-8 pb-8 pt-4 bg-white rounded-b-[40px] border-t border-gray-100">
              <button
                onClick={onClose}
                className="w-full mt-2 p-4 text-gray-400 font-bold hover:text-gray-600"
              >
                Cancel and Go Back
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
