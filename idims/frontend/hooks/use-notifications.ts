'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '@/lib/websocket';

// Notification data types based on backend payloads
export interface MarketplaceOrderData {
  order_id: string;
  drug_name: string;
  quantity: number;
  total_price: number;
  buyer_organization_id?: string;
  buyer_organization_name?: string;
}

export interface MarketplaceOrderUpdatedData {
  order_id: string;
  drug_name: string;
  new_status: string;
  seller_organization_name?: string;
  cancellation_reason?: string;
}

export interface InventoryAlertData {
  inventory_id: string;
  drug_name: string;
  batch_number?: string;
  quantity_available?: number;
  reorder_level?: number;
  expiry_date?: string;
  days_until_expiry?: number;
}

export type NotificationData =
  | MarketplaceOrderData
  | MarketplaceOrderUpdatedData
  | InventoryAlertData;

export interface Notification {
  id: string;
  type: 'marketplace' | 'inventory';
  event: string;
  data: NotificationData;
  timestamp: Date;
  read: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ws = useWebSocket();

  // Use ref to store addNotification to avoid dependency issues
  const addNotificationRef = useRef<(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void | undefined>(undefined);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount((prev) => prev + 1);
  }, []);

  // Update ref when addNotification changes
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  useEffect(() => {
    if (!ws) return;

    // Connect on mount
    ws.connect();

    // Marketplace notifications
    const handleNewOrder = (data: MarketplaceOrderData) => {
      addNotificationRef.current?.({
        type: 'marketplace',
        event: 'new_order',
        data,
      });
    };

    const handleOrderUpdated = (data: MarketplaceOrderUpdatedData) => {
      addNotificationRef.current?.({
        type: 'marketplace',
        event: 'order_updated',
        data,
      });
    };

    // Inventory notifications
    const handleLowStock = (data: InventoryAlertData) => {
      addNotificationRef.current?.({
        type: 'inventory',
        event: 'low_stock',
        data,
      });
    };

    const handleNearExpiry = (data: InventoryAlertData) => {
      addNotificationRef.current?.({
        type: 'inventory',
        event: 'near_expiry',
        data,
      });
    };

    const handleExpired = (data: InventoryAlertData) => {
      addNotificationRef.current?.({
        type: 'inventory',
        event: 'expired',
        data,
      });
    };

    // Subscribe to events
    ws.on('marketplace:new_order', handleNewOrder);
    ws.on('marketplace:order_updated', handleOrderUpdated);
    ws.on('inventory:low_stock', handleLowStock);
    ws.on('inventory:near_expiry', handleNearExpiry);
    ws.on('inventory:expired', handleExpired);

    // Cleanup on unmount
    return () => {
      ws.off('marketplace:new_order', handleNewOrder);
      ws.off('marketplace:order_updated', handleOrderUpdated);
      ws.off('inventory:low_stock', handleLowStock);
      ws.off('inventory:near_expiry', handleNearExpiry);
      ws.off('inventory:expired', handleExpired);
    };
  }, [ws]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isConnected: ws?.isConnected() || false,
  };
}

