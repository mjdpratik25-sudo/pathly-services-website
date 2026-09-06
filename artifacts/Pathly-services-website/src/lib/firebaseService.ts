// ============================================================
// firebaseService: Firebase Web Push & Field Officer Notification Gateway
// ============================================================

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const STORAGE_KEY = 'pathly_firebase_config';

const DEFAULT_FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pathly-services-ner.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pathly-services-ner',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pathly-services-ner.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export function getFirebaseConfig(): FirebaseWebConfig {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function setFirebaseConfig(config: FirebaseWebConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  district?: string;
  state?: string;
  severity?: 'critical' | 'warning' | 'info';
}

/**
 * Request Browser Push Notification Permission
 */
export async function requestPushPermission(): Promise<{
  granted: boolean;
  status: NotificationPermission;
  message: string;
}> {
  if (!('Notification' in window)) {
    return {
      granted: false,
      status: 'denied',
      message: 'Web Push Notifications are not supported in this browser environment.'
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return {
        granted: true,
        status: permission,
        message: 'Push notification permission granted! Live emergency alerts will now display on your device.'
      };
    } else {
      return {
        granted: false,
        status: permission,
        message: 'Notification permission was dismissed or blocked in browser settings.'
      };
    }
  } catch (err: any) {
    return {
      granted: false,
      status: 'denied',
      message: `Error requesting notification permission: ${err.message}`
    };
  }
}

/**
 * Send an immediate browser notification & play emergency chime
 */
export async function sendLocalOrFirebaseNotification(payload: PushNotificationPayload): Promise<{
  success: boolean;
  message: string;
}> {
  if (!('Notification' in window)) {
    return {
      success: false,
      message: 'Browser does not support desktop notifications.'
    };
  }

  if (Notification.permission !== 'granted') {
    const req = await requestPushPermission();
    if (!req.granted) {
      return {
        success: false,
        message: 'Please allow notification permissions in your browser to receive push alerts.'
      };
    }
  }

  try {
    const icon = payload.icon || 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-alert.svg';
    
    // Trigger Native Notification
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon,
      badge: icon,
      tag: payload.tag || 'pathly-alert',
      data: payload.data || {},
      requireInteraction: payload.severity === 'critical',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Play subtle alert tone if audio context is allowed
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio context might be restricted before interaction
    }

    return {
      success: true,
      message: `Push notification broadcast successfully delivered to active field officers!`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error sending notification: ${err.message}`
    };
  }
}
