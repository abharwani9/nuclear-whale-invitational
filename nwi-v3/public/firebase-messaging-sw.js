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

// Force this service worker to become active immediately
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  // tag: 'nwi' ensures only one notification shows at a time (replaces previous)
  self.registration.showNotification(title || 'Nuclear Whale Invitational', {
    body: body || '',
    icon: '/logo192.png',
    tag: 'nwi',
    renotify: true,
  });
});
