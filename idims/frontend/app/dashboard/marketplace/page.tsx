'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';

interface MarketplaceListing {
  id: string;
  drug_master: {
    generic_name: string;
    brand_name?: string;
    form: string;
  };
  organization: {
    name: string;
  };
  quantity_available: number;
  unit_price: number;
  minimum_order_quantity: number;
  is_active: boolean;
  created_at: string;
}

interface MarketplaceOrder {
  id: string;
  listing: {
    drug_master: {
      generic_name: string;
    };
  };
  seller_organization: {
    name: string;
  };
  quantity_ordered: number;
  total_price: number;
  status: string;
  created_at: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'listings' | 'orders' | 'my-listings'>('listings');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, router, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'listings') {
        const response = await apiClient.get('/marketplace/listings');
        const data = response.data;
        setListings(
          data && data.data ? data.data : Array.isArray(data) ? data : []
        );
      } else if (activeTab === 'orders') {
        const response = await apiClient.get('/marketplace/orders/my');
        const data = response.data;
        setOrders(
          data && data.data ? data.data : Array.isArray(data) ? data : []
        );
      } else if (activeTab === 'my-listings') {
        const response = await apiClient.get('/marketplace/listings/my');
        const data = response.data;
        setMyListings(
          data && data.data ? data.data : Array.isArray(data) ? data : []
        );
      }
    } catch (err: any) {
      setError('Failed to load marketplace data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (listingId: string, quantity: number) => {
    try {
      await apiClient.post('/marketplace/orders', {
        listing_id: listingId,
        quantity_ordered: quantity,
        shipping_address: 'To be provided',
      });
      alert('Order created successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create order');
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
            <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
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
        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'listings'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Available Listings
          </button>
          <button
            onClick={() => setActiveTab('my-listings')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'my-listings'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Listings
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'orders'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Orders
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Listings Tab */}
            {activeTab === 'listings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    No listings available
                  </div>
                ) : (
                  listings.map((listing) => (
                    <div key={listing.id} className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {listing.drug_master?.generic_name || 'Unknown'}
                      </h3>
                      {listing.drug_master?.brand_name && (
                        <p className="text-sm text-gray-600">{listing.drug_master.brand_name}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-2">{listing.drug_master?.form}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Available:</span>
                          <span className="text-sm font-medium">{listing.quantity_available}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Price:</span>
                          <span className="text-sm font-semibold">
                            {formatCurrency(parseFloat(listing.unit_price.toString()))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Min Order:</span>
                          <span className="text-sm">{listing.minimum_order_quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Seller:</span>
                          <span className="text-sm">{listing.organization?.name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCreateOrder(listing.id, listing.minimum_order_quantity)}
                        className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Order Now
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* My Listings Tab */}
            {activeTab === 'my-listings' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {myListings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No listings found
                        </td>
                      </tr>
                    ) : (
                      myListings.map((listing) => (
                        <tr key={listing.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {listing.drug_master?.generic_name || 'Unknown'}
                            </div>
                            {listing.drug_master?.brand_name && (
                              <div className="text-sm text-gray-500">{listing.drug_master.brand_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{listing.quantity_available}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatCurrency(parseFloat(listing.unit_price.toString()))}
                          </td>
                          <td className="px-6 py-4">
                            {listing.is_active ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button className="text-blue-600 hover:text-blue-900">Edit</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No orders found
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {order.listing?.drug_master?.generic_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {order.seller_organization?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{order.quantity_ordered}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatCurrency(parseFloat(order.total_price.toString()))}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                order.status === 'delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : order.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(order.created_at)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

