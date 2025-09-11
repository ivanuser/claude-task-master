// Push Notification Manager
export class PushNotificationManager {
  private vapidPublicKey: string;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  }

  // Initialize push notifications
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered:', this.serviceWorkerRegistration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // Check current permission status
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Request permission for notifications
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  // Subscribe to push notifications
  async subscribe(): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
    try {
      if (!this.serviceWorkerRegistration) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { success: false, error: 'Failed to initialize service worker' };
        }
      }

      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Notification permission denied' };
      }

      // Check for existing subscription
      let subscription = await this.serviceWorkerRegistration!.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await this.serviceWorkerRegistration!.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
      }

      // Send subscription to server
      const response = await fetch('/api/notifications/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }

      console.log('Push notification subscription successful');
      return { success: true, subscription };
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.serviceWorkerRegistration) {
        return { success: false, error: 'Service worker not registered' };
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (!subscription) {
        return { success: true }; // Already unsubscribed
      }

      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Remove from server
      await fetch('/api/notifications/push-subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      console.log('Push notification unsubscription successful');
      return { success: true };
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Check if user is subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        await this.initialize();
      }

      if (!this.serviceWorkerRegistration) {
        return false;
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  // Get current subscription
  async getSubscription(): Promise<PushSubscription | null> {
    try {
      if (!this.serviceWorkerRegistration) {
        await this.initialize();
      }

      if (!this.serviceWorkerRegistration) {
        return null;
      }

      return await this.serviceWorkerRegistration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  // Send test notification
  async sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/notifications/test-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Helper: Convert VAPID key to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Helper: Convert ArrayBuffer to Base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// Export singleton instance
export const pushManager = new PushNotificationManager();