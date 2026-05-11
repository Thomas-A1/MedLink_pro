'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      // Call logout endpoint - backend will clear HTTP-only cookies
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user data from store (cookies cleared by backend)
      clearAuth();
      // Redirect to login
      router.push('/login');
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      className="flex items-center space-x-2"
    >
      <LogOut className="h-4 w-4" />
      <span>Logout</span>
    </Button>
  );
}

