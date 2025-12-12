// Push notification utilities
import { graphqlFetch } from './graphqlClient';

const VAPID_PUBLIC_KEY = 'BHvTYyUPD0e_STvP_ZVIkK3-hnOIaM3Us2jPoeMfrbE2ZI5klIDMVUJw7bGP1K13rvx9OoTSTXf0OQOJDdWCWMI';

// Check if service workers and push notifications are supported
export function isNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Check current notification permission status
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

// Ask for notification permission (works with both old and new API)
export async function askPermission(): Promise<NotificationPermission> {
  console.log('askPermission: Requesting notification permission...');

  const permissionResult_1 = await new Promise<NotificationPermission>(function (resolve, reject) {
    console.log('askPermission: Calling Notification.requestPermission');
    const permissionResult = Notification.requestPermission(function (result) {
      console.log('askPermission: Callback result:', result);
      resolve(result);
    });

    if (permissionResult) {
      console.log('askPermission: Promise-based API detected');
      permissionResult.then((result) => {
        console.log('askPermission: Promise result:', result);
        resolve(result);
      }, reject);
    }
  });

  console.log('askPermission: Final permission result:', permissionResult_1);

  if (permissionResult_1 !== 'granted') {
    throw new Error('We weren\'t granted permission.');
  }
  return permissionResult_1;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  console.log('registerServiceWorker: Checking service worker support');
  if (!('serviceWorker' in navigator)) {
    console.log('registerServiceWorker: Service workers not supported');
    return null;
  }

  try {
    // Check if there's already a registration
    console.log('registerServiceWorker: Checking for existing registration');
    let registration = await navigator.serviceWorker.getRegistration('/');

    if (registration) {
      console.log('registerServiceWorker: Found existing registration:', registration.scope);
    } else {
      console.log('registerServiceWorker: No existing registration, registering /sw.js');
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('registerServiceWorker: Service Worker registered successfully:', registration);
    }

    console.log('registerServiceWorker: Registration scope:', registration.scope);
    console.log('registerServiceWorker: Registration state:', registration.active?.state);

    // Set up message listener (safe to call multiple times)
    const messageHandler = (event: MessageEvent) => {
      console.log('registerServiceWorker: Received message from service worker:', event.data);
      if (event.data && event.data.type === 'BACKGROUND_SYNC') {
        console.log('registerServiceWorker: Background sync triggered by service worker');
        // Dispatch custom event that the app can listen to
        window.dispatchEvent(new CustomEvent('background-sync', {
          detail: { timestamp: event.data.timestamp }
        }));
      }
    };

    // Remove existing listener to avoid duplicates
    navigator.serviceWorker.removeEventListener('message', messageHandler);
    navigator.serviceWorker.addEventListener('message', messageHandler);

    return registration;
  } catch (error) {
    console.error('registerServiceWorker: Service Worker registration failed:', error);
    return null;
  }
}

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

// Subscribe to push notifications
export async function subscribeToPushNotifications(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  if (!registration || !registration.pushManager) {
    console.error('Push manager unavailable');
    return null;
  }

  try {
    // Check if we already have a subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    console.log('Push subscription created:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(registration: ServiceWorkerRegistration): Promise<boolean> {
  if (!registration || !registration.pushManager) {
    console.error('Push manager unavailable');
    return false;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const result = await subscription.unsubscribe();
      console.log('Push subscription cancelled:', result);
      return result;
    }
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

// Save push subscription to server
export async function savePushSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    console.log('savePushSubscriptionToServer: Preparing to save subscription');
    console.log('savePushSubscriptionToServer: Subscription object:', subscription);

    // Use toJSON() to get properly formatted subscription data
    const subscriptionJson = subscription.toJSON();
    console.log('savePushSubscriptionToServer: Subscription JSON:', subscriptionJson);

    // Extract structured data from PushSubscription JSON
    const subscriptionInput = {
      endpoint: subscriptionJson.endpoint || '',
      expirationTime: subscriptionJson.expirationTime ? subscriptionJson.expirationTime.toString() : null,
      keys: {
        // Keys are already in proper base64 format from toJSON()
        auth: subscriptionJson.keys?.auth || '',
        p256dh: subscriptionJson.keys?.p256dh || ''
      }
    };

    console.log('savePushSubscriptionToServer: Structured subscription data:', subscriptionInput);

    const mutation = `
      mutation SavePushSubscription($subscription: PushSubscriptionInput!) {
        savePushSubscription(subscription: $subscription) {
          success
        }
      }
    `;

    console.log('savePushSubscriptionToServer: Calling GraphQL mutation');
    const result = await graphqlFetch<{ savePushSubscription: { success: boolean } }>({
      query: mutation,
      variables: { subscription: subscriptionInput }
    });

    console.log('savePushSubscriptionToServer: GraphQL result:', result);

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'Failed to save push subscription');
    }

    const success = result.data?.savePushSubscription.success || false;
    console.log('savePushSubscriptionToServer: Success:', success);
    return success;
  } catch (error) {
    console.error('savePushSubscriptionToServer: Failed to save push subscription:', error);
    return false;
  }
}

