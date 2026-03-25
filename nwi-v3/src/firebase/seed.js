// src/firebase/seed.js
// Run this ONCE from the Admin Panel to populate your Firebase with starter data.
// After seeding, edit everything from the Admin Panel UI.

import { db } from "./config";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";

export async function seedDatabase() {
  try {
    // ── Tournament Meta ──────────────────────────────────────────
    await setDoc(doc(db, "meta", "tournament"), {
      name: "Nuclear Whale Invitational",
      year: 2026,
      date: "2026-08-13",
      location: "TBD",
      tagline: "The Annual Battle of Fire & Water"
    });

    // ── Admin Codes ───────────────────────────────────────────────
    await setDoc(doc(db, "meta", "admins"), {
      codes: ["nuke2026", "whale2026", "admin2026"]
    });

    // ── Players ───────────────────────────────────────────────────
    const players = [
      { name: "Mike T.", team: "nukes", handicap: 12, bio: "3-time participant", photoURL: "" },
      { name: "Dave R.", team: "nukes", handicap: 8, bio: "2023 MVP", photoURL: "" },
      { name: "Chris L.", team: "nukes", handicap: 18, bio: "Long drive specialist", photoURL: "" },
      { name: "Jake M.", team: "nukes", handicap: 5, bio: "Team captain", photoURL: "" },
      { name: "Sam W.", team: "whales", handicap: 10, bio: "2022 MVP", photoURL: "" },
      { name: "Tom B.", team: "whales", handicap: 15, bio: "Closest to pin king", photoURL: "" },
      { name: "Ryan K.", team: "whales", handicap: 7, bio: "2021 MVP", photoURL: "" },
      { name: "Nick P.", team: "whales", handicap: 20, bio: "Always improving", photoURL: "" },
    ];
    for (const p of players) {
      await addDoc(collection(db, "players"), p);
    }

    // ── Schedule ─────────────────────────────────────────────────
    const schedule = [
      { day: "Day 1", time: "7:00 AM", event: "Registration & Breakfast", icon: "🍳" },
      { day: "Day 1", time: "8:30 AM", event: "Round 1 Shotgun Start", icon: "⛳" },
      { day: "Day 1", time: "2:00 PM", event: "Lunch & Side Competitions", icon: "🏅" },
      { day: "Day 2", time: "4:00 PM", event: "Round 2 Tee Off", icon: "⛳" },
      { day: "Day 3", time: "9:00 AM", event: "Round 3 Final Round", icon: "⛳" },
      { day: "Day 3", time: "3:00 PM", event: "Awards Ceremony & Cookout", icon: "🏆" },
    ];
    for (const s of schedule) await addDoc(collection(db, "schedule"), s);

    // ── Rounds / Matchups ─────────────────────────────────────────
    // Each round has a name, points value, and list of matchups
    const rounds = [
      {
        name: "Round 1", day: "Day 1", pointsPerWin: 3, pointsPerTie: 1.5,
        matchups: [
          { nukes: ["Mike T.", "Dave R."], whales: ["Sam W.", "Tom B."], winner: null },
          { nukes: ["Chris L.", "Jake M."], whales: ["Ryan K.", "Nick P."], winner: null },
        ]
      },
      {
        name: "Round 2", day: "Day 2", pointsPerWin: 4, pointsPerTie: 2,
        matchups: [
          { nukes: ["Dave R.", "Jake M."], whales: ["Ryan K.", "Sam W."], winner: null },
          { nukes: ["Mike T.", "Chris L."], whales: ["Tom B.", "Nick P."], winner: null },
        ]
      },
      {
        name: "Round 3", day: "Day 3", pointsPerWin: 6, pointsPerTie: 3,
        matchups: [
          { nukes: ["Mike T.", "Jake M."], whales: ["Sam W.", "Ryan K."], winner: null },
          { nukes: ["Dave R.", "Chris L."], whales: ["Tom B.", "Nick P."], winner: null },
        ]
      },
    ];
    for (const r of rounds) await addDoc(collection(db, "rounds"), r);

    // ── Side Competitions ─────────────────────────────────────────
    const competitions = [
      { name: "Closest to the Pin", icon: "🎯", desc: "Hole #7 Par 3 — measured in feet & inches", winner: null, winnerTeam: null, detail: "" },
      { name: "Most Birdies", icon: "🐦", desc: "Total birdies across all 3 rounds", winner: null, winnerTeam: null, detail: "" },
      { name: "Cumulative Team Points", icon: "⚡", desc: "Total points across all matchups & competitions", winner: null, winnerTeam: null, detail: "Auto-calculated" },
    ];
    for (const c of competitions) await addDoc(collection(db, "competitions"), c);

    // ── Past Tournaments ──────────────────────────────────────────
    const history = [
      { year: 2024, winner: "THE NUKES", score: "18 pts", mvp: "Jake M.", notes: "Closest tournament yet — decided on final hole", nukes_pts: 18, whales_pts: 15 },
      { year: 2023, winner: "THE WHALES", score: "20 pts", mvp: "Ryan K.", notes: "Whales dominated Round 3", nukes_pts: 14, whales_pts: 20 },
    ];
    for (const h of history) await addDoc(collection(db, "history"), h);

    // ── Rules ─────────────────────────────────────────────────────
    const rules = [
      { order: 1, title: "Format", body: "3-round team match play. Each round features 2v2 matchups. Points vary per round — see the schedule for point values." },
      { order: 2, title: "Handicaps", body: "All players use their current GHIN handicap index. Handicaps are locked at tournament registration." },
      { order: 3, title: "Team Scoring", body: "Points are awarded per matchup win. Ties split the points. The team with the most cumulative points wins the trophy." },
      { order: 4, title: "Side Competitions", body: "Closest to the Pin and Most Birdies award bonus points. Results are entered by admins after each round." },
      { order: 5, title: "Conduct", body: "No mulligans. Gimmies within the leather only. The Nuclear Whale Code of Honor applies at all times." },
    ];
    for (const r of rules) await addDoc(collection(db, "rules"), r);

    // ── Media ─────────────────────────────────────────────────────
    // Upload photos, audio, and docs via Admin Panel → Media Vault
    // No seed data needed here.

    alert("✅ Database seeded! Now go to Admin Panel → Media Vault to upload photos, theme songs, and documents.");
  } catch (err) {
    console.error("Seed error:", err);
    alert("❌ Seed failed: " + err.message);
  }
}
