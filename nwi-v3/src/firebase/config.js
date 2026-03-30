// src/firebase/config.js
// ─────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Click "Add project" → name it "nuclear-whale-invitational"
// 3. Disable Google Analytics (not needed) → Create project
// 4. Click the </> Web icon to add a web app
// 5. Register app with nickname "NWI App"
// 6. Copy the firebaseConfig values below from your Firebase console
// 7. In Firebase console: Build → Firestore Database → Create database
//    → Start in "test mode" → choose a region → Done
// 8. In Firebase console: Build → Storage → Get started
//    → Start in "test mode" → Done  (for player photos)
// ─────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 🔧 REPLACE THESE WITH YOUR FIREBASE PROJECT VALUES:
const firebaseConfig = {
  apiKey: "AIzaSyDPhq-D-pSpv54AQ8DH7td6YiBMhH6MY18",
  authDomain: "nuclear-whale-invitation-8df45.firebaseapp.com",
  projectId: "nuclear-whale-invitation-8df45",
  storageBucket: "nuclear-whale-invitation-8df45.firebasestorage.app",
  messagingSenderId: "877175227248",
  appId: "1:877175227248:web:c587c9fc446d1c324305b5"
};

const app = initializeApp(firebaseConfig);
// Use memory cache only — disables offline persistence so data is always fresh
export const db = initializeFirestore(app, { localCache: memoryLocalCache() });
export const auth = getAuth(app);
export default app;
