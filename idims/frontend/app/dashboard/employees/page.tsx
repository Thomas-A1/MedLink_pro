'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Ban, UserCheck, AlertTriangle, Users } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

interface BanRecord {
  id: string;
  reason?: string;
  is_active: boolean;
  created_at: string;
  unbanned_at?: string;
  bannedBy?: {
    first_name: string;
    last_name: string;
  };
}

export default function EmployeesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banning, setBanning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [unbanReason, setUnbanReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showUnbanDialog, setShowUnbanDialog] = useState(false);
  const [banHistory, setBanHistory] = useState<BanRecord[]>([]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'pharmacy_admin') {
      router.push('/dashboard');
      return;
    }
    fetchEmployees();
    fetchBannedUsers();
  }, [isAuthenticated, user, router]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/users');
      const data = response.data.data || response.data || [];
      
      // Filter to only show employees in this organization
      const orgEmployees = data.filter(
        (emp: Employee) => emp.role !== 'pharmacy_admin' && emp.role !== 'superadmin',
      );
      setEmployees(orgEmployees);
    } catch (err: any) {
      setError('Failed to load employees');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBannedUsers = async () => {
    try {
      const response = await apiClient.get('/users/banned');
      setBannedUsers(response.data || []);
    } catch (err: any) {
      console.error('Failed to load banned users:', err);
    }
  };

  const fetchBanHistory = async (userId: string) => {
    try {
      const response = await apiClient.get(`/users/${userId}/ban-history`);
      setBanHistory(response.data || []);
    } catch (err: any) {
      console.error('Failed to load ban history:', err);
    }
  };

  const handleBan = async () => {
    if (!selectedUser) return;

    try {
      setBanning(selectedUser.id);
      setError(null);

      await apiClient.post(`/users/${selectedUser.id}/ban`, {
        reason: banReason || undefined,
      });

      setSuccess(`${selectedUser.first_name} ${selectedUser.last_name} has been banned`);
      setShowBanDialog(false);
      setBanReason('');
      setSelectedUser(null);
      
      await fetchEmployees();
      await fetchBannedUsers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to ban user');
    } finally {
      setBanning(null);
    }
  };

  const handleUnban = async () => {
    if (!selectedUser) return;

    try {
      setBanning(selectedUser.id);
      setError(null);

      await apiClient.post(`/users/${selectedUser.id}/unban`, {
        reason: unbanReason || undefined,
      });

      setSuccess(`${selectedUser.first_name} ${selectedUser.last_name} has been unbanned`);
      setShowUnbanDialog(false);
      setUnbanReason('');
      setSelectedUser(null);
      
      await fetchEmployees();
      await fetchBannedUsers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unban user');
    } finally {
      setBanning(null);
    }
  };

  const openBanDialog = (employee: Employee) => {
    setSelectedUser(employee);
    setBanReason('');
    setShowBanDialog(true);
  };

  const openUnbanDialog = (employee: Employee) => {
    setSelectedUser(employee);
    setUnbanReason('');
    fetchBanHistory(employee.id);
    setShowUnbanDialog(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const isBanned = (userId: string) => {
    return bannedUsers.some((ban) => ban.user_id === userId && ban.is_active);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
              <p className="text-sm text-gray-600">Manage your pharmacy employees</p>
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
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center space-x-2"
          >
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"
          >
            {success}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                <UserCheck className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {employees.filter((e) => e.is_active && !isBanned(e.id)).length}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Banned Employees</CardTitle>
                <Ban className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bannedUsers.length}</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No employees found
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((employee) => {
                        const banned = isBanned(employee.id);
                        return (
                          <TableRow key={employee.id}>
                            <TableCell className="font-medium">
                              {employee.first_name} {employee.last_name}
                            </TableCell>
                            <TableCell>{employee.email}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {employee.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              {banned ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  Banned
                                </span>
                              ) : employee.is_active ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(employee.created_at)}</TableCell>
                            <TableCell>
                              {banned ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openUnbanDialog(employee)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <UserCheck className="mr-1 h-4 w-4" />
                                  Unban
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openBanDialog(employee)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Ban className="mr-1 h-4 w-4" />
                                  Ban
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Ban Dialog */}
        <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to ban{' '}
                <strong>
                  {selectedUser?.first_name} {selectedUser?.last_name}
                </strong>
                ? This will revoke all their access and privileges.
              </p>
              <div>
                <Label htmlFor="ban-reason">Reason (Optional)</Label>
                <textarea
                  id="ban-reason"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter reason for banning this employee..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBanDialog(false);
                    setBanReason('');
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBan}
                  disabled={banning === selectedUser?.id}
                >
                  {banning === selectedUser?.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Banning...
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Ban Employee
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unban Dialog */}
        <Dialog open={showUnbanDialog} onOpenChange={setShowUnbanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unban Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to unban{' '}
                <strong>
                  {selectedUser?.first_name} {selectedUser?.last_name}
                </strong>
                ? This will restore their access and privileges.
              </p>
              {banHistory.length > 0 && (
                <div>
                  <Label>Ban History</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {banHistory.map((ban) => (
                      <div
                        key={ban.id}
                        className="p-2 bg-gray-50 rounded text-sm"
                      >
                        <div className="font-medium">
                          {ban.is_active ? 'Currently Banned' : 'Previously Banned'}
                        </div>
                        {ban.reason && (
                          <div className="text-gray-600">Reason: {ban.reason}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          {formatDate(ban.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="unban-reason">Reason (Optional)</Label>
                <textarea
                  id="unban-reason"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter reason for unbanning this employee..."
                  value={unbanReason}
                  onChange={(e) => setUnbanReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUnbanDialog(false);
                    setUnbanReason('');
                    setSelectedUser(null);
                    setBanHistory([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleUnban}
                  disabled={banning === selectedUser?.id}
                >
                  {banning === selectedUser?.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Unbanning...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Unban Employee
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

