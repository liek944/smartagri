import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, 
  ShoppingCart, 
  Receipt, 
  LayoutDashboard, 
  LogIn, 
  LogOut, 
  PlusCircle, 
  Search, 
  Trash2, 
  Edit, 
  CheckCircle,
  Package,
  MapPin,
  Menu,
  X,
  CreditCard,
  Truck,
  Smartphone,
  MessageSquare,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType, Product, CartItem, Order, UserRole, Conversation } from './types';
import { INITIAL_PRODUCTS } from './constants';
import ChatWindow from './components/ChatWindow';

export default function App() {
  // State
  const [activeSection, setActiveSection] = useState<'home' | 'orders' | 'dashboard' | 'auth'>('home');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('sac_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'agriculture' | 'craft'>('all');
  
  // UI States
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isAddProductFormOpen, setIsAddProductFormOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'gcash' | 'credit' | 'cod'>('cod');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');

  // Auth Effect
  useEffect(() => {
    const savedUser = localStorage.getItem('sac_user');
    if (savedUser && savedUser !== 'null') {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id) {
          fetch(`/api/users/${parsed.id}`)
            .then(res => res.json())
            .then(data => {
              if (data && !data.error) {
                setCurrentUser(data);
              } else {
                localStorage.removeItem('sac_user');
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));
        } else {
          setLoading(false);
        }
      } catch (e) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Data Sync
  const fetchProducts = () => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          // Map _id to id
          const mapped = data.map((p: any) => ({ ...p, id: p._id }));
          setProducts(mapped);
        } else {
          setProducts(INITIAL_PRODUCTS);
        }
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setConversations([]);
      return;
    }

    // Fetch Orders
    fetch(`/api/orders/${currentUser?.id}`)
      .then(res => res.json())
      .then(data => setOrders(Array.isArray(data) ? data.map((o:any) => ({...o, id: o._id})) : []));

    // Fetch Conversations
    fetch(`/api/conversations/${currentUser?.id}`)
      .then(res => res.json())
      .then(data => setConversations(Array.isArray(data) ? data.map((c:any) => ({...c, id: c._id})) : []));

  }, [currentUser, activeSection]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('sac_cart', JSON.stringify(cart));
  }, [cart]);

  // Derived State
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartTotal = cartSubtotal + (cartSubtotal > 0 ? 50 : 0);

  // Handlers
  const addToCart = (product: Product) => {
    if (!currentUser) {
      setActiveSection('auth');
      return;
    }
    if (currentUser.role !== 'buyer') {
      alert('Only buyers can purchase items.');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const buyNow = (product: Product) => {
    if (!currentUser) {
      setActiveSection('auth');
      return;
    }
    if (currentUser.role !== 'buyer') {
      alert('Only buyers can purchase items.');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev;
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCheckoutModalOpen(true);
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleCheckout = async () => {
    if (!currentUser) return;

    if (!deliveryLocation || deliveryLocation.trim() === '') {
      alert('Please enter your delivery barangay in Roxas first.');
      return;
    }

    if (!phoneNumber || phoneNumber.trim() === '') {
      alert('Please enter your GCash or contact number.');
      return;
    }

    const newOrder = {
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      items: cart.map(item => ({ ...item, id: item.id })), // Ensure id is passed properly
      subtotal: cartSubtotal,
      deliveryFee: 50,
      total: cartTotal,
      paymentMethod: selectedPaymentMethod,
      status: 'pending',
      deliveryLocation: `${deliveryLocation}, Roxas, Or. Mindoro`,
      phoneNumber,
      orderDate: new Date().toISOString()
    };
    
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      const data = await res.json();

      if (res.ok) {
        setCart([]);
        setIsCheckoutModalOpen(false);
        setLastOrder({ ...data, id: data._id });
        setIsReceiptOpen(true);
        fetchProducts(); // Refresh products for stock
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Checkout failed. Please try again.');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const role = formData.get('role') as string;

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = authMode === 'login' ? { email, password } : { email, username: formData.get('username'), password, fullName, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }

      if (authMode === 'register' && !data.role) {
        setCurrentUser(data);
        setIsRolePickerOpen(true);
      } else {
        setCurrentUser(data);
        localStorage.setItem('sac_user', JSON.stringify(data));
        setActiveSection('home');
      }
    } catch (err) {
      setAuthError('An unexpected error occurred');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sac_user');
    setActiveSection('home');
  };

  const handlePickRole = async (role: UserRole) => {
    if (!currentUser) return;
    
    const newUser: UserType = {
      ...currentUser,
      role,
      location: 'Roxas, Oriental Mindoro',
      joinedDate: new Date().toLocaleDateString()
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const saved = await res.json();
      setCurrentUser(saved);
      localStorage.setItem('sac_user', JSON.stringify(saved));
      setIsRolePickerOpen(false);
      setActiveSection('home');
    } catch (error) {
      console.error('Error saving user role:', error);
    }
  };

  const handleStartChat = async (product: Product) => {
    if (!currentUser) {
      setActiveSection('auth');
      return;
    }

    if (currentUser?.id === product.producerId) {
      alert("You can't chat with yourself!");
      return;
    }

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: [currentUser?.id, product.producerId],
          participantNames: {
            [currentUser?.id || '']: currentUser?.fullName,
            [product.producerId]: product.producer
          },
          productId: product.id || product._id,
          productName: product.name
        })
      });
      const conv = await res.json();
      setActiveConversation({...conv, id: conv._id});
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(e.currentTarget);
    const productData: Omit<Product, 'id'> = {
      name: formData.get('name') as string,
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
      sold: 0,
      category: formData.get('category') as 'agriculture' | 'craft',
      producer: currentUser?.fullName,
      producerId: currentUser?.id,
      image: "https://images.unsplash.com/photo-1596456930735-36b4a4b974c4?w=400",
      description: formData.get('description') as string
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      if (res.ok) {
        setIsAddProductFormOpen(false);
        fetchProducts();
      }
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-light-bg text-text-main">
      {/* Navbar */}
      <nav className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveSection('home')}>
            <div className="bg-white p-1 rounded-lg">
              <Store className="text-primary h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">SmartAgriCraft</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-medium">
            <button onClick={() => setActiveSection('home')} className={`hover:bg-white/10 px-3 py-2 rounded-md transition-colors ${activeSection === 'home' ? 'bg-white/20' : ''}`}>Marketplace</button>
            {currentUser && currentUser.role && (
              <>
                <button onClick={() => setActiveSection('orders')} className={`hover:bg-white/10 px-3 py-2 rounded-md transition-colors ${activeSection === 'orders' ? 'bg-white/20' : ''}`}>Orders</button>
                <button onClick={() => setActiveSection('dashboard')} className={`hover:bg-white/10 px-3 py-2 rounded-md transition-colors ${activeSection === 'dashboard' ? 'bg-white/20' : ''}`}>Dashboard</button>
              </>
            )}
            {!currentUser ? (
              <button onClick={() => setActiveSection('auth')} className="flex items-center gap-2 bg-secondary/80 hover:bg-secondary px-4 py-2 rounded-full transition-all shadow-sm"><LogIn size={18} /> Login</button>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{currentUser.fullName}</span>
                {currentUser.role === 'buyer' && (
                  <button onClick={() => setIsCartModalOpen(true)} className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ShoppingCart size={22} />
                    {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-primary">{cartCount}</span>}
                  </button>
                )}
                <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Logout"><LogOut size={22} /></button>
              </div>
            )}
          </div>
          
          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X /> : <Menu />}</button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="md:hidden bg-primary text-white shadow-xl absolute w-full z-40 p-4 space-y-4">
            <button onClick={() => {setActiveSection('home'); setIsMenuOpen(false)}} className="block w-full text-left py-2 border-b border-white/10">Marketplace</button>
            {currentUser && currentUser.role && (
              <>
                <button onClick={() => {setActiveSection('orders'); setIsMenuOpen(false)}} className="block w-full text-left py-2 border-b border-white/10">Orders</button>
                <button onClick={() => {setActiveSection('dashboard'); setIsMenuOpen(false)}} className="block w-full text-left py-2 border-b border-white/10">Dashboard</button>
                <button onClick={() => {handleLogout(); setIsMenuOpen(false)}} className="block w-full text-left py-2 text-red-200">Logout</button>
              </>
            )}
            {!currentUser && <button onClick={() => {setActiveSection('auth'); setIsMenuOpen(false)}} className="block w-full text-left py-2">Login / Register</button>}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-primary font-bold">Loading SmartAgriCraft...</div>
        ) : (
          <>
            {activeSection === 'home' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <header className="mb-10 text-center py-10 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10">
                  <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 tracking-tight">Marketplace</h1>
                  <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-8">Oriental Mindoro's digital hub for local farmers and artisans.</p>
                  <div className="max-w-xl mx-auto flex flex-col md:flex-row gap-4 px-4 bg-white p-3 rounded-2xl shadow-lg border border-gray-100">
                    <div className="flex-grow relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border-none focus:ring-0 text-gray-700" />
                    </div>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)} className="bg-gray-50 border-none rounded-xl focus:ring-0 text-gray-700 font-medium">
                      <option value="all">All Categories</option>
                      <option value="agriculture">Agricultural</option>
                      <option value="craft">Crafts</option>
                    </select>
                  </div>
                  {currentUser && (currentUser.role === 'farmer' || currentUser.role === 'artisan') && (
                    <button onClick={() => setIsAddProductFormOpen(true)} className="mt-8 flex items-center gap-2 mx-auto bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                      <PlusCircle size={20} /> Add Product
                    </button>
                  )}
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {filteredProducts.map(product => (
                    <motion.div key={product.id} whileHover={{ y: -5 }} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-50 flex flex-col">
                      <div className="h-56 bg-gray-100 relative group">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">{product.category.toUpperCase()}</div>
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{product.name}</h3>
                        <p className="text-sm text-gray-500 mb-3 truncate">By {product.producer}</p>
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-2xl font-black text-primary">₱{product.price}</span>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {currentUser?.role === 'buyer' ? (
                            <>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => buyNow(product)} 
                                  disabled={product.stock === 0} 
                                  className="flex-grow bg-primary text-white py-3 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform disabled:bg-gray-300 disabled:scale-100 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                                >
                                  Order Now
                                </button>
                                <button 
                                  onClick={() => addToCart(product)} 
                                  disabled={product.stock === 0} 
                                  className="p-3 bg-primary/10 text-primary rounded-2xl hover:bg-primary/20 transition-colors disabled:opacity-50" 
                                  title="Add to Cart"
                                >
                                  <ShoppingCart size={20} />
                                </button>
                                <button onClick={() => handleStartChat(product)} className="p-3 bg-secondary/10 text-secondary rounded-2xl hover:bg-secondary/20 transition-colors" title="Message Seller"><MessageCircle size={20} /></button>
                              </div>
                            </>
                          ) : currentUser?.id === product.producerId ? (
                            <button className="w-full py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold border-2 border-dashed border-gray-200 hover:bg-white hover:border-primary hover:text-primary transition-all">
                              Manage your {product.name}
                            </button>
                          ) : currentUser?.role === 'farmer' || currentUser?.role === 'artisan' ? (
                            <div className="w-full text-center text-xs font-bold text-gray-300 py-3 border border-gray-100 rounded-2xl">
                              Market Listing View
                            </div>
                          ) : (
                            <div className="w-full text-center text-sm italic text-gray-400 py-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                              Login to purchase
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeSection === 'orders' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-black text-primary mb-8 flex items-center gap-3"><Receipt size={32} /> My Orders</h2>
                {orders.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <Package size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-500">No orders yet</h3>
                    <button onClick={() => setActiveSection('home')} className="mt-4 text-primary font-bold hover:underline">Start Shopping</button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {orders.map(order => (
                      <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:-translate-y-1 transition-transform">
                        <div className="flex justify-between items-start mb-6 border-b border-gray-50 pb-4">
                          <div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">{order.id}</span>
                            <p className="text-sm text-gray-600 mt-1">{new Date(order.orderDate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{order.status}</span>
                            <button 
                              onClick={() => {setLastOrder(order); setIsReceiptOpen(true)}}
                              className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1"
                            >
                              <Receipt size={12} /> View Receipt
                            </button>
                          </div>
                        </div>
                        <div className="space-y-4 mb-6">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
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
                          <div className="text-sm text-gray-500 uppercase font-bold tracking-tighter">Pay via {order.paymentMethod.toUpperCase()}</div>
                          <div className="text-xl font-black text-primary">Total: ₱{order.total}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeSection === 'dashboard' && currentUser && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-3xl font-black text-primary mb-10 flex items-center gap-3"><LayoutDashboard size={32} /> Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="md:col-span-1 space-y-8">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50 text-center">
                      <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center"><span className="text-3xl font-black text-primary">{currentUser.fullName[0]}</span></div>
                      <h3 className="text-xl font-black text-gray-800">{currentUser.fullName}</h3>
                      <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mt-1">{currentUser.role}</p>
                      <div className="mt-6 pt-6 border-t border-gray-50 space-y-3 text-left">
                        <p className="flex items-center gap-2 text-sm text-gray-600"><MapPin size={16} /> {currentUser.location}</p>
                        <p className="text-xs text-gray-400 text-center">Joined {currentUser.joinedDate}</p>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-3 space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {(currentUser.role === 'farmer' || currentUser.role === 'artisan') ? (
                        <>
                          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Sales</p>
                            <p className="text-3xl font-black text-primary">₱{products.reduce((acc, p) => acc + (p.sold * p.price), 0).toLocaleString()}</p>
                          </div>
                          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Items Sold</p>
                            <p className="text-3xl font-black text-primary">{products.reduce((acc, p) => acc + p.sold, 0)}</p>
                          </div>
                          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Active Listings</p>
                            <p className="text-3xl font-black text-primary">{products.filter(p => p.producerId === currentUser?.id).length}</p>
                          </div>
                          <button 
                            onClick={() => setIsAddProductFormOpen(true)}
                            className="bg-primary text-white p-6 rounded-3xl shadow-lg flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                          >
                            <PlusCircle size={32} />
                            <span className="font-black uppercase tracking-widest text-xs">Add New Product</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Orders Placed</p>
                            <p className="text-3xl font-black text-primary">{orders.length}</p>
                          </div>
                          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Items Bought</p>
                            <p className="text-3xl font-black text-primary">{orders.reduce((acc, o) => acc + o.items.reduce((ia, i) => ia + i.quantity, 0), 0)}</p>
                          </div>
                          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Cart Value</p>
                            <p className="text-3xl font-black text-primary">₱{cartSubtotal}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
                      <h4 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2"><MessageSquare size={20} className="text-primary"/> Recent Chats</h4>
                      {conversations.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 italic">No conversations yet</div>
                      ) : (
                        <div className="space-y-4">
                          {conversations.map(conv => (
                            <button key={conv.id} onClick={() => setActiveConversation(conv)} className="w-full text-left p-4 bg-gray-50 rounded-2xl flex justify-between items-center hover:bg-gray-100 transition-colors">
                              <div>
                                <p className="font-bold text-gray-800">{Object.entries(conv.participantNames).find(([uid]) => uid !== currentUser?.id)?.[1] || 'User'}</p>
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{conv.lastMessage || 'No messages yet'}</p>
                              </div>
                              {conv.productName && <span className="text-[10px] bg-white px-2 py-1 rounded-full font-bold text-primary">Re: {conv.productName}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'auth' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-[1000px] mx-auto py-12 flex flex-col md:flex-row items-center gap-12 lg:gap-24">
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-6xl font-black text-primary mb-6 tracking-tighter">SmartAgriCraft</h2>
                  <p className="text-2xl font-medium text-gray-700 leading-tight">Connect with local farmers and artisans in Oriental Mindoro. Authentically local.</p>
                </div>
                
                <div className="w-full max-w-[400px]">
                  <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      {authMode === 'register' && (
                        <>
                          <input name="fullName" required placeholder="Full Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      <input name="username" required placeholder="Username" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                          <div className="space-y-2 px-1">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select your role</p>
                            <div className="flex gap-2">
                              {['buyer', 'farmer', 'artisan'].map((r) => (
                                <label key={r} className="flex-1 cursor-pointer">
                                  <input type="radio" name="role" value={r} required defaultChecked={r === 'buyer'} className="peer hidden" />
                                  <div className="text-center py-2 border rounded-lg text-xs font-bold capitalize bg-white peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all text-gray-600">
                                    {r}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      <input name="email" type={authMode === 'login' ? 'text' : 'email'} required placeholder={authMode === 'login' ? "Email or Username" : "Email Address"} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      <input name="password" type="password" required placeholder="Password" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      
                      {authError && <p className="text-red-500 text-xs font-bold pl-1">{authError}</p>}
                      
                      <button type="submit" className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/95 transition-all font-bold text-lg">
                        {authMode === 'login' ? 'Log In' : 'Sign Up'}
                      </button>
                      
                      <div className="text-center py-2">
                        <button type="button" className="text-primary text-sm font-medium hover:underline">Forgotten password?</button>
                      </div>
                      
                      <div className="border-t border-gray-200 my-4"></div>
                      
                      <div className="text-center">
                        <button 
                          type="button" 
                          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                          className="bg-secondary/80 hover:bg-secondary text-white px-6 py-3 rounded-lg font-bold transition-all text-sm"
                        >
                          {authMode === 'login' ? 'Create New Account' : 'Back to Login'}
                        </button>
                      </div>
                    </form>
                  </div>
                  <p className="text-center text-sm mt-6 text-gray-600"><span className="font-bold">Create a Page</span> for a celebrity, brand or business.</p>
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col h-[80vh] md:h-auto md:max-h-[80vh]">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <h2 className="text-2xl font-black text-primary">Shopping Cart</h2>
                <button onClick={() => setIsCartModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X /></button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 italic">Your cart is empty</div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-800">{item.name}</h4>
                        <p className="text-sm text-primary font-black">₱{item.price}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => updateCartQuantity(item.id, -1)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">-</button>
                          <span className="font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.id, 1)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">+</button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-500 p-2"><Trash2 size={20} /></button>
                    </div>
                  ))
                )}
              </div>
              
              {cart.length > 0 && (
                <div className="p-6 bg-white border-t space-y-4">
                  <div className="flex justify-between font-bold text-gray-600">
                    <span>Subtotal</span>
                    <span>₱{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-600">
                    <span>Delivery Fee</span>
                    <span>₱50</span>
                  </div>
                  <div className="flex justify-between text-2xl font-black text-primary">
                    <span>Total</span>
                    <span>₱{cartTotal}</span>
                  </div>
                  <button 
                    onClick={() => {setIsCartModalOpen(false); setIsCheckoutModalOpen(true)}}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutModalOpen && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCheckoutModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative p-8">
              <h2 className="text-3xl font-black text-primary mb-2 text-center">Complete Your Order</h2>
              <p className="text-center text-gray-500 mb-8 font-medium italic">Support local, stay digital.</p>
              
                <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-3xl space-y-3">
                  <div className="flex justify-between text-sm text-gray-500 font-bold"><span>Items ({cartCount})</span><span>₱{cartSubtotal}</span></div>
                  <div className="flex justify-between text-sm text-gray-500 font-bold"><span>Delivery</span><span>₱50</span></div>
                  <div className="flex justify-between text-xl font-black text-primary pt-2 border-t border-gray-200"><span>Grand Total</span><span>₱{cartTotal}</span></div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Delivery Barangay</label>
                    <div className="relative">
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Odiong"
                        value={deliveryLocation} 
                        onChange={(e) => setDeliveryLocation(e.target.value)}
                        className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 transition-all ${!deliveryLocation ? 'border-orange-100' : 'border-transparent focus:border-primary'}`}
                      />
                      {deliveryLocation && (
                        <div className="mt-2 ml-2 text-[10px] text-primary font-black uppercase tracking-tighter opacity-70">
                          Full Address: {deliveryLocation}, Roxas, Or. Mindoro
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">GCash / Contact Number</label>
                    <input 
                      type="tel"
                      required
                      placeholder="09xx xxxxxxx"
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none font-bold text-gray-700 transition-all ${!phoneNumber ? 'border-orange-100' : 'border-transparent focus:border-primary'}`}
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setSelectedPaymentMethod('gcash')} 
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${selectedPaymentMethod === 'gcash' ? 'border-primary bg-primary/5' : 'border-transparent bg-gray-50'}`}
                    >
                      <Smartphone className={selectedPaymentMethod === 'gcash' ? 'text-primary' : 'text-gray-400'} />
                      <span className={`text-[10px] font-black uppercase ${selectedPaymentMethod === 'gcash' ? 'text-primary' : 'text-gray-400'}`}>GCash</span>
                    </button>
                    <button 
                      onClick={() => setSelectedPaymentMethod('cod')} 
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${selectedPaymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-transparent bg-gray-50'}`}
                    >
                      <Truck className={selectedPaymentMethod === 'cod' ? 'text-primary' : 'text-gray-400'} />
                      <span className={`text-[10px] font-black uppercase ${selectedPaymentMethod === 'cod' ? 'text-primary' : 'text-gray-400'}`}>COD</span>
                    </button>
                  </div>
                </div>

                {/* Conditional Payment View */}
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
                      <p className="text-[9px] text-blue-400 font-bold italic leading-tight">Please take a screenshot of your receipt. Our rider will verify it upon arrival or via chat.</p>
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
                      <p className="text-[9px] text-green-400 font-bold italic leading-tight">Rider will contact you once the order is out for delivery. Stay reachable!</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-4">
                  <button 
                    onClick={handleCheckout}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
                  >
                    Confirm Purchase
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => setIsCheckoutModalOpen(false)} 
                className="w-full mt-8 p-4 text-gray-400 font-bold hover:text-gray-600"
              >
                Cancel and Go Back
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Role Picker Modal */}
      <AnimatePresence>
        {isRolePickerOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative p-10 text-center">
              <h2 className="text-3xl font-black text-primary mb-4">Select Your Identity</h2>
              <p className="text-gray-500 mb-10 font-medium italic">How will you participate in the marketplace?</p>
              <div className="space-y-4 text-left">
                {[
                  { id: 'buyer', title: 'Buyer', desc: 'Shop for fresh goods and unique crafts', icon: ShoppingCart },
                  { id: 'farmer', title: 'Farmer', desc: 'Sell your local harvests directly', icon: CheckCircle },
                  { id: 'artisan', title: 'Artisan', desc: 'Showcase your handcrafted creations', icon: Edit }
                ].map(role => (
                  <button key={role.id} onClick={() => handlePickRole(role.id as UserRole)} className="w-full flex items-center justify-between group p-6 bg-gray-50 rounded-3xl hover:bg-primary hover:text-white transition-all text-gray-800">
                    <div>
                      <span className="block text-lg font-black">{role.title}</span>
                      <span className="text-xs opacity-60 font-medium group-hover:opacity-80">{role.desc}</span>
                    </div>
                    <role.icon className="group-hover:scale-125 transition-transform" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {isReceiptOpen && lastOrder && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative p-8 flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">Order Successful!</h2>
              <p className="text-gray-500 text-sm mb-8">Thank you for supporting local traders.</p>
              
              <div className="w-full border-2 border-dashed border-gray-100 rounded-3xl p-6 bg-gray-50/50 mb-8 font-mono text-sm">
                <div className="flex justify-between mb-4 border-b pb-4">
                  <span className="font-bold text-gray-400">Order ID:</span>
                  <span className="text-gray-800 uppercase">{lastOrder.id?.slice(-8)}</span>
                </div>
                <div className="space-y-2 mb-4">
                  {lastOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.name} x{item.quantity}</span>
                      <span>₱{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 space-y-2 font-bold">
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Subtotal</span>
                    <span>₱{lastOrder.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Delivery</span>
                    <span>₱{lastOrder.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-primary text-lg">
                    <span>TOTAL</span>
                    <span>₱{lastOrder.total}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t-2 border-white text-[10px] text-gray-400 text-center uppercase tracking-widest leading-relaxed">
                  Delivery: {(lastOrder as any).deliveryLocation}
                  <br />
                  Contact: {(lastOrder as any).phoneNumber || 'N/A'}
                  <br />
                  {new Date(lastOrder.orderDate).toLocaleString()}
                </div>
              </div>

              <div className="mt-8 w-full">
                <button 
                  onClick={() => {setIsReceiptOpen(false); setActiveSection('orders')}}
                  className="w-full py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  View My Orders
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeConversation && currentUser && <ChatWindow conversation={activeConversation} currentUser={currentUser} onClose={() => setActiveConversation(null)} />}
      
      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddProductFormOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddProductFormOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative p-8">
              <h2 className="text-3xl font-black text-primary mb-2 text-center">List New Product</h2>
              <p className="text-center text-gray-500 mb-8 font-medium italic">Grow your business, Mindoro style.</p>
              
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Product Name</label>
                    <input name="name" required placeholder="e.g. Organic Calamansi" className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl outline-none font-bold text-gray-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Category</label>
                    <select name="category" required className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl outline-none font-bold text-gray-700">
                      <option value="agriculture">Agriculture</option>
                      <option value="craft">Craft</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Price (₱)</label>
                    <input name="price" type="number" required placeholder="Price" className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl outline-none font-bold text-gray-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Stock</label>
                    <input name="stock" type="number" required placeholder="Quantity" className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl outline-none font-bold text-gray-700" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Description</label>
                  <textarea name="description" rows={3} placeholder="Describe your product..." className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary rounded-2xl outline-none font-bold text-gray-700 resize-none"></textarea>
                </div>

                <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform mt-4">
                  List Product Now
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

