// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 🔧 REPLACE THESE WITH YOUR FIREBASE PROJECT VALUES
firebase.initializeApp({
  apiKey: "AIzaSyDPhq-D-pSpv54AQ8DH7td6YiBMhH6MY18",
  authDomain: "nuclear-whale-invitation-8df45.firebaseapp.com",
  projectId: "nuclear-whale-invitation-8df45",
  storageBucket: "nuclear-whale-invitation-8df45.firebasestorage.app",
  messagingSenderId: "877175227248",
  appId: "1:877175227248:web:c587c9fc446d1c324305b5"
});

const messaging = firebase.messaging();

// Handle background notifications — only show once
messaging.onBackgroundMessage(payload => {
  const clients_check = self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => {
      // Don't show if app is in foreground (client is focused)
      const focused = clients.some(c => c.focused);
      if (focused) return;
      
      const { title, body } = payload.notification || {};
      self.registration.showNotification(title || 'Nuclear Whale Invitational', {
        body: body || '',
        icon: '/logo192.png',
        tag: 'nwi-notification', // tag prevents duplicates
        renotify: false,
      });
    });
});
