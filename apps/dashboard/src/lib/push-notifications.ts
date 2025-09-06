// Push notification utilities for client-side

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  
  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  // Initialize service worker and get registration
  async initialize(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.log('Push notifications are not supported');
      return null;
    }

    try {
      // Register service worker if not already registered
      this.registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', this.registration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      return this.registration;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return null;
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  // Get or create push subscription
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    // Check if already subscribed
    this.subscription = await this.registration.pushManager.getSubscription();
    
    if (this.subscription) {
      console.log('Existing subscription found');
      return this.subscription;
    }

    try {
      // Get VAPID public key from server
      const response = await fetch('/api/notifications/subscription');
      const data = await response.json();
      
      if (!data.vapidPublicKey) {
        throw new Error('VAPID public key not available');
      }

      // Convert VAPID key to Uint8Array
      const vapidPublicKey = this.urlBase64ToUint8Array(data.vapidPublicKey);

      // Subscribe to push notifications
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      console.log('Push subscription created:', this.subscription);
      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Save subscription to server
  async saveSubscription(types: string[] = []): Promise<boolean> {
    if (!this.subscription) {
      throw new Error('No push subscription available');
    }

    try {
      const response = await fetch('/api/notifications/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription.toJSON(),
          types
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      const data = await response.json();
      console.log('Subscription saved:', data);
      return true;
    } catch (error) {
      console.error('Failed to save subscription:', error);
      return false;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      const reg = await navigator.serviceWorker.ready;
      this.subscription = await reg.pushManager.getSubscription();
    }

    if (!this.subscription) {
      console.log('No subscription to unsubscribe from');
      return true;
    }

    try {
      // Unsubscribe from push manager
      const success = await this.subscription.unsubscribe();
      
      if (success) {
        // Remove from server
        await fetch('/api/notifications/subscription', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: this.subscription.endpoint
          }),
        });

        this.subscription = null;
        console.log('Successfully unsubscribed from push notifications');
      }

      return success;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  // Check subscription status
  async checkSubscription(): Promise<{
    subscribed: boolean;
    subscription: PushSubscriptionData | null;
  }> {
    try {
      const response = await fetch('/api/notifications/subscription');
      const data = await response.json();
      return {
        subscribed: data.subscribed,
        subscription: data.subscription
      };
    } catch (error) {
      console.error('Failed to check subscription:', error);
      return {
        subscribed: false,
        subscription: null
      };
    }
  }

  // Send test notification (admin only)
  async sendTestNotification(
    title: string,
    body: string,
    options?: {
      icon?: string;
      badge?: string;
      url?: string;
      tag?: string;
      type?: string;
    }
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          ...options
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const data = await response.json();
      console.log('Test notification sent:', data);
      return true;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  // Helper function to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const pushNotifications = PushNotificationService.getInstance();