// src/pages/PublicApp.js
import { useState, useEffect } from "react";
import { useCollection, useDocument } from "../firebase/hooks";
import MediaGallery from "./MediaGallery";

const TEAMS = {
  nukes: { name: "THE NUKES", emoji: "☢️", color: "#ff4500", glow: "rgba(255,69,0,0.25)", bg: "rgba(255,69,0,0.1)" },
  whales: { name: "THE WHALES", emoji: "🐋", color: "#00aaff", glow: "rgba(0,170,255,0.2)", bg: "rgba(0,170,255,0.1)" },
};

const TABS = [
  { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
  { id: "matchups", label: "Matchups", icon: "⚔️" },
  { id: "projections", label: "Projections", icon: "📊" },
  { id: "countdown", label: "Countdown", icon: "⏳" },
  { id: "schedule", label: "Schedule", icon: "📅" },
  { id: "competitions", label: "Competitions", icon: "🎯" },
  { id: "players", label: "Players", icon: "👤" },
  { id: "history", label: "History", icon: "📜" },
  { id: "media", label: "Media", icon: "🎬" },
  { id: "rules", label: "Rules", icon: "📋" },
];

const APP_PASSWORD = "nwi2026";

export default function PublicApp({ onGoAdmin }) {
  const [tab, setTab] = useState("leaderboard");
  const [countdown, setCountdown] = useState({});
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("nwi_unlocked") === "true");
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [lbTab, setLbTab] = useState("team");

  const { data: players } = useCollection("players");
  const { data: rounds } = useCollection("rounds");
  const { data: schedule } = useCollection("schedule");
  const { data: competitions } = useCollection("competitions");
  const { data: history } = useCollection("history");
  const { data: rules } = useCollection("rules", "order");
  const { data: meta } = useDocument("meta", "tournament");

  const tournamentDate = new Date((meta?.date || "2026-08-13") + "T10:00:00");

  const tryUnlock = () => {
    if (pwInput.trim() === APP_PASSWORD) {
      sessionStorage.setItem("nwi_unlocked", "true");
      setUnlocked(true); setPwError(false);
    } else { setPwError(true); setPwInput(""); }
  };

  useEffect(() => {
    const tick = () => {
      const diff = tournamentDate - new Date();
      if (diff <= 0) { setCountdown({ over: true }); return; }
      setCountdown({ days: Math.floor(diff/86400000), hours: Math.floor((diff%86400000)/3600000), minutes: Math.floor((diff%3600000)/60000), seconds: Math.floor((diff%60000)/1000) });
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [tournamentDate]);

  // Points engine
  const teamPoints = { nukes: 0, whales: 0 };
  const teamPtsAvail = { nukes: 0, whales: 0 };
  const playerStats = {};
  players.forEach(p => { playerStats[p.name] = { wins:0, losses:0, ties:0, ptsWon:0, ptsAvail:0, matchWins:0, matchLosses:0, matchTies:0 }; });

  rounds.forEach(round => {
    (round.matchups||[]).forEach(m => {
      const pts = round.pointsPerWin||0, tiePts = round.pointsPerTie||0;
      const nk = m.nukes||[], wh = m.whales||[];
      teamPtsAvail.nukes += pts; teamPtsAvail.whales += pts;
      nk.forEach(n => { if(playerStats[n]) playerStats[n].ptsAvail += pts; });
      wh.forEach(n => { if(playerStats[n]) playerStats[n].ptsAvail += pts; });
      if (m.winner==="nukes") {
        teamPoints.nukes += pts;
        nk.forEach(n => { if(playerStats[n]){playerStats[n].ptsWon+=pts;playerStats[n].wins++;playerStats[n].matchWins++;} });
        wh.forEach(n => { if(playerStats[n]){playerStats[n].losses++;playerStats[n].matchLosses++;} });
      } else if (m.winner==="whales") {
        teamPoints.whales += pts;
        wh.forEach(n => { if(playerStats[n]){playerStats[n].ptsWon+=pts;playerStats[n].wins++;playerStats[n].matchWins++;} });
        nk.forEach(n => { if(playerStats[n]){playerStats[n].losses++;playerStats[n].matchLosses++;} });
      } else if (m.winner==="tie") {
        teamPoints.nukes+=tiePts; teamPoints.whales+=tiePts;
        [...nk,...wh].forEach(n => { if(playerStats[n]){playerStats[n].ptsWon+=tiePts;playerStats[n].ties++;playerStats[n].matchTies++;} });
      }
    });
  });

  const individualLb = players.map(p => {
    const st = playerStats[p.name]||{};
    return { ...p, ...st, ptsWinPct: st.ptsAvail>0?Math.round((st.ptsWon/st.ptsAvail)*100):0, matchWinPct: (st.matchWins+st.matchLosses+st.matchTies)>0?Math.round((st.matchWins/(st.matchWins+st.matchLosses+st.matchTies))*100):0 };
  }).sort((a,b)=>b.ptsWinPct-a.ptsWinPct||b.ptsWon-a.ptsWon);

  // All-time stats from history matches + current
  const allTimeStats = {};
  history.forEach(yr => {
    (yr.matches||[]).forEach(m => {
      const pts=m.pointsWorth||0, tiePts=pts/2;
      const nk=m.nukes||[], wh=m.whales||[];
      [...nk,...wh].forEach(n => { if(!allTimeStats[n]) allTimeStats[n]={ptsWon:0,ptsAvail:0,matchWins:0,matchLosses:0,matchTies:0}; allTimeStats[n].ptsAvail+=pts; });
      if(m.winner==="nukes"){nk.forEach(n=>{if(allTimeStats[n]){allTimeStats[n].ptsWon+=pts;allTimeStats[n].matchWins++;}});wh.forEach(n=>{if(allTimeStats[n])allTimeStats[n].matchLosses++;});}
      else if(m.winner==="whales"){wh.forEach(n=>{if(allTimeStats[n]){allTimeStats[n].ptsWon+=pts;allTimeStats[n].matchWins++;}});nk.forEach(n=>{if(allTimeStats[n])allTimeStats[n].matchLosses++;});}
      else if(m.winner==="tie"){[...nk,...wh].forEach(n=>{if(allTimeStats[n]){allTimeStats[n].ptsWon+=tiePts;allTimeStats[n].matchTies++;}});}
    });
  });
  Object.entries(playerStats).forEach(([name,st])=>{
    if(!allTimeStats[name]) allTimeStats[name]={ptsWon:0,ptsAvail:0,matchWins:0,matchLosses:0,matchTies:0};
    allTimeStats[name].ptsWon+=(st.ptsWon||0); allTimeStats[name].ptsAvail+=(st.ptsAvail||0);
    allTimeStats[name].matchWins+=(st.matchWins||0); allTimeStats[name].matchLosses+=(st.matchLosses||0); allTimeStats[name].matchTies+=(st.matchTies||0);
  });
  const allTimeLb = Object.entries(allTimeStats).map(([name,st])=>{
    const tot=st.matchWins+st.matchLosses+st.matchTies;
    return { name,...st, ptsWinPct:st.ptsAvail>0?Math.round((st.ptsWon/st.ptsAvail)*100):0, matchWinPct:tot>0?Math.round((st.matchWins/tot)*100):0, totalMatches:tot };
  }).filter(p=>p.totalMatches>0).sort((a,b)=>b.ptsWinPct-a.ptsWinPct||b.ptsWon-a.ptsWon);

  const totalPtsAvail = teamPtsAvail.nukes;
  const playedPts = teamPoints.nukes + teamPoints.whales;
  const remainingPts = totalPtsAvail - playedPts;
  const threshold = Math.floor(totalPtsAvail/2)+0.5;
  const nukeWinPts = Math.max(0, Math.ceil(threshold - teamPoints.nukes));
  const whaleWinPts = Math.max(0, Math.ceil(threshold - teamPoints.whales));
  const nukesClinched = teamPoints.nukes > totalPtsAvail/2;
  const whalesClinched = teamPoints.whales > totalPtsAvail/2;
  const nukesElim = teamPoints.nukes + remainingPts <= teamPoints.whales;
  const whalesElim = teamPoints.whales + remainingPts <= teamPoints.nukes;
  const nukeWins = history.filter(h=>h.winner==="THE NUKES").length;
  const whaleWins = history.filter(h=>h.winner==="THE WHALES").length;

  // Password screen
  if (!unlocked) return (
    <div style={{ minHeight:"100vh", background:"#07090e", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Barlow Condensed',sans-serif", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ width:"100%", maxWidth:360, textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:12 }}>☢️🐋</div>
        <div style={{ fontSize:28, fontWeight:900, letterSpacing:"0.06em", background:"linear-gradient(90deg,#ff4500,#00aaff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:4 }}>NUCLEAR WHALE</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.3)", marginBottom:32, letterSpacing:"0.1em" }}>INVITATIONAL</div>
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:24 }}>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", marginBottom:14 }}>ENTER ACCESS CODE</div>
          <input type="password" value={pwInput} onChange={e=>{setPwInput(e.target.value);setPwError(false);}} onKeyDown={e=>e.key==="Enter"&&tryUnlock()}
            style={{ background:"rgba(255,255,255,0.07)", border:`1px solid ${pwError?"rgba(255,80,80,0.5)":"rgba(255,255,255,0.12)"}`, borderRadius:8, color:"#e8edf3", fontFamily:"inherit", fontSize:16, padding:"11px 14px", width:"100%", outline:"none", textAlign:"center", letterSpacing:"0.15em", marginBottom:10 }} />
          {pwError && <div style={{ fontSize:12, color:"#ff5555", marginBottom:10 }}>Incorrect code — try again</div>}
          <button onClick={tryUnlock} style={{ width:"100%", padding:"12px", background:"linear-gradient(135deg,#ff4500,#ff8c00)", border:"none", borderRadius:8, color:"#fff", fontFamily:"inherit", fontSize:14, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer" }}>Enter</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#07090e", color:"#e8edf3", fontFamily:"'Barlow Condensed',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=Barlow:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .tab-scroll{display:flex;overflow-x:auto;gap:4px;padding:0 16px;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .tab-scroll::-webkit-scrollbar{display:none;}
        .tab-btn{flex-shrink:0;padding:7px 11px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:8px;color:rgba(255,255,255,0.4);font-family:inherit;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer;transition:all 0.15s;white-space:nowrap;touch-action:manipulation;}
        .tab-btn.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);color:#fff;}
        .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;}
        .nuke-card{border-color:rgba(255,69,0,0.3)!important;box-shadow:0 0 20px rgba(255,69,0,0.12);}
        .whale-card{border-color:rgba(0,170,255,0.25)!important;box-shadow:0 0 20px rgba(0,170,255,0.1);}
        @keyframes flicker{0%,100%{text-shadow:0 0 12px #ff4500,0 0 30px #ff4500;}50%{text-shadow:0 0 6px #ff6a00,0 0 15px #ff6a00;}}
        @keyframes wave{0%,100%{text-shadow:0 0 12px #00aaff,0 0 30px #00aaff;}50%{text-shadow:0 0 6px #00ccff,0 0 15px #00ccff;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .live-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;animation:pulse 1.5s infinite;display:inline-block;margin-right:6px;}
        .ghost-btn{padding:7px 14px;background:none;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:rgba(255,255,255,0.5);font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;}
        .lb-tab{padding:7px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:rgba(255,255,255,0.4);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
        .lb-tab.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);color:#fff;}
        table{width:100%;border-collapse:collapse;}
        th{font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.1em;text-transform:uppercase;padding:8px 8px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.07);}
        td{font-size:13px;padding:9px 8px;border-bottom:1px solid rgba(255,255,255,0.05);}
        tr:last-child td{border-bottom:none;}
      `}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(180deg,#0d1520,#07090e)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"20px 16px 0" }}>
        <div style={{ maxWidth:680, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:18 }}>
            <div style={{ fontSize:11, letterSpacing:"0.2em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:4 }}>
              <span className="live-dot"/>LIVE · {meta?.year||2026}
            </div>
            <h1 style={{ fontWeight:900, fontSize:"clamp(26px,7vw,50px)", letterSpacing:"0.04em", textTransform:"uppercase", lineHeight:1.05, background:"linear-gradient(90deg,#ff4500,#ff8c00 35%,#fff 50%,#00aaff 65%,#0066cc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              NUCLEAR WHALE<br/>INVITATIONAL
            </h1>
            {meta?.location && <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:4, letterSpacing:"0.1em" }}>{meta.location}</div>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"center", marginBottom:18 }}>
            <div className="card nuke-card" style={{ padding:"12px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", marginBottom:2 }}>☢️ NUKES</div>
              <div style={{ fontSize:36, fontWeight:900, color:"#ff4500", lineHeight:1, animation:"flicker 3s infinite" }}>{teamPoints.nukes}</div>
              <div style={{ fontSize:10, color:"rgba(255,80,0,0.5)", marginTop:2 }}>POINTS</div>
            </div>
            <div style={{ textAlign:"center", fontSize:16, fontWeight:900, color:"rgba(255,255,255,0.15)" }}>VS</div>
            <div className="card whale-card" style={{ padding:"12px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", marginBottom:2 }}>🐋 WHALES</div>
              <div style={{ fontSize:36, fontWeight:900, color:"#00aaff", lineHeight:1, animation:"wave 3s infinite" }}>{teamPoints.whales}</div>
              <div style={{ fontSize:10, color:"rgba(0,150,255,0.5)", marginTop:2 }}>POINTS</div>
            </div>
          </div>
        </div>
      </div>
      <div className="tab-scroll" style={{ padding:"8px 16px", background:"linear-gradient(180deg,#0d1520,#07090e)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"20px 16px 80px", animation:"slideIn 0.2s ease" }} key={tab}>

        {/* LEADERBOARD */}
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
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[{team:"nukes",pts:teamPoints.nukes},{team:"whales",pts:teamPoints.whales}].sort((a,b)=>b.pts-a.pts).map((t,i)=>(
                  <div key={t.team} className={`card ${t.team==="nukes"?"nuke-card":"whale-card"}`} style={{ padding:"20px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ fontSize:28, fontWeight:900, color:i===0?"#ffd700":"rgba(255,255,255,0.2)" }}>{i+1}</div>
                      <div style={{ fontSize:32 }}>{TEAMS[t.team].emoji}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:20, fontWeight:800, color:TEAMS[t.team].color, letterSpacing:"0.06em" }}>{TEAMS[t.team].name}</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{players.filter(p=>p.team===t.team).length} players</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:40, fontWeight:900, color:TEAMS[t.team].color, lineHeight:1 }}>{t.pts}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>PTS</div>
                      </div>
                    </div>
                    {totalPtsAvail>0 && (
                      <div style={{ marginTop:14 }}>
                        <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${(t.pts/totalPtsAvail)*100}%`, background:TEAMS[t.team].color, borderRadius:3, transition:"width 0.5s" }}/>
                        </div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>{Math.round((t.pts/totalPtsAvail)*100)}% of available points</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {lbTab==="individual" && (
              <div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:12 }}>Ranked by points win % (points won ÷ points competed for)</div>
                <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
                  <table>
                    <thead><tr><th>#</th><th>Player</th><th>Pts Won</th><th>Pts Win%</th><th>W-T-L</th></tr></thead>
                    <tbody>
                      {individualLb.map((p,i)=>{
                        const team=TEAMS[p.team]||TEAMS.nukes;
                        return (
                          <tr key={p.id} style={{ background:i%2===0?"rgba(255,255,255,0.02)":"transparent" }}>
                            <td style={{ fontWeight:900, color:i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":"rgba(255,255,255,0.3)", fontSize:15 }}>{i+1}</td>
                            <td><div style={{ fontWeight:700 }}>{p.name}</div><div style={{ fontSize:10, color:team.color }}>{team.emoji} {p.team}</div></td>
                            <td style={{ fontWeight:700, color:team.color }}>{p.ptsWon}</td>
                            <td style={{ fontWeight:800 }}>{p.ptsWinPct}%</td>
                            <td style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{p.matchWins}-{p.matchTies}-{p.matchLosses}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {lbTab==="alltime" && (
              <div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:12 }}>All-time across all tournaments — ranked by points win %</div>
                {allTimeLb.length===0
                  ? <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,0.2)" }}>No historical match data yet — add it in Admin → History</div>
                  : <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
                      <table>
                        <thead><tr><th>#</th><th>Player</th><th>Pts Won</th><th>Pts Win%</th><th>Matches</th><th>Match%</th></tr></thead>
                        <tbody>
                          {allTimeLb.map((p,i)=>(
                            <tr key={p.name} style={{ background:i%2===0?"rgba(255,255,255,0.02)":"transparent" }}>
                              <td style={{ fontWeight:900, color:i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":"rgba(255,255,255,0.3)", fontSize:15 }}>{i+1}</td>
                              <td style={{ fontWeight:700 }}>{p.name}</td>
                              <td style={{ fontWeight:700, color:"#ff8c00" }}>{p.ptsWon}</td>
                              <td style={{ fontWeight:800 }}>{p.ptsWinPct}%</td>
                              <td style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{p.matchWins}W {p.matchTies}T {p.matchLosses}L</td>
                              <td style={{ fontWeight:700, color:"#00aaff" }}>{p.matchWinPct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                }
              </div>
            )}
          </div>
        )}

        {/* MATCHUPS */}
        {tab==="matchups" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>Round Matchups</div>
            {rounds.length===0 && <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,0.25)" }}>No rounds set up yet</div>}
            {rounds.map(round=>(
              <div key={round.id} style={{ marginBottom:24 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" }}>
                  <div style={{ fontSize:16, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase" }}>{round.name}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", background:"rgba(255,255,255,0.06)", padding:"2px 10px", borderRadius:20 }}>{round.day}</div>
                  {round.competitionName && <div style={{ fontSize:11, color:"#ffd700", background:"rgba(255,200,0,0.1)", padding:"2px 10px", borderRadius:20 }}>🏅 {round.competitionName}</div>}
                  <div style={{ fontSize:11, color:"#ffd700", marginLeft:"auto" }}>Win={round.pointsPerWin}pts · Tie={round.pointsPerTie}pts</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {(round.matchups||[]).map((m,mi)=>(
                    <div key={mi} className="card" style={{ padding:"16px" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"center" }}>
                        <div style={{ background:m.winner==="nukes"?"rgba(255,69,0,0.15)":"rgba(255,69,0,0.06)", border:`1px solid ${m.winner==="nukes"?"rgba(255,69,0,0.4)":"rgba(255,69,0,0.15)"}`, borderRadius:10, padding:"12px", textAlign:"center" }}>
                          <div style={{ fontSize:18, marginBottom:4 }}>☢️</div>
                          {(m.nukes||[]).map((n,ni)=><div key={ni} style={{ fontSize:14, fontWeight:700, color:"#ff4500" }}>{n}</div>)}
                          {m.winner==="nukes" && <div style={{ fontSize:10, color:"#ff4500", marginTop:6 }}>✓ WIN</div>}
                          {m.winner==="tie" && <div style={{ fontSize:10, color:"#ffd700", marginTop:6 }}>TIE</div>}
                        </div>
                        <div style={{ textAlign:"center", fontSize:14, fontWeight:900, color:"rgba(255,255,255,0.2)" }}>VS</div>
                        <div style={{ background:m.winner==="whales"?"rgba(0,170,255,0.15)":"rgba(0,170,255,0.06)", border:`1px solid ${m.winner==="whales"?"rgba(0,170,255,0.4)":"rgba(0,170,255,0.15)"}`, borderRadius:10, padding:"12px", textAlign:"center" }}>
                          <div style={{ fontSize:18, marginBottom:4 }}>🐋</div>
                          {(m.whales||[]).map((n,ni)=><div key={ni} style={{ fontSize:14, fontWeight:700, color:"#00aaff" }}>{n}</div>)}
                          {m.winner==="whales" && <div style={{ fontSize:10, color:"#00aaff", marginTop:6 }}>✓ WIN</div>}
                          {m.winner==="tie" && <div style={{ fontSize:10, color:"#ffd700", marginTop:6 }}>TIE</div>}
                        </div>
                      </div>
                      {!m.winner && <div style={{ textAlign:"center", marginTop:10, fontSize:12, color:"rgba(255,255,255,0.25)" }}>PENDING</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PROJECTIONS */}
        {tab==="projections" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>Projections</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              {["nukes","whales"].map(t=>{
                const pts=teamPoints[t], needed=t==="nukes"?nukeWinPts:whaleWinPts;
                const clinched=t==="nukes"?nukesClinched:whalesClinched, elim=t==="nukes"?nukesElim:whalesElim;
                return (
                  <div key={t} className={`card ${t==="nukes"?"nuke-card":"whale-card"}`} style={{ padding:18, textAlign:"center" }}>
                    <div style={{ fontSize:28 }}>{TEAMS[t].emoji}</div>
                    <div style={{ fontSize:16, fontWeight:800, color:TEAMS[t].color, marginTop:6, marginBottom:10 }}>{TEAMS[t].name}</div>
                    {clinched
                      ? <div style={{ padding:"8px 12px", background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:8, fontSize:13, fontWeight:700, color:"#4ade80" }}>🏆 CLINCHED!</div>
                      : elim
                      ? <div style={{ padding:"8px 12px", background:"rgba(255,80,80,0.12)", border:"1px solid rgba(255,80,80,0.25)", borderRadius:8, fontSize:13, fontWeight:700, color:"#ff5555" }}>Eliminated</div>
                      : <div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em", marginBottom:4 }}>NEEDS TO WIN</div>
                          <div style={{ fontSize:32, fontWeight:900, color:TEAMS[t].color }}>{needed}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>more points to clinch</div>
                        </div>
                    }
                    <div style={{ marginTop:12, fontSize:12, color:"rgba(255,255,255,0.35)" }}>Current: {pts} pts</div>
                  </div>
                );
              })}
            </div>
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14, letterSpacing:"0.06em", textTransform:"uppercase" }}>Points Breakdown</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
                {[["Total Available",totalPtsAvail,"#ffd700"],["Points Played",playedPts,"#4ade80"],["Remaining",remainingPts,"#00aaff"]].map(([label,val,color])=>(
                  <div key={label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:12 }}>
                    <div style={{ fontSize:24, fontWeight:900, color }}>{val}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.06em", marginTop:4 }}>{label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, fontSize:12, color:"rgba(255,255,255,0.3)", fontFamily:"'Barlow',sans-serif" }}>Win threshold: more than {Math.floor(totalPtsAvail/2)} points</div>
            </div>
          </div>
        )}

        {/* COUNTDOWN */}
        {tab==="countdown" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:13, letterSpacing:"0.15em", color:"rgba(255,255,255,0.35)", textTransform:"uppercase", marginBottom:6 }}>Tournament Begins In</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)", marginBottom:40 }}>August 13, 2026 at 10:00 AM</div>
            {countdown.over
              ? <div style={{ fontSize:42, fontWeight:900, background:"linear-gradient(90deg,#ff4500,#00aaff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>IT'S TIME! ⛳</div>
              : <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:48 }}>
                  {[["days","DAYS"],["hours","HRS"],["minutes","MIN"],["seconds","SEC"]].map(([k,label])=>(
                    <div key={k} className="card" style={{ padding:"18px 8px", borderColor:k==="seconds"?"rgba(255,69,0,0.3)":undefined }}>
                      <div style={{ fontSize:"clamp(26px,7vw,44px)", fontWeight:900, color:k==="seconds"?"#ff4500":"#e8edf3", lineHeight:1 }}>{String(countdown[k]??0).padStart(2,"0")}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.12em", marginTop:4 }}>{label}</div>
                    </div>
                  ))}
                </div>
            }
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {["nukes","whales"].map(t=>(
                <div key={t} className={`card ${t==="nukes"?"nuke-card":"whale-card"}`} style={{ padding:20 }}>
                  <div style={{ fontSize:34 }}>{TEAMS[t].emoji}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:TEAMS[t].color, marginTop:8 }}>{TEAMS[t].name}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:4 }}>{t==="nukes"?`${nukeWins} titles`:`${whaleWins} titles`}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCHEDULE */}
        {tab==="schedule" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Tournament Schedule</div>
            {meta?.location && <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:20, fontFamily:"'Barlow',sans-serif" }}>📍 {meta.location}</div>}
            {["Day 1","Day 2","Day 3"].map(day=>{
              const items=schedule.filter(s=>s.day===day);
              if(!items.length) return null;
              return (
                <div key={day} style={{ marginBottom:24 }}>
                  <div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.14em", color:"rgba(255,255,255,0.35)", textTransform:"uppercase", marginBottom:10 }}>{day}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {items.map((s,i)=>(
                      <div key={i} className="card" style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ minWidth:72, fontSize:13, fontWeight:700, color:"#ff8c00" }}>{s.time}</div>
                        <div style={{ width:1, height:28, background:"rgba(255,255,255,0.07)" }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600 }}>{s.icon&&<span style={{ marginRight:6 }}>{s.icon}</span>}{s.event}</div>
                          {s.course && <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>📍 {s.course}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* COMPETITIONS */}
        {tab==="competitions" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>Side Competitions</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {competitions.map(c=>(
                <div key={c.id} className={`card ${c.winnerTeam==="nukes"?"nuke-card":c.winnerTeam==="whales"?"whale-card":""}`} style={{ padding:20 }}>
                  <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <div style={{ fontSize:30 }}>{c.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>{c.name}</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:12, fontFamily:"'Barlow',sans-serif" }}>{c.desc}</div>
                      {c.winner
                        ? <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em" }}>LEADER</span>
                            <span style={{ fontSize:15, fontWeight:700, color:c.winnerTeam==="nukes"?"#ff4500":"#00aaff" }}>{c.winnerTeam==="nukes"?"☢️":"🐋"} {c.winner}{c.detail?` — ${c.detail}`:""}</span>
                          </div>
                        : <div style={{ fontSize:13, color:"rgba(255,255,255,0.25)", fontStyle:"italic" }}>Results pending</div>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLAYERS */}
        {tab==="players" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:20 }}>Player Roster</div>
            {["nukes","whales"].map(team=>{
              const tp=players.filter(p=>p.team===team);
              return (
                <div key={team} style={{ marginBottom:28 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <span style={{ fontSize:20 }}>{TEAMS[team].emoji}</span>
                    <span style={{ fontSize:18, fontWeight:800, color:TEAMS[team].color, letterSpacing:"0.08em", textTransform:"uppercase" }}>{TEAMS[team].name}</span>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>({tp.length})</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {tp.map(p=>(
                      <div key={p.id} className="card" style={{ padding:"14px 16px", borderColor:`${TEAMS[team].color}22`, cursor:"pointer" }} onClick={()=>setExpandedPlayer(expandedPlayer===p.id?null:p.id)}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          {p.photoURL ? <img src={p.photoURL} alt={p.name} style={{ width:46, height:46, borderRadius:"50%", objectFit:"cover", border:`2px solid ${TEAMS[team].color}55` }}/> : <div style={{ width:46, height:46, borderRadius:"50%", background:TEAMS[team].bg, border:`2px solid ${TEAMS[team].color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:TEAMS[team].color }}>{p.name?.[0]}</div>}
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:16, fontWeight:700 }}>{p.name}</div>
                            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:1 }}>HCP {p.handicap}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:22, fontWeight:900, color:TEAMS[team].color }}>{playerStats[p.name]?.ptsWon||0}</div>
                            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>PTS</div>
                          </div>
                        </div>
                        {expandedPlayer===p.id&&p.bio&&<div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.07)", fontSize:13, color:"rgba(255,255,255,0.5)", fontFamily:"'Barlow',sans-serif" }}>{p.bio}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* HISTORY */}
        {tab==="history" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:20 }}>Tournament History</div>
            {[...history].sort((a,b)=>b.year-a.year).map(h=>{
              const isNuke=h.winner==="THE NUKES";
              return (
                <div key={h.id} style={{ marginBottom:16 }}>
                  <div className={`card ${isNuke?"nuke-card":"whale-card"}`} style={{ padding:"18px 20px" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                      <div style={{ fontSize:34, fontWeight:900, color:"rgba(255,255,255,0.12)", minWidth:56, lineHeight:1 }}>{h.year}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:18, fontWeight:800, color:isNuke?"#ff4500":"#00aaff", marginBottom:2 }}>{isNuke?"☢️":"🐋"} {h.winner}</div>
                        <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>MVP: {h.mvp} · {h.nukes_pts??0}–{h.whales_pts??0}</div>
                        {h.notes&&<div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", fontFamily:"'Barlow',sans-serif", fontStyle:"italic", marginBottom:8 }}>{h.notes}</div>}
                        {(h.superlatives||[]).length>0&&(
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                            {h.superlatives.map((sup,si)=>(
                              <div key={si} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.6)" }}>🏅 {sup.title}: {sup.player}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize:28 }}>🏆</div>
                    </div>
                    {(h.matches||[]).length>0&&(
                      <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Matchup Results</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          {h.matches.map((m,mi)=>(
                            <div key={mi} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"10px 12px" }}>
                              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"center", fontSize:13 }}>
                                <div style={{ color:m.winner==="nukes"?"#ff4500":"rgba(255,255,255,0.5)", fontWeight:m.winner==="nukes"?700:400 }}>☢️ {(m.nukes||[]).join(" & ")}{m.winner==="nukes"&&<span style={{ marginLeft:6, fontSize:10 }}>✓</span>}</div>
                                <div style={{ textAlign:"center", fontSize:11, color:"rgba(255,255,255,0.2)" }}>VS</div>
                                <div style={{ color:m.winner==="whales"?"#00aaff":"rgba(255,255,255,0.5)", fontWeight:m.winner==="whales"?700:400, textAlign:"right" }}>{m.winner==="whales"&&<span style={{ marginRight:6, fontSize:10 }}>✓</span>}{(m.whales||[]).join(" & ")} 🐋</div>
                              </div>
                              <div style={{ display:"flex", justifyContent:"center", gap:12, marginTop:6, fontSize:11, color:"rgba(255,255,255,0.3)" }}>
                                {m.roundName&&<span>{m.roundName}</span>}
                                {m.pointsWorth&&<span>{m.pointsWorth} pts</span>}
                                {m.winner==="tie"&&<span style={{ color:"#ffd700" }}>TIE</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="card" style={{ padding:"16px 20px", marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, textAlign:"center" }}>
              <div><div style={{ fontSize:30, fontWeight:900, color:"#ff4500" }}>{nukeWins}</div><div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em" }}>NUKE TITLES</div></div>
              <div><div style={{ fontSize:30, fontWeight:900, color:"#00aaff" }}>{whaleWins}</div><div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em" }}>WHALE TITLES</div></div>
            </div>
          </div>
        )}

        {tab==="media" && <MediaGallery/>}

        {tab==="rules" && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:20 }}>Rules & Format</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {rules.map((r,i)=>(
                <div key={r.id} className="card" style={{ padding:"16px 18px" }}>
                  <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:i%2===0?"#ff8c00":"#00aaff", marginBottom:8 }}>{r.title}</div>
                  <div style={{ fontSize:14, color:"rgba(255,255,255,0.55)", lineHeight:1.65, fontFamily:"'Barlow',sans-serif" }}>{r.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
