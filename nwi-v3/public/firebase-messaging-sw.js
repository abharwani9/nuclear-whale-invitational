// firebase-messaging-sw.js
// 🔧 REPLACE THESE WITH YOUR FIREBASE PROJECT VALUES (same as src/firebase/config.js)

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

// onBackgroundMessage fires when the app is in background
// We explicitly show ONE notification here with a dedup tag
messaging.onBackgroundMessage(payload => {
  const title = payload.data?.nwi_title || payload.notification?.title || 'Nuclear Whale Invitational';
  const body  = payload.data?.nwi_body  || payload.notification?.body  || '';

  return self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    tag: 'nwi',       // same tag = replaces any existing notification, no duplicates
    renotify: true,   // still buzzes even with same tag
  });
});
