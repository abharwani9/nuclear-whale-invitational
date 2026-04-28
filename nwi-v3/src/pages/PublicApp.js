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
  { id: "superlatives", label: "Superlatives",  icon: "🏅" },
  { id: "players",      label: "Players",       icon: "👤" },
  { id: "history",      label: "History",       icon: "📜" },
  { id: "media",        label: "Media",         icon: "🎬" },
  { id: "rules",        label: "Rules",         icon: "📋" },
  { id: "mockdraft",    label: "Mock Draft",    icon: "🃏" },
];

function SuperlativesTab({ meta, roster, votes, drafts }) {
  const categories = meta?.superlativeCategories || [];
  const votingOpen = meta?.votingOpen === true;

  const deviceId = (() => {
    let id = localStorage.getItem("nwi_device_id");
    if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem("nwi_device_id", id); }
    return id;
  })();

  const myVoteDoc = votes?.find(v => v.id === deviceId);
  const myVotes = myVoteDoc?.votes || {};
  const hasSubmitted = !!myVoteDoc?.submittedAt;

  const [selections, setSelections] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Only show players in the current year draft
  const currentYearStr = String(meta?.year || new Date().getFullYear());
  const currentDraft = (drafts || []).find(d => String(d.year) === currentYearStr);
  const assignments = currentDraft?.assignments || {};
  const draftedPlayers = roster.filter(p => assignments[p.name] && assignments[p.name] !== "out");
  const sortedRoster = draftedPlayers.length > 0
    ? [...draftedPlayers].sort((a,b)=>a.name.localeCompare(b.name))
    : [...roster].sort((a,b)=>a.name.localeCompare(b.name));

  const handleSubmit = async () => {
    const allAnswered = categories.every(c => selections[c]);
    if (!allAnswered) { alert("Please vote in every category before submitting."); return; }
    setSubmitting(true);
    const { firestore } = await import("../firebase/hooks");
    await firestore.set("votes", deviceId, { votes: selections, submittedAt: new Date().toISOString(), deviceId });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (!votingOpen) return (
    <div style={{ textAlign:"center", padding:"60px 20px" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🏅</div>
      <div style={{ fontSize:22, fontWeight:800, color:"#e8edf3", marginBottom:8 }}>Voting Not Open Yet</div>
      <div style={{ fontSize:14, color:"rgba(255,255,255,0.35)" }}>Check back during the tournament when voting opens.</div>
    </div>
  );

  if (submitted || hasSubmitted) {
    const displayVotes = hasSubmitted ? myVotes : selections;
    return (
      <div>
        <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>🏅 Superlatives</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:20 }}>Your votes are in! Results will be revealed by the admin.</div>
        {categories.map(cat => {
          const pick = displayVotes[cat];
          const p = roster.find(r => r.name === pick);
          return (
            <div key={cat} className="card" style={{ padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{cat}</div>
                <div style={{ fontWeight:700, fontSize:15 }}>{pick || "—"}</div>
              </div>
              {p?.photoURL
                ? <img src={p.photoURL} alt={pick} style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover" }}/>
                : <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800 }}>{pick?.[0]}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>🏅 Superlatives</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:20 }}>Vote for one player in each category. One submission per device.</div>
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#ffd700", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>{cat}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {sortedRoster.map(p => {
              const selected = selections[cat] === p.name;
              return (
                <div key={p.id} onClick={() => setSelections(s => ({ ...s, [cat]: selected ? null : p.name }))}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                    background: selected ? "rgba(255,200,0,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selected ? "rgba(255,200,0,0.4)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius:10, cursor:"pointer" }}>
                  {p.photoURL
                    ? <img src={p.photoURL} alt={p.name} style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover" }}/>
                    : <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16 }}>{p.name?.[0]}</div>}
                  <div style={{ flex:1, fontWeight:600, fontSize:14 }}>{p.name}</div>
                  {selected && <div style={{ fontSize:20, color:"#ffd700" }}>✓</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button onClick={handleSubmit} disabled={submitting}
        style={{ width:"100%", padding:"14px", background:"linear-gradient(135deg,#ff8c00,#ff4500)", border:"none", borderRadius:12, color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", marginTop:8 }}>
        {submitting ? "Submitting..." : "🏅 Submit My Votes"}
      </button>
    </div>
  );
}

function CustomPicker({ label, value, options, onSelect, setModalPicker, color="rgba(255,255,255,0.5)" }) {
  return (
    <div style={{ marginBottom:6 }}>
      <button onClick={()=>setModalPicker({label, options, onSelect, color, current:value})}
        style={{ width:"100%", padding:"8px 10px", background:"rgba(255,255,255,0.06)", border:`1px solid ${value?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.1)"}`, borderRadius:8, color:value?color:"rgba(255,255,255,0.35)", fontFamily:"inherit", fontSize:12, fontWeight:value?700:400, cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span>{value ? (options.find(o=>o.value===value)?.label||value) : label}</span>
        <span style={{ fontSize:10, opacity:0.5 }}>▼</span>
      </button>
    </div>
  );
}

function PhotoAvatar({ name, roster, size=28 }) {
  const p = roster?.find(r=>r.name===name);
  return p?.photoURL
    ? <img src={p.photoURL} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
    : <div style={{width:size,height:size,borderRadius:"50%",background:"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4,fontWeight:800,flexShrink:0}}>{name[0]}</div>;
}

function SortSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{background:"#1a2235",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,color:"#e8edf3",fontFamily:"inherit",fontSize:11,padding:"4px 6px"}}>
      <option value="hcp">By HCP</option>
      <option value="alpha">A–Z</option>
      <option value="record">By Record</option>
      <option value="winRate">By Win%</option>
      <option value="ptsRate">By Pts%</option>
    </select>
  );
}

function MockDraftTab({ roster, competitions, meta, getHandicap, history, rounds }) {
  const sortedRoster = [...roster].sort((a,b)=>a.name.localeCompare(b.name));
  const teamFormats = meta?.teamFormats || {};
  const hcpAllowances = meta?.hcpAllowances || {};
  const compOrder = competitions.reduce((acc,c,i)=>({...acc,[c.id]:i}),{});

  // Scramble detection — group all scramble competitions
  const scrambleComps = competitions.filter(c=>c.name?.toLowerCase().includes("scramble"));
  const scrambleIds = scrambleComps.map(c=>c.id);
  const isScrambleGroup = (id) => scrambleIds.includes(id);
  const SCRAMBLE_KEY = "__scramble__";

  // Team competitions sorted (scrambles last, grouped)
  const nonScrambleTeamComps = competitions.filter(c=>teamFormats[c.id]&&!isScrambleGroup(c.id))
    .sort((a,b)=>(compOrder[a.id]||0)-(compOrder[b.id]||0));
  const hasScramble = scrambleComps.some(c=>teamFormats[c.id]);

  // Board entries: non-scramble comps + optional scramble group
  const boardEntries = [
    ...nonScrambleTeamComps.map(c=>({type:"comp",comp:c,id:c.id})),
    ...(hasScramble?[{type:"scramble",id:SCRAMBLE_KEY}]:[]),
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  const [nukes, setNukes_] = useState([]);
  const [whales, setWhales_] = useState([]);
  const [unassigned, setUnassigned] = useState(sortedRoster.map(p=>p.name));
  const [assignSort, setAssignSort] = useState("hcp");
  const [selComp, setSelComp] = useState(null);
  const [selNukes, setSelNukes] = useState([]);
  const [selWhales, setSelWhales] = useState([]);
  const [explorerSort, setExplorerSort] = useState("hcp");
  const [savedMatchups, setSavedMatchups] = useState({});
  const [ptsOverride, setPtsOverride] = useState({});
  const [modalPicker, setModalPicker] = useState(null);

  const setNukes = (v) => { const val=typeof v==="function"?v(nukes):v; setNukes_(val); try{sessionStorage.setItem("nwi_mock_nukes",JSON.stringify(val));}catch(e){} };
  const setWhales = (v) => { const val=typeof v==="function"?v(whales):v; setWhales_(val); try{sessionStorage.setItem("nwi_mock_whales",JSON.stringify(val));}catch(e){} };

  useEffect(()=>{
    try {
      const sn=JSON.parse(sessionStorage.getItem("nwi_mock_nukes")||"[]");
      const sw=JSON.parse(sessionStorage.getItem("nwi_mock_whales")||"[]");
      const ss=JSON.parse(sessionStorage.getItem("nwi_mock_saved")||"{}");
      const sp=JSON.parse(sessionStorage.getItem("nwi_mock_pts")||"{}");
      if(sn.length) setNukes_(sn);
      if(sw.length) setWhales_(sw);
      if(Object.keys(ss).length) setSavedMatchups(ss);
      if(Object.keys(sp).length) setPtsOverride(sp);
      if(sn.length||sw.length) setUnassigned(sortedRoster.map(p=>p.name).filter(n=>![...sn,...sw].includes(n)));
    } catch(e) {}
    try { localStorage.removeItem("nwi_mock_matchups"); localStorage.removeItem("nwi_mock_pts"); } catch(e) {}
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const defaultPts = Number(meta?.defaultMatchPts)||2;

  const teamHcp = (players, allowPct=100) => {
    const pct=allowPct/100;
    const hcps=players.filter(Boolean).map(n=>getHandicap(n)*pct).sort((a,b)=>a-b);
    if(!hcps.length) return 18;
    if(hcps.length===1) return Math.round(hcps[0]*0.5);
    return Math.round(hcps[0]*0.35+hcps[1]*0.15);
  };

  const toOdds = p => {
    p=Math.max(0.05,Math.min(0.95,p));
    return p>=0.5?`-${Math.round((p/(1-p))*100)}`:`+${Math.round(((1-p)/p)*100)}`;
  };

  const getPlayerStats = (name) => {
    let w=0,l=0,t=0,pts=0,ptsAvail=0;
    (history||[]).forEach(yr=>(yr.matches||[]).forEach(m=>{
      if(!m.winner) return;
      const onN=(m.nukes||[]).includes(name),onW=(m.whales||[]).includes(name);
      if(!onN&&!onW) return;
      const pt=onN?"nukes":"whales",p=m.pointsWorth||defaultPts,tie=p/2;
      if(m.winner===pt){w++;pts+=p;}else if(m.winner==="tie"){t++;pts+=tie;}else l++;
      ptsAvail+=p;
    }));
    return {w,l,t,pts,ptsAvail,total:w+l+t};
  };

  const getBlendedStats = (players, compName) => {
    let w=0,t=0,total=0;
    players.forEach(name=>{
      (history||[]).forEach(yr=>(yr.matches||[]).forEach(m=>{
        if(!m.winner) return;
        if(compName){const mc=(m.roundName||"").toLowerCase();if(!mc.includes(compName.toLowerCase().split(" ")[0])) return;}
        const onN=(m.nukes||[]).includes(name),onW=(m.whales||[]).includes(name);
        if(!onN&&!onW) return;
        const pt=onN?"nukes":"whales";
        if(m.winner===pt) w++; else if(m.winner==="tie") t+=0.5;
        total++;
      }));
    });
    if(total<2) return null;
    return {w:Math.round(w*10)/10,t:Math.round(t*10)/10,l:Math.round((total-w-t)*10)/10,total,pct:Math.round((w/total)*100)};
  };

  // ── Adaptive odds model ───────────────────────────────────────────────────
  // Opponent-quality weighted win rate for a set of players
  // compName: if provided, filter to that competition only
  const getWeightedWinRate = (players, compName) => {
    if(!players?.length) return null;
    let weightedWins=0, totalWeight=0;
    (history||[]).forEach(yr=>(yr.matches||[]).forEach(m=>{
      if(m.type==="heading"||!m.winner) return;
      if(compName){
        const mc=(m.roundName||m.competitionName||"").toLowerCase();
        if(!mc.includes(compName.toLowerCase().split(" ")[0])) return;
      }
      const inN=players.some(p=>(m.nukes||[]).includes(p));
      const inW=players.some(p=>(m.whales||[]).includes(p));
      if(!inN&&!inW) return;
      // Opponent quality weight — avg opponent HCP normalized around 18
      const oppTeam=inN?"whales":"nukes";
      const oppPlayers=m[oppTeam]||[];
      const oppAvgHcp=oppPlayers.length>0
        ? oppPlayers.map(n=>getHandicap(n)).reduce((s,h)=>s+h,0)/oppPlayers.length
        : 18;
      const weight=Math.max(0.5, 1+(18-oppAvgHcp)/18); // lower opp hcp = higher weight
      const pt=inN?"nukes":"whales";
      const won=m.winner===pt?1:m.winner==="tie"?0.5:0;
      weightedWins+=won*weight;
      totalWeight+=weight;
    }));
    if(totalWeight<2) return null; // not enough data
    return weightedWins/totalWeight; // 0-1 win rate
  };

  // Convert two team win rates to a head-to-head probability
  const winRateToProb = (nRate, wRate) => {
    const tot=nRate+wRate;
    return tot>0?nRate/tot:0.5;
  };

  const calcProb = (nPair, wPair, comp) => {
    if(!comp) return 0.5;
    const compId=comp.id===SCRAMBLE_KEY?scrambleComps[0]?.id:comp.id;
    const compName=comp.id===SCRAMBLE_KEY?null:comp.name; // scramble uses all-time only
    const allow=hcpAllowances[compId]||100;

    // Factor 1: Team handicap (always present)
    const nHcp=teamHcp(nPair,allow), wHcp=teamHcp(wPair,allow);
    const hcpProb=Math.max(0.05,Math.min(0.95, 0.5+(wHcp-nHcp)*0.03));

    // Factor 2: All-time opponent-weighted win rate
    const nAllTime=getWeightedWinRate(nPair,null);
    const wAllTime=getWeightedWinRate(wPair,null);
    const hasAllTime=nAllTime!==null||wAllTime!==null;
    const allTimeProb=hasAllTime?winRateToProb(nAllTime??0.5,wAllTime??0.5):null;

    // Factor 3: Competition-specific win rate
    const nCompSpec=compName?getWeightedWinRate(nPair,compName):null;
    const wCompSpec=compName?getWeightedWinRate(wPair,compName):null;
    const hasCompSpec=nCompSpec!==null||wCompSpec!==null;
    const compSpecProb=hasCompSpec?winRateToProb(nCompSpec??0.5,wCompSpec??0.5):null;

    // Blend based on available data
    let prob;
    if(hasCompSpec&&allTimeProb!==null) {
      // All three factors: 50% hcp + 25% all-time + 25% comp-specific
      prob=hcpProb*0.50+allTimeProb*0.25+compSpecProb*0.25;
    } else if(allTimeProb!==null) {
      // Two factors: 75% hcp + 25% all-time
      prob=hcpProb*0.75+allTimeProb*0.25;
    } else {
      // Handicap only
      prob=hcpProb;
    }
    return Math.max(0.1,Math.min(0.9,prob));
  };

  const getPairs = players => {
    const p=[];
    for(let i=0;i<players.length;i++) for(let j=i+1;j<players.length;j++) p.push([players[i],players[j]]);
    return p;
  };

  const getCompPts = (comp) => {
    if(!comp) return defaultPts;
    if(ptsOverride[comp.id]) return Number(ptsOverride[comp.id]);
    const r=(rounds||[]).find(r=>r.competitionName===comp.name||(r.matchups||[]).some(mu=>mu.competitionName===comp.name));
    return r?.pointsPerWin||defaultPts;
  };

  // Dynamic max slots based on team size
  const maxSlots = Math.max(1, Math.floor(Math.min(nukes.length||1, whales.length||1)/2));

  // Players already used in saved matchups for current competition
  const selCompIsScramble = selComp ? isScrambleGroup(selComp.id) : false;
  const usedInSelComp = selComp ? (
    selCompIsScramble
      ? (savedMatchups[SCRAMBLE_KEY]||[]).flatMap(m=>[...(m.np||[]),...(m.wp||[])])
      : (savedMatchups[selComp.id]||[]).flatMap(m=>[...(m.np||[]),...(m.wp||[])])
  ) : [];

  const checkPartnerRepeat = (p1, p2) => {
    if(!p1||!p2) return false;
    const key=[p1,p2].sort().join("|");
    return Object.entries(savedMatchups).some(([,ms])=>
      ms.some(m=>[...(m.np||[])].sort().join("|")===key||[...(m.wp||[])].sort().join("|")===key)
    );
  };

  const checkRepeat = (np, wp, cid) => {
    if(!np?.length||!wp?.length) return false;
    try {
      const nKey=[...np].sort().join("|"), wKey=[...wp].sort().join("|");
      const pairKeys=Object.entries(savedMatchups).flatMap(([ocid,ms])=>ms.flatMap(m=>[
        {key:[...(m.np||[])].sort().join("|"),cid:ocid},
        {key:[...(m.wp||[])].sort().join("|"),cid:ocid}
      ]));
      return pairKeys.some(({key,cid:ocid})=>(key===nKey||key===wKey)&&ocid!==cid&&!(isScrambleGroup(cid)&&isScrambleGroup(ocid)));
    } catch(e){return false;}
  };

  // Auto-compute suggestions
  const suggestions = (() => {
    if(!selComp) return null;
    const np=selNukes.filter(Boolean), wp=selWhales.filter(Boolean);
    if(np.length<2&&wp.length<2) return null;
    const allow=hcpAllowances[selComp.id]||100;
    if(np.length===2&&wp.length===2){
      const prob=calcProb(np,wp,selComp);
      const altPool=whales.length>=2?whales.filter(n=>!np.includes(n)):sortedRoster.map(p=>p.name).filter(n=>!np.includes(n));
      const altPairs=getPairs(altPool).filter(p=>p.join("|")!==[...wp].sort().join("|"));
      const ranked=altPairs.map(ap=>({pair:ap,prob:calcProb(np,ap,selComp),diff:Math.abs(calcProb(np,ap,selComp)-0.5)})).sort((a,b)=>a.diff-b.diff);
      const nextBest=ranked[0]?{pair:ranked[0].pair,prob:ranked[0].prob,diffFromBest:Math.abs(ranked[0].prob-prob)}:null;
      return [{label:"Projected Matchup",emoji:"🎯",np,wp,prob,nHcp:teamHcp(np,allow),wHcp:teamHcp(wp,allow),color:"rgba(255,200,0,0.8)",bg:"rgba(255,200,0,0.04)",border:"rgba(255,200,0,0.2)",nextBest}];
    }
    const knownIsNuke=np.length===2;
    const known=knownIsNuke?np:wp;
    const pool=knownIsNuke?(whales.length>=2?whales:sortedRoster.map(p=>p.name).filter(n=>!known.includes(n))):(nukes.length>=2?nukes:sortedRoster.map(p=>p.name).filter(n=>!known.includes(n)));
    const filtered=selCompIsScramble?pool:pool.filter(n=>!usedInSelComp.includes(n));
    const matchups=getPairs(filtered).map(op=>{
      const nP=knownIsNuke?known:op, wP=knownIsNuke?op:known;
      const prob=calcProb(nP,wP,selComp);
      return {nPair:nP,wPair:wP,prob,diff:Math.abs(prob-0.5),nHcp:teamHcp(nP,allow),wHcp:teamHcp(wP,allow)};
    });
    if(!matchups.length) return [];
    const byComp=[...matchups];
    byComp.sort((a,b)=>a.diff-b.diff); const mostComp=byComp[0];
    const byNuke=[...matchups].sort((a,b)=>b.prob-a.prob); const nukeStamp=byNuke[0];
    const byWhale=[...matchups].sort((a,b)=>a.prob-b.prob); const whaleStamp=byWhale[0];
    const nextFor=(base,sorted)=>{const alt=sorted.filter(m=>m!==base);if(!alt.length)return null;return{pair:knownIsNuke?alt[0].wPair:alt[0].nPair,prob:alt[0].prob,diffFromBest:Math.abs(alt[0].prob-base.prob)};};
    return [
      {label:"Most Competitive",emoji:"⚖️",np:mostComp.nPair,wp:mostComp.wPair,prob:mostComp.prob,nHcp:mostComp.nHcp,wHcp:mostComp.wHcp,color:"rgba(74,222,128,0.8)",bg:"rgba(74,222,128,0.04)",border:"rgba(74,222,128,0.2)",nextBest:nextFor(mostComp,byComp)},
      {label:nukeStamp.prob>=0.6?"☢️ Nuke Stomp":"Most Nuke-Favored",emoji:"☢️",np:nukeStamp.nPair,wp:nukeStamp.wPair,prob:nukeStamp.prob,nHcp:nukeStamp.nHcp,wHcp:nukeStamp.wHcp,color:"rgba(255,69,0,0.8)",bg:"rgba(255,69,0,0.04)",border:"rgba(255,69,0,0.2)",nextBest:nextFor(nukeStamp,byNuke)},
      {label:whaleStamp.prob<=0.4?"🐋 Whale Stomp":"Most Whale-Favored",emoji:"🐋",np:whaleStamp.nPair,wp:whaleStamp.wPair,prob:whaleStamp.prob,nHcp:whaleStamp.nHcp,wHcp:whaleStamp.wHcp,color:"rgba(0,170,255,0.8)",bg:"rgba(0,170,255,0.04)",border:"rgba(0,170,255,0.2)",nextBest:nextFor(whaleStamp,byWhale)},
    ];
  })();

  const saveMatchup = (m) => {
    if(!selComp) return;
    try {
      const isScr=isScrambleGroup(selComp.id);
      const cid=isScr?SCRAMBLE_KEY:selComp.id;
      const current=savedMatchups[cid]||[];
      if(current.length>=maxSlots) return;
      const pts=getCompPts(selComp);
      const entry={np:m.np,wp:m.wp,prob:m.prob,nHcp:m.nHcp,wHcp:m.wHcp,label:m.label,compId:cid,pointsWorth:pts,isScramble:isScr};
      setSavedMatchups(s=>{const next={...s,[cid]:[...current,entry]};try{sessionStorage.setItem("nwi_mock_saved",JSON.stringify(next));}catch(e){}return next;});
      setSelNukes([]); setSelWhales([]); // clear after save
    } catch(e){console.log("save error:",e);}
  };

  const deleteMatchup=(cid,idx)=>setSavedMatchups(s=>{const next={...s,[cid]:(s[cid]||[]).filter((_,i)=>i!==idx)};try{sessionStorage.setItem("nwi_mock_saved",JSON.stringify(next));}catch(e){}return next;});

  const assign=(name,team)=>{
    setUnassigned(u=>u.filter(n=>n!==name));
    setNukes(n=>n.filter(n2=>n2!==name));
    setWhales(w=>w.filter(n=>n!==name));
    if(team==="nukes") setNukes(n=>[...n,name]);
    if(team==="whales") setWhales(w=>[...w,name]);
    if(team==="none") setUnassigned(u=>[...u,name]);
    setSelNukes([]); setSelWhales([]);
  };

  const sortPlayers=(players,by)=>[...players].sort((a,b)=>{
    if(by==="alpha") return a.localeCompare(b);
    if(by==="hcp") return getHandicap(a)-getHandicap(b);
    const sa=getPlayerStats(a),sb=getPlayerStats(b);
    if(by==="record") return sb.w-sa.w||sb.t-sa.t||sa.l-sb.l;
    if(by==="winRate") return (sb.total?(sb.w+sb.t*0.5)/sb.total:0)-(sa.total?(sa.w+sa.t*0.5)/sa.total:0);
    if(by==="ptsRate") return (sb.ptsAvail?sb.pts/sb.ptsAvail:0)-(sa.ptsAvail?sa.pts/sa.ptsAvail:0);
    return 0;
  });

  // PhotoAvatar and SortSelect defined at top level (outside component)

  // Sort non-scramble comps by order they appear in rounds/matchups tab
  const roundsCompNames = [];
  (rounds||[]).forEach(r=>{
    const n=r.competitionName||"";
    if(n&&!roundsCompNames.includes(n)) roundsCompNames.push(n);
    (r.matchups||[]).forEach(m=>{
      const mn=m.competitionName||"";
      if(mn&&!roundsCompNames.includes(mn)) roundsCompNames.push(mn);
    });
  });
  const sortedNonScramble = [...nonScrambleTeamComps].sort((a,b)=>{
    const ai=roundsCompNames.indexOf(a.name);
    const bi=roundsCompNames.indexOf(b.name);
    const ao=ai>=0?ai:(compOrder[a.id]??999);
    const bo=bi>=0?bi:(compOrder[b.id]??999);
    return ao-bo;
  });
  // Explorer competition options (non-scramble + single "Scramble" entry)
  const explorerComps=[
    ...sortedNonScramble,
    ...(hasScramble?[{id:SCRAMBLE_KEY,name:"Scramble",icon:"🏌️",_scramble:true}]:[]),
  ];
  // When scramble is selected in explorer, use first scramble comp for hcp calc
  const effectiveComp = selComp?.id===SCRAMBLE_KEY ? scrambleComps[0] : selComp;

  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{fontSize:22,fontWeight:900,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>🃏 Mock Draft</div>
      <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:20}}>Build your mock draft and explore optimal matchups. Nothing saves to the app.</div>

      {/* ══ STEP 1 ══════════════════════════════════════════════════════════ */}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,letterSpacing:"0.04em",textTransform:"uppercase"}}>Step 1 — Assign Players</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>Assign everyone to a team before exploring matchups</div>
          </div>
          <SortSelect value={assignSort} onChange={setAssignSort}/>
        </div>

        {unassigned.length>0&&(
          <div style={{marginBottom:12,display:"flex",flexDirection:"column",gap:4}}>
            {sortPlayers(unassigned,assignSort).map(name=>{
              const s=getPlayerStats(name);
              return (
                <div key={name} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8}}>
                  <PhotoAvatar roster={roster} name={name} size={26}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600}}>{name}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>HCP {getHandicap(name)}&nbsp;&nbsp;<span style={{color:"rgba(255,255,255,0.25)"}}>|</span>&nbsp;&nbsp;{s.w}W{s.t>0?` · ${s.t}T`:""} · {s.l}L</div>
                  </div>
                  <button onClick={()=>assign(name,"nukes")} style={{padding:"3px 8px",background:"rgba(255,69,0,0.15)",border:"1px solid rgba(255,69,0,0.3)",borderRadius:5,color:"#ff4500",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer"}}>☢️</button>
                  <button onClick={()=>assign(name,"whales")} style={{padding:"3px 8px",background:"rgba(0,170,255,0.15)",border:"1px solid rgba(0,170,255,0.3)",borderRadius:5,color:"#00aaff",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer"}}>🐋</button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[["nukes","☢️ Nukes","#ff4500","rgba(255,69,0,0.08)","rgba(255,69,0,0.25)",nukes],["whales","🐋 Whales","#00aaff","rgba(0,170,255,0.06)","rgba(0,170,255,0.2)",whales]].map(([team,label,color,bg,border,players])=>(
            <div key={team} style={{padding:"8px 10px",background:bg,border:`1px solid ${border}`,borderRadius:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{fontSize:10,color,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>{players.length} players</div></div>
              {players.length===0?<div style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>None yet</div>:players.map(name=>(
                <div key={name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <PhotoAvatar roster={roster} name={name} size={18}/>
                    <span style={{fontSize:11,fontWeight:600}}>{name}</span>
                  </div>
                  <button onClick={()=>assign(name,"none")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:11}}>✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button onClick={()=>{setNukes([]);setWhales([]);setUnassigned(sortedRoster.map(p=>p.name));setSelNukes([]);setSelWhales([]);setSavedMatchups({});setPtsOverride({});try{["nwi_mock_saved","nwi_mock_nukes","nwi_mock_whales","nwi_mock_pts"].forEach(k=>sessionStorage.removeItem(k));}catch(e){}}}
          style={{width:"100%",padding:"8px",background:"rgba(255,140,0,0.12)",border:"1px solid rgba(255,140,0,0.35)",borderRadius:8,color:"#ff8c00",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"}}>
          🔄 Reset All Players
        </button>
      </div>

      {/* ══ STEP 2 ══════════════════════════════════════════════════════════ */}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px",marginBottom:20}}>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:800,letterSpacing:"0.04em",textTransform:"uppercase"}}>Step 2 — Matchup Explorer</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>Select a competition, then tap up to 2 players per side to build a matchup or choose from suggested pairings below</div>
        </div>

        {explorerComps.length===0?(
          <div style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>No team competitions flagged — set them in Admin → Settings</div>
        ):(
          <div style={{marginBottom:12}}>
            <CustomPicker setModalPicker={setModalPicker}
              label="— Select competition —"
              value={selComp?.id||""}
              options={explorerComps.map(c=>({value:c.id,label:`${c.icon||"🏅"} ${c.name} · ${c.id===SCRAMBLE_KEY?((Number(ptsOverride[`${SCRAMBLE_KEY}_f9`]||"")||defaultPts)+(Number(ptsOverride[`${SCRAMBLE_KEY}_b9`]||"")||defaultPts)+(Number(ptsOverride[`${SCRAMBLE_KEY}_18`]||"")||defaultPts*2))+" pts (F9+B9+18)":getCompPts(c)+" pts"}`}))}
              onSelect={v=>{
                const found=explorerComps.find(c=>c.id===v)||null;
                setSelComp(found); setSelNukes([]); setSelWhales([]);
              }}
              color="#ffd700"
            />
          </div>
        )}

        {selComp&&(
          <>
            {selComp.id===SCRAMBLE_KEY&&(
              <div style={{marginBottom:10,padding:"8px 12px",background:"rgba(255,200,0,0.06)",border:"1px solid rgba(255,200,0,0.2)",borderRadius:8}}>
                <div style={{fontSize:11,color:"#ffd700",fontWeight:700,marginBottom:4}}>🏌️ Scramble — One pairing, three sub-matches</div>
                <div style={{display:"flex",gap:12,fontSize:11,color:"rgba(255,255,255,0.5)"}}>
                  <span>Front 9: {defaultPts} pts</span>
                  <span>Back 9: {defaultPts} pts</span>
                  <span>Full 18: {defaultPts*2} pts</span>
                  <span style={{color:"#ffd700",fontWeight:700}}>Total: {defaultPts*4} pts</span>
                </div>
              </div>
            )}

            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Tap to select · max 2 per side</div>
              <SortSelect value={explorerSort} onChange={setExplorerSort}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {[
                ["nukes","☢️ Nukes","#ff4500","rgba(255,69,0,0.08)","rgba(255,69,0,0.2)",nukes.length>0?nukes:sortedRoster.map(p=>p.name),selNukes,setSelNukes],
                ["whales","🐋 Whales","#00aaff","rgba(0,170,255,0.06)","rgba(0,170,255,0.15)",whales.length>0?whales:sortedRoster.map(p=>p.name),selWhales,setSelWhales],
              ].map(([team,label,color,bg,border,players,sel,setSel])=>(
                <div key={team} style={{background:bg,border:`1px solid ${border}`,borderRadius:10,overflow:"hidden"}}>
                  <div style={{padding:"8px 10px",borderBottom:`1px solid ${border}`,fontSize:10,color,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
                  <div style={{padding:"6px",display:"flex",flexDirection:"column",gap:3,maxHeight:260,overflowY:"auto"}}>
                    {sortPlayers(players,explorerSort).map(name=>{
                      const isSelected=sel.includes(name);
                      const isUsed=!selCompIsScramble&&usedInSelComp.includes(name);
                      const canSelect=!isUsed&&(isSelected||sel.length<2);
                      const s=getPlayerStats(name);
                      const partnerWarn=sel.length===1&&!isSelected&&checkPartnerRepeat(sel[0],name);
                      return (
                        <div key={name} onClick={()=>{if(isUsed)return;if(isSelected)setSel(v=>v.filter(n=>n!==name));else if(sel.length<2)setSel(v=>[...v,name]);}}
                          style={{display:"flex",alignItems:"center",gap:6,padding:"6px 7px",borderRadius:7,
                            background:isSelected?`${color}22`:isUsed?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.03)",
                            border:`1px solid ${isSelected?color:"rgba(255,255,255,0.05)"}`,
                            opacity:isUsed?0.3:canSelect?1:0.5,cursor:isUsed?"not-allowed":canSelect?"pointer":"default"}}>
                          <PhotoAvatar roster={roster} name={name} size={24}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11,fontWeight:700,color:isSelected?color:"#e8edf3",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                            <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>
                              HCP {getHandicap(name)}&nbsp;<span style={{opacity:0.4}}>|</span>&nbsp;{s.w}W{s.t>0?` · ${s.t}T`:""} · {s.l}L
                            </div>
                          </div>
                          {isSelected&&<div style={{fontSize:13,color,flexShrink:0}}>✓</div>}
                          {isUsed&&<div style={{fontSize:9,color:"rgba(255,85,85,0.6)",flexShrink:0}}>used</div>}
                          {partnerWarn&&<div style={{fontSize:10,flexShrink:0}}>⚠️</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Live suggestions */}
            {suggestions&&suggestions.length>0&&suggestions.map((s,si)=>{
              const cid=selCompIsScramble?SCRAMBLE_KEY:selComp.id;
              const alreadySaved=(savedMatchups[cid]||[]).some(m=>JSON.stringify([...(m.np||[])].sort())===JSON.stringify([...s.np].sort())&&JSON.stringify([...(m.wp||[])].sort())===JSON.stringify([...s.wp].sort()));
              const compSlots=(savedMatchups[cid]||[]).length;
              const playerConflict=!alreadySaved&&!selCompIsScramble&&[...s.np,...s.wp].some(p=>usedInSelComp.includes(p));
              const repeat=checkRepeat(s.np,s.wp,cid);
              const partnerRepeatNuke=checkPartnerRepeat(s.np[0],s.np[1]);
              const partnerRepeatWhale=checkPartnerRepeat(s.wp[0],s.wp[1]);
              const nHist=getBlendedStats(s.np,effectiveComp?.name);
              const wHist=getBlendedStats(s.wp,effectiveComp?.name);
              const compPtsDisplay=selComp.id===SCRAMBLE_KEY?`${defaultPts}+${defaultPts}+${defaultPts*2} pts`:getCompPts(selComp)+" pts/win";
              return (
                <div key={si} style={{padding:"10px 12px",background:s.bg,border:`2px solid ${repeat?"rgba(255,200,0,0.5)":s.border}`,borderRadius:10,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:13,color:s.color,fontWeight:800,letterSpacing:"0.06em",textTransform:"uppercase"}}>{s.emoji} {s.label}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:1}}>{compPtsDisplay}</div>
                    </div>
                    <button onClick={()=>{if(!alreadySaved&&!playerConflict&&compSlots<maxSlots) saveMatchup(s);}}
                      style={{padding:"5px 12px",background:alreadySaved?"rgba(74,222,128,0.15)":playerConflict?"rgba(255,85,85,0.1)":"rgba(255,255,255,0.08)",border:`1px solid ${alreadySaved?"rgba(74,222,128,0.3)":playerConflict?"rgba(255,85,85,0.3)":"rgba(255,255,255,0.15)"}`,borderRadius:6,color:alreadySaved?"#4ade80":playerConflict?"#ff5555":"rgba(255,255,255,0.7)",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:alreadySaved||playerConflict||compSlots>=maxSlots?"default":"pointer",flexShrink:0}}>
                      {alreadySaved?"✓ Saved":playerConflict?"Player used":compSlots>=maxSlots?"Full":"+ Save"}
                    </button>
                  </div>
                  {repeat&&<div style={{fontSize:10,color:"#ffd700",marginBottom:4}}>⚠️ Repeat pairing detected</div>}
                  {partnerRepeatNuke&&<div style={{fontSize:10,color:"#ffd700",marginBottom:4}}>⚠️ {s.np[0]} & {s.np[1]} have been paired before</div>}
                  {partnerRepeatWhale&&<div style={{fontSize:10,color:"#ffd700",marginBottom:4}}>⚠️ {s.wp[0]} & {s.wp[1]} have been paired before</div>}
                  {playerConflict&&<div style={{fontSize:10,color:"#ff5555",marginBottom:4}}>🚫 Player already used in this competition</div>}
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{display:"flex",justifyContent:"center",gap:3,marginBottom:4}}>{s.np.map(n=><PhotoAvatar roster={roster} key={n} name={n} size={26}/>)}</div>
                      {s.np.map(n=><div key={n} style={{fontSize:11,fontWeight:700,color:"#ff4500",lineHeight:1.3}}>{n}</div>)}
                      <div style={{fontSize:17,fontWeight:900,color:"#ff4500",marginTop:3,lineHeight:1}}>{toOdds(s.prob)}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:2}}>{Math.round(s.prob*100)}% win · HCP {s.nHcp}</div>
                      {nHist&&<div style={{fontSize:9,color:"rgba(255,69,0,0.6)",marginTop:2}}>{nHist.w}W·{nHist.l}L ({nHist.pct}%){effectiveComp?` in ${effectiveComp.name}`:""}</div>}
                    </div>
                    <div style={{fontSize:10,fontWeight:900,color:"rgba(255,255,255,0.15)"}}>VS</div>
                    <div style={{textAlign:"center"}}>
                      <div style={{display:"flex",justifyContent:"center",gap:3,marginBottom:4}}>{s.wp.map(n=><PhotoAvatar roster={roster} key={n} name={n} size={26}/>)}</div>
                      {s.wp.map(n=><div key={n} style={{fontSize:11,fontWeight:700,color:"#00aaff",lineHeight:1.3}}>{n}</div>)}
                      <div style={{fontSize:17,fontWeight:900,color:"#00aaff",marginTop:3,lineHeight:1}}>{toOdds(1-s.prob)}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:2}}>{Math.round((1-s.prob)*100)}% win · HCP {s.wHcp}</div>
                      {wHist&&<div style={{fontSize:9,color:"rgba(0,170,255,0.6)",marginTop:2}}>{wHist.w}W·{wHist.l}L ({wHist.pct}%){effectiveComp?` in ${effectiveComp.name}`:""}</div>}
                    </div>
                  </div>
                  {s.nextBest&&(
                    <div style={{marginTop:8,padding:"5px 8px",background:"rgba(255,255,255,0.04)",borderRadius:6,fontSize:10,color:"rgba(255,255,255,0.35)"}}>
                      Next best: {s.nextBest.pair.join(" & ")} → {toOdds(s.nextBest.prob)} ({s.nextBest.diffFromBest<0.01?"similar":Math.round(s.nextBest.diffFromBest*100)+"% shift"})
                    </div>
                  )}
                </div>
              );
            })}
            {suggestions&&suggestions.length===0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.3)",textAlign:"center",padding:10}}>Not enough players to generate suggestions</div>}
            {!suggestions&&(selNukes.length>0||selWhales.length>0)&&<div style={{fontSize:12,color:"rgba(255,255,255,0.35)",textAlign:"center",padding:10}}>Select 2 players on at least one side</div>}
          </>
        )}
      </div>

      {/* ══ MATCHUP BOARD ═══════════════════════════════════════════════════ */}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px"}}>
        <div style={{fontSize:16,fontWeight:800,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:4}}>📋 Matchup Board</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:14}}>{maxSlots} slot{maxSlots!==1?"s":""} per competition · based on {Math.min(nukes.length,whales.length)||"?"} players per team</div>

        {boardEntries.map(entry=>{
          if(entry.type==="scramble"){
            const ms=savedMatchups[SCRAMBLE_KEY]||[];
            const slots=Math.max(maxSlots,ms.length);
            return (
              <div key="scramble" style={{marginBottom:14}}>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#ffd700",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>🏌️ Scramble</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {[["Front 9",`${SCRAMBLE_KEY}_f9`,defaultPts],["Back 9",`${SCRAMBLE_KEY}_b9`,defaultPts],["18-Holes",`${SCRAMBLE_KEY}_18`,defaultPts*2]].map(([lbl,key,def])=>(
                      <div key={key} style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{lbl}:</span>
                        <input type="number" min="0" step="0.5"
                          value={ptsOverride[key]!==undefined?ptsOverride[key]:def}
                          onChange={e=>setPtsOverride(p=>({...p,[key]:e.target.value}))}
                          style={{width:36,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:4,color:"#ffd700",fontFamily:"inherit",fontSize:11,fontWeight:700,textAlign:"center",padding:"2px 4px"}}/>
                        <span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>pts</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(slots,4)},1fr)`,gap:6}}>
                  {Array.from({length:slots}).map((_,i)=>{
                    const m=ms[i];
                    if(!m) return (
                      <div key={i} style={{padding:"10px",background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",minHeight:80}}>
                        <span style={{fontSize:16,color:"rgba(255,255,255,0.12)"}}>+</span>
                      </div>
                    );
                    const f9Pts=Number(ptsOverride[`${SCRAMBLE_KEY}_f9`]||"")||defaultPts;
                    const b9Pts=Number(ptsOverride[`${SCRAMBLE_KEY}_b9`]||"")||defaultPts;
                    const full18Pts=Number(ptsOverride[`${SCRAMBLE_KEY}_18`]||"")||defaultPts*2;
                    const totalPts=f9Pts+b9Pts+full18Pts;
                    const nExp=(m.prob*totalPts).toFixed(1);
                    const wExp=((1-m.prob)*totalPts).toFixed(1);
                    return (
                      <div key={i} style={{padding:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,position:"relative"}}>
                        <button onClick={()=>deleteMatchup(SCRAMBLE_KEY,i)} style={{position:"absolute",top:4,right:4,background:"none",border:"none",color:"rgba(255,85,85,0.5)",cursor:"pointer",fontSize:10}}>✕</button>
                        <div style={{display:"flex",justifyContent:"center",gap:2,marginBottom:2}}>{(m.np||[]).map(n=><PhotoAvatar roster={roster} key={n} name={n} size={18}/>)}</div>
                        {(m.np||[]).map(n=><div key={n} style={{fontSize:9,fontWeight:700,color:"#ff4500",textAlign:"center",lineHeight:1.2}}>{n}</div>)}
                        <div style={{fontSize:11,fontWeight:800,color:"#ff4500",textAlign:"center",margin:"2px 0"}}>{toOdds(m.prob)}</div>
                        <div style={{fontSize:9,color:"#ff4500",textAlign:"center",marginBottom:3}}>{nExp}pts exp</div>
                        {[[`Front 9`,`${SCRAMBLE_KEY}_f9`,defaultPts],[`Back 9`,`${SCRAMBLE_KEY}_b9`,defaultPts],[`18-Holes`,`${SCRAMBLE_KEY}_18`,defaultPts*2]].map(([lbl,key,def])=>{
                          const pts=Number(ptsOverride[key]||"")||def;
                          return (
                            <div key={lbl} style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"rgba(255,255,255,0.35)",marginBottom:1}}>
                              <span>{lbl}</span><span style={{color:"#ffd700",fontWeight:700}}>{pts}pts</span>
                            </div>
                          );
                        })}
                        <div style={{fontSize:8,color:"rgba(255,255,255,0.2)",textAlign:"center",margin:"2px 0"}}>vs</div>
                        <div style={{display:"flex",justifyContent:"center",gap:2,marginBottom:2}}>{(m.wp||[]).map(n=><PhotoAvatar roster={roster} key={n} name={n} size={18}/>)}</div>
                        {(m.wp||[]).map(n=><div key={n} style={{fontSize:9,fontWeight:700,color:"#00aaff",textAlign:"center",lineHeight:1.2}}>{n}</div>)}
                        <div style={{fontSize:11,fontWeight:800,color:"#00aaff",textAlign:"center",margin:"2px 0"}}>{toOdds(1-m.prob)}</div>
                        <div style={{fontSize:9,color:"#00aaff",textAlign:"center"}}>{wExp}pts exp</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          // Regular competition
          const comp=entry.comp;
          const ms=savedMatchups[comp.id]||[];
          const slots=Math.max(maxSlots,ms.length);
          return (
            <div key={comp.id} style={{marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:700,color:"#ffd700",letterSpacing:"0.06em",textTransform:"uppercase"}}>{comp.icon||"🏅"} {comp.name}</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>pts/win:</span>
                  <input type="number" min="0" step="0.5"
                    value={ptsOverride[comp.id]!==undefined?ptsOverride[comp.id]:getCompPts(comp)}
                    onChange={e=>setPtsOverride(p=>({...p,[comp.id]:e.target.value}))}
                    style={{width:38,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:4,color:"#ffd700",fontFamily:"inherit",fontSize:11,fontWeight:700,textAlign:"center",padding:"2px 4px"}}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(slots,4)},1fr)`,gap:6}}>
                {Array.from({length:slots}).map((_,i)=>{
                  const m=ms[i];
                  if(!m) return (
                    <div key={i} style={{padding:"10px",background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",minHeight:80}}>
                      <span style={{fontSize:16,color:"rgba(255,255,255,0.12)"}}>+</span>
                    </div>
                  );
                  const repeat=checkRepeat(m.np||[],m.wp||[],comp.id);
                  const allOther=ms.filter((_,idx)=>idx!==i).flatMap(x=>[...(x.np||[]),...(x.wp||[])]);
                  const conflict=[...(m.np||[]),...(m.wp||[])].some(p=>allOther.includes(p));
                  return (
                    <div key={i} style={{padding:"8px",background:"rgba(255,255,255,0.04)",border:`1px solid ${conflict?"rgba(255,140,0,0.5)":repeat?"rgba(255,200,0,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:8,position:"relative"}}>
                      {conflict&&<div style={{fontSize:8,color:"#ff8c00",marginBottom:2}}>⚠️ Conflict</div>}
                      {repeat&&!conflict&&<div style={{fontSize:8,color:"#ffd700",marginBottom:2}}>⚠️ Repeat</div>}
                      {(()=>{const pts=Number(ptsOverride[comp.id]||"")||getCompPts(comp);const nExp=(m.prob*pts).toFixed(1);const wExp=((1-m.prob)*pts).toFixed(1);return(<>
                      <div style={{display:"flex",justifyContent:"center",gap:2,marginBottom:2}}>{(m.np||[]).map(n=><PhotoAvatar roster={roster} key={n} name={n} size={18}/>)}</div>
                      {(m.np||[]).map(n=><div key={n} style={{fontSize:9,fontWeight:700,color:"#ff4500",textAlign:"center",lineHeight:1.2}}>{n}</div>)}
                      <div style={{fontSize:11,fontWeight:800,color:"#ff4500",textAlign:"center",margin:"2px 0"}}>{toOdds(m.prob)}</div>
                      <div style={{fontSize:9,color:"#ff4500",textAlign:"center",marginBottom:3}}>{nExp}pts exp</div>
                      <div style={{fontSize:8,color:"rgba(255,255,255,0.2)",textAlign:"center"}}>vs</div>
                      <div style={{display:"flex",justifyContent:"center",gap:2,margin:"2px 0"}}>{(m.wp||[]).map(n=><PhotoAvatar roster={roster} key={n} name={n} size={18}/>)}</div>
                      {(m.wp||[]).map(n=><div key={n} style={{fontSize:9,fontWeight:700,color:"#00aaff",textAlign:"center",lineHeight:1.2}}>{n}</div>)}
                      <div style={{fontSize:11,fontWeight:800,color:"#00aaff",textAlign:"center",margin:"2px 0"}}>{toOdds(1-m.prob)}</div>
                      <div style={{fontSize:9,color:"#00aaff",textAlign:"center"}}>{wExp}pts exp</div>
                      </>);})()}
                      <button onClick={()=>deleteMatchup(comp.id,i)} style={{position:"absolute",top:4,right:4,background:"none",border:"none",color:"rgba(255,85,85,0.5)",cursor:"pointer",fontSize:10}}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Team probability */}
        {(()=>{
          const all=Object.entries(savedMatchups).flatMap(([cid,ms])=>ms.map(m=>({...m,cid})));
          if(!all.length) return null;
          let nExp=0,wExp=0,tPts=0;
          all.forEach(m=>{
            const isScr=m.isScramble||m.cid===SCRAMBLE_KEY;
            const scrPts=(Number(ptsOverride[`${SCRAMBLE_KEY}_f9`]||"")||defaultPts)+(Number(ptsOverride[`${SCRAMBLE_KEY}_b9`]||"")||defaultPts)+(Number(ptsOverride[`${SCRAMBLE_KEY}_18`]||"")||defaultPts*2);
            const pts=isScr?scrPts:(Number(ptsOverride[m.cid]||"")||Number(m.pointsWorth)||defaultPts);
            nExp+=m.prob*pts; wExp+=(1-m.prob)*pts; tPts+=pts;
          });
          const nPct=tPts>0?Math.round((nExp/tPts)*100):50;
          return (
            <div style={{marginTop:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>📊 Projected Outcome</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                {[["☢️ Nukes","#ff4500","rgba(255,69,0,0.08)","rgba(255,69,0,0.25)",nPct,nExp],["🐋 Whales","#00aaff","rgba(0,170,255,0.08)","rgba(0,170,255,0.25)",100-nPct,wExp]].map(([label,color,bg,border,pct,exp])=>(
                  <div key={label} style={{padding:"12px",background:bg,border:`1px solid ${border}`,borderRadius:12,textAlign:"center"}}>
                    <div style={{fontSize:11,color,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>{label}</div>
                    <div style={{fontSize:30,fontWeight:900,color,lineHeight:1}}>{pct}%</div>
                    <div style={{fontSize:12,color,fontWeight:700,marginTop:3}}>{exp.toFixed(1)} pts</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>projected</div>
                  </div>
                ))}
              </div>
              <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden",display:"flex"}}>
                <div style={{width:`${nPct}%`,background:"#ff4500",transition:"width 0.5s"}}/>
                <div style={{flex:1,background:"#00aaff"}}/>
              </div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:6,textAlign:"center"}}>Based on {all.length} saved matchup{all.length!==1?"s":""}</div>
            </div>
          );
        })()}
      </div>

      {/* Modal picker */}
      {modalPicker&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={()=>setModalPicker(null)}>
          <div style={{background:"#0d1520",borderRadius:"16px",width:"100%",maxWidth:480,maxHeight:"75vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"16px 16px 10px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:14,fontWeight:700,color:modalPicker.color||"#e8edf3"}}>{modalPicker.label}</div>
              <button onClick={()=>setModalPicker(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:18,cursor:"pointer",padding:"0 4px"}}>✕</button>
            </div>
            <div style={{overflowY:"auto",flex:1}}>
              {modalPicker.current&&<div onClick={()=>{modalPicker.onSelect("");setModalPicker(null);}} style={{padding:"14px 16px",fontSize:13,color:"rgba(255,255,255,0.4)",borderBottom:"1px solid rgba(255,255,255,0.06)",cursor:"pointer"}}>— Clear selection —</div>}
              {modalPicker.options.map(opt=>(
                <div key={opt.value} onClick={()=>{modalPicker.onSelect(opt.value);setModalPicker(null);}}
                  style={{padding:"14px 16px",fontSize:13,fontWeight:600,color:opt.value===modalPicker.current?"#ffd700":"rgba(255,255,255,0.85)",background:opt.value===modalPicker.current?"rgba(255,200,0,0.08)":"transparent",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer"}}>
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherWidget({ location, tournamentDate }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setWeather(null);
    const fetchWeather = async () => {
      try {
        const parts = location.split(",").map(s => s.trim());
        const city  = parts[0] || "";
        const state = parts[1] || "";

        let lat = null, lon = null, matchedName = location;

        // Try US Census Bureau geocoder first — covers every US city/town
        if (city) {
          const censusUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=US&format=json&limit=1`;
          const censusRes = await fetch(censusUrl, { headers: { "User-Agent": "NuclearWhaleInvitational/1.0 contact@nwi.app" } });
          const censusData = await censusRes.json();
          if (censusData.length) {
            lat = parseFloat(censusData[0].lat);
            lon = parseFloat(censusData[0].lon);
            matchedName = censusData[0].display_name.split(",").slice(0,2).join(",").trim();
          }
        }

        // Fallback to Open-Meteo geocoding
        if (!lat) {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`);
          const geoData = await geoRes.json();
          if (geoData.results?.length) {
            const stateMatch = state ? geoData.results.find(r =>
              r.country_code === "US" &&
              r.admin1?.toLowerCase().includes(state.toLowerCase())
            ) : null;
            const best = stateMatch || geoData.results.find(r => r.country_code === "US") || geoData.results[0];
            lat = best.latitude;
            lon = best.longitude;
            matchedName = `${best.name}, ${best.admin1}`;
          }
        }

        if (!lat) { setLoading(false); return; }

        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7`);
        const wxData = await wxRes.json();
        setWeather({ ...wxData, matchedCity: matchedName });
      } catch(e) { console.log("Weather error:", e); }
      setLoading(false);
    };
    fetchWeather();
  }, [location]);

  const wxIcon = code => {
    if (code === 0) return "☀️";
    if (code <= 2) return "⛅";
    if (code <= 3) return "☁️";
    if (code <= 49) return "🌫️";
    if (code <= 59) return "🌦️";
    if (code <= 69) return "🌧️";
    if (code <= 79) return "🌨️";
    if (code <= 84) return "🌧️";
    if (code <= 99) return "⛈️";
    return "🌡️";
  };

  const wxDesc = code => {
    if (code === 0) return "Clear";
    if (code <= 2) return "Partly Cloudy";
    if (code <= 3) return "Cloudy";
    if (code <= 49) return "Foggy";
    if (code <= 59) return "Drizzle";
    if (code <= 69) return "Rain";
    if (code <= 79) return "Snow";
    if (code <= 84) return "Showers";
    if (code <= 99) return "Thunderstorm";
    return "Unknown";
  };

  if (!location) return null;

  return (
    <div style={{ textAlign:"left", marginBottom:24 }}>
      <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>
        🌤️ Weather · {weather?.matchedCity || location}
      </div>
      {loading ? (
        <div className="card" style={{ padding:16, textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.3)" }}>Loading forecast...</div>
      ) : weather ? (
        <div>
          <div className="card" style={{ padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:40 }}>{wxIcon(weather.current_weather?.weathercode)}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:28, fontWeight:900, color:"#e8edf3", lineHeight:1 }}>{Math.round(weather.current_weather?.temperature)}°F</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{wxDesc(weather.current_weather?.weathercode)} · Wind {Math.round(weather.current_weather?.windspeed)} mph</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
            {(weather.daily?.time||[]).map((date, i) => {
              const isTournament = tournamentDate && date === tournamentDate;
              const hi = Math.round(weather.daily.temperature_2m_max[i]);
              const lo = Math.round(weather.daily.temperature_2m_min[i]);
              const rain = weather.daily.precipitation_probability_max[i];
              const code = weather.daily.weathercode[i];
              const dayName = i === 0 ? "Today" : new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short" });
              return (
                <div key={date} className="card" style={{ flex:"0 0 auto", width:72, padding:"10px 6px", textAlign:"center",
                  borderColor:isTournament?"rgba(255,200,0,0.4)":undefined,
                  background:isTournament?"rgba(255,200,0,0.06)":undefined }}>
                  {isTournament && <div style={{ fontSize:8, color:"#ffd700", fontWeight:700, letterSpacing:"0.05em", marginBottom:3 }}>⛳ TRN</div>}
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>{dayName}</div>
                  <div style={{ fontSize:20 }}>{wxIcon(code)}</div>
                  <div style={{ fontSize:12, fontWeight:700, marginTop:4 }}>{hi}°</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>{lo}°</div>
                  {rain > 0 && <div style={{ fontSize:9, color:"#00aaff", marginTop:3 }}>💧{rain}%</div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding:16, textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.3)" }}>
          Could not load weather for "{location}"<br/>
          <span style={{ fontSize:11 }}>Try a city + state format, e.g. "Myrtle Beach, SC"</span>
        </div>
      )}
    </div>
  );
}

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
  const { data: fcmTokens }    = useCollection("fcm_tokens");
  const { data: votes }        = useCollection("votes");

  // Current year draft — maps playerName → team
  const currentYear = meta?.year || 2026;
  const currentDraft = drafts.find(d => d.year === currentYear) || drafts.find(d => d.year === String(currentYear));
  const teamAssign = currentDraft?.assignments || {};

  // Players active this tournament = those in the draft assignments
  const activePlayers = roster.filter(p => teamAssign[p.name]); // includes tbd

  const tournamentDate = new Date((meta?.date || "2026-08-13") + "T" + (meta?.startTime || "10:00") + ":00");

  // ── Analytics tracking ─────────────────────────────────────────────────────
  useEffect(() => {
    const sessionKey = "nwi_session_id";
    const sessionStartKey = "nwi_session_start";
    const sessionTabsKey = "nwi_session_tabs";
    const now = Date.now();
    const ua = navigator.userAgent;
    const deviceType = /iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "desktop";

    // Get or create session (30 min timeout)
    let sessionId = sessionStorage.getItem(sessionKey);
    const sessionStart = parseInt(sessionStorage.getItem(sessionStartKey) || "0");
    const isNewSession = !sessionId || (now - sessionStart) > 30 * 60 * 1000;

    if (isNewSession) {
      sessionId = Math.random().toString(36).slice(2);
      sessionStorage.setItem(sessionKey, sessionId);
      sessionStorage.setItem(sessionStartKey, String(now));
      sessionStorage.setItem(sessionTabsKey, "[]");
      // Log new session
      const logSession = async () => {
        try {
          const { db } = await import("../firebase/config");
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(db, "analytics", sessionId), {
            deviceId,
            deviceType,
            sessionId,
            startedAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            tabsVisited: ["leaderboard"],
            duration: 0,
          });
          console.log("analytics session logged:", sessionId);
        } catch(e) { console.log("analytics session error:", e); }
      };
      logSession();
    }
  }, []);

  // Track tab changes — use set (merge) so it works even if doc doesn't exist yet
  useEffect(() => {
    const sessionId = sessionStorage.getItem("nwi_session_id");
    if (!sessionId) return;
    (async () => {
      try {
        const { db } = await import("../firebase/config");
        const { doc, setDoc } = await import("firebase/firestore");
        const tabs = JSON.parse(sessionStorage.getItem("nwi_session_tabs") || "[]");
        if (!tabs.includes(tab)) tabs.push(tab);
        sessionStorage.setItem("nwi_session_tabs", JSON.stringify(tabs));
        const start = parseInt(sessionStorage.getItem("nwi_session_start") || "0");
        const duration = Math.round((Date.now() - start) / 1000);
        await setDoc(doc(db, "analytics", sessionId), {
          tabsVisited: tabs,
          lastActiveAt: new Date().toISOString(),
          duration,
        }, { merge: true });
      } catch(e) { console.log("analytics tab update error:", e); }
    })();
  }, [tab]);

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

  const [notifEnabled, setNotifEnabled] = useState(null);
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [showReview, setShowReview] = useState(null);
  const [notifToken, setNotifToken]     = useState(null);
  const [tokenKey, setTokenKey]         = useState(null);

  useEffect(() => {
    if (!messaging) return;

    // Stable device ID — never changes
    let deviceId = localStorage.getItem("nwi_device_id");
    if (!deviceId) { deviceId = Math.random().toString(36).slice(2); localStorage.setItem("nwi_device_id", deviceId); }

    // Instantly restore bell state from Firestore using stable device ID
    import("../firebase/hooks").then(({ firestore }) => {
      firestore.getDoc("notif_prefs", deviceId).then(pref => {
        setNotifEnabled(pref?.enabled !== false); // default true if no pref
      }).catch(() => setNotifEnabled(true));
    });

    const init = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") { setNotifEnabled(false); return; }
        const sw = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { updateViaCache:"none" });
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
        if (!token) return;
        setNotifToken(token);
        const key = token.slice(-20);
        setTokenKey(key);
        localStorage.setItem("nwi_token_key", key);
        const { firestore } = await import("../firebase/hooks");
        // Check pref using stable device ID
        const pref = await firestore.getDoc("notif_prefs", deviceId);
        if (pref?.enabled === false) {
          // User turned off — remove token, don't re-add
          try { await firestore.delete("fcm_tokens", key); } catch(e) {}
          setNotifEnabled(false);
        } else {
          // On — register token
          await firestore.set("fcm_tokens", key, { token, updatedAt: new Date().toISOString(), deviceId });
          await firestore.set("notif_prefs", deviceId, { enabled: true });
          setNotifEnabled(true);
        }
      } catch(e) {
        console.log("Notification init:", e.message);
      }
    };
    init();
    if (onMessage) onMessage(messaging, payload => console.log("Foreground:", payload));
  }, []);

  const toggleNotifications = async () => {
    const { firestore } = await import("../firebase/hooks");
    const deviceId = localStorage.getItem("nwi_device_id");
    if (notifEnabled) {
      if (tokenKey) {
        try { await firestore.delete("fcm_tokens", tokenKey); } catch(e) {}
      }
      if (deviceId) await firestore.set("notif_prefs", deviceId, { enabled: false });
      setNotifEnabled(false);
    } else {
      if (tokenKey && notifToken) {
        await firestore.set("fcm_tokens", tokenKey, { token: notifToken, updatedAt: new Date().toISOString(), deviceId });
      } else {
        const sw = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { updateViaCache:"none" });
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
        if (token) {
          const key = token.slice(-20);
          setNotifToken(token);
          setTokenKey(key);
          localStorage.setItem("nwi_token_key", key);
          await firestore.set("fcm_tokens", key, { token, updatedAt: new Date().toISOString(), deviceId });
        }
      }
      if (deviceId) await firestore.set("notif_prefs", deviceId, { enabled: true });
      setNotifEnabled(true);
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

  // ── Dynamic team colors ────────────────────────────────────────────────────
  const dynamicColors = (() => {
    if (!meta?.dynamicColors) return null;
    const nPts = teamPoints.nukes, wPts = teamPoints.whales;
    if (nPts === wPts) return { leading:"tied",   accent:"rgba(255,200,0,1)",    glow:"rgba(255,200,0,0.2)",   border:"rgba(255,200,0,0.5)",   bg:"rgba(255,200,0,0.06)" };
    if (nPts > wPts)  return { leading:"nukes",  accent:"rgba(255,69,0,1)",     glow:"rgba(255,69,0,0.25)",   border:"rgba(255,69,0,0.6)",    bg:"rgba(255,69,0,0.08)" };
    return                   { leading:"whales", accent:"rgba(0,170,255,1)",    glow:"rgba(0,170,255,0.25)",  border:"rgba(0,170,255,0.6)",   bg:"rgba(0,170,255,0.08)" };
  })();

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=Barlow:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    .tab-bar{display:flex;overflow-x:auto;gap:6px;padding:10px 12px;justify-content:flex-start;scrollbar-width:none;-webkit-overflow-scrolling:touch;background:linear-gradient(180deg,#0d1520,#07090e);border-bottom:1px solid rgba(255,255,255,0.06);}
    .tab-bar::-webkit-scrollbar{display:none;}
    @media(min-width:600px){.tab-bar{justify-content:center;flex-wrap:wrap;}}
    .tab-btn{flex-shrink:0;padding:7px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:rgba(255,255,255,0.45);font-family:inherit;font-size:12px;font-weight:600;letter-spacing:0.04em;cursor:pointer;transition:all 0.15s;white-space:nowrap;touch-action:manipulation;}
    .tab-btn.active{background:${dynamicColors ? dynamicColors.glow : 'rgba(255,255,255,0.12)'};border-color:${dynamicColors ? dynamicColors.accent : 'rgba(255,255,255,0.25)'};color:#fff;}
    .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;}
    .nuke-card{border-color:rgba(255,69,0,0.3)!important;box-shadow:0 0 20px rgba(255,69,0,0.1);}
    .whale-card{border-color:rgba(0,170,255,0.25)!important;box-shadow:0 0 20px rgba(0,170,255,0.08);}
    @keyframes flicker{0%,100%{text-shadow:0 0 6px rgba(255,69,0,0.4);}50%{text-shadow:0 0 3px rgba(255,106,0,0.3);}}
    @keyframes wave{0%,100%{text-shadow:0 0 6px rgba(0,170,255,0.4);}50%{text-shadow:0 0 3px rgba(0,204,255,0.3);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    @keyframes slideIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    .live-dot{width:7px;height:7px;border-radius:50%;background:${dynamicColors ? dynamicColors.accent : '#4ade80'};animation:pulse 1.5s infinite;display:inline-block;margin-right:6px;}
    .ghost-btn{padding:7px 14px;background:none;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:rgba(255,255,255,0.5);font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;}
    .lb-tab{padding:6px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:rgba(255,255,255,0.4);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
    .lb-tab.active{background:${dynamicColors ? dynamicColors.glow : 'rgba(255,255,255,0.1)'};border-color:${dynamicColors ? dynamicColors.accent : 'rgba(255,255,255,0.2)'};color:#fff;}
    table{width:100%;border-collapse:collapse;}
    th{font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.1em;text-transform:uppercase;padding:8px 8px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.07);}
    td{font-size:13px;padding:9px 8px;border-bottom:1px solid rgba(255,255,255,0.05);}
    tr:last-child td{border-bottom:none;}
    .player-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:0;}
    @media(min-width:500px){.player-modal-backdrop{align-items:center;padding:20px;}}
    .player-modal{background:#0d1520;border:1px solid rgba(255,255,255,0.1);border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:24px;max-height:85vh;overflow-y:auto;}
    @media(min-width:500px){.player-modal{border-radius:16px;}}
  `;

  return (
    <div style={{ minHeight:"100vh", background:"#07090e", color:"#e8edf3", fontFamily:"'Barlow Condensed',sans-serif" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background: dynamicColors ? `linear-gradient(180deg, #0d1520, ${dynamicColors.bg})` : "linear-gradient(180deg,#0d1520,#07090e)", borderBottom:`1px solid ${dynamicColors ? dynamicColors.border : "rgba(255,255,255,0.06)"}`, padding:"20px 16px 14px", transition:"all 1s ease" }}>
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
            <div className="card nuke-card" style={{ padding:"10px", textAlign:"center", boxShadow: dynamicColors?.leading==="nukes" ? `0 0 20px ${dynamicColors.glow}` : undefined, transition:"box-shadow 1s ease" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", marginBottom:2 }}>☢️ NUKES</div>
              <div style={{ fontSize:32, fontWeight:900, color:"#ff4500", lineHeight:1, animation:"flicker 3s infinite" }}>{teamPoints.nukes}</div>
              <div style={{ fontSize:10, color:"rgba(255,80,0,0.5)", marginTop:1 }}>POINTS</div>
            </div>
            <div style={{ textAlign:"center", fontSize:14, fontWeight:900, color:"rgba(255,255,255,0.15)" }}>VS</div>
            <div className="card whale-card" style={{ padding:"10px", textAlign:"center", boxShadow: dynamicColors?.leading==="whales" ? `0 0 20px ${dynamicColors.glow}` : undefined, transition:"box-shadow 1s ease" }}>
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
                    const magicNumber = Math.floor(totalPtsAvail/2)+1;
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
                          <div style={{ marginTop:12 }}>
                            {clinched ? (
                              <div style={{ fontSize:13, fontWeight:700, color:"#4ade80" }}>🏆 CLINCHED!</div>
                            ) : elim ? (
                              <div style={{ fontSize:13, fontWeight:700, color:"#ff5555" }}>❌ Eliminated</div>
                            ) : (
                              <div>
                                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:5 }}>
                                  <span style={{ fontSize:12, fontWeight:600 }}>{t.pts} pts · Need {magicNumber} to clinch · {Math.round((t.pts/totalPtsAvail)*100)}% of pts won</span>
                                </div>
                                <div style={{ height:8, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
                                  <div style={{ height:"100%", borderRadius:4, transition:"width 0.5s",
                                    background:TEAMS[t.team].color,
                                    width:`${Math.min(100, Math.round((t.pts/magicNumber)*100))}%`
                                  }}/>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {totalPtsAvail>0&&(
                  <div className="card" style={{ padding:"12px 16px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" }}>
                      {[["Total Pts",totalPtsAvail,"#ffd700"],["Pts Played",playedPts,"#4ade80"],["Pts Left",remainingPts,"#00aaff"]].map(([l,v,c])=>(
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
                                  <td>
                                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                      {p.photoURL
                                        ? <img src={p.photoURL} alt={p.name} style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
                                        : <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{p.name?.[0]}</div>}
                                      <div>
                                        <div style={{ fontWeight:700 }}>{p.name}</div>
                                        <div style={{ fontSize:10, color:tc?tc.color:"rgba(255,255,255,0.3)" }}>{tc?`${tc.emoji} ${p.team}`:"—"}</div>
                                      </div>
                                    </div>
                                  </td>
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
                                    <td>
                                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                        {rp?.photoURL
                                          ? <img src={rp.photoURL} alt={p.name} style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
                                          : <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{p.name?.[0]}</div>}
                                        <div style={{ fontWeight:700 }}>{p.name}</div>
                                      </div>
                                    </td>
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
        {tab==="matchups" && (() => {
          // ── Odds Model ──────────────────────────────────────────────────────
          // Get player handicap — default to 25-30 range if below 1
          const getHandicap = (name) => {
            const p = roster.find(r => r.name === name);
            const h = parseFloat(p?.handicap);
            if (!h || isNaN(h) || h <= 1) return 27; // scratch/plus default
            if (h > 50) return 36; // very high handicap default
            return h;
          };

          // Team handicap = 35% of lower + 15% of higher, adjusted by allowance %
          const teamHandicap = (players, allowancePct) => {
            if (!players?.length) return 18;
            const pct = (allowancePct || 100) / 100;
            const hcaps = players.map(n => getHandicap(n) * pct).sort((a,b)=>a-b);
            if (hcaps.length === 1) return Math.round(hcaps[0] * 0.5);
            return Math.round(hcaps[0] * 0.35 + hcaps[1] * 0.15);
          };

          // Get opponent-quality weighted win rate for a set of players
          // compName: if provided, filter to that competition only
          const getWeightedWinRateMatchups = (players, compName) => {
            if (!players?.length) return null;
            let weightedWins = 0, totalWeight = 0;
            history.forEach(yr => {
              (yr.matches||[]).forEach(m => {
                if (m.type === "heading" || !m.winner) return;
                if (compName) {
                  const mc = (m.roundName||m.competitionName||"").toLowerCase();
                  if (!mc.includes(compName.toLowerCase().split(" ")[0])) return;
                }
                const inN = players.some(p => (m.nukes||[]).includes(p));
                const inW = players.some(p => (m.whales||[]).includes(p));
                if (!inN && !inW) return;
                const oppTeam = inN ? "whales" : "nukes";
                const oppPlayers = m[oppTeam] || [];
                const oppAvgHcp = oppPlayers.length > 0
                  ? oppPlayers.map(n => getHandicap(n)).reduce((s,h)=>s+h,0) / oppPlayers.length
                  : 18;
                const weight = Math.max(0.5, 1 + (18 - oppAvgHcp) / 18);
                const pt = inN ? "nukes" : "whales";
                const won = m.winner === pt ? 1 : m.winner === "tie" ? 0.5 : 0;
                weightedWins += won * weight;
                totalWeight += weight;
              });
            });
            return totalWeight >= 2 ? weightedWins / totalWeight : null;
          };

          // Convert probability to American odds
          const toAmericanOdds = (prob) => {
            prob = Math.max(0.05, Math.min(0.95, prob));
            if (prob >= 0.5) {
              return `-${Math.round((prob / (1 - prob)) * 100)}`;
            } else {
              return `+${Math.round(((1 - prob) / prob) * 100)}`;
            }
          };

          // Adaptive odds model: blends handicap + all-time + competition-specific history
          const calcOdds = (nukes, whales, allowancePct, compName) => {
            const nukeHcp  = teamHandicap(nukes, allowancePct);
            const whaleHcp = teamHandicap(whales, allowancePct);
            const hcpDiff  = whaleHcp - nukeHcp;
            const hcpProb  = 0.5 + (hcpDiff * 0.03);

            // All-time opponent-weighted win rate
            const nAllTime = getWeightedWinRateMatchups(nukes, null);
            const wAllTime = getWeightedWinRateMatchups(whales, null);
            const hasAllTime = nAllTime !== null || wAllTime !== null;
            const nA = nAllTime ?? 0.5, wA = wAllTime ?? 0.5;
            const allTimeProb = hasAllTime ? (nA + wA > 0 ? nA / (nA + wA) : 0.5) : null;

            // Competition-specific win rate
            const nComp = compName ? getWeightedWinRateMatchups(nukes, compName) : null;
            const wComp = compName ? getWeightedWinRateMatchups(whales, compName) : null;
            const hasCompSpec = nComp !== null || wComp !== null;
            const nC = nComp ?? 0.5, wC = wComp ?? 0.5;
            const compSpecProb = hasCompSpec ? (nC + wC > 0 ? nC / (nC + wC) : 0.5) : null;

            // Blend based on available data
            let nukeProb;
            if (hasCompSpec && allTimeProb !== null) {
              nukeProb = hcpProb * 0.50 + allTimeProb * 0.25 + compSpecProb * 0.25;
            } else if (allTimeProb !== null) {
              nukeProb = hcpProb * 0.75 + allTimeProb * 0.25;
            } else {
              nukeProb = hcpProb;
            }

            const clampedProb = Math.max(0.1, Math.min(0.9, nukeProb));
            return {
              nukeProb: clampedProb,
              whaleProb: 1 - clampedProb,
              nukeOdds: toAmericanOdds(clampedProb),
              whaleOdds: toAmericanOdds(1 - clampedProb),
              nukeFav: clampedProb >= 0.5,
            };
          };

          return (
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
                    <div key={mi} className="card" style={{ padding:"14px", marginBottom:10, cursor:"pointer" }}
                      onClick={()=>setSelectedMatchup(selectedMatchup===`${round.id}-${mi}`?null:`${round.id}-${mi}`)}>
                      {m.competitionName&&<div style={{ fontSize:12, color:"#ffd700", marginBottom:8 }}>🏅 {m.competitionName} · {m.pointsWorth||round.pointsPerWin}pts</div>}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"center" }}>
                        <div style={{ background:m.winner==="nukes"?"rgba(255,69,0,0.15)":"rgba(255,69,0,0.05)", border:`1px solid ${m.winner==="nukes"?"rgba(255,69,0,0.4)":"rgba(255,69,0,0.15)"}`, borderRadius:10, padding:"10px", textAlign:"center" }}>
                          <div style={{ fontSize:16, marginBottom:3 }}>☢️</div>
                          {(m.nukes||[]).filter(n=>n&&n.trim()).map((n,ni)=>{
                            const p = roster.find(r=>r.name===n);
                            return (
                              <div key={ni} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:ni>0?6:0 }}>
                                {p?.photoURL
                                  ? <img src={p.photoURL} alt={n} style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
                                  : <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,69,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#ff4500", flexShrink:0 }}>{n?.[0]}</div>}
                                <div style={{ fontSize:13, fontWeight:700, color:"#ff4500" }}>{n}</div>
                              </div>
                            );
                          })}
                          {m.winner==="nukes"&&<div style={{ fontSize:10, color:"#ff4500", marginTop:4 }}>✓ WIN</div>}
                          {m.winner==="tie"&&<div style={{ fontSize:10, color:"#ffd700", marginTop:4 }}>TIE</div>}
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:12, fontWeight:900, color:"rgba(255,255,255,0.2)" }}>VS</div>
                        </div>
                        <div style={{ background:m.winner==="whales"?"rgba(0,170,255,0.15)":"rgba(0,170,255,0.05)", border:`1px solid ${m.winner==="whales"?"rgba(0,170,255,0.4)":"rgba(0,170,255,0.15)"}`, borderRadius:10, padding:"10px", textAlign:"center" }}>
                          <div style={{ fontSize:16, marginBottom:3 }}>🐋</div>
                          {(m.whales||[]).filter(n=>n&&n.trim()).map((n,ni)=>{
                            const p = roster.find(r=>r.name===n);
                            return (
                              <div key={ni} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:ni>0?6:0 }}>
                                {p?.photoURL
                                  ? <img src={p.photoURL} alt={n} style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
                                  : <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(0,170,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#00aaff", flexShrink:0 }}>{n?.[0]}</div>}
                                <div style={{ fontSize:13, fontWeight:700, color:"#00aaff" }}>{n}</div>
                              </div>
                            );
                          })}
                          {m.winner==="whales"&&<div style={{ fontSize:10, color:"#00aaff", marginTop:4 }}>✓ WIN</div>}
                          {m.winner==="tie"&&<div style={{ fontSize:10, color:"#ffd700", marginTop:4 }}>TIE</div>}
                        </div>
                      </div>
                      {(m.nukes||[]).length > 0 && (m.whales||[]).length > 0 && (() => {
                        const hasPlayers = (m.nukes||[]).filter(n=>n&&n.trim()).length > 0 && (m.whales||[]).filter(n=>n&&n.trim()).length > 0;
                        if (!hasPlayers) return null;
                        const allowance = (() => {
                          const comp = competitions?.find(c => c.name === round.competitionName || c.name === m.competitionName);
                          if (comp && meta?.hcpAllowances?.[comp.id] !== undefined) return meta.hcpAllowances[comp.id];
                          return 100;
                        })();
                        const isAdj = Number(allowance) < 100;
                        const odds = calcOdds(m.nukes, m.whales, Number(allowance), m.competitionName||round.competitionName||"");
                        const nukeHcp = teamHandicap(m.nukes, Number(allowance));
                        const whaleHcp = teamHandicap(m.whales, Number(allowance));
                        return (
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, padding:"6px 10px", background:"rgba(255,255,255,0.03)", borderRadius:8 }}>
                            <div style={{ textAlign:"center", flex:1 }}>
                              <span style={{ fontSize:13, fontWeight:800, color:odds.nukeFav?"#ff4500":"rgba(255,100,0,0.6)" }}>{odds.nukeOdds}</span>
                              <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:1 }}>Team HCP {nukeHcp}{isAdj?` (${allowance}%)`:"" }</div>
                            </div>
                            <div style={{ fontSize:9, color:"rgba(255,255,255,0.2)", textAlign:"center" }}>ODDS</div>
                            <div style={{ textAlign:"center", flex:1 }}>
                              <span style={{ fontSize:13, fontWeight:800, color:!odds.nukeFav?"#00aaff":"rgba(0,150,255,0.6)" }}>{odds.whaleOdds}</span>
                              <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:1 }}>Team HCP {whaleHcp}{isAdj?` (${allowance}%)`:"" }</div>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Player records panel — shows on tap */}
                      {selectedMatchup===`${round.id}-${mi}` && (m.nukes||[]).filter(n=>n&&n.trim()).length > 0 && (m.whales||[]).filter(n=>n&&n.trim()).length > 0 && (() => {
                        const allPlayers = [...(m.nukes||[]), ...(m.whales||[])];
                        const playerStats = allPlayers.map(name => {
                          let w=0,l=0,t=0;
                          history.forEach(yr => {
                            (yr.matches||[]).forEach(hm => {
                              if (hm.type==="heading"||!hm.winner) return;
                              const onNukes = (hm.nukes||[]).includes(name);
                              const onWhales = (hm.whales||[]).includes(name);
                              if (!onNukes && !onWhales) return;
                              const playerTeam = onNukes?"nukes":"whales";
                              if (hm.winner===playerTeam) w++;
                              else if (hm.winner==="tie") t++;
                              else l++;
                            });
                          });
                          return { name, w, l, t, total:w+l+t };
                        }).filter(p=>p.total>0);
                        if (!playerStats.length) return <div style={{ marginTop:8, fontSize:12, color:"rgba(255,255,255,0.25)", textAlign:"center" }}>No historical data yet</div>;
                        return (
                          <div style={{ marginTop:10, padding:"10px 12px", background:"rgba(255,255,255,0.04)", borderRadius:8 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
                              <span>Player</span>
                              <span>W · T · L</span>
                            </div>
                            {playerStats.map(p => (
                              <div key={p.name} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                                <span style={{ color:"rgba(255,255,255,0.7)" }}>
                                  {p.name}
                                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginLeft:6 }}>HCP {getHandicap(p.name)}</span>
                                </span>
                                <span style={{ color:"rgba(255,255,255,0.4)" }}>{p.w} · {p.t} · {p.l}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {!m.winner&&<div style={{ textAlign:"center", marginTop:6, fontSize:11, color:"rgba(255,255,255,0.2)" }}>PENDING · tap for stats</div>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          );
        })()}

        {/* ── COUNTDOWN ── */}
        {tab==="countdown" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:13, letterSpacing:"0.15em", color:"rgba(255,255,255,0.35)", textTransform:"uppercase", marginBottom:6 }}>Tournament Begins In</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)", marginBottom:12 }}>{meta?.date||"August 13, 2026"} · {meta?.startTime||"10:00"}</div>
            {(meta?.course || meta?.location) && (
              <div style={{ marginBottom:28, fontSize:13, color:"rgba(255,255,255,0.45)" }}>
                {meta?.course && <div style={{ fontWeight:700, color:"rgba(255,255,255,0.65)" }}>⛳ {meta.course}</div>}
                {meta?.location && <div style={{ marginTop:2 }}>📍 {meta.location}</div>}
              </div>
            )}
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
            <WeatherWidget location={meta?.weatherLocation || meta?.location} tournamentDate={meta?.date}/>
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
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>{c.desc}</div>
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
                          <span style={{ fontSize:12, color:"rgba(255,69,0,0.7)" }}>{nukePts}</span>
                          <span style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>–</span>
                          <span style={{ fontSize:12, color:"rgba(0,170,255,0.7)" }}>{whalePts}</span>
                          {matchCount>0&&<span style={{ fontSize:11, color:"rgba(255,255,255,0.25)" }}>· {matchCount} matches</span>}
                        </div>
                        {(h.course||h.location)&&(
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>
                            {h.course&&<span>⛳ {h.course}</span>}
                            {h.course&&h.location&&<span style={{ margin:"0 6px", opacity:0.4 }}>·</span>}
                            {h.location&&<span>📍 {h.location}</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)" }}>{isExp?"▲":"▼"}</div>
                    </div>
                    {h.reviewUnlocked && (
                      <div style={{ marginTop:10 }} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>setShowReview(h.id)}
                          style={{ width:"100%", padding:"8px", background:"linear-gradient(135deg,rgba(255,200,0,0.12),rgba(255,140,0,0.08))", border:"1px solid rgba(255,200,0,0.25)", borderRadius:8, color:"#ffd700", fontFamily:"inherit", fontSize:12, fontWeight:800, cursor:"pointer" }}>
                          🏆 {h.year} Year in Review
                        </button>
                      </div>
                    )}
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

        {/* ── SUPERLATIVES ── */}
        {tab==="superlatives" && (
          <SuperlativesTab meta={meta} roster={roster} votes={votes} drafts={drafts}/>
        )}

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

        {tab==="mockdraft" && (
          <MockDraftTab roster={roster} competitions={competitions} meta={meta} history={history} rounds={rounds} getHandicap={n=>{const p=roster.find(r=>r.name===n);const h=parseFloat(p?.handicap);if(!h||isNaN(h)||h<=1)return 27;if(h>50)return 36;return h;}}/>
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

      {/* ── YEAR IN REVIEW MODAL ── */}
      {showReview && (() => {
        const histYear = history?.find(h => h.id === showReview);
        if (!histYear) return null;
        const reviewYear = histYear.year;
        const review = histYear?.reviewData || {};

        // Calculate stats from current data
        const isNukeWin = histYear?.winner === "THE NUKES";
        const isWhaleWin = histYear?.winner === "THE WHALES";
        const winnerColor = isNukeWin ? "#ff4500" : isWhaleWin ? "#00aaff" : "#ffd700";
        const winnerEmoji = isNukeWin ? "☢️" : isWhaleWin ? "🐋" : "⏳";

        // Best/worst record from individual leaderboard for this specific year
        const yearMatches = histYear?.matches || [];
        const yearStats = {};
        yearMatches.forEach(m => {
          if (!m.winner) return;
          [...(m.nukes||[]), ...(m.whales||[])].filter(Boolean).forEach(name => {
            if (!yearStats[name]) yearStats[name] = { w:0, t:0, l:0 };
            const onNukes = (m.nukes||[]).includes(name);
            const playerTeam = onNukes ? "nukes" : "whales";
            if (m.winner === playerTeam) yearStats[name].w++;
            else if (m.winner === "tie") yearStats[name].t++;
            else yearStats[name].l++;
          });
        });
        const yearPlayers = Object.entries(yearStats).map(([name,s])=>({ name, ...s, total:s.w+s.t+s.l, pct: s.total>0?((s.w+s.t*0.5)/s.total):0 }))
          .filter(p=>p.total>0).sort((a,b)=>b.w-a.w||b.t-a.t||a.l-b.l);
        const bestPct = yearPlayers[0]?.pct;
        const worstPct = yearPlayers[yearPlayers.length-1]?.pct;
        const bestPlayers = yearPlayers.filter(p=>p.pct===bestPct);
        const worstPlayers = bestPct !== worstPct ? yearPlayers.filter(p=>p.pct===worstPct) : [];
        const getTeamEmoji = (name) => {
          // Look up team from the year's draft
          const yearDraft = drafts?.find(d => String(d.year) === String(reviewYear));
          const t = yearDraft?.assignments?.[name] || teamAssign[name];
          return t === "nukes" ? "☢️" : t === "whales" ? "🐋" : "";
        };

        // Hole in one winners this year
        const ledger = holePool?.find(h => h.id === "ledger");
        const holeWinners = (ledger?.winners || []).filter(w => String(w.year) === String(reviewYear));

        // Superlatives
        const superlatives = histYear?.superlatives || [];

        // Match counts
        const matches = histYear?.matches || [];
        const nukeWins = matches.filter(m => m.winner === "nukes").length;
        const whaleWins = matches.filter(m => m.winner === "whales").length;
        const ties = matches.filter(m => m.winner === "tie").length;
        const totalMatches = matches.filter(m => m.winner).length;

        return (
          <div className="player-modal-backdrop" onClick={()=>setShowReview(null)}>
            <div className="player-modal" onClick={e=>e.stopPropagation()} style={{ background:"#0a0f1a", border:"1px solid rgba(255,200,0,0.2)" }}>
              {/* Header */}
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:11, letterSpacing:"0.2em", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", marginBottom:6 }}>Nuclear Whale Invitational</div>
                <div style={{ fontSize:32, fontWeight:900, letterSpacing:"0.04em", background:"linear-gradient(90deg,#ff4500,#ffd700,#00aaff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{reviewYear} YEAR IN REVIEW</div>
                {(histYear?.course || histYear?.location) && (
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:6 }}>
                    {histYear.course && <span>⛳ {histYear.course}</span>}
                    {histYear.course && histYear.location && <span style={{ margin:"0 8px", opacity:0.4 }}>·</span>}
                    {histYear.location && <span>📍 {histYear.location}</span>}
                  </div>
                )}
              </div>

              {/* Winner */}
              <div style={{ textAlign:"center", padding:"16px", background:`rgba(${isNukeWin?"255,69,0":isWhaleWin?"0,170,255":"255,200,0"},0.08)`, border:`1px solid rgba(${isNukeWin?"255,69,0":isWhaleWin?"0,170,255":"255,200,0"},0.25)`, borderRadius:12, marginBottom:12 }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>🏆 Tournament Champion</div>
                <div style={{ fontSize:24, fontWeight:900, color:winnerColor }}>{winnerEmoji} {histYear?.winner || "TBD"}</div>
                <div style={{ fontSize:18, fontWeight:700, color:"rgba(255,255,255,0.6)", marginTop:4 }}>
                  <span style={{ color:"#ff4500" }}>{histYear?.nukes_pts || 0}</span>
                  <span style={{ color:"rgba(255,255,255,0.3)", margin:"0 8px" }}>–</span>
                  <span style={{ color:"#00aaff" }}>{histYear?.whales_pts || 0}</span>
                </div>
              </div>

              {/* Match record */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
                {[["☢️ Wins", nukeWins, "#ff4500"], ["🤝 Ties", ties, "#ffd700"], ["🐋 Wins", whaleWins, "#00aaff"]].map(([l,v,c])=>(
                  <div key={l} style={{ textAlign:"center", padding:"10px 6px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10 }}>
                    <div style={{ fontSize:22, fontWeight:900, color:c }}>{v}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Player Records */}
              {yearPlayers.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>👤 Player Records</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div style={{ padding:"10px 12px", background:"rgba(255,69,0,0.06)", border:"1px solid rgba(255,69,0,0.2)", borderRadius:10 }}>
                      <div style={{ fontSize:10, color:"#ff4500", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>☢️ Nukes</div>
                      {yearPlayers.filter(p => {
                        const d = drafts?.find(d=>String(d.year)===String(reviewYear));
                        return d?.assignments?.[p.name] === "nukes";
                      }).map(p=>(
                        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:600 }}>{p.name}</span>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{p.w}-{p.t}-{p.l}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:"10px 12px", background:"rgba(0,170,255,0.06)", border:"1px solid rgba(0,170,255,0.2)", borderRadius:10 }}>
                      <div style={{ fontSize:10, color:"#00aaff", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>🐋 Whales</div>
                      {yearPlayers.filter(p => {
                        const d = drafts?.find(d=>String(d.year)===String(reviewYear));
                        return d?.assignments?.[p.name] === "whales";
                      }).map(p=>(
                        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:600 }}>{p.name}</span>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{p.w}-{p.t}-{p.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Superlatives */}
              {superlatives.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>🏅 Superlatives</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {superlatives.map((s,i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8 }}>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{s.title}</div>
                        <div style={{ fontSize:13, fontWeight:700 }}>{getTeamEmoji(s.player)} {s.player}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hole in one */}
              {holeWinners.length > 0 && (
                <div style={{ marginBottom:12, padding:"12px", background:"rgba(255,200,0,0.06)", border:"1px solid rgba(255,200,0,0.2)", borderRadius:10 }}>
                  <div style={{ fontSize:11, color:"rgba(255,200,0,0.7)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>⛳ Hole-in-One</div>
                  {holeWinners.map((w,i) => (
                    <div key={i} style={{ fontSize:13, fontWeight:700, color:"#ffd700" }}>{w.name} · ${w.amount}</div>
                  ))}
                </div>
              )}

              <button onClick={()=>setShowReview(null)} style={{ width:"100%", padding:"12px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"rgba(255,255,255,0.5)", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", marginTop:4 }}>Close</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
