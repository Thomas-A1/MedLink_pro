'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface Sale {
  id: string;
  sale_number: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  net_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items: Array<{
    drug_name: string;
    quantity_sold: number;
    unit_price: number;
    sub_total: number;
  }>;
}

export default function SalesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchSales();
  }, [isAuthenticated, router, page, filter]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      let endpoint = `/sales?page=${page}&limit=20`;
      
      // Add date filter if needed
      if (filter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        if (filter === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (filter === 'week') {
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
        } else if (filter === 'month') {
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
        }
        
        endpoint += `&start_date=${startDate!.toISOString()}`;
      }

      const response = await apiClient.get(endpoint);
      const data = response.data;
      // Handle paginated response
      if (data && data.data && Array.isArray(data.data)) {
        setSales(data.data);
        setTotal(data.total || data.data.length);
      } else if (Array.isArray(data)) {
        setSales(data);
        setTotal(data.length);
      } else {
        setSales([]);
        setTotal(0);
      }
    } catch (err: any) {
      setError('Failed to load sales');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.net_amount.toString()), 0);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
              <p className="text-sm text-gray-600">View all sales transactions</p>
            </div>
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
        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{sales.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Average Sale</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {sales.length > 0 ? formatCurrency(totalRevenue / sales.length) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            This Month
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading sales...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchSales}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No sales found
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.sale_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.customer_name || 'Walk-in'}
                        {sale.customer_phone && (
                          <div className="text-xs text-gray-400">{sale.customer_phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {sale.items?.length || 0} item(s)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(parseFloat(sale.net_amount.toString()))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sale.payment_status === 'completed' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {sale.payment_status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(sale.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

