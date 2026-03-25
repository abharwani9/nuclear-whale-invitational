// src/pages/AdminPanel.js
import { useState, useRef } from "react";
import { useCollection, useDocument, firestore } from "../firebase/hooks";
import { seedDatabase } from "../firebase/seed";
import AdminMedia from "./AdminMedia";

const ADMIN_CODES = ["nuke2026", "whale2026", "admin2026"];

const s = { // inline style helpers
  label: { fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 },
  input: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8edf3", fontFamily: "inherit", fontSize: 14, padding: "9px 12px", width: "100%", outline: "none" },
  select: { background: "#1a2035", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8edf3", fontFamily: "inherit", fontSize: 14, padding: "9px 12px", width: "100%", outline: "none" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 16px", marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 },
  btnFire: { padding: "9px 18px", background: "linear-gradient(135deg,#ff4500,#ff8c00)", border: "none", borderRadius: 8, color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" },
  btnBlue: { padding: "9px 18px", background: "linear-gradient(135deg,#0066cc,#00ccff)", border: "none", borderRadius: 8, color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" },
  btnGhost: { padding: "8px 16px", background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" },
  btnDanger: { padding: "7px 14px", background: "rgba(220,30,30,0.15)", border: "1px solid rgba(220,30,30,0.4)", borderRadius: 8, color: "#ff5555", fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  row: { display: "flex", gap: 8, alignItems: "center" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
};

const SECTIONS = [
  { id: "players", label: "Players", icon: "👤" },
  { id: "rounds", label: "Rounds & Matchups", icon: "⚔️" },
  { id: "schedule", label: "Schedule", icon: "📅" },
  { id: "competitions", label: "Competitions", icon: "🎯" },
  { id: "media", label: "Media Vault", icon: "🎬" },
  { id: "history", label: "History", icon: "📜" },
  { id: "rules", label: "Rules", icon: "📋" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function AdminPanel({ authed, onAuth, onBack }) {
  const [code, setCode] = useState("");
  const [section, setSection] = useState("players");
  const [toast, setToast] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const { data: players } = useCollection("players");
  const { data: rounds } = useCollection("rounds");
  const { data: schedule } = useCollection("schedule");
  const { data: competitions } = useCollection("competitions");
  const { data: history } = useCollection("history");
  const { data: rules } = useCollection("rules", "order");
  const { data: meta } = useDocument("meta", "tournament");

  const showToast = (msg, err = false) => { setToast({ msg, err }); setTimeout(() => setToast(null), 3000); };

  const tryLogin = () => {
    if (ADMIN_CODES.includes(code.trim())) { onAuth(); setCode(""); }
    else showToast("Invalid access code", true);
  };

  const handleSeed = async () => {
    if (!window.confirm("This will populate the database with starter data. Only do this once on a fresh setup. Continue?")) return;
    setSeeding(true);
    await seedDatabase();
    setSeeding(false);
  };

  if (!authed) return (
    <div style={{ minHeight: "100vh", background: "#07090e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ ...s.card, width: "100%", maxWidth: 360, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.06em", color: "#e8edf3", marginBottom: 4 }}>ADMIN PANEL</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Nuclear Whale Invitational</div>
        <input style={{ ...s.input, marginBottom: 12, textAlign: "center", letterSpacing: "0.12em" }} type="password" placeholder="Enter access code" value={code}
          onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && tryLogin()} />
        <button style={{ ...s.btnFire, width: "100%", marginBottom: 12 }} onClick={tryLogin}>Unlock</button>
        <button style={{ ...s.btnGhost, width: "100%" }} onClick={onBack}>← Back to App</button>
        {toast && <div style={{ marginTop: 12, fontSize: 13, color: toast.err ? "#ff5555" : "#4ade80" }}>{toast.msg}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#07090e", color: "#e8edf3", fontFamily: "'Barlow Condensed', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select,textarea{transition:border-color 0.2s;}
        input:focus,select:focus,textarea:focus{border-color:rgba(255,255,255,0.3)!important;outline:none;}
        textarea{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#e8edf3;font-family:'Barlow',sans-serif;font-size:14px;padding:9px 12px;width:100%;resize:vertical;}
        .sec-btn{flex-shrink:0;padding:8px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:8px;color:rgba(255,255,255,0.45);font-family:inherit;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
        .sec-btn.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);color:#fff;}
      `}</style>

      {/* Top bar */}
      <div style={{ background: "#0d1520", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button style={s.btnGhost} onClick={onBack}>← App</button>
          <div style={{ flex: 1, fontSize: 18, fontWeight: 800, letterSpacing: "0.06em" }}>☢️🐋 ADMIN PANEL</div>
          <button style={{ ...s.btnGhost, borderColor: "rgba(255,69,0,0.4)", color: "#ff4500", fontSize: 11 }} onClick={handleSeed} disabled={seeding}>
            {seeding ? "Seeding..." : "⚡ Seed DB"}
          </button>
        </div>
      </div>

      {/* Section nav */}
      <div style={{ background: "#0a0f1a", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
        {SECTIONS.map(sec => (
          <button key={sec.id} className={`sec-btn${section === sec.id ? " active" : ""}`} onClick={() => setSection(sec.id)}>
            {sec.icon} {sec.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px" }}>
        {toast && (
          <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 8, background: toast.err ? "rgba(220,30,30,0.15)" : "rgba(74,222,128,0.12)", border: `1px solid ${toast.err ? "rgba(220,30,30,0.4)" : "rgba(74,222,128,0.3)"}`, fontSize: 14, color: toast.err ? "#ff5555" : "#4ade80" }}>
            {toast.msg}
          </div>
        )}

        {section === "players" && <PlayersSection players={players} showToast={showToast} />}
        {section === "rounds" && <RoundsSection rounds={rounds} players={players} showToast={showToast} />}
        {section === "schedule" && <ScheduleSection schedule={schedule} showToast={showToast} />}
        {section === "competitions" && <CompetitionsSection competitions={competitions} showToast={showToast} />}
        {section === "media" && <AdminMedia showToast={showToast} />}
        {section === "history" && <HistorySection history={history} showToast={showToast} />}
        {section === "rules" && <RulesSection rules={rules} showToast={showToast} />}
        {section === "settings" && <SettingsSection meta={meta} showToast={showToast} />}
      </div>
    </div>
  );
}

// ── PLAYERS ──────────────────────────────────────────────────────────────────
function PlayersSection({ players, showToast }) {
  const blank = { name: "", team: "nukes", handicap: "", bio: "", photoURL: "" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const save = async () => {
    if (!form.name) return showToast("Name required", true);
    try {
      if (editing) { await firestore.update("players", editing, { ...form, handicap: Number(form.handicap) }); showToast("Player updated!"); setEditing(null); }
      else { await firestore.add("players", { ...form, handicap: Number(form.handicap) }); showToast("Player added!"); }
      setForm(blank);
    } catch(e) { showToast("Error: " + e.message, true); }
  };

  const startEdit = (p) => { setEditing(p.id); setForm({ name: p.name, team: p.team, handicap: p.handicap, bio: p.bio || "", photoURL: p.photoURL || "" }); };
  const del = async (id) => { if (window.confirm("Delete player?")) { await firestore.delete("players", id); showToast("Deleted"); } };

  const uploadPhoto = async (file, playerId) => {
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `players/${playerId || "new"}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm(f => ({ ...f, photoURL: url }));
      if (playerId) await firestore.update("players", playerId, { photoURL: url });
      showToast("Photo uploaded!");
    } catch(e) { showToast("Upload failed: " + e.message, true); }
    setUploading(false);
  };

  return (
    <div>
      <div style={s.sectionTitle}>👤 Players</div>

      {/* Form */}
      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: editing ? "#ff8c00" : "#4ade80" }}>{editing ? "✏️ Editing Player" : "➕ Add Player"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><div style={s.label}>Name</div><input style={s.input} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Full name" /></div>
          <div><div style={s.label}>Team</div>
            <select style={s.select} value={form.team} onChange={e => setForm(f => ({...f, team: e.target.value}))}>
              <option value="nukes">☢️ Nukes</option>
              <option value="whales">🐋 Whales</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}><div style={s.label}>Handicap</div><input style={s.input} type="number" value={form.handicap} onChange={e => setForm(f => ({...f, handicap: e.target.value}))} placeholder="e.g. 12" /></div>
        <div style={{ marginBottom: 10 }}><div style={s.label}>Bio / Notes</div><textarea rows={2} value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} placeholder="Fun fact, previous wins, etc." /></div>
        <div style={{ marginBottom: 14 }}>
          <div style={s.label}>Photo</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input style={{ ...s.input, flex: 1 }} value={form.photoURL} onChange={e => setForm(f => ({...f, photoURL: e.target.value}))} placeholder="Paste image URL, or upload →" />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => uploadPhoto(e.target.files[0], editing)} />
            <button style={s.btnGhost} onClick={() => fileRef.current.click()} disabled={uploading}>{uploading ? "..." : "📷 Upload"}</button>
          </div>
          {form.photoURL && <img src={form.photoURL} alt="preview" style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", marginTop: 8 }} />}
        </div>
        <div style={s.row}>
          <button style={s.btnFire} onClick={save}>{editing ? "Save Changes" : "Add Player"}</button>
          {editing && <button style={s.btnGhost} onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
        </div>
      </div>

      {/* Player list */}
      {["nukes","whales"].map(team => (
        <div key={team} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: team === "nukes" ? "#ff4500" : "#00aaff", letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
            {team === "nukes" ? "☢️" : "🐋"} {team}
          </div>
          {players.filter(p => p.team === team).map(p => (
            <div key={p.id} style={{ ...s.card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              {p.photoURL ? <img src={p.photoURL} alt={p.name} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{p.name?.[0]}</div>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>HCP {p.handicap}{p.bio ? ` · ${p.bio}` : ""}</div>
              </div>
              <div style={s.row}>
                <button style={s.btnGhost} onClick={() => startEdit(p)}>Edit</button>
                <button style={s.btnDanger} onClick={() => del(p.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── ROUNDS & MATCHUPS ─────────────────────────────────────────────────────────
function RoundsSection({ rounds, players, showToast }) {
  const blankRound = { name: "", day: "Day 1", pointsPerWin: 3, pointsPerTie: 1.5 };
  const [form, setForm] = useState(blankRound);
  const [editingRound, setEditingRound] = useState(null);

  const saveRound = async () => {
    if (!form.name) return showToast("Round name required", true);
    try {
      const data = { ...form, pointsPerWin: Number(form.pointsPerWin), pointsPerTie: Number(form.pointsPerTie), matchups: editingRound ? undefined : [] };
      if (editingRound) { const { matchups: _, ...rest } = data; await firestore.update("rounds", editingRound, rest); showToast("Round updated!"); setEditingRound(null); }
      else { await firestore.add("rounds", { ...data, matchups: [] }); showToast("Round added!"); }
      setForm(blankRound);
    } catch(e) { showToast("Error: " + e.message, true); }
  };

  const delRound = async (id) => { if (window.confirm("Delete round?")) { await firestore.delete("rounds", id); showToast("Deleted"); } };
  const startEditRound = (r) => { setEditingRound(r.id); setForm({ name: r.name, day: r.day, pointsPerWin: r.pointsPerWin, pointsPerTie: r.pointsPerTie }); };

  const updateMatchupWinner = async (roundId, matchups, mi, winner) => {
    const updated = matchups.map((m, i) => i === mi ? { ...m, winner } : m);
    await firestore.update("rounds", roundId, { matchups: updated });
    showToast("Result saved!");
  };

  const addMatchup = async (round) => {
    const nukes = players.filter(p => p.team === "nukes").map(p => p.name);
    const whales = players.filter(p => p.team === "whales").map(p => p.name);
    const newMatchup = { nukes: nukes.slice(0, 2), whales: whales.slice(0, 2), winner: null };
    await firestore.update("rounds", round.id, { matchups: [...(round.matchups || []), newMatchup] });
    showToast("Matchup added!");
  };

  const updateMatchupPlayers = async (round, mi, side, idx, value) => {
    const updated = (round.matchups || []).map((m, i) => {
      if (i !== mi) return m;
      const arr = [...(m[side] || [])];
      arr[idx] = value;
      return { ...m, [side]: arr };
    });
    await firestore.update("rounds", round.id, { matchups: updated });
  };

  const delMatchup = async (round, mi) => {
    const updated = (round.matchups || []).filter((_, i) => i !== mi);
    await firestore.update("rounds", round.id, { matchups: updated });
    showToast("Matchup removed");
  };

  const nukeNames = players.filter(p => p.team === "nukes").map(p => p.name);
  const whaleNames = players.filter(p => p.team === "whales").map(p => p.name);

  return (
    <div>
      <div style={s.sectionTitle}>⚔️ Rounds & Matchups</div>

      {/* Add/edit round */}
      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: editingRound ? "#ff8c00" : "#4ade80" }}>{editingRound ? "✏️ Edit Round" : "➕ Add Round"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Round Name</div><input style={s.input} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Round 1" /></div>
          <div><div style={s.label}>Day</div>
            <select style={s.select} value={form.day} onChange={e => setForm(f => ({...f, day: e.target.value}))}>
              <option>Day 1</option><option>Day 2</option><option>Day 3</option>
            </select>
          </div>
          <div><div style={s.label}>Points per Win</div><input style={s.input} type="number" step="0.5" value={form.pointsPerWin} onChange={e => setForm(f => ({...f, pointsPerWin: e.target.value}))} /></div>
          <div><div style={s.label}>Points per Tie</div><input style={s.input} type="number" step="0.5" value={form.pointsPerTie} onChange={e => setForm(f => ({...f, pointsPerTie: e.target.value}))} /></div>
        </div>
        <div style={{ ...s.row, marginTop: 14 }}>
          <button style={s.btnFire} onClick={saveRound}>{editingRound ? "Save Round" : "Add Round"}</button>
          {editingRound && <button style={s.btnGhost} onClick={() => { setEditingRound(null); setForm(blankRound); }}>Cancel</button>}
        </div>
      </div>

      {/* Round list */}
      {rounds.map(round => (
        <div key={round.id} style={{ ...s.card, borderColor: "rgba(255,200,0,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{round.name} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>{round.day}</span></div>
              <div style={{ fontSize: 12, color: "#ffd700" }}>Win = {round.pointsPerWin} pts · Tie = {round.pointsPerTie} pts</div>
            </div>
            <button style={s.btnGhost} onClick={() => startEditRound(round)}>Edit</button>
            <button style={s.btnDanger} onClick={() => delRound(round.id)}>✕</button>
          </div>

          {/* Matchups */}
          {(round.matchups || []).map((m, mi) => (
            <div key={mi} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#ff4500", letterSpacing: "0.08em", marginBottom: 6 }}>☢️ NUKES</div>
                  {[0,1].map(idx => (
                    <select key={idx} style={{ ...s.select, marginBottom: 6 }} value={(m.nukes || [])[idx] || ""} onChange={e => updateMatchupPlayers(round, mi, "nukes", idx, e.target.value)}>
                      <option value="">— Select player —</option>
                      {nukeNames.map(n => <option key={n}>{n}</option>)}
                    </select>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#00aaff", letterSpacing: "0.08em", marginBottom: 6 }}>🐋 WHALES</div>
                  {[0,1].map(idx => (
                    <select key={idx} style={{ ...s.select, marginBottom: 6 }} value={(m.whales || [])[idx] || ""} onChange={e => updateMatchupPlayers(round, mi, "whales", idx, e.target.value)}>
                      <option value="">— Select player —</option>
                      {whaleNames.map(n => <option key={n}>{n}</option>)}
                    </select>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={s.label}>Result:</div>
                {["nukes","tie","whales",null].map(w => (
                  <button key={String(w)} onClick={() => updateMatchupWinner(round.id, round.matchups, mi, w)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${m.winner === w ? (w === "nukes" ? "#ff4500" : w === "whales" ? "#00aaff" : w === "tie" ? "#ffd700" : "rgba(255,255,255,0.3)") : "rgba(255,255,255,0.12)"}`, background: m.winner === w ? "rgba(255,255,255,0.1)" : "none", color: m.winner === w ? "#fff" : "rgba(255,255,255,0.4)", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {w === "nukes" ? "☢️ Nukes Win" : w === "whales" ? "🐋 Whales Win" : w === "tie" ? "🤝 Tie" : "Pending"}
                  </button>
                ))}
                <button style={{ ...s.btnDanger, marginLeft: "auto" }} onClick={() => delMatchup(round, mi)}>✕</button>
              </div>
            </div>
          ))}
          <button style={{ ...s.btnGhost, marginTop: 4 }} onClick={() => addMatchup(round)}>+ Add Matchup</button>
        </div>
      ))}
    </div>
  );
}

// ── SCHEDULE ──────────────────────────────────────────────────────────────────
function ScheduleSection({ schedule, showToast }) {
  const blank = { day: "Day 1", time: "", event: "", icon: "⛳" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);

  const save = async () => {
    if (!form.event || !form.time) return showToast("Time and event required", true);
    try {
      if (editing) { await firestore.update("schedule", editing, form); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("schedule", form); showToast("Added!"); }
      setForm(blank);
    } catch(e) { showToast(e.message, true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>📅 Schedule</div>
      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: editing ? "#ff8c00" : "#4ade80" }}>{editing ? "✏️ Edit Event" : "➕ Add Event"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Day</div>
            <select style={s.select} value={form.day} onChange={e => setForm(f => ({...f, day: e.target.value}))}>
              <option>Day 1</option><option>Day 2</option><option>Day 3</option>
            </select>
          </div>
          <div><div style={s.label}>Time</div><input style={s.input} value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))} placeholder="8:30 AM" /></div>
          <div><div style={s.label}>Icon (emoji)</div><input style={s.input} value={form.icon} onChange={e => setForm(f => ({...f, icon: e.target.value}))} placeholder="⛳" /></div>
        </div>
        <div style={{ marginTop: 10 }}><div style={s.label}>Event</div><input style={s.input} value={form.event} onChange={e => setForm(f => ({...f, event: e.target.value}))} placeholder="Event description" /></div>
        <div style={{ ...s.row, marginTop: 14 }}>
          <button style={s.btnFire} onClick={save}>{editing ? "Save" : "Add Event"}</button>
          {editing && <button style={s.btnGhost} onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
        </div>
      </div>
      {["Day 1","Day 2","Day 3"].map(day => {
        const items = schedule.filter(s => s.day === day);
        if (!items.length) return null;
        return (
          <div key={day} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{day}</div>
            {items.map(item => (
              <div key={item.id} style={{ ...s.card, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ color: "#ff8c00", fontWeight: 700, minWidth: 70, fontSize: 13 }}>{item.time}</span>
                <span style={{ flex: 1, fontSize: 14 }}>{item.event}</span>
                <button style={s.btnGhost} onClick={() => { setEditing(item.id); setForm({ day: item.day, time: item.time, event: item.event, icon: item.icon || "" }); }}>Edit</button>
                <button style={s.btnDanger} onClick={async () => { await firestore.delete("schedule", item.id); showToast("Deleted"); }}>✕</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── COMPETITIONS ──────────────────────────────────────────────────────────────
function CompetitionsSection({ competitions, showToast }) {
  const blank = { name: "", icon: "🏅", desc: "", winner: "", winnerTeam: "nukes", detail: "" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);

  const save = async () => {
    if (!form.name) return showToast("Name required", true);
    try {
      if (editing) { await firestore.update("competitions", editing, form); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("competitions", form); showToast("Added!"); }
      setForm(blank);
    } catch(e) { showToast(e.message, true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>🎯 Competitions</div>
      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: editing ? "#ff8c00" : "#4ade80" }}>{editing ? "✏️ Edit" : "➕ Add Competition"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Name</div><input style={s.input} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Competition name" /></div>
          <div><div style={s.label}>Icon</div><input style={s.input} value={form.icon} onChange={e => setForm(f => ({...f, icon: e.target.value}))} placeholder="🎯" /></div>
        </div>
        <div style={{ marginTop: 10 }}><div style={s.label}>Description</div><input style={s.input} value={form.desc} onChange={e => setForm(f => ({...f, desc: e.target.value}))} placeholder="Rules / hole info" /></div>
        <div style={s.grid2}>
          <div style={{ marginTop: 10 }}><div style={s.label}>Current Leader / Winner</div><input style={s.input} value={form.winner} onChange={e => setForm(f => ({...f, winner: e.target.value}))} placeholder="Player name + result" /></div>
          <div style={{ marginTop: 10 }}><div style={s.label}>Their Team</div>
            <select style={s.select} value={form.winnerTeam} onChange={e => setForm(f => ({...f, winnerTeam: e.target.value}))}>
              <option value="nukes">☢️ Nukes</option>
              <option value="whales">🐋 Whales</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}><div style={s.label}>Detail (e.g. "4'2\"")</div><input style={s.input} value={form.detail} onChange={e => setForm(f => ({...f, detail: e.target.value}))} /></div>
        <div style={{ ...s.row, marginTop: 14 }}>
          <button style={s.btnFire} onClick={save}>{editing ? "Save" : "Add"}</button>
          {editing && <button style={s.btnGhost} onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
        </div>
      </div>
      {competitions.map(c => (
        <div key={c.id} style={{ ...s.card, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{c.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{c.winner ? `Leader: ${c.winner}` : "No result yet"}</div>
          </div>
          <button style={s.btnGhost} onClick={() => { setEditing(c.id); setForm({ name: c.name, icon: c.icon, desc: c.desc, winner: c.winner || "", winnerTeam: c.winnerTeam || "nukes", detail: c.detail || "" }); }}>Edit</button>
          <button style={s.btnDanger} onClick={async () => { await firestore.delete("competitions", c.id); showToast("Deleted"); }}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
function HistorySection({ history, showToast }) {
  const blank = { year: new Date().getFullYear() - 1, winner: "THE NUKES", score: "", mvp: "", notes: "", nukes_pts: "", whales_pts: "" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);

  const save = async () => {
    try {
      const data = { ...form, year: Number(form.year), nukes_pts: Number(form.nukes_pts), whales_pts: Number(form.whales_pts) };
      if (editing) { await firestore.update("history", editing, data); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("history", data); showToast("Year added!"); }
      setForm(blank);
    } catch(e) { showToast(e.message, true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>📜 Tournament History</div>
      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: editing ? "#ff8c00" : "#4ade80" }}>{editing ? "✏️ Edit Year" : "➕ Add Tournament Year"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Year</div><input style={s.input} type="number" value={form.year} onChange={e => setForm(f => ({...f, year: e.target.value}))} /></div>
          <div><div style={s.label}>Winner</div>
            <select style={s.select} value={form.winner} onChange={e => setForm(f => ({...f, winner: e.target.value}))}>
              <option value="THE NUKES">☢️ THE NUKES</option>
              <option value="THE WHALES">🐋 THE WHALES</option>
            </select>
          </div>
          <div><div style={s.label}>Nukes Points</div><input style={s.input} type="number" value={form.nukes_pts} onChange={e => setForm(f => ({...f, nukes_pts: e.target.value}))} /></div>
          <div><div style={s.label}>Whales Points</div><input style={s.input} type="number" value={form.whales_pts} onChange={e => setForm(f => ({...f, whales_pts: e.target.value}))} /></div>
          <div><div style={s.label}>MVP</div><input style={s.input} value={form.mvp} onChange={e => setForm(f => ({...f, mvp: e.target.value}))} placeholder="Player name" /></div>
          <div><div style={s.label}>Final Score Label</div><input style={s.input} value={form.score} onChange={e => setForm(f => ({...f, score: e.target.value}))} placeholder="e.g. 18 pts" /></div>
        </div>
        <div style={{ marginTop: 10 }}><div style={s.label}>Notes / Recap</div><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Memorable moments, key matchup, etc." /></div>
        <div style={{ ...s.row, marginTop: 14 }}>
          <button style={s.btnFire} onClick={save}>{editing ? "Save" : "Add Year"}</button>
          {editing && <button style={s.btnGhost} onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
        </div>
      </div>
      {[...history].sort((a,b) => b.year - a.year).map(h => (
        <div key={h.id} style={{ ...s.card, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: "rgba(255,255,255,0.15)", minWidth: 50 }}>{h.year}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: h.winner === "THE NUKES" ? "#ff4500" : "#00aaff" }}>{h.winner}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>MVP: {h.mvp} · {h.nukes_pts}–{h.whales_pts}</div>
          </div>
          <button style={s.btnGhost} onClick={() => { setEditing(h.id); setForm({ year: h.year, winner: h.winner, score: h.score || "", mvp: h.mvp || "", notes: h.notes || "", nukes_pts: h.nukes_pts || "", whales_pts: h.whales_pts || "" }); }}>Edit</button>
          <button style={s.btnDanger} onClick={async () => { await firestore.delete("history", h.id); showToast("Deleted"); }}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── RULES ─────────────────────────────────────────────────────────────────────
function RulesSection({ rules, showToast }) {
  const blank = { title: "", body: "", order: rules.length + 1 };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);

  const save = async () => {
    if (!form.title || !form.body) return showToast("Title and body required", true);
    try {
      const data = { ...form, order: Number(form.order) };
      if (editing) { await firestore.update("rules", editing, data); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("rules", data); showToast("Rule added!"); }
      setForm({ ...blank, order: rules.length + 2 });
    } catch(e) { showToast(e.message, true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>📋 Rules</div>
      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: editing ? "#ff8c00" : "#4ade80" }}>{editing ? "✏️ Edit Rule" : "➕ Add Rule"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Title</div><input style={s.input} value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Format" /></div>
          <div><div style={s.label}>Display Order</div><input style={s.input} type="number" value={form.order} onChange={e => setForm(f => ({...f, order: e.target.value}))} /></div>
        </div>
        <div style={{ marginTop: 10 }}><div style={s.label}>Rule Body</div><textarea rows={3} value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} placeholder="Full rule text..." /></div>
        <div style={{ ...s.row, marginTop: 14 }}>
          <button style={s.btnFire} onClick={save}>{editing ? "Save" : "Add Rule"}</button>
          {editing && <button style={s.btnGhost} onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
        </div>
      </div>
      {rules.map(r => (
        <div key={r.id} style={{ ...s.card, padding: "13px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 20 }}>#{r.order}</div>
            <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{r.title}</div>
            <button style={s.btnGhost} onClick={() => { setEditing(r.id); setForm({ title: r.title, body: r.body, order: r.order }); }}>Edit</button>
            <button style={s.btnDanger} onClick={async () => { await firestore.delete("rules", r.id); showToast("Deleted"); }}>✕</button>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, fontFamily: "'Barlow', sans-serif" }}>{r.body}</div>
        </div>
      ))}
    </div>
  );
}

// ── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsSection({ meta, showToast }) {
  const [form, setForm] = useState({ name: "", year: "", date: "", location: "", tagline: "" });
  const [loaded, setLoaded] = useState(false);

  if (meta && !loaded) { setForm({ name: meta.name || "", year: meta.year || "", date: meta.date || "", location: meta.location || "", tagline: meta.tagline || "" }); setLoaded(true); }

  const save = async () => {
    try {
      await firestore.set("meta", "tournament", { ...form, year: Number(form.year) });
      showToast("Settings saved!");
    } catch(e) { showToast(e.message, true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>⚙️ Tournament Settings</div>
      <div style={s.card}>
        <div><div style={s.label}>Tournament Name</div><input style={{ ...s.input, marginBottom: 10 }} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
        <div style={s.grid2}>
          <div><div style={s.label}>Year</div><input style={s.input} type="number" value={form.year} onChange={e => setForm(f => ({...f, year: e.target.value}))} /></div>
          <div><div style={s.label}>Tournament Date</div><input style={s.input} type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
        </div>
        <div style={{ marginTop: 10 }}><div style={s.label}>Location / Course</div><input style={s.input} value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="Course name, city" /></div>
        <div style={{ marginTop: 10 }}><div style={s.label}>Tagline</div><input style={s.input} value={form.tagline} onChange={e => setForm(f => ({...f, tagline: e.target.value}))} placeholder="The Annual Battle of Fire & Water" /></div>
        <div style={{ marginTop: 16 }}>
          <div style={{ ...s.label, marginBottom: 8 }}>Admin Access Codes</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Barlow', sans-serif", lineHeight: 1.6, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px" }}>
            Default codes: <strong style={{ color: "#ff4500" }}>nuke2026</strong> · <strong style={{ color: "#00aaff" }}>whale2026</strong> · <strong style={{ color: "#ffd700" }}>admin2026</strong><br />
            To change codes, edit the <code style={{ background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 4 }}>ADMIN_CODES</code> array in <code style={{ background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 4 }}>AdminPanel.js</code> line 6.
          </div>
        </div>
        <button style={{ ...s.btnFire, marginTop: 16 }} onClick={save}>Save Settings</button>
      </div>
    </div>
  );
}
