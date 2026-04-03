// firebase-messaging-sw.js
// 🔧 REPLACE THESE WITH YOUR FIREBASE PROJECT VALUES

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDPhq-D-pSpv54AQ8DH7td6YiBMhH6MY18",
  authDomain: "nuclear-whale-invitation-8df45.firebaseapp.com",
  projectId: "nuclear-whale-invitation-8df45",
  storageBucket: "nuclear-whale-invitation-8df45.firebasestorage.app",
  messagingSenderId: "877175227248",
  appId: "1:877175227248:web:c587c9fc446d1c324305b5"
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const messaging = firebase.messaging();

// webpush.notification in the FCM payload handles display automatically with the tag
// onBackgroundMessage is NOT called when webpush.notification is present
// So we don't need to call showNotification here — FCM handles it with our tag
messaging.onBackgroundMessage(payload => {
  // Only fires for data-only messages — not needed since we use webpush.notification
  // Kept as safety net
  if (!payload.notification && !payload.webpush?.notification) {
    const title = payload.data?.nwi_title || 'Nuclear Whale Invitational';
    const body  = payload.data?.nwi_body  || '';
    return self.registration.showNotification(title, {
      body, icon: '/logo192.png', tag: 'nwi-unique', renotify: false,
    });
  }
});
