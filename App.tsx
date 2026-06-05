import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User as UserType, Product, CartItem, Order, UserRole, Conversation } from './types';
import { api } from './api';
import { io, Socket } from 'socket.io-client';
import { SEED_PRODUCTS } from './server/seed-data';
import logo from '@/Logo.png';
import {
  validatePhone, validatePhoneStrict, validateDelivery,
  validateAuthRegister, validateAuthLogin, validateProduct,
  sanitizePhone,
} from './lib/validation';
import { signInWithGoogle } from './lib/firebase';

// Layout
import Navbar from './components/layout/Navbar';
import MobileMenu from './components/layout/MobileMenu';

// Pages
import MarketplacePage from './components/pages/MarketplacePage';
import OrdersPage from './components/pages/OrdersPage';
import DashboardPage from './components/pages/DashboardPage';
import AuthPage from './components/pages/AuthPage';
import AdminDashboardPage from './components/pages/AdminDashboardPage';
import MessagesPage from './components/pages/MessagesPage';

// Modals
import CartModal from './components/modals/CartModal';
import CheckoutModal from './components/modals/CheckoutModal';
import RolePickerModal from './components/modals/RolePickerModal';
import ReceiptModal from './components/modals/ReceiptModal';
import AddProductModal from './components/modals/AddProductModal';
import EditProductModal from './components/modals/EditProductModal';
import ProductDetailModal from './components/modals/ProductDetailModal';



// --- Types ---
type Section = 'home' | 'orders' | 'dashboard' | 'auth' | 'admin' | 'messages';

// ---------------------------------------------------------------------------
// App — orchestrator that wires hooks, state, and components together.
// No rendering logic lives here; every visual element is a composed module.
// ---------------------------------------------------------------------------

