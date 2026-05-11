'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SystemStats {
  total_organizations: number;
  pending_organizations: number;
  approved_organizations: number;
  total_users: number;
  total_sales: number;
  total_revenue: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'superadmin') {
      router.push('/dashboard');
      return;
    }

    fetchSystemStats();
  }, [isAuthenticated, user, router]);

  const fetchSystemStats = async () => {
    try {
      // Fetch organizations
      const orgsResponse = await apiClient.get('/organizations');
      const orgData = orgsResponse.data;
      const organizations = orgData && orgData.data ? orgData.data : Array.isArray(orgData) ? orgData : [];

      const pending = organizations.filter((org: any) => org.verification_status === 'pending').length;
      const approved = organizations.filter((org: any) => org.verification_status === 'approved').length;

      // Calculate stats
      const systemStats: SystemStats = {
        total_organizations: organizations.length,
        pending_organizations: pending,
        approved_organizations: approved,
        total_users: 0, // Would need users endpoint
        total_sales: 0, // Would need system-wide sales endpoint
        total_revenue: 0, // Would need system-wide revenue endpoint
      };

      setStats(systemStats);
    } catch (err: any) {
      if (err.response?.status === 401) {
        clearAuth();
        router.push('/login');
      } else {
        setError('Failed to load system statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'superadmin') {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SuperAdmin Dashboard</h1>
              <p className="text-sm text-gray-600">
                System Overview & Management
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Organizations */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {stats?.total_organizations || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2h14a2 2 0 012 2v16m-4 0h2m-2 0h-5m-9 0H3m2 0v-5.576a2 2 0 011.053-1.765l6-3.333a2 2 0 011.894 0l6 3.333A2 2 0 0121 15.424V21" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Verifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Verifications</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {stats?.pending_organizations || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Approved Organizations */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved Organizations</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {stats?.approved_organizations || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {stats?.total_users || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/admin/organizations"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Organization Verification</h3>
            <p className="text-sm text-gray-600">Review and verify pharmacy registrations</p>
            {stats && stats.pending_organizations > 0 && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                {stats.pending_organizations} pending
              </span>
            )}
          </a>

          <a
            href="/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
            <p className="text-sm text-gray-600">Manage all system users and roles</p>
          </a>

          <a
            href="/admin/analytics"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">System Analytics</h3>
            <p className="text-sm text-gray-600">View platform-wide statistics and reports</p>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <a
            href="/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
            <p className="text-sm text-gray-600">Manage all system users and roles</p>
          </a>
        </div>
      </main>
    </div>
  );
}

