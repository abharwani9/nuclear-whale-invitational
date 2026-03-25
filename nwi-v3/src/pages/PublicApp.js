// src/pages/PublicApp.js
import { useState, useEffect } from "react";
import { useCollection, useDocument } from "../firebase/hooks";
import MediaGallery from "./MediaGallery";

const TEAMS = {
  nukes: { name: "THE NUKES", emoji: "☢️", color: "#ff4500", glow: "rgba(255,69,0,0.25)", bg: "rgba(255,69,0,0.1)", gradient: "linear-gradient(135deg,#ff4500,#ff8c00)" },
  whales: { name: "THE WHALES", emoji: "🐋", color: "#00aaff", glow: "rgba(0,170,255,0.2)", bg: "rgba(0,170,255,0.1)", gradient: "linear-gradient(135deg,#0066cc,#00ccff)" },
};

const TABS = [
  { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
  { id: "matchups", label: "Matchups", icon: "⚔️" },
  { id: "countdown", label: "Countdown", icon: "⏳" },
  { id: "schedule", label: "Schedule", icon: "📅" },
  { id: "competitions", label: "Competitions", icon: "🎯" },
  { id: "players", label: "Players", icon: "👤" },
  { id: "history", label: "History", icon: "📜" },
  { id: "media", label: "Media", icon: "🎬" },
  { id: "rules", label: "Rules", icon: "📋" },
];

export default function PublicApp({ onGoAdmin }) {
  const [tab, setTab] = useState("leaderboard");
  const [countdown, setCountdown] = useState({});
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  const { data: players } = useCollection("players");
  const { data: rounds } = useCollection("rounds");
  const { data: schedule } = useCollection("schedule");
  const { data: competitions } = useCollection("competitions");
  const { data: history } = useCollection("history");
  const { data: rules } = useCollection("rules", "order");
  const { data: meta } = useDocument("meta", "tournament");

  const tournamentDate = meta?.date ? new Date(meta.date + "T08:00:00") : new Date("2026-08-13T08:00:00");

  // Compute team points from rounds
  const teamPoints = { nukes: 0, whales: 0 };
  rounds.forEach(round => {
    (round.matchups || []).forEach(m => {
      if (m.winner === "nukes") teamPoints.nukes += round.pointsPerWin || 0;
      else if (m.winner === "whales") teamPoints.whales += round.pointsPerWin || 0;
      else if (m.winner === "tie") {
        teamPoints.nukes += round.pointsPerTie || 0;
        teamPoints.whales += round.pointsPerTie || 0;
      }
    });
  });

  // Leaderboard: players ranked by team points contribution (wins/ties)
  const playerWins = {};
  players.forEach(p => { playerWins[p.name] = { wins: 0, ties: 0, losses: 0, pts: 0 }; });
  rounds.forEach(round => {
    (round.matchups || []).forEach(m => {
      const nukePair = m.nukes || [];
      const whalePair = m.whales || [];
      if (m.winner === "nukes") {
        nukePair.forEach(n => { if (playerWins[n]) { playerWins[n].wins++; playerWins[n].pts += round.pointsPerWin || 0; } });
        whalePair.forEach(n => { if (playerWins[n]) playerWins[n].losses++; });
      } else if (m.winner === "whales") {
        whalePair.forEach(n => { if (playerWins[n]) { playerWins[n].wins++; playerWins[n].pts += round.pointsPerWin || 0; } });
        nukePair.forEach(n => { if (playerWins[n]) playerWins[n].losses++; });
      } else if (m.winner === "tie") {
        [...nukePair, ...whalePair].forEach(n => { if (playerWins[n]) { playerWins[n].ties++; playerWins[n].pts += round.pointsPerTie || 0; } });
      }
    });
  });

  const leaderboard = players.map(p => ({
    ...p,
    ...(playerWins[p.name] || { wins: 0, ties: 0, losses: 0, pts: 0 })
  })).sort((a, b) => b.pts - a.pts || b.wins - a.wins);

  // Countdown
  useEffect(() => {
    const tick = () => {
      const diff = tournamentDate - new Date();
      if (diff <= 0) { setCountdown({ over: true }); return; }
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tournamentDate]);

  const nukeWins = history.filter(h => h.winner === "THE NUKES").length;
  const whaleWins = history.filter(h => h.winner === "THE WHALES").length;

  return (
    <div style={{ minHeight: "100vh", background: "#07090e", color: "#e8edf3", fontFamily: "'Barlow Condensed', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=Barlow:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .tab-scroll{display:flex;overflow-x:auto;gap:4px;padding:0 16px;scrollbar-width:none;}
        .tab-scroll::-webkit-scrollbar{display:none;}
        .tab-btn{flex-shrink:0;padding:8px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:8px;color:rgba(255,255,255,0.4);font-family:inherit;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
        .tab-btn.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);color:#fff;}
        .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;}
        .nuke-card{border-color:rgba(255,69,0,0.3)!important;box-shadow:0 0 20px rgba(255,69,0,0.12);}
        .whale-card{border-color:rgba(0,170,255,0.25)!important;box-shadow:0 0 20px rgba(0,170,255,0.1);}
        @keyframes flicker{0%,100%{text-shadow:0 0 12px #ff4500,0 0 30px #ff4500;}50%{text-shadow:0 0 6px #ff6a00,0 0 15px #ff6a00;}}
        @keyframes wave{0%,100%{text-shadow:0 0 12px #00aaff,0 0 30px #00aaff;}50%{text-shadow:0 0 6px #00ccff,0 0 15px #00ccff;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .live-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;animation:pulse 1.5s infinite;display:inline-block;margin-right:6px;}
        .rank-1{background:linear-gradient(135deg,rgba(255,200,0,0.12),rgba(255,150,0,0.04))!important;border-color:rgba(255,200,0,0.25)!important;}
        .rank-2{background:linear-gradient(135deg,rgba(180,180,180,0.08),transparent)!important;}
        .rank-3{background:linear-gradient(135deg,rgba(180,100,30,0.1),transparent)!important;}
        .ghost-btn{padding:7px 14px;background:none;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:rgba(255,255,255,0.5);font-family:inherit;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:all 0.15s;}
        .ghost-btn:hover{border-color:rgba(255,255,255,0.3);color:#fff;}
        .winner-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.06em;}
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0d1520,#07090e)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 16px 0" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 4 }}>
              <span className="live-dot" />LIVE · {meta?.year || 2026}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: "clamp(26px,7vw,50px)", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.05, background: "linear-gradient(90deg,#ff4500,#ff8c00 35%,#fff 50%,#00aaff 65%,#0066cc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              NUCLEAR WHALE<br />INVITATIONAL
            </h1>
            {meta?.location && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.1em" }}>{meta.location}</div>}
          </div>

          {/* Team score strip */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", marginBottom: 18 }}>
            <div className="card nuke-card" style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 2 }}>☢️ NUKES</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#ff4500", lineHeight: 1, animation: "flicker 3s infinite" }}>{teamPoints.nukes}</div>
              <div style={{ fontSize: 10, color: "rgba(255,80,0,0.5)", marginTop: 2 }}>POINTS</div>
            </div>
            <div style={{ textAlign: "center", fontSize: 16, fontWeight: 900, color: "rgba(255,255,255,0.15)" }}>VS</div>
            <div className="card whale-card" style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 2 }}>🐋 WHALES</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#00aaff", lineHeight: 1, animation: "wave 3s infinite" }}>{teamPoints.whales}</div>
              <div style={{ fontSize: 10, color: "rgba(0,150,255,0.5)", marginTop: 2 }}>POINTS</div>
            </div>
          </div>

          <div className="tab-scroll" style={{ paddingBottom: 0, marginBottom: -1 }}>
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 80px", animation: "slideIn 0.2s ease" }} key={tab}>

        {/* ── LEADERBOARD ── */}
        {tab === "leaderboard" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>Player Standings</div>
              <button className="ghost-btn" onClick={onGoAdmin}>Admin Panel</button>
            </div>
            {leaderboard.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>No players yet — add them in Admin Panel</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leaderboard.map((p, i) => {
                const team = TEAMS[p.team] || TEAMS.nukes;
                const rankCls = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "";
                return (
                  <div key={p.id} className={`card ${rankCls}`} style={{ padding: "14px 16px", borderColor: `${team.color}22`, cursor: "pointer" }}
                    onClick={() => setExpandedPlayer(expandedPlayer === p.id ? null : p.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.2)", minWidth: 26 }}>{i + 1}</div>
                      {p.photoURL
                        ? <img src={p.photoURL} alt={p.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `2px solid ${team.color}55` }} />
                        : <div style={{ width: 40, height: 40, borderRadius: "50%", background: team.bg, border: `2px solid ${team.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: team.color }}>{p.name?.[0]}</div>
                      }
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: team.bg, color: team.color, fontWeight: 700, letterSpacing: "0.06em" }}>{team.emoji} {p.team?.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>HCP {p.handicap} · {p.wins}W {p.ties}T {p.losses}L</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 26, fontWeight: 900, color: team.color }}>{p.pts}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>PTS</div>
                      </div>
                    </div>
                    {expandedPlayer === p.id && p.bio && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Barlow', sans-serif" }}>
                        {p.bio}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MATCHUPS ── */}
        {tab === "matchups" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Round Matchups</div>
            {rounds.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>No rounds yet — set up matchups in Admin Panel</div>}
            {rounds.map(round => (
              <div key={round.id} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{round.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.06)", padding: "2px 10px", borderRadius: 20 }}>{round.day}</div>
                  <div style={{ fontSize: 11, color: "#ffd700", marginLeft: "auto" }}>Win = {round.pointsPerWin} pts · Tie = {round.pointsPerTie} pts</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(round.matchups || []).map((m, mi) => {
                    const winner = m.winner;
                    return (
                      <div key={mi} className="card" style={{ padding: "16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
                          {/* Nukes side */}
                          <div style={{ background: winner === "nukes" ? "rgba(255,69,0,0.15)" : winner === "whales" ? "rgba(255,255,255,0.02)" : "rgba(255,69,0,0.06)", border: `1px solid ${winner === "nukes" ? "rgba(255,69,0,0.4)" : "rgba(255,69,0,0.15)"}`, borderRadius: 10, padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: 18, marginBottom: 4 }}>☢️</div>
                            {(m.nukes || []).map((n, ni) => <div key={ni} style={{ fontSize: 14, fontWeight: 700, color: "#ff4500" }}>{n}</div>)}
                            {winner === "nukes" && <div style={{ fontSize: 10, color: "#ff4500", marginTop: 6, letterSpacing: "0.08em" }}>✓ WIN</div>}
                            {winner === "tie" && <div style={{ fontSize: 10, color: "#ffd700", marginTop: 6 }}>TIE</div>}
                          </div>
                          <div style={{ textAlign: "center", fontSize: 14, fontWeight: 900, color: "rgba(255,255,255,0.2)" }}>VS</div>
                          {/* Whales side */}
                          <div style={{ background: winner === "whales" ? "rgba(0,170,255,0.15)" : winner === "nukes" ? "rgba(255,255,255,0.02)" : "rgba(0,170,255,0.06)", border: `1px solid ${winner === "whales" ? "rgba(0,170,255,0.4)" : "rgba(0,170,255,0.15)"}`, borderRadius: 10, padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: 18, marginBottom: 4 }}>🐋</div>
                            {(m.whales || []).map((n, ni) => <div key={ni} style={{ fontSize: 14, fontWeight: 700, color: "#00aaff" }}>{n}</div>)}
                            {winner === "whales" && <div style={{ fontSize: 10, color: "#00aaff", marginTop: 6, letterSpacing: "0.08em" }}>✓ WIN</div>}
                            {winner === "tie" && <div style={{ fontSize: 10, color: "#ffd700", marginTop: 6 }}>TIE</div>}
                          </div>
                        </div>
                        {!winner && <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>PENDING</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── COUNTDOWN ── */}
        {tab === "countdown" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 }}>Tournament Begins In</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 40 }}>
              {meta?.date ? new Date(meta.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "August 13, 2026"}
            </div>
            {countdown.over ? (
              <div style={{ fontSize: 42, fontWeight: 900, background: "linear-gradient(90deg,#ff4500,#00aaff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IT'S TIME! ⛳</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 48 }}>
                {[["days","DAYS"],["hours","HRS"],["minutes","MIN"],["seconds","SEC"]].map(([k, label]) => (
                  <div key={k} className="card" style={{ padding: "18px 8px", borderColor: k === "seconds" ? "rgba(255,69,0,0.3)" : undefined }}>
                    <div style={{ fontSize: "clamp(26px,7vw,44px)", fontWeight: 900, color: k === "seconds" ? "#ff4500" : "#e8edf3", lineHeight: 1 }}>
                      {String(countdown[k] ?? 0).padStart(2, "0")}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["nukes","whales"].map(t => (
                <div key={t} className={`card ${t === "nukes" ? "nuke-card" : "whale-card"}`} style={{ padding: 20 }}>
                  <div style={{ fontSize: 34 }}>{TEAMS[t].emoji}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: TEAMS[t].color, marginTop: 8 }}>{TEAMS[t].name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{t === "nukes" ? `${nukeWins} titles` : `${whaleWins} titles`}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {tab === "schedule" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Tournament Schedule</div>
            {["Day 1","Day 2","Day 3"].map(day => {
              const items = schedule.filter(s => s.day === day);
              if (!items.length) return null;
              return (
                <div key={day} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 10, paddingLeft: 4 }}>{day}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((s, i) => (
                      <div key={i} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ minWidth: 72, fontSize: 13, fontWeight: 700, color: "#ff8c00" }}>{s.time}</div>
                        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{s.icon && <span style={{ marginRight: 6 }}>{s.icon}</span>}{s.event}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── COMPETITIONS ── */}
        {tab === "competitions" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Side Competitions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {competitions.map(c => (
                <div key={c.id} className={`card ${c.winnerTeam === "nukes" ? "nuke-card" : c.winnerTeam === "whales" ? "whale-card" : ""}`} style={{ padding: 20 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 30 }}>{c.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.04em", marginBottom: 4 }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 12, fontFamily: "'Barlow', sans-serif" }}>{c.desc}</div>
                      {c.winner
                        ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>LEADER</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: c.winnerTeam === "nukes" ? "#ff4500" : "#00aaff" }}>
                              {c.winnerTeam === "nukes" ? "☢️" : "🐋"} {c.winner} {c.detail && `— ${c.detail}`}
                            </span>
                          </div>
                        : <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Results pending</div>
                      }
                    </div>
                  </div>
                  {c.name === "Cumulative Team Points" && (
                    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {["nukes","whales"].map(t => (
                        <div key={t} style={{ background: TEAMS[t].bg, border: `1px solid ${TEAMS[t].color}33`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>{TEAMS[t].emoji} {TEAMS[t].name}</div>
                          <div style={{ fontSize: 30, fontWeight: 900, color: TEAMS[t].color, marginTop: 4 }}>{teamPoints[t]}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>pts</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PLAYERS ── */}
        {tab === "players" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Player Roster</div>
            {["nukes","whales"].map(team => {
              const teamPlayers = players.filter(p => p.team === team);
              return (
                <div key={team} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{TEAMS[team].emoji}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: TEAMS[team].color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{TEAMS[team].name}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>({teamPlayers.length})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {teamPlayers.map(p => (
                      <div key={p.id} className="card" style={{ padding: "14px 16px", borderColor: `${TEAMS[team].color}22` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {p.photoURL
                            ? <img src={p.photoURL} alt={p.name} style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: `2px solid ${TEAMS[team].color}55` }} />
                            : <div style={{ width: 46, height: 46, borderRadius: "50%", background: TEAMS[team].bg, border: `2px solid ${TEAMS[team].color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: TEAMS[team].color }}>{p.name?.[0]}</div>
                          }
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>Handicap {p.handicap}</div>
                            {p.bio && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4, fontFamily: "'Barlow', sans-serif" }}>{p.bio}</div>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: TEAMS[team].color }}>{playerWins[p.name]?.pts || 0}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>PTS</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Tournament History</div>
            {[...history].sort((a,b) => b.year - a.year).map(h => {
              const isNuke = h.winner === "THE NUKES";
              return (
                <div key={h.id} className={`card ${isNuke ? "nuke-card" : "whale-card"}`} style={{ padding: "18px 20px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ fontSize: 34, fontWeight: 900, color: "rgba(255,255,255,0.12)", minWidth: 56, lineHeight: 1 }}>{h.year}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: isNuke ? "#ff4500" : "#00aaff", marginBottom: 2 }}>
                        {isNuke ? "☢️" : "🐋"} {h.winner}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>MVP: {h.mvp} · Final: {h.nukes_pts ?? "?"} – {h.whales_pts ?? "?"}</div>
                      {h.notes && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Barlow', sans-serif", fontStyle: "italic" }}>{h.notes}</div>}
                    </div>
                    <div style={{ fontSize: 28 }}>🏆</div>
                  </div>
                </div>
              );
            })}
            <div className="card" style={{ padding: "16px 20px", marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#ff4500" }}>{nukeWins}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>NUKE TITLES</div>
              </div>
              <div>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#00aaff" }}>{whaleWins}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>WHALE TITLES</div>
              </div>
            </div>
          </div>
        )}

        {/* ── MEDIA ── */}
        {tab === "media" && <MediaGallery />}

        {/* ── RULES ── */}
        {tab === "rules" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Rules & Format</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rules.map((r, i) => (
                <div key={r.id} className="card" style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: i % 2 === 0 ? "#ff8c00" : "#00aaff", marginBottom: 8 }}>{r.title}</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, fontFamily: "'Barlow', sans-serif", fontWeight: 400 }}>{r.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
