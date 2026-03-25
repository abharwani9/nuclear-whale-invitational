# ☢️🐋 Nuclear Whale Invitational — Setup Guide (v2)

## What's new in v2
- 🎬 **Media Vault** tab — photos, audio/theme songs, PDF docs
- 📸 **Player photo uploads** — any player can upload tournament photos directly
- 🎵 **In-app audio player** — play theme songs without leaving the app
- 📄 **PDF viewer** — view scorecards and docs in-app
- ⬇ **Download buttons** — save any file to your device
- 📊 **Upload progress bar** — see exactly how far along your upload is

---

## STEP 1 — Set up Firebase (free, ~10 min)

1. Go to https://console.firebase.google.com
2. Click "Add project" → name it `nuclear-whale-invitational`
3. Disable Google Analytics → Create project
4. Click the </> (Web) icon → register app as `NWI App`
5. Copy the firebaseConfig object shown

### Enable Firestore:
Sidebar → Build → Firestore Database → Create database → Start in test mode → pick region → Done

### Enable Storage (photos / audio / docs):
Sidebar → Build → Storage → Get started → Start in test mode → Done
Free tier: 5GB storage, 1GB/day downloads — more than enough for 20 users

---

## STEP 2 — Add your Firebase config

Open src/firebase/config.js and replace placeholder values with your real Firebase values.

---

## STEP 3 — Install and run locally

Install Node.js from https://nodejs.org (LTS version), then:

  npm install
  npm start

Opens at http://localhost:3000

---

## STEP 4 — Seed the database (first time only)

1. Open app → Admin Panel → code: nuke2026
2. Click the "Seed DB" button (top right)
3. Only run this ONCE on a fresh setup

---

## STEP 5 — Deploy to Vercel (free)

1. Push this folder to GitHub
2. Go to vercel.com → Add New Project → import repo → Deploy
3. Share the URL with all 20 players

Install on phones:
- iPhone: Safari → Share → Add to Home Screen
- Android: Chrome → menu → Add to Home Screen

---

## STEP 6 — Making changes (Option A workflow)

1. Describe the change to Claude
2. Claude gives you updated file(s)
3. Replace the file in your project folder
4. Run: npx vercel --prod
Takes about 5 minutes per change.

---

## Admin Access Codes

  nuke2026    (Admin 1)
  whale2026   (Admin 2)
  admin2026   (Admin 3)

To change: edit ADMIN_CODES array at line 6 of src/pages/AdminPanel.js

---

## Media Vault

Admins can upload:
  - Photos (JPG, PNG, etc.) — shown in grid gallery
  - Audio (MP3, M4A, etc.) — plays in-app with download option
  - Documents (PDF, etc.) — viewable in-app with download option

Any player can upload photos from the Media tab (they enter their name + caption).

---

## File structure

  src/
    firebase/
      config.js        <- Put your Firebase keys here (only file you must edit)
      hooks.js         <- Real-time data listeners
      seed.js          <- Starter data
    pages/
      PublicApp.js     <- What everyone sees
      AdminPanel.js    <- Admin editing UI
      MediaGallery.js  <- Photos, audio, docs viewer
      AdminMedia.js    <- Media upload/manage UI
    App.js