// Invalidate push subscription on server
export async function invalidatePushSubscriptionOnServer(subscription: PushSubscription): Promise<boolean> {
  try {
    console.log('invalidatePushSubscriptionOnServer: Preparing to invalidate subscription');

    // Use toJSON() to get properly formatted subscription data
    const subscriptionJson = subscription.toJSON();
    console.log('invalidatePushSubscriptionOnServer: Subscription JSON:', subscriptionJson);

    // Extract structured data from PushSubscription JSON
    const subscriptionInput = {
      endpoint: subscriptionJson.endpoint || '',
      expirationTime: subscriptionJson.expirationTime ? subscriptionJson.expirationTime.toString() : null,
      keys: {
        // Keys are already in proper base64 format from toJSON()
        auth: subscriptionJson.keys?.auth || '',
        p256dh: subscriptionJson.keys?.p256dh || ''
      }
    };

    console.log('invalidatePushSubscriptionOnServer: Structured subscription data:', subscriptionInput);

    const mutation = `
      mutation InvalidatePushSubscription($subscription: PushSubscriptionInput!) {
        invalidatePushSubscription(subscription: $subscription) {
          success
        }
      }
    `;

    const result = await graphqlFetch<{ invalidatePushSubscription: { success: boolean } }>({
      query: mutation,
      variables: { subscription: subscriptionInput }
    });

    console.log('invalidatePushSubscriptionOnServer: GraphQL result:', result);

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'Failed to invalidate push subscription');
    }

    return result.data?.invalidatePushSubscription.success || false;
  } catch (error) {
    console.error('invalidatePushSubscriptionOnServer: Failed to invalidate push subscription:', error);
    return false;
  }
}

// Register background sync
export async function registerBackgroundSync(registration: ServiceWorkerRegistration, tag: string = 'background-sync'): Promise<void> {
  if ('sync' in registration && registration.sync) {
    try {
      await (registration.sync as any).register(tag);
      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  } else {
    console.log('Background sync not supported');
  }
}

// Setup push notifications (complete flow)
export async function setupPushNotifications(): Promise<{
  success: boolean;
  subscription: PushSubscription | null;
  registration: ServiceWorkerRegistration | null;
}> {
  try {
    console.log('setupPushNotifications: Starting setup...');

    // Check support
    if (!isNotificationSupported()) {
      throw new Error('Push notifications not supported');
    }
    console.log('setupPushNotifications: Support check passed');

    // Register service worker
    console.log('setupPushNotifications: Registering service worker...');
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('Service worker registration failed');
    }
    console.log('setupPushNotifications: Service worker registered:', registration.scope);

    // Check permission
    console.log('setupPushNotifications: Checking notification permission...');
    let permission = getNotificationPermission();
    console.log('setupPushNotifications: Current permission:', permission);

    if (permission === 'default') {
      console.log('setupPushNotifications: Requesting notification permission...');
      permission = await askPermission();
      console.log('setupPushNotifications: Permission after request:', permission);
    }

    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Subscribe to push notifications
    console.log('setupPushNotifications: Creating push subscription...');
    const subscription = await subscribeToPushNotifications(registration);
    if (!subscription) {
      throw new Error('Failed to create push subscription');
    }
    console.log('setupPushNotifications: Push subscription created:', subscription.endpoint);

    // Save subscription to server
    console.log('setupPushNotifications: Saving subscription to server...');
    const saved = await savePushSubscriptionToServer(subscription);
    if (!saved) {
      console.warn('setupPushNotifications: Failed to save push subscription to server');
    } else {
      console.log('setupPushNotifications: Subscription saved to server successfully');
    }

    // Register background sync
    console.log('setupPushNotifications: Registering background sync...');
    await registerBackgroundSync(registration);

    console.log('setupPushNotifications: Setup completed successfully');
    return {
      success: true,
      subscription,
      registration
    };
  } catch (error) {
    console.error('setupPushNotifications: Setup failed:', error);
    return {
      success: false,
      subscription: null,
      registration: null
    };
  }
}

// Cleanup push notifications (for logout)
export async function cleanupPushNotifications(registration?: ServiceWorkerRegistration): Promise<void> {
  try {
    console.log('cleanupPushNotifications: Starting cleanup...');

    if (!registration) {
      console.log('cleanupPushNotifications: Getting service worker registration...');
      registration = await navigator.serviceWorker.getRegistration();
    }

    if (registration) {
      console.log('cleanupPushNotifications: Found service worker registration');
      const subscription = await registration.pushManager?.getSubscription();

      if (subscription) {
        console.log('cleanupPushNotifications: Found push subscription, invalidating on server...');

        // Invalidate on server first (this needs auth token)
        await invalidatePushSubscriptionOnServer(subscription);
        console.log('cleanupPushNotifications: Server invalidation completed');

        // Then unsubscribe locally
        console.log('cleanupPushNotifications: Unsubscribing locally...');
        await unsubscribeFromPushNotifications(registration);
        console.log('cleanupPushNotifications: Local unsubscription completed');
      } else {
        console.log('cleanupPushNotifications: No push subscription found');
      }
    } else {
      console.log('cleanupPushNotifications: No service worker registration found');
    }

    console.log('cleanupPushNotifications: Cleanup completed successfully');
  } catch (error) {
    console.error('cleanupPushNotifications: Failed to cleanup push notifications:', error);
    throw error; // Re-throw so caller knows it failed
  }
}

// Debug function to test push notification setup manually
// This can be called from browser console: window.testPushNotifications()
export function testPushNotifications() {
  console.log('=== Testing Push Notification Setup ===');

  console.log('1. Checking support...');
  const supported = isNotificationSupported();
  console.log('Support result:', supported);

  if (!supported) {
    console.log('Push notifications not supported, stopping test');
    return;
  }

  console.log('2. Getting current permission...');
  const permission = getNotificationPermission();
  console.log('Current permission:', permission);

  console.log('3. Starting full setup...');
  setupPushNotifications()
    .then((result) => {
      console.log('Setup completed with result:', result);
    })
    .catch((error) => {
      console.error('Setup failed with error:', error);
    });
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testPushNotifications = testPushNotifications;
  (window as any).isNotificationSupported = isNotificationSupported;
  (window as any).getNotificationPermission = getNotificationPermission;
  (window as any).setupPushNotifications = setupPushNotifications;
}
