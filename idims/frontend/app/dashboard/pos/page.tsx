'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';

interface Drug {
  id: string;
  generic_name: string;
  brand_name?: string;
  form: string;
  strength?: string;
}

interface CartItem {
  drug_id: string;
  drug_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export default function POSPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchDrugs();
    } else {
      setDrugs([]);
    }
  }, [searchQuery]);

  const searchDrugs = async () => {
    try {
      const response = await apiClient.get(`/drugs/autocomplete?q=${searchQuery}&limit=10`);
      const data = response.data;
      // Handle both array and object responses
      setDrugs(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error('Failed to search drugs:', err);
      setDrugs([]);
    }
  };

  const addToCart = (drug: Drug) => {
    const existingItem = cart.find((item) => item.drug_id === drug.id);
    
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.drug_id === drug.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
            : item
        )
      );
    } else {
      // Default price - in real app, get from inventory
      const unitPrice = 10.00;
      setCart([
        ...cart,
        {
          drug_id: drug.id,
          drug_name: `${drug.generic_name}${drug.brand_name ? ` (${drug.brand_name})` : ''}`,
          quantity: 1,
          unit_price: unitPrice,
          subtotal: unitPrice,
        },
      ]);
    }
    setSearchQuery('');
    setDrugs([]);
  };

  const removeFromCart = (drugId: string) => {
    setCart(cart.filter((item) => item.drug_id !== drugId));
  };

  const updateQuantity = (drugId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(drugId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.drug_id === drugId
          ? { ...item, quantity, subtotal: quantity * item.unit_price }
          : item
      )
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    setProcessing(true);
    try {
      const response = await apiClient.post('/sales', {
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items: cart.map((item) => ({
          drug_id: item.drug_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        payment_method: paymentMethod,
        total_amount: totalAmount,
        net_amount: totalAmount,
      });

      alert('Sale completed successfully!');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
            <a
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Search & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Search */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Search Products</h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by drug name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {drugs.length > 0 && (
                <div className="mt-4 space-y-2">
                  {drugs.map((drug) => (
                    <button
                      key={drug.id}
                      onClick={() => addToCart(drug)}
                      className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="font-medium">{drug.generic_name}</div>
                      {drug.brand_name && (
                        <div className="text-sm text-gray-600">{drug.brand_name}</div>
                      )}
                      <div className="text-xs text-gray-500">{drug.form} {drug.strength}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Cart</h2>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.drug_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.drug_name}</div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(item.unit_price)} × {item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.drug_id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-12 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.drug_id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <div className="font-semibold w-24 text-right">
                          {formatCurrency(item.subtotal)}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.drug_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Checkout</h2>
              
              {/* Customer Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="+233XXXXXXXXX"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {/* Total */}
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || processing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

