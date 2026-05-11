'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  license_number: string;
  organization_type: string;
  verification_status: string;
  superintendent_pharmacist_name: string;
  superintendent_pharmacist_id_card_url: string;
  created_at: string;
  verification_rejection_reason?: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && user?.role !== 'superadmin') {
      router.push('/login');
      return;
    }
    fetchOrganizations();
  }, [isAuthenticated, user, router, filter]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/organizations');
      let orgs = response.data.data || response.data || [];

      if (filter !== 'all') {
        orgs = orgs.filter((org: Organization) => {
          if (filter === 'pending') return org.verification_status === 'pending';
          if (filter === 'approved') return org.verification_status === 'approved';
          if (filter === 'rejected') return org.verification_status === 'rejected';
          return true;
        });
      }

      setOrganizations(orgs);
    } catch (err: any) {
      setError('Failed to load organizations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (orgId: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      await apiClient.patch(`/organizations/${orgId}/verify`, {
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : null,
      });

      alert(`Organization ${status} successfully`);
      setShowModal(false);
      setSelectedOrg(null);
      setRejectionReason('');
      fetchOrganizations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update organization status');
    } finally {
      setProcessing(false);
    }
  };

  const openModal = (org: Organization) => {
    setSelectedOrg(org);
    setShowModal(true);
    setRejectionReason(org.verification_rejection_reason || '');
  };

  if (!isAuthenticated || user?.role !== 'superadmin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Organization Verification</h1>
              <p className="text-sm text-gray-600">Review and verify pharmacy registrations</p>
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
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Rejected
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading organizations...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchOrganizations}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Superintendent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No organizations found
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        <div className="text-sm text-gray-500">{org.organization_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {org.license_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {org.superintendent_pharmacist_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {org.verification_status === 'pending' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                        {org.verification_status === 'approved' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Approved
                          </span>
                        )}
                        {org.verification_status === 'rejected' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(org.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openModal(org)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Verification Modal */}
        {showModal && selectedOrg && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Review Organization</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                  <p className="mt-1 text-gray-900">{selectedOrg.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">License Number</label>
                  <p className="mt-1 text-gray-900">{selectedOrg.license_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Superintendent Pharmacist</label>
                  <p className="mt-1 text-gray-900">{selectedOrg.superintendent_pharmacist_name}</p>
                </div>
                {selectedOrg.superintendent_pharmacist_id_card_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ghana ID Card</label>
                    <img
                      src={selectedOrg.superintendent_pharmacist_id_card_url}
                      alt="ID Card"
                      className="max-w-full h-auto border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>

              {selectedOrg.verification_status === 'pending' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Enter reason for rejection (required if rejecting)"
                  />
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedOrg(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                {selectedOrg.verification_status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleVerify(selectedOrg.id, 'rejected')}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                      onClick={() => handleVerify(selectedOrg.id, 'approved')}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Approve'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

