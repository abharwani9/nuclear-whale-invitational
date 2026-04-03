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

// webpush.notification in the payload handles display with tag dedup
// onBackgroundMessage is NOT called when webpush.notification is present in FCM v1
// So this handler only fires for data-only messages — do nothing here
messaging.onBackgroundMessage(payload => {
  // Intentionally empty — webpush.notification handles display
});
