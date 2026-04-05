// src/pages/PublicApp.js
import { useState, useEffect } from "react";
import { useCollection, useDocument } from "../firebase/hooks";
import { messaging, getToken, onMessage, VAPID_KEY } from "../firebase/config";
import MediaGallery from "./MediaGallery";

const TEAMS = {
  nukes:  { name: "THE NUKES",  emoji: "☢️", color: "#ff4500", bg: "rgba(255,69,0,0.1)"   },
  whales: { name: "THE WHALES", emoji: "🐋", color: "#00aaff", bg: "rgba(0,170,255,0.1)" },
};

const TABS = [
  { id: "leaderboard",  label: "Leaderboard",  icon: "🏆" },
  { id: "matchups",     label: "Matchups",      icon: "⚔️"  },
  { id: "countdown",    label: "Countdown",     icon: "⏳" },
  { id: "schedule",     label: "Schedule",      icon: "📅" },
  { id: "competitions", label: "Competitions",  icon: "🎯" },
  { id: "hole",         label: "Hole-in-One",   icon: "⛳" },
  { id: "players",      label: "Players",       icon: "👤" },
  { id: "history",      label: "History",       icon: "📜" },
  { id: "media",        label: "Media",         icon: "🎬" },
  { id: "rules",        label: "Rules",         icon: "📋" },
];

