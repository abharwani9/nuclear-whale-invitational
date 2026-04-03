// firebase-messaging-sw.js
// Service worker for Firebase Cloud Messaging push notifications
// IMPORTANT: Replace the firebaseConfig values below with your actual Firebase project values

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 🔧 REPLACE THESE WITH YOUR FIREBASE PROJECT VALUES (same as src/firebase/config.js)
firebase.initializeApp({
  apiKey: "AIzaSyDPhq-D-pSpv54AQ8DH7td6YiBMhH6MY18",
  authDomain: "nuclear-whale-invitation-8df45.firebaseapp.com",
  projectId: "nuclear-whale-invitation-8df45",
  storageBucket: "nuclear-whale-invitation-8df45.firebasestorage.app",
  messagingSenderId: "877175227248",
  appId: "1:877175227248:web:c587c9fc446d1c324305b5"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Nuclear Whale Invitational', {
    body: body || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'nwi-notification',
    renotify: true,
  });
});
