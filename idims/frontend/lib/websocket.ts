'use client';

import { io, Socket } from 'socket.io-client';
// Helper to get token from cookie
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('access_token='));
  return tokenCookie ? tokenCookie.split('=')[1] : null;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

/**
 * WebSocket Client for Real-time Notifications
 * 
 * Handles:
 * - Marketplace order notifications
 * - Inventory alerts (low stock, expiry)
 * - Real-time updates
 */
class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('No token available for WebSocket connection');
      return;
    }

    this.socket = io(`${WS_URL}/notifications`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('connected', (data) => {
      console.log('WebSocket authenticated:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    // Subscribe to default channels
    this.socket.emit('subscribe:marketplace');
    this.socket.emit('subscribe:inventory');

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback?: (data: any) => void): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Set up default event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Marketplace events
    this.socket.on('marketplace:new_order', (data) => {
      console.log('New marketplace order:', data);
      this.notifyListeners('marketplace:new_order', data);
    });

    this.socket.on('marketplace:order_updated', (data) => {
      console.log('Marketplace order updated:', data);
      this.notifyListeners('marketplace:order_updated', data);
    });

    // Inventory events
    this.socket.on('inventory:low_stock', (data) => {
      console.log('Low stock alert:', data);
      this.notifyListeners('inventory:low_stock', data);
    });

    this.socket.on('inventory:near_expiry', (data) => {
      console.log('Near expiry alert:', data);
      this.notifyListeners('inventory:near_expiry', data);
    });

    this.socket.on('inventory:expired', (data) => {
      console.log('Expired item alert:', data);
      this.notifyListeners('inventory:expired', data);
    });
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${event}:`, error);
        }
      });
    }
  }
}

// Singleton instance
export const websocketManager = new WebSocketManager();

// React hook for using WebSocket
export function useWebSocket() {
  if (typeof window !== 'undefined') {
    return websocketManager;
  }
  return null;
}

