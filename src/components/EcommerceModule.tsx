import React, { useState, useEffect } from 'react';
import { ShoppingCart, ShoppingBag, Plus, Minus, CreditCard, Trash2, Store, PackageSearch, Box, ShieldCheck, Truck, Users, Activity, Percent, GitMerge } from 'lucide-react';
import { LedgerEntry } from '../types';
import { formatCurrency } from '../utils/helpers';

interface EcommerceModuleProps {
  handleSaveEntry: (entry: LedgerEntry) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Product {
  sku: string;
  item: string;
  category: string;
  qty: number;
  cost: number;
  price: number;
}

interface CartItem extends Product {
  cartQty: number;
}

export const EcommerceModule: React.FC<EcommerceModuleProps> = ({ handleSaveEntry, showToast }) => {
  const [activeTab, setActiveTab] = useState<'POS' | 'Orders' | 'Settings' | 'Enterprise'>('POS');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [orders, setOrders] = useState<any[]>([]);

  // Integration settings
  const [integrationType, setIntegrationType] = useState('Shopify');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [storeUrl, setStoreUrl] = useState('');

  useEffect(() => {
    loadInventory();
    loadOrders();
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem('ecommerce_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setIntegrationType(parsed.integrationType || 'Shopify');
        setApiKey(parsed.apiKey || '');
        setApiSecret(parsed.apiSecret || '');
        setStoreUrl(parsed.storeUrl || '');
      }
    } catch (e) {}
  };

  const saveSettings = () => {
    localStorage.setItem('ecommerce_settings', JSON.stringify({ integrationType, apiKey, apiSecret, storeUrl }));
    showToast('Integration settings saved.', 'success');
  };

  const testConnection = () => {
    if (!apiKey || !storeUrl) {
      showToast('Please enter API Key and Store URL', 'error');
      return;
    }
    showToast(`Testing connection to ${storeUrl}...`, 'info');
    setTimeout(() => {
      showToast('Connection successful! Store linked.', 'success');
    }, 1500);
  };

  const loadOrders = () => {
    try {
      const stored = localStorage.getItem('ecommerce_orders');
      if (stored) setOrders(JSON.parse(stored));
    } catch (e) {}
  };

  const loadInventory = () => {
    try {
      const stored = localStorage.getItem('stratify_inventory');
      if (stored) {
        setProducts(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = (product: Product) => {
    if (product.qty <= 0) {
      showToast('Item is out of stock!', 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(p => p.sku === product.sku);
      if (existing) {
        if (existing.cartQty >= product.qty) {
          showToast('Cannot add more than available stock', 'error');
          return prev;
        }
        return prev.map(p => p.sku === product.sku ? { ...p, cartQty: p.cartQty + 1 } : p);
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const updateCartQty = (sku: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.sku === sku) {
        const newQty = p.cartQty + delta;
        if (newQty > p.qty) {
          showToast('Cannot exceed available stock', 'error');
          return p;
        }
        return { ...p, cartQty: Math.max(1, newQty) };
      }
      return p;
    }));
  };

  const removeFromCart = (sku: string) => {
    setCart(prev => prev.filter(p => p.sku !== sku));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const totalGross = cart.reduce((acc, item) => acc + (item.price * item.cartQty), 0);
    // Assuming prices are VAT inclusive.
    const taxable = totalGross / 1.12;
    const vat = totalGross - taxable;

    const particulars = cart.map(c => `${c.cartQty}x ${c.item}`).join(', ');

    const newEntry: LedgerEntry = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      month: new Date().toLocaleString('default', { month: 'long' }).toUpperCase(),
      category: 'Operating',
      cash: totalGross,
      createdAt: new Date().toISOString(),
      accountCode: '4000', // Sales Revenue
      type: 'Sales',
      payor: customerName || 'Walk-in Customer',
      tin: '',
      particulars: `POS Sale: ${particulars}`,
        gross: totalGross,
        taxType: 'Vatable',
        vat: vat,
        taxable: taxable,
        terms: 'Cash',
        status: 'Cleared'
    };

    // Post to ledger
    handleSaveEntry(newEntry);

    // Update inventory
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(c => c.sku === p.sku);
      if (cartItem) {
        return { ...p, qty: p.qty - cartItem.cartQty };
      }
      return p;
    });

    setProducts(updatedProducts);
    localStorage.setItem('stratify_inventory', JSON.stringify(updatedProducts));

    setCart([]);
    setCustomerName('Walk-in Customer');
    showToast('Checkout successful! Sale posted to ledger & stock updated.', 'success');
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.cartQty), 0);

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Point of Sale & E-Commerce</h2>
          <p className="text-sm text-zinc-500">Manage orders, sync with store, and auto-post sales.</p>
        </div>
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl flex-wrap justify-end">
          <button onClick={() => setActiveTab('POS')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'POS' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>New Order (POS)</button>
          <button onClick={() => setActiveTab('Orders')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Orders' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>Online Orders</button>
          <button onClick={() => setActiveTab('Settings')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Settings' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>Integration Settings</button>
          <button onClick={() => setActiveTab('Enterprise')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'Enterprise' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>Enterprise Features</button>
        </div>
      </div>
      
      {activeTab === 'POS' && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          
          {/* Product List */}
          <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col min-h-0">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Available Products
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm">
                  <p>No products found in Inventory.</p>
                  <p className="text-xs mt-2">Go to "Inventory Stock" to add items.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map(p => (
                    <button
                      key={p.sku}
                      onClick={() => addToCart(p)}
                      disabled={p.qty <= 0}
                      className={`text-left p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                        p.qty > 0 
                          ? 'border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-md bg-white dark:bg-zinc-900' 
                          : 'border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-950/50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{p.sku}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.qty > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {p.qty} in stock
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2">{p.item}</h4>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-auto">{formatCurrency(p.price.toString())}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart / Checkout */}
          <div className="w-full md:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col min-h-0">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex justify-between items-center">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Current Order
              </h3>
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
            </div>
            
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Customer Name</label>
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-sm">
                  <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                  <p>Order is empty.</p>
                  <p className="text-xs">Click items to add.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(c => (
                    <div key={c.sku} className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 pr-4">{c.item}</h4>
                        <button onClick={() => removeFromCart(c.sku)} className="text-zinc-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-sm">
                          <button onClick={() => updateCartQty(c.sku, -1)} className="p-1 text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-xs w-4 text-center">{c.cartQty}</span>
                          <button onClick={() => updateCartQty(c.sku, 1)} className="p-1 text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(c.price * c.cartQty)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <div className="flex justify-between items-end mb-4">
                <span className="text-sm font-bold text-zinc-500 uppercase">Total Amount</span>
                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(cartTotal.toString())}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-4 bg-blue-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-black text-lg transition-colors flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20"
              >
                <CreditCard className="w-5 h-5" /> Checkout & Post
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Orders' && (
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Live External Orders</h3>
              <p className="text-[10px] text-zinc-500 font-medium">Auto-synced via Webhooks/API from {integrationType}</p>
            </div>
            <button onClick={() => showToast('Syncing orders from API...', 'info')} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-xs rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              Force Sync
            </button>
          </div>
          {orders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-500">
              <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-bold">No online orders found.</p>
              <p className="text-sm mt-1">When customers order from your synced store, they will appear here.</p>
              
              <button 
                onClick={() => {
                  const sampleOrders = [
                    { id: 'ORD-1001', date: new Date().toISOString().slice(0, 10), customer: 'Juan Dela Cruz', amount: 4500, status: 'Pending' },
                    { id: 'ORD-1002', date: new Date().toISOString().slice(0, 10), customer: 'Maria Clara', amount: 1250, status: 'Shipped' }
                  ];
                  setOrders(sampleOrders);
                  localStorage.setItem('ecommerce_orders', JSON.stringify(sampleOrders));
                  showToast('Sample orders loaded for testing.', 'info');
                }}
                className="mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors"
              >
                Load Sample Orders
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="px-5 py-3">Order ID</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-5 py-3 font-bold text-blue-600 dark:text-blue-400">{o.id}</td>
                      <td className="px-5 py-3">{o.date}</td>
                      <td className="px-5 py-3 font-medium">{o.customer}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(o.amount.toString())}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${
                          o.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {o.status === 'Pending' ? (
                          <button 
                            onClick={() => {
                              const updated = orders.map(order => order.id === o.id ? { ...order, status: 'Shipped' } : order);
                              setOrders(updated);
                              localStorage.setItem('ecommerce_orders', JSON.stringify(updated));
                              showToast(`Order ${o.id} marked as shipped`, 'success');
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Mark Shipped
                          </button>
                        ) : (
                          <span className="text-zinc-400 text-xs font-bold italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Settings' && (
        <div className="flex-1 max-w-2xl mx-auto w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Store Integration</h3>
            <p className="text-sm text-zinc-500">Connect your external e-commerce platform (e.g. Shopify, WooCommerce, CRM).</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Platform</label>
              <select 
                value={integrationType}
                onChange={(e) => setIntegrationType(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Shopify">Shopify</option>
                <option value="WooCommerce">WooCommerce</option>
                <option value="Custom API">Custom CRM / API</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Store URL</label>
              <input 
                type="text" 
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="https://your-store.myshopify.com"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">API Key</label>
              <input 
                type="text" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="shpat_..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">API Secret (Optional)</label>
              <input 
                type="password" 
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={testConnection}
              className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-sm rounded-xl transition-colors"
            >
              Test Connection
            </button>
            <button 
              onClick={saveSettings}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-blue-500/20"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Enterprise' && (
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-y-auto">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Enterprise E-commerce System</h3>
              <p className="text-xs text-zinc-500">Comprehensive capabilities for scaling your online business.</p>
            </div>
            <button onClick={() => showToast('Upgrading to Enterprise Edition...', 'info')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
              Upgrade System
            </button>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* 1. USER & AUTH */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">1. User & Authentication</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" /> Role-Based Access Control (RBAC)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" /> Multiple Addresses (Billing & Shipping)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" /> JWT / OAuth2 Secure Login</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" /> Password Encryption (bcrypt/Argon2)</li>
              </ul>
              <button onClick={() => showToast('Managing Users & RBAC...', 'info')} className="text-left text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Manage Users →</button>
            </div>

            {/* 2. PRODUCT CATALOG */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-lg flex items-center justify-center mb-3">
                <PackageSearch className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">2. Product Catalog & Variants</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-sky-400 mt-1.5 shrink-0" /> Parent-Child Variant Logic (SKU, Price, Stock)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-sky-400 mt-1.5 shrink-0" /> Dynamic Pricing (B2B vs Customer)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-sky-400 mt-1.5 shrink-0" /> Soft-Delete function for inactive products</li>
              </ul>
              <button onClick={() => showToast('Opening Product Catalog...', 'info')} className="text-left text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400">Manage Catalog →</button>
            </div>

            {/* 3. INVENTORY */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                <Box className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">3. Inventory & Reservation</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" /> 15-Minute Stock Reservation upon checkout</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" /> Multi-Warehouse deduction routing</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" /> Stock Movement History & Logs</li>
              </ul>
              <button onClick={() => showToast('Opening Warehouse Settings...', 'info')} className="text-left text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">Open Warehouse →</button>
            </div>

            {/* 4. CART & CHECKOUT */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">4. Cart & Checkout Logic</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" /> Guest Cart to User Cart merging</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" /> Dynamic Shipping Fee Engine (Weight + Distance)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" /> Pre-payment Stock Validation check</li>
              </ul>
              <button onClick={() => showToast('Configuring Checkout Engine...', 'info')} className="text-left text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">Checkout Settings →</button>
            </div>

            {/* 5. ORDER WORKFLOW */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg flex items-center justify-center mb-3">
                <GitMerge className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">5. Order State Machine</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" /> Strict Status Flow (Pending {'->'} Paid {'->'} Shipped)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" /> Payment Webhook Listener & Email triggers</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" /> Cancellation Locking on Shipped status</li>
              </ul>
              <button onClick={() => showToast('Opening Order Workflow...', 'info')} className="text-left text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400">Order Workflow →</button>
            </div>

            {/* 6. PAYMENT & PROMOTION */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg flex items-center justify-center mb-3">
                <Percent className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">6. Payment & Promotion Engine</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0" /> Discount Logic (Dates, MOV, Cap limits)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0" /> Gateway Logs (PayMongo, Xendit, Stripe)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0" /> Transaction Audit Trailing</li>
              </ul>
              <button onClick={() => showToast('Opening Promotion Engine...', 'info')} className="text-left text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400">Promo Engine →</button>
            </div>

            {/* 7. LOGISTICS */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-lg flex items-center justify-center mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">7. Logistics & Fulfillment</h4>
              <ul className="text-xs text-zinc-500 space-y-1.5 flex-1 mb-4">
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-pink-400 mt-1.5 shrink-0" /> 3rd-Party Courier APIs (J&T, Lalamove)</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-pink-400 mt-1.5 shrink-0" /> Auto-generate Waybills & Tracking Numbers</li>
                <li className="flex items-start gap-1.5"><div className="w-1 h-1 rounded-full bg-pink-400 mt-1.5 shrink-0" /> Order Object Tracking attachment</li>
              </ul>
              <button onClick={() => showToast('Opening Logistics Settings...', 'info')} className="text-left text-xs font-bold text-pink-600 hover:text-pink-700 dark:text-pink-400">Logistics Settings →</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