export default function App() {
  // ---- Auth state ----
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);

  // ---- Navigation ----
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ---- Products ----
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'agriculture' | 'craft'>('all');
  const [isAddProductFormOpen, setIsAddProductFormOpen] = useState(false);
  const [isEditProductFormOpen, setIsEditProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // ---- Cart + Checkout ----
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<CartItem | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'gcash' | 'credit' | 'cod'>('cod');
  const [phoneError, setPhoneError] = useState('');
  const [deliveryError, setDeliveryError] = useState('');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentToast, setPaymentToast] = useState<{ type: 'success' | 'failed' | 'expired'; message: string } | null>(null);

  // ---- Orders ----
  const [orders, setOrders] = useState<Order[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  // ---- Chat ----
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingChatConvId, setPendingChatConvId] = useState<string | null>(null);

  // ---- Notifications ----
  const [notifications, setNotifications] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);



  // ===========================================================================
  // Effects
  // ===========================================================================

  // Restore auth from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('sac_user');
    if (savedUser && savedUser !== 'null') {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.id) {
          api.users.get(parsed.id)
            .then((data) => { setCurrentUser(data); setLoading(false); })
            .catch(() => {
              // Don't wipe localStorage on transient API failures (e.g. server busy
              // after PayMongo redirect). Fall back to cached user data instead.
              console.warn('[Auth] Could not refresh user from server, using cached data');
              setCurrentUser(parsed);
              setLoading(false);
            });
        } else { setLoading(false); }
      } catch { setLoading(false); }
    } else { setLoading(false); }
  }, []);

  // Fetch products
  const fetchProducts = () => {
    api.products.list()
      .then((data) => setProducts(data.length > 0 ? data : SEED_PRODUCTS as Product[]))
      .catch(() => setProducts(SEED_PRODUCTS as Product[]));
  };

  useEffect(fetchProducts, []);

  // Fetch orders + conversations when user or section changes
  useEffect(() => {
    if (!currentUser) { setOrders([]); setConversations([]); return; }
    api.orders.list(currentUser.id).then(setOrders).catch(() => setOrders([]));
    api.conversations.list(currentUser.id).then(setConversations).catch(() => setConversations([]));
  }, [currentUser, activeSection]);

  // Handle return from PayMongo GCash redirect — Step 1: Capture URL params immediately
  // This runs once on mount and stores payment params in sessionStorage so they survive
  // even if auth restoration is slow, fails, or causes a re-render before completing.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderId = params.get('order_id');

    if (paymentStatus) {
      sessionStorage.setItem('sac_pending_payment', JSON.stringify({ paymentStatus, orderId }));
      // Clean URL immediately so it's not re-read on subsequent renders
      window.history.replaceState({}, '', '/');
    }
  }, []); // mount-only — no dependency on auth state

  // Handle return from PayMongo GCash redirect — Step 2: Process once user is ready
  // Separated from URL capture so that even if auth is slow, the params are preserved.
  useEffect(() => {
    if (loading) return; // Wait until auth is resolved from localStorage

    const pendingStr = sessionStorage.getItem('sac_pending_payment');
    if (!pendingStr) return;

    const { paymentStatus, orderId } = JSON.parse(pendingStr);
    sessionStorage.removeItem('sac_pending_payment');

    if (paymentStatus === 'success' && orderId) {
      // Fetch the newly created order and show receipt
      const fetchOrder = async () => {
        try {
          // Re-fetch orders to get the new one
          if (currentUser) {
            const allOrders = await api.orders.list(currentUser.id);
            setOrders(allOrders);
            const newOrder = allOrders.find((o: Order) => o.id === orderId || o._id === orderId);
            if (newOrder) {
              setLastOrder(newOrder);
              setIsReceiptOpen(true);
            }
          }
          fetchProducts(); // refresh stock
          setCart([]); // clear cart
          setPaymentToast({ type: 'success', message: 'GCash payment successful! Your order has been placed.' });
        } catch (err) {
          console.error('Error fetching order after payment:', err);
        }
      };
      fetchOrder();
    } else if (paymentStatus === 'failed') {
      setPaymentToast({ type: 'failed', message: 'GCash payment was cancelled or failed. Your cart items are still saved.' });
    } else if (paymentStatus === 'expired') {
      setPaymentToast({ type: 'expired', message: 'Payment session expired. Please try again.' });
    }
  }, [currentUser, loading]); // runs once currentUser is available after redirect return

  // Auto-dismiss payment toast
  useEffect(() => {
    if (!paymentToast) return;
    const timer = setTimeout(() => setPaymentToast(null), 6000);
    return () => clearTimeout(timer);
  }, [paymentToast]);

  // Handle global socket connection for notifications
  useEffect(() => {
    if (!currentUser) {
      socketRef.current?.disconnect();
      return;
    }
    
    // Connect and register
    socketRef.current = io();
    socketRef.current.emit('user_connected', currentUser.id);

    // Listen for new sales
    socketRef.current.on('new_order', (data: { orderId: string; productName: string }) => {
      setNotifications((prev) => [{
        id: Date.now().toString(),
        type: 'sale',
        message: `New sale for ${data.productName}!`,
        read: false,
        time: new Date().toISOString()
      }, ...prev]);
    });

    // Listen for new messages
    socketRef.current.on('new_message_notification', (data: { conversationId: string; senderName: string; text: string }) => {
      setNotifications((prev) => [{
        id: Date.now().toString(),
        type: 'message',
        message: `New message from ${data.senderName}: ${data.text}`,
        read: false,
        time: new Date().toISOString()
      }, ...prev]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [currentUser]);

  // Load cart when user changes
  useEffect(() => {
    const key = currentUser ? `sac_cart_${currentUser.id}` : 'sac_cart_guest';
    const saved = localStorage.getItem(key);
    setCart(saved ? JSON.parse(saved) : []);
  }, [currentUser]);

  // Pre-fill delivery details from saved user profile
  useEffect(() => {
    if (currentUser?.deliveryLocation) setDeliveryLocation(currentUser.deliveryLocation);
    if (currentUser?.phoneNumber) setPhoneNumber(currentUser.phoneNumber);
  }, [currentUser?.id]);

  // Persist cart
  useEffect(() => {
    const key = currentUser ? `sac_cart_${currentUser.id}` : 'sac_cart_guest';
    localStorage.setItem(key, JSON.stringify(cart));
  }, [cart, currentUser]);

  // ===========================================================================
  // Derived state
  // ===========================================================================

  const filteredProducts = useMemo(() =>
    products.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.producer && p.producer.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }), [products, searchQuery, categoryFilter]);

  const cartCount = cart.reduce((t, i) => t + i.quantity, 0);
  const cartSubtotal = cart.reduce((t, i) => t + i.price * i.quantity, 0);
  const cartTotal = cartSubtotal + (cartSubtotal > 0 ? 50 : 0);

  // Checkout items: either the single buy-now product or the full cart
  const checkoutItems: CartItem[] = buyNowProduct ? [buyNowProduct] : cart;
  const checkoutCount = checkoutItems.reduce((t, i) => t + i.quantity, 0);
  const checkoutSubtotal = checkoutItems.reduce((t, i) => t + i.price * i.quantity, 0);
  const checkoutTotal = checkoutSubtotal + (checkoutSubtotal > 0 ? 50 : 0);

  // ===========================================================================
  // Handlers
  // ===========================================================================

  // ---- Cart ----
  const addToCart = (product: Product) => {
    if (!currentUser) { setActiveSection('auth'); return; }
    if (currentUser.role !== 'buyer') { alert('Only buyers can purchase items.'); return; }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const updateCartQuantity = (id: string, delta: number) =>
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));

  const buyNow = (product: Product) => {
    if (!currentUser) { setActiveSection('auth'); return; }
    if (currentUser.role !== 'buyer') { alert('Only buyers can purchase items.'); return; }
    setBuyNowProduct({ ...product, quantity: 1 });
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutClose = () => {
    setIsCheckoutModalOpen(false);
    setBuyNowProduct(null);
  };

  const handleCheckoutQuantityUpdate = (id: string, delta: number) => {
    if (buyNowProduct && buyNowProduct.id === id) {
      setBuyNowProduct((prev) => prev ? { ...prev, quantity: Math.max(1, prev.quantity + delta) } : prev);
    } else {
      updateCartQuantity(id, delta);
    }
  };

  // ---- Checkout form ----
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = sanitizePhone(e.target.value);
    setPhoneNumber(raw);
    setPhoneError(validatePhone(raw) || '');
  };

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = sanitizePhone(e.clipboardData.getData('text'));
    setPhoneNumber(pasted);
    setPhoneError(validatePhone(pasted) || '');
  };

  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value.slice(0, 100);
    setDeliveryLocation(val);
    setDeliveryError(validateDelivery(val) || '');
  };

  // ---- Checkout submit ----
  const handleCheckout = async () => {
    if (!currentUser) return;
    let hasError = false;
    const delErr = validateDelivery(deliveryLocation);
    if (delErr) { setDeliveryError(delErr); hasError = true; }
    const phErr = validatePhoneStrict(phoneNumber.replace(/\D/g, ''));
    if (phErr) { setPhoneError(phErr); hasError = true; }
    if (hasError) return;

    // ------ GCash via PayMongo ------
    if (selectedPaymentMethod === 'gcash') {
      setIsPaymentProcessing(true);
      try {
        const { checkoutUrl } = await api.payments.createGcashSource({
          userId: currentUser.id,
          userName: currentUser.fullName,
          items: checkoutItems.map((i) => ({ ...i, id: i.id })),
          subtotal: checkoutSubtotal,
          deliveryFee: 20,
          total: checkoutTotal,
          deliveryLocation: `${deliveryLocation}, Roxas, Or. Mindoro`,
          phoneNumber,
        });

        // Persist delivery details before redirecting
        if (
          deliveryLocation !== currentUser.deliveryLocation ||
          phoneNumber !== currentUser.phoneNumber
        ) {
          try {
            const updatedUser = await api.users.save({
              ...currentUser,
              deliveryLocation,
              phoneNumber,
            });
            setCurrentUser(updatedUser);
            localStorage.setItem('sac_user', JSON.stringify(updatedUser));
          } catch (err) {
            console.warn('Could not persist delivery details:', err);
          }
        }

        // Redirect to PayMongo GCash checkout
        window.location.href = checkoutUrl;
      } catch (error: any) {
        console.error('GCash payment error:', error);
        setIsPaymentProcessing(false);
        alert(error.message || 'Failed to initiate GCash payment. Please try again.');
      }
      return;
    }

    // ------ COD (existing flow) ------
    try {
      const data = await api.orders.create({
        userId: currentUser.id, userName: currentUser.fullName,
        items: checkoutItems.map((i) => ({ ...i, id: i.id })),
        subtotal: checkoutSubtotal, deliveryFee: 50, total: checkoutTotal,
        paymentMethod: selectedPaymentMethod, status: 'pending',
        deliveryLocation: `${deliveryLocation}, Roxas, Or. Mindoro`,
        phoneNumber, orderDate: new Date().toISOString(),
      } as any);
      if (!buyNowProduct) setCart([]); // Only clear cart if checking out from cart
      setBuyNowProduct(null); setIsCheckoutModalOpen(false);
      setLastOrder(data); setIsReceiptOpen(true);
      fetchProducts();

      // Persist delivery details on user profile if changed
      if (
        deliveryLocation !== currentUser.deliveryLocation ||
        phoneNumber !== currentUser.phoneNumber
      ) {
        try {
          const updatedUser = await api.users.save({
            ...currentUser,
            deliveryLocation,
            phoneNumber,
          });
          setCurrentUser(updatedUser);
          localStorage.setItem('sac_user', JSON.stringify(updatedUser));
        } catch (err) {
          console.warn('Could not persist delivery details:', err);
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    }
  };

  // ---- Auth ----
  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    const fd = new FormData(e.currentTarget);
    const email = (fd.get('email') as string).trim();
    const password = fd.get('password') as string;
    const fullName = (fd.get('fullName') as string || '').trim();
    const username = (fd.get('username') as string || '').trim();
    const role = fd.get('role') as string;


    if (authMode === 'register') {
      const err = validateAuthRegister({ fullName, username, email, password });
      if (err) { setAuthError(err); return; }
    } else {
      const err = validateAuthLogin({ email, password });
      if (err) { setAuthError(err); return; }
    }

    try {
      const data = authMode === 'login'
        ? await api.auth.login(email, password)
        : await api.auth.register({ email, username, password, fullName, role });

      if (authMode === 'register' && !data.role) {
        setCurrentUser(data); setIsRolePickerOpen(true);
      } else {
        setCurrentUser(data);
        localStorage.setItem('sac_user', JSON.stringify(data));
        setActiveSection('home');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthError('');
      const firebaseUser = await signInWithGoogle();
      
      if (firebaseUser.email) {
        const data = await api.auth.googleLogin({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          uid: firebaseUser.uid
        });

        if (data.role === 'buyer' && authMode === 'register') {
          setCurrentUser(data); 
          setIsRolePickerOpen(true);
        } else {
          setCurrentUser(data);
          localStorage.setItem('sac_user', JSON.stringify(data));
          setActiveSection('home');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sac_user');
    setActiveSection('home');
  };

  const handlePickRole = async (role: UserRole) => {
    if (!currentUser) return;
    try {
      const saved = await api.users.save({
        ...currentUser, role, location: 'Roxas, Oriental Mindoro',
        joinedDate: new Date().toLocaleDateString(),
      });
      setCurrentUser(saved);
      localStorage.setItem('sac_user', JSON.stringify(saved));
      setIsRolePickerOpen(false);
      setActiveSection('home');
    } catch (error) { console.error('Error saving user role:', error); }
  };

  // ---- Chat ----
  const handleStartChat = async (product: Product) => {
    if (!currentUser) { setActiveSection('auth'); return; }
    if (currentUser.id === product.producerId) { alert("You can't chat with yourself!"); return; }
    try {
      const conv = await api.conversations.create({
        participants: [currentUser.id, product.producerId],
        participantNames: { [currentUser.id]: currentUser.fullName, [product.producerId]: product.producer },
        productId: product.id || product._id || '',
        productName: product.name,
      });
      // Ensure the conversation is in the list, then navigate to Messages
      setConversations((prev) => {
        const convId = conv._id || conv.id;
        if (prev.find(c => (c._id || c.id) === convId)) return prev;
        return [conv, ...prev];
      });
      setPendingChatConvId(conv._id || conv.id);
      setActiveSection('messages');
    } catch (err) { console.error('Chat error:', err); }
  };

  // ---- Add product ----
  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const price = Number(fd.get('price'));
    const stock = Number(fd.get('stock'));
    const description = (fd.get('description') as string).trim();
    const imageFile = fd.get('image') as File | null;

    const errs = validateProduct({ name, price, stock, description });
    if (Object.keys(errs).length > 0) { setProductErrors(errs); return; }
    setProductErrors({});

    let image = 'https://images.unsplash.com/photo-1596456930735-36b4a4b974c4?w=400';
    if (imageFile && imageFile.size > 0) {
      const getBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
      try {
        image = await getBase64(imageFile);
      } catch (err) {
        console.error("Image read error", err);
      }
    }

    try {
      await api.products.create({
        name, price, stock, sold: 0,
        category: currentUser.role === 'farmer' ? 'agriculture' : 'craft',
        producer: currentUser.fullName, producerId: currentUser.id,
        image,
        description,
      });
      setIsAddProductFormOpen(false);
      fetchProducts();
    } catch (error) { console.error('Error adding product:', error); }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const counter = document.getElementById('desc-counter');
    if (counter) counter.textContent = `${e.target.value.length}/500`;
    if (e.target.value.length >= 500) setProductErrors((p) => ({ ...p, description: 'Maximum 500 characters reached.' }));
    else setProductErrors((p) => ({ ...p, description: '' }));
  };

  const handleEditProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !productToEdit) return;
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const price = Number(fd.get('price'));
    const stock = Number(fd.get('stock'));
    const description = (fd.get('description') as string).trim();
    const imageFile = fd.get('image') as File | null;

    const errs = validateProduct({ name, price, stock, description });
    if (Object.keys(errs).length > 0) { setProductErrors(errs); return; }
    setProductErrors({});

    let image = productToEdit.image;
    if (imageFile && imageFile.size > 0) {
      const getBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
      try {
        image = await getBase64(imageFile);
      } catch (err) {
        console.error("Image read error", err);
      }
    }

    try {
      await api.products.update(productToEdit.id || productToEdit._id || '', {
        name, price, stock, description, image
      });
      setIsEditProductFormOpen(false);
      setProductToEdit(null);
      fetchProducts();
    } catch (error) { console.error('Error updating product:', error); }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!currentUser) return;
    try {
      await api.products.delete(product.id || product._id || '');
      fetchProducts();
    } catch (error) { console.error('Error deleting product:', error); }
  };

  // ---- Navigation helpers ----
  const navigate = (section: Section) => { setActiveSection(section); setIsMenuOpen(false); };

  // ---- Order status update (2.2 + 2.3) ----
  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    const updated = await api.orders.updateStatus(orderId, status);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
    if (status === 'cancelled') fetchProducts(); // restore stock display
  };

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="min-h-screen flex flex-col font-sans bg-light-bg text-text-main">
      <Navbar
        currentUser={currentUser} activeSection={activeSection} cartCount={cartCount}
        onNavigate={navigate} onCartOpen={() => setIsCartModalOpen(true)}
        onLogout={handleLogout} onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen}
        notifications={notifications}
        onMarkNotificationsRead={() => setNotifications(prev => prev.map(n => ({...n, read: true})))}
      />
      <MobileMenu isOpen={isMenuOpen} currentUser={currentUser} onNavigate={navigate} onLogout={handleLogout} />

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4 animate-pulse">
            <img src={logo} className="h-20 w-20 object-contain bg-white p-3.5 rounded-full shadow-lg border border-gray-100" alt="Loading Logo" />
            <div className="text-primary font-black text-xl tracking-tight">SmartAgriCraft</div>
          </div>
        ) : (
          <>
            {activeSection === 'home' && (
              <MarketplacePage
                currentUser={currentUser} filteredProducts={filteredProducts}
                searchQuery={searchQuery} categoryFilter={categoryFilter}
                onSearchChange={setSearchQuery} onCategoryChange={setCategoryFilter}
                onAddToCart={addToCart} onBuyNow={buyNow} onStartChat={handleStartChat}
                onAddProductOpen={() => setIsAddProductFormOpen(true)}
                onEditProductOpen={(p) => { setProductToEdit(p); setIsEditProductFormOpen(true); }}
                onProductClick={(p) => setSelectedProduct(p)}
              />
            )}
            {activeSection === 'orders' && currentUser && (
              <OrdersPage
                orders={orders}
                currentUser={currentUser}
                onViewReceipt={(o) => { setLastOrder(o); setIsReceiptOpen(true); }}
                onGoShopping={() => setActiveSection('home')}
                onUpdateOrderStatus={handleUpdateOrderStatus}
              />
            )}
            {activeSection === 'dashboard' && currentUser && (
              <DashboardPage
                currentUser={currentUser} products={products} orders={orders}
                conversations={conversations} cartSubtotal={cartSubtotal}
                onAddProductOpen={() => setIsAddProductFormOpen(true)}
                onEditProductOpen={(p) => { setProductToEdit(p); setIsEditProductFormOpen(true); }}
                onDeleteProduct={handleDeleteProduct}
                onOpenConversation={(conv) => {
                  setPendingChatConvId(conv._id || conv.id);
                  navigate('messages');
                }}
              />
            )}
            {activeSection === 'auth' && (
              <AuthPage
                authMode={authMode} authError={authError}
                onSubmit={handleAuthSubmit}
                onToggleMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                onGoogleSignIn={handleGoogleSignIn}
              />
            )}
            {activeSection === 'admin' && currentUser?.role === 'admin' && (
              <AdminDashboardPage currentUser={currentUser} onNavigate={navigate} />
            )}
            {activeSection === 'messages' && currentUser && (
              <MessagesPage
                currentUser={currentUser}
                conversations={conversations}
                onConversationsChange={setConversations}
                socketRef={socketRef}
                products={products}
                initialConversationId={pendingChatConvId}
                onInitialConversationHandled={() => setPendingChatConvId(null)}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CartModal
        isOpen={isCartModalOpen} cart={cart} cartSubtotal={cartSubtotal} cartTotal={cartTotal}
        onClose={() => setIsCartModalOpen(false)} onRemove={removeFromCart}
        onUpdateQuantity={updateCartQuantity}
        onCheckout={() => { setIsCartModalOpen(false); setBuyNowProduct(null); setIsCheckoutModalOpen(true); }}
      />
      <CheckoutModal
        isOpen={isCheckoutModalOpen} cart={checkoutItems} cartCount={checkoutCount} cartSubtotal={checkoutSubtotal} cartTotal={checkoutTotal}
        deliveryLocation={deliveryLocation} phoneNumber={phoneNumber}
        selectedPaymentMethod={selectedPaymentMethod}
        phoneError={phoneError} deliveryError={deliveryError}
        onClose={handleCheckoutClose}
        onDeliveryChange={handleDeliveryChange} onPhoneChange={handlePhoneChange}
        onPhonePaste={handlePhonePaste}
        onPaymentMethodChange={setSelectedPaymentMethod} onUpdateQuantity={handleCheckoutQuantityUpdate}
        onConfirm={handleCheckout}
        isProcessing={isPaymentProcessing}
      />
      <RolePickerModal isOpen={isRolePickerOpen} onPickRole={handlePickRole} />
      <ReceiptModal
        isOpen={isReceiptOpen} order={lastOrder}
        onClose={() => setIsReceiptOpen(false)}
        onViewOrders={() => { setIsReceiptOpen(false); setActiveSection('orders'); }}
      />
      <ProductDetailModal
        product={selectedProduct}
        currentUser={currentUser}
        hasPurchased={orders.some(o => o.items.some(i => i.id === selectedProduct?.id) && o.status === 'delivered')}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        onBuyNow={buyNow}
        onStartChat={handleStartChat}
        onEditProductOpen={(p) => { setProductToEdit(p); setIsEditProductFormOpen(true); }}
      />
      {currentUser && isAddProductFormOpen && (
        <AddProductModal
          isOpen={isAddProductFormOpen} currentUser={currentUser} productErrors={productErrors}
          onClose={() => setIsAddProductFormOpen(false)} onSubmit={handleAddProduct}
          onClearError={(f) => setProductErrors((p) => ({ ...p, [f]: '' }))}
          onDescriptionChange={handleDescriptionChange}
        />
      )}
      {currentUser && isEditProductFormOpen && productToEdit && (
        <EditProductModal
          isOpen={isEditProductFormOpen} currentUser={currentUser} product={productToEdit} productErrors={productErrors}
          onClose={() => { setIsEditProductFormOpen(false); setProductToEdit(null); }} onSubmit={handleEditProductSubmit}
          onClearError={(f) => setProductErrors((p) => ({ ...p, [f]: '' }))}
          onDescriptionChange={handleDescriptionChange}
        />
      )}



      {/* Payment toast notification */}
      {paymentToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[500] max-w-md w-full mx-4 p-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-[slideDown_0.3s_ease-out] ${
          paymentToast.type === 'success'
            ? 'bg-green-500 text-white'
            : paymentToast.type === 'failed'
              ? 'bg-red-500 text-white'
              : 'bg-yellow-500 text-white'
        }`}>
          <span className="text-lg">{paymentToast.type === 'success' ? '✅' : paymentToast.type === 'failed' ? '❌' : '⏳'}</span>
          <span className="flex-grow">{paymentToast.message}</span>
          <button onClick={() => setPaymentToast(null)} className="text-white/80 hover:text-white font-black">✕</button>
        </div>
      )}
    </div>
  );
}
