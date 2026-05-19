import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Package, ShoppingBag, Trash2, Ban, CheckCircle } from 'lucide-react';
import { User, Product, Order } from '../../types';
import { api } from '../../api';

interface AdminDashboardPageProps {
  currentUser: User;
  onNavigate: (section: 'home' | 'orders' | 'dashboard' | 'auth' | 'admin') => void;
}

export default function AdminDashboardPage({ currentUser, onNavigate }: AdminDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'orders'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [u, p, o] = await Promise.all([
        api.users.list(),
        api.products.list(),
        api.orders.listAll(),
      ]);
      setUsers(u);
      setProducts(p);
      setOrders(o);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchData();
    } else {
      onNavigate('home');
    }
  }, [currentUser]);

  const handleToggleUserStatus = async (user: User) => {
    try {
      const updated = await api.users.updateStatus(user.id, !user.isActive);
      setUsers(users.map(u => u.id === user.id ? updated : u));
    } catch (err) {
      console.error('Failed to update user status', err);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete ${product.name}?`)) return;
    try {
      await api.products.delete(product.id || product._id || '');
      setProducts(products.filter(p => p.id !== product.id && p._id !== product.id));
    } catch (err) {
      console.error('Failed to delete product', err);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-gray-500">Loading admin data...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight mb-2">Admin Dashboard</h1>
        <p className="text-gray-500">Manage users, products, and monitor all platform activity.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-100 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 font-bold transition-colors ${
            activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Users size={18} /> Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 font-bold transition-colors ${
            activeTab === 'products' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Package size={18} /> Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 font-bold transition-colors ${
            activeTab === 'orders' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ShoppingBag size={18} /> Orders ({orders.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">{u.fullName}</td>
                    <td className="py-3 px-4 text-gray-500">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold uppercase">{u.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      {u.isActive !== false ? (
                        <span className="text-green-600 flex items-center gap-1 text-sm font-bold"><CheckCircle size={14} /> Active</span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1 text-sm font-bold"><Ban size={14} /> Inactive</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                            u.isActive !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {u.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Producer</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                      <span className="font-bold text-gray-800">{p.name}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{p.producer}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">₱{p.price}</td>
                    <td className="py-3 px-4 text-gray-500">{p.stock}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Product"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Buyer</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{o.id}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{o.userName}</td>
                    <td className="py-3 px-4 font-bold text-primary">₱{o.total}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                        o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{new Date(o.orderDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
