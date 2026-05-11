'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'superadmin') {
      router.push('/login');
      return;
    }
    fetchSystemStats();
  }, [isAuthenticated, user, router]);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      
      // Fetch organizations
      const orgsResponse = await apiClient.get('/organizations');
      const orgData = orgsResponse.data;
      const organizations = orgData && orgData.data ? orgData.data : Array.isArray(orgData) ? orgData : [];

      // Calculate stats
      const pending = organizations.filter((org: any) => org.verification_status === 'pending').length;
      const approved = organizations.filter((org: any) => org.verification_status === 'approved').length;
      const rejected = organizations.filter((org: any) => org.verification_status === 'rejected').length;

      // Group by registration date for trend
      const registrationTrend = organizations.reduce((acc: any, org: any) => {
        const date = new Date(org.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const trendData = Object.entries(registrationTrend)
        .map(([date, count]) => ({ date, count: count as number }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      setStats({
        total_organizations: organizations.length,
        pending_organizations: pending,
        approved_organizations: approved,
        rejected_organizations: rejected,
        registration_trend: trendData,
        organizations_by_status: [
          { name: 'Approved', value: approved },
          { name: 'Pending', value: pending },
          { name: 'Rejected', value: rejected },
        ],
      });
    } catch (err: any) {
      setError('Failed to load system statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'superadmin') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'No data available'}</p>
          <button
            onClick={fetchSystemStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
              <p className="text-sm text-gray-600">Platform-wide statistics and insights</p>
            </div>
            <a
              href="/admin/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Organizations</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {stats.total_organizations}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {stats.approved_organizations}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {stats.pending_organizations}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Rejected</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {stats.rejected_organizations}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Registration Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.registration_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Registrations"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organizations by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.organizations_by_status}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