export default function PublicApp({ onGoAdmin }) {
  const [tab, setTab]               = useState("leaderboard");
  const [countdown, setCountdown]   = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [lbTab, setLbTab]           = useState("team");
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [atSort, setAtSort]         = useState("ptsWinPct");
  const [atDir, setAtDir]           = useState("desc");
  const atSortLabels = { ptsWon:"total points", ptsWinPct:"points win %", record:"wins", winPct:"match win %" };
  const [indSort, setIndSort]       = useState("ptsWon");
  const [indDir, setIndDir]         = useState("desc");
  const indSortLabels = { ptsWon:"points won", ptsWinPct:"points win %", record:"wins", winPct:"match win %" };

  const { data: roster }       = useCollection("roster");       // master player profiles
  const { data: rounds }       = useCollection("rounds");
  const { data: schedule }     = useCollection("schedule");
  const { data: competitions } = useCollection("competitions");
  const { data: history }      = useCollection("history");
  const { data: rules }        = useCollection("rules", "order");
  const { data: holePool }     = useCollection("holepool");
  const { data: meta }         = useDocument("meta", "tournament");
  const { data: drafts }       = useCollection("drafts");

  // Current year draft — maps playerName → team
  const currentYear = meta?.year || 2026;
  const currentDraft = drafts.find(d => d.year === currentYear) || drafts.find(d => d.year === String(currentYear));
  const teamAssign = currentDraft?.assignments || {};

  // Players active this tournament = those in the draft assignments
  const activePlayers = roster.filter(p => teamAssign[p.name]); // includes tbd

  const tournamentDate = new Date((meta?.date || "2026-08-13") + "T" + (meta?.startTime || "10:00") + ":00");

  // ── Password ────────────────────────────────────────────────────────────────
  // ── Countdown ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const diff = tournamentDate - new Date();
      if (diff <= 0) { setCountdown({ over: true }); return; }
      setCountdown({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000)  / 60000),
        seconds: Math.floor((diff % 60000)    / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tournamentDate]);

  const [notifEnabled, setNotifEnabled] = useState(null); // null=unknown, true=on, false=off
  const [notifToken, setNotifToken]     = useState(null);

  // Request notification permission and register token
  useEffect(() => {
    if (!messaging) return;
    // Check localStorage for user's preference
    const savedPref = localStorage.getItem("nwi_notif");
    if (savedPref === "off") { setNotifEnabled(false); return; }

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          // Unregister any stale service workers first
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            if (!reg.active?.scriptURL?.includes("firebase-messaging-sw")) {
              await reg.unregister();
            }
          }
          // Register the messaging service worker
          const sw = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { updateViaCache: "none" });
          await sw.update(); // force update check
          const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
          if (token) {
            const { firestore } = await import("../firebase/hooks");
            const tokenKey = token.slice(-20);
            await firestore.set("fcm_tokens", tokenKey, { token, updatedAt: new Date().toISOString() });
            setNotifToken(token);
            setNotifEnabled(true);
            localStorage.setItem("nwi_notif", "on");
            localStorage.setItem("nwi_token_key", tokenKey);
          }
        } else {
          setNotifEnabled(false);
        }
      } catch(e) {
        console.log("Notification permission:", e.message);
        setNotifEnabled(false);
      }
    };
    register();

    if (onMessage) {
      onMessage(messaging, payload => {
        // Foreground — service worker handles display, no need to alert
        console.log("Foreground notification received:", payload);
      });
    }
  }, []);

  const toggleNotifications = async () => {
    const { firestore } = await import("../firebase/hooks");
    const tokenKey = localStorage.getItem("nwi_token_key");
    if (notifEnabled) {
      // Turn off — remove token from Firestore
      if (tokenKey) {
        try { await firestore.delete("fcm_tokens", tokenKey); } catch(e) {}
      }
      setNotifEnabled(false);
      localStorage.setItem("nwi_notif", "off");
    } else {
      // Turn on — re-register token
      try {
        let sw = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
        if (!sw) {
          sw = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        }
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
        if (token) {
          const key = token.slice(-20);
          await firestore.set("fcm_tokens", key, { token, updatedAt: new Date().toISOString() });
          setNotifToken(token);
          setNotifEnabled(true);
          localStorage.setItem("nwi_notif", "on");
          localStorage.setItem("nwi_token_key", key);
        }
      } catch(e) {
        alert("Could not enable notifications. Please check your device settings.");
      }
    }
  };

  // ── Points engine ───────────────────────────────────────────────────────────
  const teamPoints = { nukes: 0, whales: 0 };
  const teamPtsAvail = { nukes: 0, whales: 0 };
  const playerStats = {};
  activePlayers.forEach(p => {
    playerStats[p.name] = { wins:0, losses:0, ties:0, ptsWon:0, ptsAvail:0, matchWins:0, matchLosses:0, matchTies:0 };
  });

  rounds.forEach(round => {
    (round.matchups || []).forEach(m => {
      const pts = (m.pointsWorth > 0 ? m.pointsWorth : round.pointsPerWin) || 0;
      const tiePts = pts / 2;
      const nk = m.nukes || [], wh = m.whales || [];
      const hasResult = m.winner === "nukes" || m.winner === "whales" || m.winner === "tie";
      // Always count team pts available for clinch/elimination math
      teamPtsAvail.nukes += pts; teamPtsAvail.whales += pts;
      // Only count player ptsAvail and stats for completed matches
      if (hasResult) {
        nk.forEach(n => { if (playerStats[n]) playerStats[n].ptsAvail += pts; });
        wh.forEach(n => { if (playerStats[n]) playerStats[n].ptsAvail += pts; });
      }
      if (m.winner === "nukes") {
        teamPoints.nukes += pts;
        nk.forEach(n => { if (playerStats[n]) { playerStats[n].ptsWon += pts; playerStats[n].wins++; playerStats[n].matchWins++; } });
        wh.forEach(n => { if (playerStats[n]) { playerStats[n].losses++; playerStats[n].matchLosses++; } });
      } else if (m.winner === "whales") {
        teamPoints.whales += pts;
        wh.forEach(n => { if (playerStats[n]) { playerStats[n].ptsWon += pts; playerStats[n].wins++; playerStats[n].matchWins++; } });
        nk.forEach(n => { if (playerStats[n]) { playerStats[n].losses++; playerStats[n].matchLosses++; } });
      } else if (m.winner === "tie") {
        teamPoints.nukes += tiePts; teamPoints.whales += tiePts;
        [...nk, ...wh].forEach(n => { if (playerStats[n]) { playerStats[n].ptsWon += tiePts; playerStats[n].ties++; playerStats[n].matchTies++; } });
      }
    });
  });

  const individualLb = activePlayers.map(p => {
    const st = playerStats[p.name] || {};
    const tot = st.matchWins + st.matchLosses + st.matchTies;
    const assignedTeam = teamAssign[p.name]==="tbd" ? null : teamAssign[p.name];
    return { ...p, team: assignedTeam, ...st,
      ptsWinPct:   st.ptsAvail > 0 ? Math.round((st.ptsWon / st.ptsAvail) * 100) : 0,
      matchWinPct: tot > 0 ? Math.round((st.matchWins / tot) * 100) : 0,
    };
  }).sort((a, b) => b.ptsWon - a.ptsWon || b.ptsWinPct - a.ptsWinPct);

  // All-time stats
  const allTimeStats = {};
  history.forEach(yr => {
    (yr.matches || []).forEach(m => {
      if (m.type === "heading") return; // skip headings
      const pts = m.pointsWorth || 0, tiePts = pts / 2;
      const nk = m.nukes || [], wh = m.whales || [];
      const hasResult = m.winner === "nukes" || m.winner === "whales" || m.winner === "tie";
      if (!hasResult) return; // skip pending matches entirely
      [...nk, ...wh].forEach(n => { if (!allTimeStats[n]) allTimeStats[n] = { ptsWon:0, ptsAvail:0, matchWins:0, matchLosses:0, matchTies:0 }; allTimeStats[n].ptsAvail += pts; });
      if (m.winner === "nukes")  { nk.forEach(n => { if (allTimeStats[n]) { allTimeStats[n].ptsWon += pts; allTimeStats[n].matchWins++; } }); wh.forEach(n => { if (allTimeStats[n]) allTimeStats[n].matchLosses++; }); }
      else if (m.winner === "whales") { wh.forEach(n => { if (allTimeStats[n]) { allTimeStats[n].ptsWon += pts; allTimeStats[n].matchWins++; } }); nk.forEach(n => { if (allTimeStats[n]) allTimeStats[n].matchLosses++; }); }
      else if (m.winner === "tie")  { [...nk, ...wh].forEach(n => { if (allTimeStats[n]) { allTimeStats[n].ptsWon += tiePts; allTimeStats[n].matchTies++; } }); }
    });
  });
  Object.entries(playerStats).forEach(([name, st]) => {
    if (!allTimeStats[name]) allTimeStats[name] = { ptsWon:0, ptsAvail:0, matchWins:0, matchLosses:0, matchTies:0 };
    allTimeStats[name].ptsWon += st.ptsWon || 0; allTimeStats[name].ptsAvail += st.ptsAvail || 0;
    allTimeStats[name].matchWins += st.matchWins || 0; allTimeStats[name].matchLosses += st.matchLosses || 0; allTimeStats[name].matchTies += st.matchTies || 0;
  });
  const allTimeLb = Object.entries(allTimeStats).map(([name, st]) => {
    const tot = st.matchWins + st.matchLosses + st.matchTies;
    return { name, ...st, ptsWinPct: st.ptsAvail > 0 ? Math.round((st.ptsWon / st.ptsAvail) * 100) : 0, matchWinPct: tot > 0 ? Math.round((st.matchWins / tot) * 100) : 0, totalMatches: tot };
  }).filter(p => p.totalMatches > 0).sort((a, b) => b.ptsWinPct - a.ptsWinPct || b.ptsWon - a.ptsWon);

  // Projections
  const totalPtsAvail = teamPtsAvail.nukes;
  const playedPts = teamPoints.nukes + teamPoints.whales;
  const remainingPts = totalPtsAvail - playedPts;
  const nukeWinPts  = Math.max(0, Math.ceil(totalPtsAvail / 2 + 0.5 - teamPoints.nukes));
  const whaleWinPts = Math.max(0, Math.ceil(totalPtsAvail / 2 + 0.5 - teamPoints.whales));
  const nukesClinched = teamPoints.nukes  > totalPtsAvail / 2;
  const whalesClinched = teamPoints.whales > totalPtsAvail / 2;
  const nukesElim  = teamPoints.nukes  + remainingPts <= teamPoints.whales;
  const whalesElim = teamPoints.whales + remainingPts <= teamPoints.nukes;
  const nukeWins  = history.filter(h => h.winner === "THE NUKES").length;
  const whaleWins = history.filter(h => h.winner === "THE WHALES").length;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=Barlow:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    .tab-bar{display:flex;overflow-x:auto;gap:6px;padding:10px 12px;justify-content:flex-start;scrollbar-width:none;-webkit-overflow-scrolling:touch;background:linear-gradient(180deg,#0d1520,#07090e);border-bottom:1px solid rgba(255,255,255,0.06);}
    .tab-bar::-webkit-scrollbar{display:none;}
    @media(min-width:600px){.tab-bar{justify-content:center;flex-wrap:wrap;}}
    .tab-btn{flex-shrink:0;padding:7px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:rgba(255,255,255,0.45);font-family:inherit;font-size:12px;font-weight:600;letter-spacing:0.04em;cursor:pointer;transition:all 0.15s;white-space:nowrap;touch-action:manipulation;}
    .tab-btn.active{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.25);color:#fff;}
    .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;}
    .nuke-card{border-color:rgba(255,69,0,0.3)!important;box-shadow:0 0 20px rgba(255,69,0,0.1);}
    .whale-card{border-color:rgba(0,170,255,0.25)!important;box-shadow:0 0 20px rgba(0,170,255,0.08);}
    @keyframes flicker{0%,100%{text-shadow:0 0 12px #ff4500,0 0 30px #ff4500;}50%{text-shadow:0 0 6px #ff6a00,0 0 15px #ff6a00;}}
    @keyframes wave{0%,100%{text-shadow:0 0 12px #00aaff,0 0 30px #00aaff;}50%{text-shadow:0 0 6px #00ccff,0 0 15px #00ccff;}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    @keyframes slideIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    .live-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;animation:pulse 1.5s infinite;display:inline-block;margin-right:6px;}
    .ghost-btn{padding:7px 14px;background:none;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:rgba(255,255,255,0.5);font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;}
    .lb-tab{padding:6px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:rgba(255,255,255,0.4);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
    .lb-tab.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);color:#fff;}
    table{width:100%;border-collapse:collapse;}
    th{font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.1em;text-transform:uppercase;padding:8px 8px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.07);}
    td{font-size:13px;padding:9px 8px;border-bottom:1px solid rgba(255,255,255,0.05);}
    tr:last-child td{border-bottom:none;}
    .player-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:0;}
    @media(min-width:500px){.player-modal-backdrop{align-items:center;padding:20px;}}
    .player-modal{background:#0d1520;border:1px solid rgba(255,255,255,0.1);border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:24px;max-height:85vh;overflow-y:auto;}
    @media(min-width:500px){.player-modal{border-radius:16px;}}
  `;

  // ── Password screen ──────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight:"100vh", background:"#07090e", color:"#e8edf3", fontFamily:"'Barlow Condensed',sans-serif" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(180deg,#0d1520,#07090e)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"20px 16px 14px" }}>
        <div style={{ maxWidth:680, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:11, letterSpacing:"0.2em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:4, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span><span className="live-dot"/>LIVE · {meta?.year || 2026}</span>
              {messaging && notifEnabled !== null && (
                <button onClick={toggleNotifications} title={notifEnabled?"Turn off notifications":"Turn on notifications"}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, opacity:notifEnabled?1:0.35, padding:0, lineHeight:1 }}>
                  {notifEnabled ? "🔔" : "🔕"}
                </button>
              )}
            </div>
            <h1 style={{ fontWeight:900, fontSize:"clamp(24px,6vw,46px)", letterSpacing:"0.04em", textTransform:"uppercase", lineHeight:1.05, background:"linear-gradient(90deg,#ff4500,#ff8c00 35%,#fff 50%,#00aaff 65%,#0066cc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              NUCLEAR WHALE<br/>INVITATIONAL
            </h1>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"center" }}>
            <div className="card nuke-card" style={{ padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", marginBottom:2 }}>☢️ NUKES</div>
              <div style={{ fontSize:32, fontWeight:900, color:"#ff4500", lineHeight:1, animation:"flicker 3s infinite" }}>{teamPoints.nukes}</div>
              <div style={{ fontSize:10, color:"rgba(255,80,0,0.5)", marginTop:1 }}>POINTS</div>
            </div>
            <div style={{ textAlign:"center", fontSize:14, fontWeight:900, color:"rgba(255,255,255,0.15)" }}>VS</div>
            <div className="card whale-card" style={{ padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", marginBottom:2 }}>🐋 WHALES</div>
              <div style={{ fontSize:32, fontWeight:900, color:"#00aaff", lineHeight:1, animation:"wave 3s infinite" }}>{teamPoints.whales}</div>
              <div style={{ fontSize:10, color:"rgba(0,150,255,0.5)", marginTop:1 }}>POINTS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar — full width, centered on desktop, scrollable on mobile */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth:680, margin:"0 auto", padding:"20px 16px 80px", animation:"slideIn 0.2s ease" }} key={tab}>

        {/* ── LEADERBOARD ── */}
        {tab==="leaderboard" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase" }}>Standings</div>
              <button className="ghost-btn" onClick={onGoAdmin}>Admin</button>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              {[["team","🏆 Team"],["individual","👤 Individual"],["alltime","📜 All-Time"]].map(([id,label])=>(
                <button key={id} className={`lb-tab${lbTab===id?" active":""}`} onClick={()=>setLbTab(id)}>{label}</button>
              ))}
            </div>

            {lbTab==="team" && (
              <div>
                <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
                  {[{team:"nukes",pts:teamPoints.nukes},{team:"whales",pts:teamPoints.whales}].sort((a,b)=>b.pts-a.pts).map((t,i)=>{
                    const clinched=t.team==="nukes"?nukesClinched:whalesClinched;
                    const elim=t.team==="nukes"?nukesElim:whalesElim;
                    const needed=t.team==="nukes"?nukeWinPts:whaleWinPts;
                    return (
                      <div key={t.team} className={`card ${t.team==="nukes"?"nuke-card":"whale-card"}`} style={{ padding:"16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ fontSize:24, fontWeight:900, color:i===0?"#ffd700":"rgba(255,255,255,0.2)" }}>{i+1}</div>
                          <div style={{ fontSize:28 }}>{TEAMS[t.team].emoji}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:17, fontWeight:800, color:TEAMS[t.team].color }}>{TEAMS[t.team].name}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:1 }}>{activePlayers.filter(p=>teamAssign[p.name]===t.team).length} players</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:36, fontWeight:900, color:TEAMS[t.team].color, lineHeight:1 }}>{t.pts}</div>
                            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>PTS</div>
                          </div>
                        </div>
                        {totalPtsAvail>0&&(
                          <div style={{ marginTop:10 }}>
                            <div style={{ height:4, background:"rgba(255,255,255,0.07)", borderRadius:2, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${(t.pts/totalPtsAvail)*100}%`, background:TEAMS[t.team].color, borderRadius:2, transition:"width 0.5s" }}/>
                            </div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:3 }}>{Math.round((t.pts/totalPtsAvail)*100)}% of available points</div>
                          </div>
                        )}
                        {/* Projection inline */}
                        {totalPtsAvail>0&&(
                          <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                            {clinched
                              ? <div style={{ fontSize:12, fontWeight:700, color:"#4ade80" }}>🏆 CLINCHED!</div>
                              : elim
                              ? <div style={{ fontSize:12, fontWeight:700, color:"#ff5555" }}>Eliminated</div>
                              : <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Needs <strong style={{ color:TEAMS[t.team].color }}>{needed} more pts</strong> to clinch · {remainingPts} remaining</div>
                            }
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Points breakdown */}
                {totalPtsAvail>0&&(
                  <div className="card" style={{ padding:"12px 16px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" }}>
                      {[["Total",totalPtsAvail,"#ffd700"],["Played",playedPts,"#4ade80"],["Left",remainingPts,"#00aaff"]].map(([l,v,c])=>(
                        <div key={l} style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"8px 4px" }}>
                          <div style={{ fontSize:20, fontWeight:900, color:c }}>{v}</div>
                          <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:8, fontSize:11, color:"rgba(255,255,255,0.25)", textAlign:"center" }}>Win threshold: more than {Math.floor(totalPtsAvail/2)} pts</div>
                  </div>
                )}
              </div>
            )}

            {lbTab==="individual" && (
              <div>
                {(() => {
                  const handleIndSort = (col) => {
                    if (indSort===col) setIndDir(d=>d==="desc"?"asc":"desc");
                    else { setIndSort(col); setIndDir("desc"); }
                  };
                  const sorted = [...individualLb].sort((a,b) => {
                    let diff = 0;
                    if (indSort==="ptsWon")    diff = b.ptsWon - a.ptsWon;
                    if (indSort==="ptsWinPct") diff = b.ptsWinPct - a.ptsWinPct || b.ptsWon - a.ptsWon;
                    if (indSort==="record")    diff = b.matchWins - a.matchWins || a.matchLosses - b.matchLosses;
                    if (indSort==="winPct")    diff = b.matchWinPct - a.matchWinPct || b.matchWins - a.matchWins;
                    return indDir==="asc" ? -diff : diff;
                  });
                  const thS = (col) => ({ cursor:"pointer", userSelect:"none", color:indSort===col?"#ffd700":"rgba(255,255,255,0.5)", whiteSpace:"nowrap" });
                  const arr = (col) => indSort===col ? (indDir==="desc"?" ▼":" ▲") : " ↕";
                  return (
                    <>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:12 }}>Pts% = pts won ÷ pts competed · Win% = match wins ÷ matches played · Sorted by <span style={{ color:"#ffd700" }}>{indSortLabels[indSort]}</span> ({indDir==="desc"?"highest first":"lowest first"}) · tap column to sort</div>
                      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
                        <table>
                          <thead><tr>
                            <th>#</th>
                            <th>Player</th>
                            <th style={thS("ptsWon")} onClick={()=>handleIndSort("ptsWon")}>Pts{arr("ptsWon")}</th>
                            <th style={thS("ptsWinPct")} onClick={()=>handleIndSort("ptsWinPct")}>Pts%{arr("ptsWinPct")}</th>
                            <th style={thS("record")} onClick={()=>handleIndSort("record")}>W-T-L{arr("record")}</th>
                            <th style={thS("winPct")} onClick={()=>handleIndSort("winPct")}>Win%{arr("winPct")}</th>
                          </tr></thead>
                          <tbody>
                            {sorted.map((p,i)=>{
                              const tc = (p.team && p.team!=="tbd") ? TEAMS[p.team] : null;
                              const totalM = p.matchWins+p.matchTies+p.matchLosses;
                              return (
                                <tr key={p.id||p.name} style={{ background:i%2===0?"rgba(255,255,255,0.02)":"transparent", cursor:"pointer" }} onClick={()=>setSelectedPlayer(p)}>
                                  <td style={{ fontWeight:900, color:i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":"rgba(255,255,255,0.3)" }}>{i+1}</td>
                                  <td><div style={{ fontWeight:700 }}>{p.name}</div><div style={{ fontSize:10, color:tc?tc.color:"rgba(255,255,255,0.3)" }}>{tc?`${tc.emoji} ${p.team}`:"—"}</div></td>
                                  <td style={{ fontWeight:700, color:tc?tc.color:"rgba(255,255,255,0.5)" }}>{p.ptsWon}</td>
                                  <td style={{ fontWeight:800 }}>{p.ptsWinPct}%</td>
                                  <td style={{ color:"rgba(255,255,255,0.5)", fontSize:11 }}>{p.matchWins}-{p.matchTies}-{p.matchLosses}</td>
                                  <td style={{ fontWeight:700, color:"#4ade80" }}>{totalM>0?p.matchWinPct+"%":"—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {lbTab==="alltime" && (
              <div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:12 }}>All-time across all tournaments · Pts% = pts won ÷ pts competed · Win% = match wins ÷ matches played · Sorted by <span style={{ color:"#ffd700" }}>{atSortLabels[atSort]}</span> ({atDir==="desc"?"highest first":"lowest first"}) · tap column to sort</div>
                {allTimeLb.length===0
                  ? <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,0.2)" }}>No historical match data yet — add matches in Admin → History</div>
                  : (() => {
                      const handleSort = (col) => {
                        if (atSort===col) setAtDir(d=>d==="desc"?"asc":"desc");
                        else { setAtSort(col); setAtDir("desc"); }
                      };
                      const sorted = [...allTimeLb].sort((a,b) => {
                        let diff = 0;
                        if (atSort==="ptsWon")    diff = b.ptsWon - a.ptsWon;
                        if (atSort==="ptsWinPct") diff = b.ptsWinPct - a.ptsWinPct || b.ptsWon - a.ptsWon;
                        if (atSort==="record")    diff = b.matchWins - a.matchWins || a.matchLosses - b.matchLosses;
                        if (atSort==="winPct")    diff = b.matchWinPct - a.matchWinPct || b.matchWins - a.matchWins;
                        return atDir==="asc" ? -diff : diff;
                      });
                      const thStyle = (col) => ({ cursor:"pointer", userSelect:"none", color:atSort===col?"#ffd700":"rgba(255,255,255,0.5)", whiteSpace:"nowrap" });
                      const arrow = (col) => atSort===col ? (atDir==="desc"?" ▼":" ▲") : " ↕";
                      return (
                        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
                          <table>
                            <thead><tr>
                              <th>#</th>
                              <th>Player</th>
                              <th style={thStyle("ptsWon")} onClick={()=>handleSort("ptsWon")}>Pts{arrow("ptsWon")}</th>
                              <th style={thStyle("ptsWinPct")} onClick={()=>handleSort("ptsWinPct")}>Pts%{arrow("ptsWinPct")}</th>
                              <th style={thStyle("record")} onClick={()=>handleSort("record")}>Record{arrow("record")}</th>
                              <th style={thStyle("winPct")} onClick={()=>handleSort("winPct")}>Win%{arrow("winPct")}</th>
                            </tr></thead>
                            <tbody>
                              {sorted.map((p,i)=>{
                                const rp = roster.find(r=>r.name===p.name);
                                return (
                                  <tr key={p.name} style={{ background:i%2===0?"rgba(255,255,255,0.02)":"transparent", cursor:"pointer" }} onClick={()=>rp&&setSelectedPlayer({...rp,...p})}>
                                    <td style={{ fontWeight:900, color:i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":"rgba(255,255,255,0.3)" }}>{i+1}</td>
                                    <td style={{ fontWeight:700 }}>{p.name}</td>
                                    <td style={{ color:"#ff8c00", fontWeight:700 }}>{p.ptsWon}</td>
                                    <td style={{ fontWeight:800 }}>{p.ptsWinPct}%</td>
                                    <td>
                                      <span style={{ fontWeight:700, color:"#4ade80" }}>{p.matchWins}W</span>
                                      {" "}<span style={{ fontWeight:700, color:"#ffd700" }}>{p.matchTies}T</span>
                                      {" "}<span style={{ fontWeight:700, color:"#ff5555" }}>{p.matchLosses}L</span>
                                    </td>
                                    <td style={{ fontWeight:700, color:"#00aaff" }}>{p.totalMatches>0?p.matchWinPct+"%":"—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                }
              </div>
            )}
          </div>
        )}

        {/* ── MATCHUPS ── */}
        {tab==="matchups" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>Round Matchups</div>
            {rounds.filter(r=>r.type!=="segment").length===0&&<div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,0.25)" }}>No rounds set up yet</div>}
            {/* Render rounds in order, segments as subheadings */}
            {[...rounds].sort((a,b)=>(a.order??0)-(b.order??0)).map(round=>{
              if (round.type==="segment") return (
                <div key={round.id} style={{ display:"flex", alignItems:"center", gap:10, marginTop:20, marginBottom:12 }}>
                  <div style={{ fontSize:16, fontWeight:900, letterSpacing:"0.06em", textTransform:"uppercase", color:"#e8edf3" }}>{round.label}</div>
                  <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
                </div>
              );
              return (
                <div key={round.id} style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                    <div style={{ fontSize:14, fontWeight:700, textTransform:"uppercase", color:"rgba(255,255,255,0.7)" }}>{round.name}</div>
                    {round.day&&<div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.05)", padding:"2px 8px", borderRadius:20 }}>{round.day}</div>}
                    {round.competitionName&&<div style={{ fontSize:11, color:"#ffd700", background:"rgba(255,200,0,0.1)", padding:"2px 10px", borderRadius:20 }}>🏅 {round.competitionName}</div>}
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginLeft:"auto" }}>Win={round.pointsPerWin}pts</div>
                  </div>
                  {(round.matchups||[]).map((m,mi)=>(
                    <div key={mi} className="card" style={{ padding:"14px", marginBottom:10 }}>
                      {m.competitionName&&<div style={{ fontSize:12, color:"#ffd700", marginBottom:8 }}>🏅 {m.competitionName} · {m.pointsWorth||round.pointsPerWin}pts</div>}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"center" }}>
                        <div style={{ background:m.winner==="nukes"?"rgba(255,69,0,0.15)":"rgba(255,69,0,0.05)", border:`1px solid ${m.winner==="nukes"?"rgba(255,69,0,0.4)":"rgba(255,69,0,0.15)"}`, borderRadius:10, padding:"10px", textAlign:"center" }}>
                          <div style={{ fontSize:16, marginBottom:3 }}>☢️</div>
                          {(m.nukes||[]).map((n,ni)=><div key={ni} style={{ fontSize:13, fontWeight:700, color:"#ff4500" }}>{n}</div>)}
                          {m.winner==="nukes"&&<div style={{ fontSize:10, color:"#ff4500", marginTop:4 }}>✓ WIN</div>}
                          {m.winner==="tie"&&<div style={{ fontSize:10, color:"#ffd700", marginTop:4 }}>TIE</div>}
                        </div>
                        <div style={{ textAlign:"center", fontSize:12, fontWeight:900, color:"rgba(255,255,255,0.2)" }}>VS</div>
                        <div style={{ background:m.winner==="whales"?"rgba(0,170,255,0.15)":"rgba(0,170,255,0.05)", border:`1px solid ${m.winner==="whales"?"rgba(0,170,255,0.4)":"rgba(0,170,255,0.15)"}`, borderRadius:10, padding:"10px", textAlign:"center" }}>
                          <div style={{ fontSize:16, marginBottom:3 }}>🐋</div>
                          {(m.whales||[]).map((n,ni)=><div key={ni} style={{ fontSize:13, fontWeight:700, color:"#00aaff" }}>{n}</div>)}
                          {m.winner==="whales"&&<div style={{ fontSize:10, color:"#00aaff", marginTop:4 }}>✓ WIN</div>}
                          {m.winner==="tie"&&<div style={{ fontSize:10, color:"#ffd700", marginTop:4 }}>TIE</div>}
                        </div>
                      </div>
                      {!m.winner&&<div style={{ textAlign:"center", marginTop:8, fontSize:11, color:"rgba(255,255,255,0.2)" }}>PENDING</div>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── COUNTDOWN ── */}
        {tab==="countdown" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:13, letterSpacing:"0.15em", color:"rgba(255,255,255,0.35)", textTransform:"uppercase", marginBottom:6 }}>Tournament Begins In</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)", marginBottom:40 }}>{meta?.date||"August 13, 2026"} · {meta?.startTime||"10:00"}</div>
            {countdown.over
              ? <div style={{ fontSize:42, fontWeight:900, background:"linear-gradient(90deg,#ff4500,#00aaff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>IT'S TIME! ⛳</div>
              : <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:48 }}>
                  {[["days","DAYS"],["hours","HRS"],["minutes","MIN"],["seconds","SEC"]].map(([k,label])=>(
                    <div key={k} className="card" style={{ padding:"18px 6px", borderColor:k==="seconds"?"rgba(255,69,0,0.3)":undefined }}>
                      <div style={{ fontSize:"clamp(28px,8vw,46px)", fontWeight:900, color:k==="seconds"?"#ff4500":"#e8edf3", lineHeight:1 }}>{String(countdown[k]??0).padStart(2,"0")}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.12em", marginTop:4 }}>{label}</div>
                    </div>
                  ))}
                </div>
            }
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {["nukes","whales"].map(t=>(
                <div key={t} className={`card ${t==="nukes"?"nuke-card":"whale-card"}`} style={{ padding:18 }}>
                  <div style={{ fontSize:32 }}>{TEAMS[t].emoji}</div>
                  <div style={{ fontSize:17, fontWeight:800, color:TEAMS[t].color, marginTop:8 }}>{TEAMS[t].name}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:4 }}>{t==="nukes"?`${nukeWins} titles`:`${whaleWins} titles`}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {tab==="schedule" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Tournament Schedule</div>
            {meta?.location&&<div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:20 }}>📍 {meta.location}</div>}
            {(() => {
              const parseTime = t => { if(!t) return 0; const m=t.match(/(\d+):(\d+)\s*(AM|PM)?/i); if(!m) return 0; let h=parseInt(m[1]),min=parseInt(m[2]); const p=(m[3]||"").toUpperCase(); if(p==="PM"&&h!==12)h+=12; if(p==="AM"&&h===12)h=0; return h*60+min; };
              const days = [...new Set(schedule.map(s=>s.day))];
              return days.map(day=>{
                const items = [...schedule.filter(s=>s.day===day)].sort((a,b)=>parseTime(a.time)-parseTime(b.time));
                if(!items.length) return null;
                return (
                  <div key={day} style={{ marginBottom:20 }}>
                    <div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.14em", color:"rgba(255,255,255,0.35)", textTransform:"uppercase", marginBottom:8 }}>{day}</div>
                    {items.map((s,i)=>(
                      <div key={i} className="card" style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
                        <div style={{ minWidth:68, fontSize:13, fontWeight:700, color:"#ff8c00" }}>{s.time}</div>
                        <div style={{ width:1, height:24, background:"rgba(255,255,255,0.07)" }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600 }}>{s.icon&&<span style={{ marginRight:5 }}>{s.icon}</span>}{s.event}</div>
                          {s.course&&<div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>📍 {s.course}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* ── COMPETITIONS ── */}
        {tab==="competitions" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>Side Competitions</div>
            {competitions.map(c=>(
              <div key={c.id} className={`card ${c.winnerTeam==="nukes"?"nuke-card":c.winnerTeam==="whales"?"whale-card":""}`} style={{ padding:18, marginBottom:10 }}>
                <div style={{ display:"flex", gap:12 }}>
                  <div style={{ fontSize:28 }}>{c.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:17, fontWeight:800, marginBottom:4 }}>{c.name}</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:10 }}>{c.desc}</div>
                    {c.winner ? <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.8)" }}>🏅 {c.winner}{c.detail?` — ${c.detail}`:""}</div>
                      : <div style={{ fontSize:13, color:"rgba(255,255,255,0.25)", fontStyle:"italic" }}>Results pending</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PLAYERS ── */}
        {tab==="players" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>Player Profiles</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginBottom:20 }}>Tap any player to see their full profile</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[...roster].sort((a,b)=>a.name.localeCompare(b.name)).map(p=>{
                const team = teamAssign[p.name]==="tbd" ? null : teamAssign[p.name];
                const tc = team ? TEAMS[team] : null;
                const at = allTimeStats[p.name];
                return (
                  <div key={p.id||p.name} className="card" style={{ padding:"12px 14px", cursor:"pointer" }} onClick={()=>setSelectedPlayer({...p, team})}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      {p.photoURL
                        ? <img src={p.photoURL} alt={p.name} style={{ width:46, height:46, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(255,255,255,0.12)" }}/>
                        : <div style={{ width:46, height:46, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"2px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"rgba(255,255,255,0.3)" }}>{p.name?.[0]}</div>
                      }
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:700 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                          {p.handicap!=null&&p.handicap!==""&&<span>HCP {p.handicap}</span>}
                          {p.hometown&&<span>{p.handicap!=null&&p.handicap!==""?" · ":""}{p.hometown}</span>}
                        </div>
                        {tc&&<div style={{ fontSize:10, color:tc.color, marginTop:2 }}>{tc.emoji} {tc.name} {currentYear}</div>}
                      </div>
                      {at&&at.totalMatches>0&&(
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:14, fontWeight:800, color:"#ff8c00" }}>{at.ptsWinPct}%</div>
                          <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>all-time</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab==="history" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Tournament History</div>
            {/* Series record */}
            <div className="card" style={{ padding:"12px 16px", marginBottom:20, display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:12, alignItems:"center", textAlign:"center" }}>
              <div><div style={{ fontSize:26, fontWeight:900, color:"#ff4500" }}>{nukeWins}</div><div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em" }}>☢️ TITLES</div></div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", fontWeight:700 }}>ALL TIME</div>
              <div><div style={{ fontSize:26, fontWeight:900, color:"#00aaff" }}>{whaleWins}</div><div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em" }}>🐋 TITLES</div></div>
            </div>

            {[...history].sort((a,b)=>b.year-a.year).map(h=>{
              const isNuke=h.winner==="THE NUKES";
              const isWhale=h.winner==="THE WHALES";
              const isTBD=!h.winner||h.winner==="TBD";
              const isExp=expandedHistory===h.id;
              const matchCount=(h.matches||[]).filter(m=>m.type!=="heading").length;
              const nukePts=h.nukes_pts??0, whalePts=h.whales_pts??0;
              return (
                <div key={h.id} style={{ marginBottom:10 }}>
                  {/* Year header - always visible */}
                  <div style={{ background:isNuke?"rgba(255,69,0,0.08)":isWhale?"rgba(0,170,255,0.06)":"rgba(255,255,255,0.04)", border:`1px solid ${isNuke?"rgba(255,69,0,0.25)":isWhale?"rgba(0,170,255,0.2)":"rgba(255,255,255,0.1)"}`, borderRadius:isExp?"12px 12px 0 0":"12px", padding:"14px 16px", cursor:"pointer" }} onClick={()=>setExpandedHistory(isExp?null:h.id)}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ fontSize:28, fontWeight:900, color:"rgba(255,255,255,0.1)", minWidth:52, lineHeight:1 }}>{h.year}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:16, fontWeight:800, color:isNuke?"#ff4500":isWhale?"#00aaff":"rgba(255,255,255,0.4)" }}>{isNuke?"☢️ ":isWhale?"🐋 ":"⏳ "}{isTBD?"In Progress":h.winner}</div>
                        <div style={{ display:"flex", gap:8, marginTop:3, flexWrap:"wrap" }}>
                          {h.mvp&&<span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>MVP: {h.mvp}</span>}
                          <span style={{ fontSize:12, color:"rgba(255,255,255,0.25)" }}>·</span>
                          <span style={{ fontSize:12, color:"rgba(255,69,0,0.7)" }}>{nukePts}</span>
                          <span style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>–</span>
                          <span style={{ fontSize:12, color:"rgba(0,170,255,0.7)" }}>{whalePts}</span>
                          {matchCount>0&&<span style={{ fontSize:11, color:"rgba(255,255,255,0.25)" }}>· {matchCount} matches</span>}
                        </div>
                      </div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)" }}>{isExp?"▲":"▼"}</div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExp&&(
                    <div style={{ border:`1px solid ${isNuke?"rgba(255,69,0,0.2)":isWhale?"rgba(0,170,255,0.15)":"rgba(255,255,255,0.08)"}`, borderTop:"none", borderRadius:"0 0 12px 12px", overflow:"hidden" }}>

                      {/* Notes */}
                      {h.notes&&<div style={{ padding:"10px 16px", background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,255,255,0.06)", fontSize:13, color:"rgba(255,255,255,0.4)", fontStyle:"italic" }}>{h.notes}</div>}

                      {/* Superlatives */}
                      {(h.superlatives||[]).length>0&&(
                        <div style={{ padding:"12px 16px", background:"rgba(255,200,0,0.04)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ fontSize:11, color:"rgba(255,200,0,0.6)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>🏅 Awards</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                            {h.superlatives.map((sup,si)=>(
                              <div key={si} style={{ fontSize:12, padding:"3px 10px", borderRadius:20, background:"rgba(255,200,0,0.1)", border:"1px solid rgba(255,200,0,0.2)", color:"rgba(255,220,0,0.8)" }}>🏅 {sup.title}: <strong>{sup.player}</strong></div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matches */}
                      {matchCount>0&&(
                        <div style={{ padding:"14px 16px", background:"rgba(0,0,0,0.2)" }}>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>⚔️ Match Results</div>
                          {h.matches.map((m,mi)=>(
                            <div key={mi}>
                              {/* Subheading */}
                              {m.type==="heading"&&(
                                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, marginBottom:8 }}>
                                  <div style={{ fontSize:13, fontWeight:800, color:"rgba(255,255,255,0.55)", letterSpacing:"0.06em", textTransform:"uppercase" }}>{m.label}</div>
                                  <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
                                </div>
                              )}
                              {/* Match */}
                              {m.type!=="heading"&&(
                                <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${m.winner==="nukes"?"rgba(255,69,0,0.2)":m.winner==="whales"?"rgba(0,170,255,0.2)":m.winner==="tie"?"rgba(255,200,0,0.15)":"rgba(255,255,255,0.05)"}`, borderRadius:10, padding:"11px 12px", marginBottom:8 }}>
                                  {m.roundName&&<div style={{ fontSize:14, fontWeight:700, color:"rgba(255,200,0,0.8)", marginBottom:10 }}>🏅 {m.roundName}{m.pointsWorth?` · ${m.pointsWorth} pts`:""}</div>}
                                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"center" }}>
                                    <div style={{ background:m.winner==="nukes"?"rgba(255,69,0,0.12)":"rgba(255,69,0,0.04)", borderRadius:8, padding:"8px", textAlign:"center" }}>
                                      <div style={{ fontSize:14, marginBottom:2 }}>☢️</div>
                                      {(m.nukes||[]).filter(Boolean).map((n,ni)=><div key={ni} style={{ fontSize:13, fontWeight:700, color:m.winner==="nukes"?"#ff4500":"rgba(255,255,255,0.65)", lineHeight:1.3 }}>{n}</div>)}
                                      {m.winner==="nukes"&&<div style={{ fontSize:10, color:"#ff4500", marginTop:5 }}>✓ WIN</div>}
                                      {m.winner==="tie"&&<div style={{ fontSize:10, color:"#ffd700", marginTop:5 }}>TIE</div>}
                                    </div>
                                    <div style={{ fontSize:10, fontWeight:900, color:"rgba(255,255,255,0.12)", textAlign:"center" }}>VS</div>
                                    <div style={{ background:m.winner==="whales"?"rgba(0,170,255,0.12)":"rgba(0,170,255,0.04)", borderRadius:8, padding:"8px", textAlign:"center" }}>
                                      <div style={{ fontSize:14, marginBottom:2 }}>🐋</div>
                                      {(m.whales||[]).filter(Boolean).map((n,ni)=><div key={ni} style={{ fontSize:13, fontWeight:700, color:m.winner==="whales"?"#00aaff":"rgba(255,255,255,0.65)", lineHeight:1.3 }}>{n}</div>)}
                                      {m.winner==="whales"&&<div style={{ fontSize:10, color:"#00aaff", marginTop:5 }}>✓ WIN</div>}
                                      {m.winner==="tie"&&<div style={{ fontSize:10, color:"#ffd700", marginTop:5 }}>TIE</div>}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {matchCount===0&&<div style={{ padding:"20px", textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.2)" }}>No match data entered yet</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab==="media" && <MediaGallery/>}
{tab==="hole" && (() => {
          const currentYear = meta?.year || new Date().getFullYear();
          const ledger = holePool?.find(h=>h.id==="ledger");
          const yearEntries = ledger?.yearEntries || [];
          const winners = ledger?.winners || [];
          const totalContributed = yearEntries.reduce((sum,e)=>sum+(e.contributions||0),0);
          const totalPaidOut = winners.reduce((sum,w)=>sum+(w.amount||0),0);
          const runningTotal = totalContributed - totalPaidOut;

          // Only show owed amounts for years AFTER the last payout
          const lastPaidYear = winners.length > 0
            ? Math.max(...winners.map(w=>w.year))
            : 0;

          const playerOwed = {};
          yearEntries.forEach(e => {
            if (e.year > lastPaidYear) {
              (e.optedIn||[]).forEach(name => {
                playerOwed[name] = (playerOwed[name]||0) + (Number(e.buyIn)||0);
              });
            }
          });
          const playersInPool = Object.keys(playerOwed).sort((a,b)=>playerOwed[b]-playerOwed[a]);
          const allPlayers = [...roster].sort((a,b)=>a.name.localeCompare(b.name));

          return (
            <div>
              <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>⛳ Hole-in-One Pool</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:20 }}>Rolls over every year — whoever hits a hole-in-one takes the full cumulative pot.</div>

              {/* Big green total */}
              <div className="card" style={{ padding:"28px 20px", marginBottom:20, textAlign:"center", background:"rgba(74,222,128,0.06)", borderColor:"rgba(74,222,128,0.25)" }}>
                <div style={{ fontSize:15, color:"rgba(255,255,255,0.4)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Current Pool</div>
                <div style={{ fontSize:64, fontWeight:900, color:"#4ade80", lineHeight:1 }}>💰 ${Math.round(runningTotal)}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", marginTop:10 }}>
                  ${Math.round(totalContributed)} total contributed · ${Math.round(totalPaidOut)} paid out
                </div>
              </div>

              {/* Past payouts */}
              {winners.length>0&&(
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>🏆 Past Winners</div>
                  {[...winners].reverse().map((w,i)=>(
                    <div key={i} className="card" style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                      <div style={{ fontSize:24 }}>⛳</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:15 }}>{w.name}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{w.year}{w.date?` · ${new Date(w.date).toLocaleDateString()}`:""}</div>
                      </div>
                      <div style={{ fontSize:22, fontWeight:900, color:"#ffd700" }}>${Math.round(w.amount||0)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Individual ledger - who owes what */}
              {playersInPool.length>0&&(
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"rgba(74,222,128,0.7)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>💵 Individual Ledger</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:12 }}>Total each player has contributed across all years</div>
                  {playersInPool.map(name=>{
                    const p = roster.find(r=>r.name===name);
                    const owed = playerOwed[name]||0;
                    // Show per-year breakdown
                    const years = yearEntries.filter(e=>(e.optedIn||[]).includes(name)).sort((a,b)=>a.year-b.year);
                    return (
                      <div key={name} className="card" style={{ padding:"12px 14px", marginBottom:8, borderColor:"rgba(74,222,128,0.12)", background:"rgba(74,222,128,0.03)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          {p?.photoURL?<img src={p.photoURL} alt={name} style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover" }}/>:<div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15 }}>{name?.[0]}</div>}
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:14 }}>{name}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                              {years.map(e=>`${e.year}: $${e.buyIn}`).join(" · ")}
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:18, fontWeight:900, color:"#4ade80" }}>${Math.round(owed)}</div>
                            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>total owed</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Total row */}
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,0.07)", marginTop:4 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.5)" }}>{playersInPool.length} players total</div>
                    <div style={{ fontSize:15, fontWeight:900, color:"#4ade80" }}>${Math.round(runningTotal)}</div>
                  </div>
                </div>
              )}


            </div>
          );
        })()}

        {tab==="rules" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:20 }}>Rules & Format</div>
            {rules.map((r,i)=>(
              <div key={r.id} className="card" style={{ padding:"14px 16px", marginBottom:8 }}>
                <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:i%2===0?"#ff8c00":"#00aaff", marginBottom:6 }}>{r.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.65, fontFamily:"'Barlow',sans-serif" }}>
                  {(r.body||"").split("\n").map((line,li)=>{
                    const isBullet = line.trimStart().startsWith("-") || line.trimStart().startsWith("•");
                    const text = isBullet ? line.trimStart().replace(/^[-•]\s*/,"") : line;
                    if (!text.trim()) return <div key={li} style={{ height:"0.5em" }}/>;
                    return (
                      <div key={li} style={{ display:"flex", gap:8, marginBottom:2 }}>
                        {isBullet&&<span style={{ color:"rgba(255,255,255,0.3)", flexShrink:0, marginTop:2 }}>•</span>}
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Player profile modal */}
      {selectedPlayer && (
        <div className="player-modal-backdrop" onClick={()=>setSelectedPlayer(null)}>
          <div className="player-modal" onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em" }}>PLAYER PROFILE</div>
              <button onClick={()=>setSelectedPlayer(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:20, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>

            {/* Photo + name */}
            <div style={{ display:"flex", gap:16, alignItems:"flex-start", marginBottom:20 }}>
              {selectedPlayer.photoURL
                ? <img src={selectedPlayer.photoURL} alt={selectedPlayer.name} style={{ width:80, height:80, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(255,255,255,0.15)", flexShrink:0 }}/>
                : <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"2px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, fontWeight:900, color:"rgba(255,255,255,0.25)", flexShrink:0 }}>{selectedPlayer.name?.[0]}</div>
              }
              <div style={{ flex:1 }}>
                <div style={{ fontSize:22, fontWeight:900, lineHeight:1.1 }}>{selectedPlayer.name}</div>
                {selectedPlayer.nickname&&<div style={{ fontSize:14, color:"rgba(255,255,255,0.45)", fontStyle:"italic", marginTop:2 }}>"{selectedPlayer.nickname}"</div>}
                {selectedPlayer.team&&selectedPlayer.team!=="tbd"&&TEAMS[selectedPlayer.team]&&(
                  <div style={{ fontSize:12, color:TEAMS[selectedPlayer.team].color, marginTop:4 }}>{TEAMS[selectedPlayer.team].emoji} {TEAMS[selectedPlayer.team].name} · {currentYear}</div>
                )}
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:6 }}>
                  {selectedPlayer.hometown&&<span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>📍 {selectedPlayer.hometown}</span>}
                  {selectedPlayer.handicap!=null&&selectedPlayer.handicap!==""&&<span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>⛳ HCP {selectedPlayer.handicap}</span>}
                </div>
              </div>
            </div>

            {/* Bio */}
            {selectedPlayer.bio&&(
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.6, fontFamily:"'Barlow',sans-serif", marginBottom:14, padding:"11px 13px", background:"rgba(255,255,255,0.03)", borderRadius:10 }}>
                {selectedPlayer.bio}
              </div>
            )}

            {/* Golf profile fields */}
            {(selectedPlayer.favoriteClub||selectedPlayer.golferComparison||selectedPlayer.strengths||selectedPlayer.weaknesses)&&(
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {selectedPlayer.favoriteClub&&(
                  <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em", marginBottom:4 }}>FAVORITE CLUB</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e8edf3" }}>🏌️ {selectedPlayer.favoriteClub}</div>
                  </div>
                )}
                {selectedPlayer.golferComparison&&(
                  <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em", marginBottom:4 }}>GOLFER COMPARISON</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#ffd700" }}>⭐ {selectedPlayer.golferComparison}</div>
                  </div>
                )}
                {selectedPlayer.strengths&&(
                  <div style={{ background:"rgba(74,222,128,0.06)", borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ fontSize:10, color:"rgba(74,222,128,0.5)", letterSpacing:"0.08em", marginBottom:4 }}>STRENGTHS</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)" }}>✅ {selectedPlayer.strengths}</div>
                  </div>
                )}
                {selectedPlayer.weaknesses&&(
                  <div style={{ background:"rgba(255,80,80,0.06)", borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ fontSize:10, color:"rgba(255,80,80,0.5)", letterSpacing:"0.08em", marginBottom:4 }}>WEAKNESSES</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)" }}>⚠️ {selectedPlayer.weaknesses}</div>
                  </div>
                )}
                {selectedPlayer.bestPartOfGame&&(
                  <div style={{ background:"rgba(74,222,128,0.06)", borderRadius:10, padding:"10px 12px", gridColumn:"1 / -1" }}>
                    <div style={{ fontSize:10, color:"rgba(74,222,128,0.5)", letterSpacing:"0.08em", marginBottom:4 }}>BEST PART OF GOLF GAME</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)" }}>⛳ {selectedPlayer.bestPartOfGame}</div>
                  </div>
                )}
              </div>
            )}

            {/* All-time stats */}
            {(() => {
              const at = allTimeStats[selectedPlayer.name];
              if (!at || at.ptsAvail === 0) return null;
              const pct = Math.round((at.ptsWon/at.ptsAvail)*100);
              return (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em", marginBottom:8 }}>ALL-TIME STATS</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:800, color:"#ff8c00" }}>{at.ptsWon}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:3 }}>PTS WON</div>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:800, color:"#ffd700" }}>{pct}%</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:3 }}>PTS WIN%</div>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                      <div style={{ fontSize:13, fontWeight:800, lineHeight:1.4 }}>
                        <span style={{ color:"#4ade80" }}>{at.matchWins}W</span>{" "}
                        <span style={{ color:"#ffd700" }}>{at.matchTies}T</span>{" "}
                        <span style={{ color:"#ff5555" }}>{at.matchLosses}L</span>
                      </div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:3 }}>RECORD</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Titles Won + Tournament appearances */}
            {(() => {
              const appearances = history.filter(h => (h.matches||[]).some(m=>m.type!=="heading"&&[...(m.nukes||[]),...(m.whales||[])].includes(selectedPlayer.name))).sort((a,b)=>b.year-a.year);
              const titles = history.filter(h => {
                const draft = drafts.find(d=>String(d.year)===String(h.year));
                const assign = draft?.assignments || {};
                const playerTeam = assign[selectedPlayer.name];
                return playerTeam && h.winner === (playerTeam==="nukes"?"THE NUKES":"THE WHALES");
              });
              // Awards from superlatives across all years
              const awards = [];
              history.forEach(h => {
                (h.superlatives||[]).forEach(sup => {
                  if (sup.player === selectedPlayer.name) {
                    awards.push({ year: h.year, title: sup.title });
                  }
                });
              });
              awards.sort((a,b)=>b.year-a.year);
              // Hole-in-one wins
              const ledger = holePool?.find(h=>h.id==="ledger");
              const holeWins = (ledger?.winners||[]).filter(w=>w.name===selectedPlayer.name).sort((a,b)=>b.year-a.year);
              return (
                <div>
                  {holeWins.length>0&&(
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8, letterSpacing:"0.08em" }}>⛳ HOLE-IN-ONE ({holeWins.length})</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {holeWins.map((w,i)=>(
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:8, padding:"7px 12px" }}>
                            <span style={{ fontSize:14 }}>⛳</span>
                            <span style={{ fontSize:13, color:"#4ade80", fontWeight:700, flex:1 }}>Hole-in-One — ${Math.round(w.amount||0)}</span>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{w.year}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {titles.length>0&&(
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8, letterSpacing:"0.08em" }}>🏆 TITLES WON ({titles.length})</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {titles.map(t=><span key={t.id} style={{ fontSize:12, padding:"3px 10px", borderRadius:20, background:"rgba(255,200,0,0.12)", border:"1px solid rgba(255,200,0,0.25)", color:"#ffd700", fontWeight:700 }}>🏆 {t.year}</span>)}
                      </div>
                    </div>
                  )}
                  {awards.length>0&&(
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8, letterSpacing:"0.08em" }}>🏅 AWARDS ({awards.length})</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {awards.map((a,i)=>(
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,200,0,0.06)", border:"1px solid rgba(255,200,0,0.15)", borderRadius:8, padding:"7px 12px" }}>
                            <span style={{ fontSize:13, color:"#ffd700", fontWeight:700, flex:1 }}>🏅 {a.title}</span>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{a.year}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {appearances.length>0&&(
                    <div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8, letterSpacing:"0.08em" }}>TOURNAMENT APPEARANCES</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {appearances.map(h=><span key={h.id} style={{ fontSize:12, padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.55)" }}>{h.year}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
