export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organization_id: string;
  organization?: {
    id: string;
    name: string;
    verification_status: string;
  };
}

/**
 * SECURE COOKIE-BASED AUTHENTICATION
 * 
 * Tokens are stored in HTTP-only cookies (not accessible via JavaScript)
 * No localStorage usage for tokens - maximum security
 */

// Removed token storage functions - tokens are in secure HTTP-only cookies
// These functions are no longer needed

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  // Check if user data exists in store
  // Actual authentication is verified by backend via cookies
  if (typeof window === 'undefined') return false;
  const userStr = localStorage.getItem('auth-storage');
  if (!userStr) return false;
  try {
    const data = JSON.parse(userStr);
    return data?.state?.isAuthenticated === true;
  } catch {
    return false;
  }
}

export function logout(): void {
  // Clear user data (cookies cleared by backend on logout endpoint)
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth-storage');
    window.location.href = '/login';
  }
}

