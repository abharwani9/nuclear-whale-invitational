// src/pages/AdminPanel.js
import { useState, useRef } from "react";
import { useCollection, useDocument, firestore } from "../firebase/hooks";
import { uploadToCloudinary } from "../cloudinary/config";
import { seedDatabase } from "../firebase/seed";
import AdminMedia from "./AdminMedia";

const ADMIN_CODES = ["nuke2026", "whale2026", "admin2026"];

const s = {
  label:    { fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 },
  input:    { background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, color:"#e8edf3", fontFamily:"inherit", fontSize:14, padding:"9px 12px", width:"100%", outline:"none" },
  select:   { background:"#1a2035", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, color:"#e8edf3", fontFamily:"inherit", fontSize:14, padding:"9px 12px", width:"100%", outline:"none" },
  card:     { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"18px 16px", marginBottom:10 },
  btnFire:  { padding:"9px 18px", background:"linear-gradient(135deg,#ff4500,#ff8c00)", border:"none", borderRadius:8, color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" },
  btnBlue:  { padding:"9px 18px", background:"linear-gradient(135deg,#0066cc,#00ccff)", border:"none", borderRadius:8, color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" },
  btnGhost: { padding:"8px 14px", background:"none", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, color:"rgba(255,255,255,0.6)", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer" },
  btnDanger:{ padding:"7px 12px", background:"rgba(220,30,30,0.15)", border:"1px solid rgba(220,30,30,0.4)", borderRadius:8, color:"#ff5555", fontFamily:"inherit", fontSize:12, cursor:"pointer" },
  row:      { display:"flex", gap:8, alignItems:"center" },
  grid2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  sectionTitle: { fontSize:18, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 },
};

const SECTIONS = [
  { id:"roster",       label:"Player Roster",    icon:"👤" },
  { id:"draft",        label:"Draft / Teams",    icon:"🎲" },
  { id:"rounds",       label:"Rounds",           icon:"⚔️"  },
  { id:"schedule",     label:"Schedule",         icon:"📅" },
  { id:"competitions", label:"Competitions",     icon:"🎯" },
  { id:"media",        label:"Media Vault",      icon:"🎬" },
  { id:"history",      label:"History",          icon:"📜" },
  { id:"rules",        label:"Rules",            icon:"📋" },
  { id:"settings",     label:"Settings",         icon:"⚙️"  },
];

export default function AdminPanel({ authed, onAuth, onBack }) {
  const [code, setCode]       = useState("");
  const [section, setSection] = useState("roster");
  const [toast, setToast]     = useState(null);
  const [seeding, setSeeding] = useState(false);

  const { data: roster }       = useCollection("roster");
  const { data: rounds }       = useCollection("rounds");
  const { data: schedule }     = useCollection("schedule");
  const { data: competitions } = useCollection("competitions");
  const { data: history }      = useCollection("history");
  const { data: rules }        = useCollection("rules", "order");
  const { data: meta }         = useDocument("meta", "tournament");
  const { data: drafts }       = useCollection("drafts");

  const showToast = (msg, err=false) => { setToast({msg,err}); setTimeout(()=>setToast(null), 3000); };
  const tryLogin  = () => {
    if (ADMIN_CODES.includes(code.trim())) { onAuth(); setCode(""); }
    else showToast("Invalid access code", true);
  };
  const handleSeed = async () => {
    if (!window.confirm("Populate with starter data? Only do once on fresh setup.")) return;
    setSeeding(true); await seedDatabase(); setSeeding(false);
  };

  if (!authed) return (
    <div style={{ minHeight:"100vh", background:"#07090e", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Barlow Condensed',sans-serif", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ ...s.card, width:"100%", maxWidth:360, textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#e8edf3", marginBottom:4 }}>ADMIN PANEL</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginBottom:24 }}>Nuclear Whale Invitational</div>
        <input type="password" placeholder="Enter access code" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryLogin()} style={{ ...s.input, marginBottom:12, textAlign:"center", letterSpacing:"0.12em" }}/>
        <button style={{ ...s.btnFire, width:"100%", marginBottom:10 }} onClick={tryLogin}>Unlock</button>
        <button style={{ ...s.btnGhost, width:"100%" }} onClick={onBack}>← Back to App</button>
        {toast&&<div style={{ marginTop:12, fontSize:13, color:toast.err?"#ff5555":"#4ade80" }}>{toast.msg}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#07090e", color:"#e8edf3", fontFamily:"'Barlow Condensed',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input:focus,select:focus,textarea:focus{border-color:rgba(255,255,255,0.3)!important;outline:none;}
        textarea{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#e8edf3;font-family:'Barlow',sans-serif;font-size:14px;padding:9px 12px;width:100%;resize:vertical;}
        .sec-btn{flex-shrink:0;padding:7px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:8px;color:rgba(255,255,255,0.45);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
        .sec-btn.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);color:#fff;}
      `}</style>

      <div style={{ background:"#0d1520", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"12px 16px" }}>
        <div style={{ maxWidth:720, margin:"0 auto", display:"flex", alignItems:"center", gap:10 }}>
          <button style={s.btnGhost} onClick={onBack}>← App</button>
          <div style={{ flex:1, fontSize:17, fontWeight:800 }}>☢️🐋 ADMIN PANEL</div>
          <button style={{ ...s.btnGhost, borderColor:"rgba(255,69,0,0.4)", color:"#ff4500", fontSize:11 }} onClick={handleSeed} disabled={seeding}>{seeding?"Seeding...":"⚡ Seed DB"}</button>
        </div>
      </div>

      <div style={{ background:"#0a0f1a", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"8px 16px", display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none" }}>
        {SECTIONS.map(sec=>(
          <button key={sec.id} className={`sec-btn${section===sec.id?" active":""}`} onClick={()=>setSection(sec.id)}>{sec.icon} {sec.label}</button>
        ))}
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 16px 60px" }}>
        {toast&&<div style={{ marginBottom:12, padding:"10px 14px", borderRadius:8, background:toast.err?"rgba(220,30,30,0.15)":"rgba(74,222,128,0.12)", border:`1px solid ${toast.err?"rgba(220,30,30,0.4)":"rgba(74,222,128,0.3)"}`, fontSize:14, color:toast.err?"#ff5555":"#4ade80" }}>{toast.msg}</div>}

        {section==="roster"       && <RosterSection roster={roster} showToast={showToast}/>}
        {section==="draft"        && <DraftSection roster={roster} drafts={drafts} showToast={showToast}/>}
        {section==="rounds"       && <RoundsSection rounds={rounds} roster={roster} drafts={drafts} competitions={competitions} meta={meta} showToast={showToast}/>}
        {section==="schedule"     && <ScheduleSection schedule={schedule} showToast={showToast}/>}
        {section==="competitions" && <CompetitionsSection competitions={competitions} showToast={showToast}/>}
        {section==="media"        && <AdminMedia showToast={showToast}/>}
        {section==="history"      && <HistorySection history={history} showToast={showToast}/>}
        {section==="rules"        && <RulesSection rules={rules} showToast={showToast}/>}
        {section==="settings"     && <SettingsSection meta={meta} showToast={showToast}/>}
      </div>
    </div>
  );
}

// ── MASTER ROSTER (no team assignment here) ────────────────────────────────
function RosterSection({ roster, showToast }) {
  const blank = { name:"", handicap:"", hometown:"", bio:"", photoURL:"" };
  const [form, setForm]     = useState(blank);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(null);
  const fileRef = useRef();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setProgress(0);
    try {
      const url = await uploadToCloudinary(file, "photo", setProgress);
      setForm(f => ({ ...f, photoURL: url }));
      showToast("Photo uploaded!");
    } catch(err) { showToast("Photo upload failed: " + err.message, true); }
    setUploading(false); setProgress(null);
  };

  const save = async () => {
    if (!form.name) return showToast("Name required", true);
    try {
      const data = { ...form, handicap: Number(form.handicap) || 0 };
      if (editing) { await firestore.update("roster", editing, data); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("roster", data); showToast("Player added to roster!"); }
      setForm(blank);
    } catch(e) { showToast("Error: " + e.message, true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>👤 Master Roster</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:16, fontFamily:"'Barlow',sans-serif" }}>
        All players who have ever played. Team assignments are done in <strong style={{ color:"#fff" }}>Draft / Teams</strong> per year.
      </div>

      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editing?"#ff8c00":"#4ade80" }}>{editing?"✏️ Edit Player":"➕ Add Player"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Name *</div><input style={s.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Full name"/></div>
          <div><div style={s.label}>Handicap</div><input style={s.input} type="number" value={form.handicap} onChange={e=>setForm(f=>({...f,handicap:e.target.value}))} placeholder="e.g. 12"/></div>
          <div><div style={s.label}>Hometown</div><input style={s.input} value={form.hometown} onChange={e=>setForm(f=>({...f,hometown:e.target.value}))} placeholder="e.g. Rochester, NY"/></div>
          <div>
            <div style={s.label}>Profile Photo</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload}/>
            {form.photoURL
              ? <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <img src={form.photoURL} alt="preview" style={{ width:40, height:40, borderRadius:"50%", objectFit:"cover" }}/>
                  <button style={s.btnGhost} onClick={()=>fileRef.current.click()} disabled={uploading}>Change</button>
                  <button style={s.btnDanger} onClick={()=>setForm(f=>({...f,photoURL:""}))}>✕</button>
                </div>
              : <button style={{ ...s.btnGhost, width:"100%" }} onClick={()=>fileRef.current.click()} disabled={uploading}>
                  {uploading ? `Uploading ${progress}%...` : "📷 Upload Photo"}
                </button>
            }
            {progress!==null&&<div style={{ height:4, background:"rgba(255,255,255,0.08)", borderRadius:2, marginTop:6, overflow:"hidden" }}><div style={{ height:"100%", width:`${progress}%`, background:"#ff4500", borderRadius:2, transition:"width 0.2s" }}/></div>}
          </div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Bio</div><textarea rows={2} value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} placeholder="Fun facts, past wins, nickname..."/></div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={save}>{editing?"Save Changes":"Add to Roster"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(blank);}}>Cancel</button>}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:4 }}>
        {[...roster].sort((a,b)=>a.name.localeCompare(b.name)).map(p=>(
          <div key={p.id} style={{ ...s.card, padding:"11px 14px", display:"flex", alignItems:"center", gap:10 }}>
            {p.photoURL
              ? <img src={p.photoURL} alt={p.name} style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover" }}/>
              : <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:"rgba(255,255,255,0.4)" }}>{p.name?.[0]}</div>
            }
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>{p.name}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>HCP {p.handicap}{p.hometown?` · ${p.hometown}`:""}</div>
            </div>
            <div style={s.row}>
              <button style={s.btnGhost} onClick={()=>{setEditing(p.id);setForm({name:p.name,handicap:p.handicap||"",hometown:p.hometown||"",bio:p.bio||"",photoURL:p.photoURL||""});}}>Edit</button>
              <button style={s.btnDanger} onClick={async()=>{if(window.confirm("Remove from roster?"))await firestore.delete("roster",p.id);}}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DRAFT / TEAM ASSIGNMENTS PER YEAR ──────────────────────────────────────
function DraftSection({ roster, drafts, showToast }) {
  const blankForm = { year: new Date().getFullYear().toString(), notes: "" };
  const [form, setForm]           = useState(blankForm);
  const [editing, setEditing]     = useState(null);
  const [assignments, setAssignments] = useState({});  // name → "nukes"|"whales"|"out"

  const startEdit = (d) => {
    setEditing(d.id);
    setForm({ year: d.year, notes: d.notes || "" });
    // Pre-fill: everyone in roster starts as "out", override with saved
    const init = {};
    roster.forEach(p => { init[p.name] = "out"; });
    Object.entries(d.assignments || {}).forEach(([n, t]) => { init[n] = t; });
    setAssignments(init);
  };

  const startNew = () => {
    const init = {};
    roster.forEach(p => { init[p.name] = "out"; });
    setEditing("new");
    setForm(blankForm);
    setAssignments(init);
  };

  const save = async () => {
    if (!form.year) return showToast("Year required", true);
    // Only save players who are actually on a team
    const active = {};
    Object.entries(assignments).forEach(([n, t]) => { if (t !== "out") active[n] = t; });
    try {
      const data = { year: Number(form.year), notes: form.notes, assignments: active, updatedAt: new Date().toISOString() };
      if (editing && editing !== "new") { await firestore.update("drafts", editing, data); showToast("Draft saved!"); }
      else { await firestore.add("drafts", { ...data, createdAt: new Date().toISOString() }); showToast("Draft created!"); }
      setEditing(null); setAssignments({});
    } catch(e) { showToast("Error: " + e.message, true); }
  };

  const nukes  = roster.filter(p => assignments[p.name] === "nukes");
  const whales = roster.filter(p => assignments[p.name] === "whales");
  const out    = roster.filter(p => !assignments[p.name] || assignments[p.name] === "out");

  return (
    <div>
      <div style={s.sectionTitle}>🎲 Draft / Team Assignments</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:16, fontFamily:"'Barlow',sans-serif" }}>
        Assign players from the master roster to teams for each tournament year. Players not assigned are marked as not competing.
      </div>

      {!editing && <button style={{ ...s.btnFire, marginBottom:16 }} onClick={startNew}>+ New Draft Year</button>}

      {editing && (
        <div style={s.card}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:"#ff8c00" }}>✏️ {editing==="new"?"New Draft":"Edit Draft"}</div>
          <div style={s.grid2}>
            <div><div style={s.label}>Year</div><input style={s.input} type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))}/></div>
            <div><div style={s.label}>Notes</div><input style={s.input} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. snake draft"/></div>
          </div>

          <div style={{ marginTop:16 }}>
            <div style={s.label}>Assign Players</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginBottom:10 }}>Select a team for each player, or leave as "Not Playing"</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {roster.map(p => (
                <div key={p.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:`1px solid ${assignments[p.name]==="nukes"?"rgba(255,69,0,0.3)":assignments[p.name]==="whales"?"rgba(0,170,255,0.25)":"rgba(255,255,255,0.06)"}` }}>
                  {p.photoURL ? <img src={p.photoURL} alt={p.name} style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover" }}/> : <div style={{ width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800 }}>{p.name?.[0]}</div>}
                  <div style={{ flex:1, fontSize:14, fontWeight:600 }}>{p.name}</div>
                  <div style={{ display:"flex", gap:4 }}>
                    {[["nukes","☢️","#ff4500"],["whales","🐋","#00aaff"],["out","✗","rgba(255,255,255,0.3)"]].map(([val,emoji,color])=>(
                      <button key={val} onClick={()=>setAssignments(a=>({...a,[p.name]:val}))}
                        style={{ padding:"4px 10px", borderRadius:8, border:`1px solid ${assignments[p.name]===val?color:"rgba(255,255,255,0.1)"}`, background:assignments[p.name]===val?"rgba(255,255,255,0.1)":"none", color:assignments[p.name]===val?color:"rgba(255,255,255,0.35)", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" }}>
              {[["☢️ Nukes",nukes.length,"#ff4500"],["🐋 Whales",whales.length,"#00aaff"],["Not Playing",out.length,"rgba(255,255,255,0.3)"]].map(([l,n,c])=>(
                <div key={l} style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"10px 6px" }}>
                  <div style={{ fontSize:20, fontWeight:900, color:c }}>{n}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...s.row, marginTop:16 }}>
            <button style={s.btnFire} onClick={save}>Save Draft</button>
            <button style={s.btnGhost} onClick={()=>{setEditing(null);setAssignments({});}}>Cancel</button>
          </div>
        </div>
      )}

      {[...drafts].sort((a,b)=>b.year-a.year).map(d=>(
        <div key={d.id} style={{ ...s.card, padding:"13px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontSize:20, fontWeight:900, color:"rgba(255,255,255,0.15)", minWidth:48 }}>{d.year}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>{d.year} Draft</div>
              {d.notes&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{d.notes}</div>}
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:4 }}>
                ☢️ {Object.values(d.assignments||{}).filter(t=>t==="nukes").length} nukes · 🐋 {Object.values(d.assignments||{}).filter(t=>t==="whales").length} whales
              </div>
            </div>
            <div style={s.row}>
              <button style={s.btnGhost} onClick={()=>startEdit(d)}>Edit</button>
              <button style={s.btnDanger} onClick={async()=>{if(window.confirm("Delete draft?"))await firestore.delete("drafts",d.id);}}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ROUNDS ─────────────────────────────────────────────────────────────────
function RoundsSection({ rounds, roster, drafts, competitions, meta, showToast }) {
  const blankRound = { name:"", day:"Day 1", pointsPerWin:3, pointsPerTie:1.5, competitionName:"" };
  const [form, setForm]           = useState(blankRound);
  const [editingRound, setEditingRound] = useState(null);

  const currentYear = meta?.year || new Date().getFullYear();
  const currentDraft = drafts.find(d => d.year === currentYear || d.year === String(currentYear));
  const teamAssign = currentDraft?.assignments || {};
  const nukeNames  = roster.filter(p => teamAssign[p.name] === "nukes").map(p => p.name);
  const whaleNames = roster.filter(p => teamAssign[p.name] === "whales").map(p => p.name);
  const compNames  = competitions.map(c => c.name);

  const saveRound = async () => {
    if (!form.name) return showToast("Round name required", true);
    const data = { name:form.name, day:form.day, pointsPerWin:Number(form.pointsPerWin), pointsPerTie:Number(form.pointsPerTie), competitionName:form.competitionName||"" };
    try {
      if (editingRound) { await firestore.update("rounds",editingRound,data); showToast("Updated!"); setEditingRound(null); }
      else { await firestore.add("rounds",{...data,matchups:[]}); showToast("Round added!"); }
      setForm(blankRound);
    } catch(e) { showToast(e.message,true); }
  };

  const addMatchup = async (round) => {
    await firestore.update("rounds",round.id,{matchups:[...(round.matchups||[]),{nukes:["",""],whales:["",""],winner:null}]});
  };

  const updateMatchupPlayer = async (round, mi, side, idx, value) => {
    const updated = (round.matchups||[]).map((m,i)=>{
      if(i!==mi) return m;
      const arr=[...(m[side]||[""," "])]; arr[idx]=value; return {...m,[side]:arr};
    });
    await firestore.update("rounds",round.id,{matchups:updated});
  };

  const updateWinner = async (round, mi, winner) => {
    const updated = (round.matchups||[]).map((m,i)=>i===mi?{...m,winner}:m);
    await firestore.update("rounds",round.id,{matchups:updated});
    showToast("Result saved!");
  };

  const delMatchup = async (round, mi) => {
    await firestore.update("rounds",round.id,{matchups:(round.matchups||[]).filter((_,i)=>i!==mi)});
  };

  return (
    <div>
      <div style={s.sectionTitle}>⚔️ Rounds & Matchups</div>
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editingRound?"#ff8c00":"#4ade80" }}>{editingRound?"✏️ Edit Round":"➕ Add Round"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Round Name</div><input style={s.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Round 1"/></div>
          <div><div style={s.label}>Day</div>
            <select style={s.select} value={form.day} onChange={e=>setForm(f=>({...f,day:e.target.value}))}>
              <option>Day 1</option><option>Day 2</option><option>Day 3</option>
            </select>
          </div>
          <div><div style={s.label}>Points per Win</div><input style={s.input} type="number" step="0.5" value={form.pointsPerWin} onChange={e=>setForm(f=>({...f,pointsPerWin:e.target.value}))}/></div>
          <div><div style={s.label}>Points per Tie</div><input style={s.input} type="number" step="0.5" value={form.pointsPerTie} onChange={e=>setForm(f=>({...f,pointsPerTie:e.target.value}))}/></div>
        </div>
        <div style={{ marginTop:10 }}>
          <div style={s.label}>Competition (optional)</div>
          <select style={s.select} value={form.competitionName} onChange={e=>setForm(f=>({...f,competitionName:e.target.value}))}>
            <option value="">— None —</option>
            {compNames.map(n=><option key={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={saveRound}>{editingRound?"Save":"Add Round"}</button>
          {editingRound&&<button style={s.btnGhost} onClick={()=>{setEditingRound(null);setForm(blankRound);}}>Cancel</button>}
        </div>
      </div>

      {rounds.map(round=>(
        <div key={round.id} style={{ ...s.card, borderColor:"rgba(255,200,0,0.15)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:800 }}>{round.name} <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>{round.day}</span></div>
              <div style={{ fontSize:12, color:"#ffd700" }}>Win={round.pointsPerWin}pts · Tie={round.pointsPerTie}pts{round.competitionName?` · 🏅 ${round.competitionName}`:""}</div>
            </div>
            <button style={s.btnGhost} onClick={()=>{setEditingRound(round.id);setForm({name:round.name,day:round.day,pointsPerWin:round.pointsPerWin,pointsPerTie:round.pointsPerTie,competitionName:round.competitionName||""});}}>Edit</button>
            <button style={s.btnDanger} onClick={async()=>{if(window.confirm("Delete?"))await firestore.delete("rounds",round.id);}}>✕</button>
          </div>
          {(round.matchups||[]).map((m,mi)=>(
            <div key={mi} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"12px", marginBottom:8 }}>
              <div style={s.grid2}>
                <div>
                  <div style={{ fontSize:11, color:"#ff4500", marginBottom:5 }}>☢️ NUKES</div>
                  {[0,1].map(idx=>(
                    <select key={idx} style={{ ...s.select, marginBottom:5 }} value={(m.nukes||[])[idx]||""} onChange={e=>updateMatchupPlayer(round,mi,"nukes",idx,e.target.value)}>
                      <option value="">— Player —</option>
                      {nukeNames.map(n=><option key={n}>{n}</option>)}
                    </select>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#00aaff", marginBottom:5 }}>🐋 WHALES</div>
                  {[0,1].map(idx=>(
                    <select key={idx} style={{ ...s.select, marginBottom:5 }} value={(m.whales||[])[idx]||""} onChange={e=>updateMatchupPlayer(round,mi,"whales",idx,e.target.value)}>
                      <option value="">— Player —</option>
                      {whaleNames.map(n=><option key={n}>{n}</option>)}
                    </select>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Result:</div>
                {["nukes","tie","whales",null].map(w=>(
                  <button key={String(w)} onClick={()=>updateWinner(round,mi,w)}
                    style={{ padding:"4px 10px", borderRadius:8, border:`1px solid ${m.winner===w?(w==="nukes"?"#ff4500":w==="whales"?"#00aaff":w==="tie"?"#ffd700":"rgba(255,255,255,0.3)"):"rgba(255,255,255,0.1)"}`, background:m.winner===w?"rgba(255,255,255,0.08)":"none", color:m.winner===w?"#fff":"rgba(255,255,255,0.4)", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    {w==="nukes"?"☢️ Win":w==="whales"?"🐋 Win":w==="tie"?"🤝 Tie":"Pending"}
                  </button>
                ))}
                <button style={{ ...s.btnDanger, marginLeft:"auto", padding:"4px 10px" }} onClick={()=>delMatchup(round,mi)}>✕</button>
              </div>
            </div>
          ))}
          <button style={{ ...s.btnGhost, marginTop:4 }} onClick={()=>addMatchup(round)}>+ Add Matchup</button>
        </div>
      ))}
    </div>
  );
}

// ── SCHEDULE ────────────────────────────────────────────────────────────────
function ScheduleSection({ schedule, showToast }) {
  const blank = { day:"Day 1", time:"", event:"", icon:"⛳", course:"" };
  const [form, setForm]     = useState(blank);
  const [editing, setEditing] = useState(null);
  const save = async () => {
    if (!form.event||!form.time) return showToast("Time and event required",true);
    try {
      if (editing) { await firestore.update("schedule",editing,form); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("schedule",form); showToast("Added!"); }
      setForm(blank);
    } catch(e) { showToast(e.message,true); }
  };
  return (
    <div>
      <div style={s.sectionTitle}>📅 Schedule</div>
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editing?"#ff8c00":"#4ade80" }}>{editing?"✏️ Edit":"➕ Add Event"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Day</div><select style={s.select} value={form.day} onChange={e=>setForm(f=>({...f,day:e.target.value}))}><option>Day 1</option><option>Day 2</option><option>Day 3</option></select></div>
          <div><div style={s.label}>Time</div><input style={s.input} value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} placeholder="8:30 AM"/></div>
          <div><div style={s.label}>Icon</div><input style={s.input} value={form.icon} onChange={e=>setForm(f=>({...f,icon:e.target.value}))} placeholder="⛳"/></div>
          <div><div style={s.label}>Course Name</div><input style={s.input} value={form.course} onChange={e=>setForm(f=>({...f,course:e.target.value}))} placeholder="Pebble Beach"/></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Event</div><input style={s.input} value={form.event} onChange={e=>setForm(f=>({...f,event:e.target.value}))} placeholder="Event description"/></div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={save}>{editing?"Save":"Add"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(blank);}}>Cancel</button>}
        </div>
      </div>
      {["Day 1","Day 2","Day 3"].map(day=>{
        const items=schedule.filter(i=>i.day===day); if(!items.length) return null;
        return (
          <div key={day} style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>{day}</div>
            {items.map(item=>(
              <div key={item.id} style={{ ...s.card, padding:"10px 12px", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:16 }}>{item.icon}</span>
                <span style={{ color:"#ff8c00", fontWeight:700, minWidth:64, fontSize:13 }}>{item.time}</span>
                <div style={{ flex:1 }}><div>{item.event}</div>{item.course&&<div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>📍 {item.course}</div>}</div>
                <button style={s.btnGhost} onClick={()=>{setEditing(item.id);setForm({day:item.day,time:item.time,event:item.event,icon:item.icon||"",course:item.course||""});}}>Edit</button>
                <button style={s.btnDanger} onClick={async()=>{await firestore.delete("schedule",item.id);}}>✕</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── COMPETITIONS ────────────────────────────────────────────────────────────
function CompetitionsSection({ competitions, showToast }) {
  const blank = { name:"", icon:"🏅", desc:"", winner:"", winnerTeam:"nukes", detail:"" };
  const [form, setForm]     = useState(blank);
  const [editing, setEditing] = useState(null);
  const save = async () => {
    if (!form.name) return showToast("Name required",true);
    try {
      if (editing) { await firestore.update("competitions",editing,form); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("competitions",form); showToast("Added!"); }
      setForm(blank);
    } catch(e) { showToast(e.message,true); }
  };
  return (
    <div>
      <div style={s.sectionTitle}>🎯 Competitions</div>
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editing?"#ff8c00":"#4ade80" }}>{editing?"✏️ Edit":"➕ Add"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Name</div><input style={s.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div><div style={s.label}>Icon</div><input style={s.input} value={form.icon} onChange={e=>setForm(f=>({...f,icon:e.target.value}))}/></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Description</div><input style={s.input} value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/></div>
        <div style={s.grid2}>
          <div style={{ marginTop:10 }}><div style={s.label}>Leader / Winner</div><input style={s.input} value={form.winner} onChange={e=>setForm(f=>({...f,winner:e.target.value}))} placeholder="Player name"/></div>
          <div style={{ marginTop:10 }}><div style={s.label}>Their Team</div><select style={s.select} value={form.winnerTeam} onChange={e=>setForm(f=>({...f,winnerTeam:e.target.value}))}><option value="nukes">☢️ Nukes</option><option value="whales">🐋 Whales</option></select></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Detail</div><input style={s.input} value={form.detail} onChange={e=>setForm(f=>({...f,detail:e.target.value}))} placeholder="e.g. 4'2&quot;"/></div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={save}>{editing?"Save":"Add"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(blank);}}>Cancel</button>}
        </div>
      </div>
      {competitions.map(c=>(
        <div key={c.id} style={{ ...s.card, padding:"12px 14px", display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:22 }}>{c.icon}</span>
          <div style={{ flex:1 }}><div style={{ fontWeight:700 }}>{c.name}</div><div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{c.winner||"No result yet"}</div></div>
          <button style={s.btnGhost} onClick={()=>{setEditing(c.id);setForm({name:c.name,icon:c.icon,desc:c.desc,winner:c.winner||"",winnerTeam:c.winnerTeam||"nukes",detail:c.detail||""});}}>Edit</button>
          <button style={s.btnDanger} onClick={async()=>{await firestore.delete("competitions",c.id);}}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── HISTORY ─────────────────────────────────────────────────────────────────
function HistorySection({ history, showToast }) {
  const blank = { year:new Date().getFullYear()-1, winner:"THE NUKES", mvp:"", notes:"", nukes_pts:"", whales_pts:"" };
  const [form, setForm]     = useState(blank);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const save = async () => {
    try {
      const data = { ...form, year:Number(form.year), nukes_pts:Number(form.nukes_pts)||0, whales_pts:Number(form.whales_pts)||0 };
      if (editing) { await firestore.update("history",editing,data); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("history",{...data,matches:[],superlatives:[]}); showToast("Year added!"); }
      setForm(blank);
    } catch(e) { showToast(e.message,true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>📜 Tournament History</div>
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editing?"#ff8c00":"#4ade80" }}>{editing?"✏️ Edit Year":"➕ Add Year"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Year</div><input style={s.input} type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))}/></div>
          <div><div style={s.label}>Winner</div><select style={s.select} value={form.winner} onChange={e=>setForm(f=>({...f,winner:e.target.value}))}><option value="THE NUKES">☢️ THE NUKES</option><option value="THE WHALES">🐋 THE WHALES</option></select></div>
          <div><div style={s.label}>Nukes Points</div><input style={s.input} type="number" value={form.nukes_pts} onChange={e=>setForm(f=>({...f,nukes_pts:e.target.value}))}/></div>
          <div><div style={s.label}>Whales Points</div><input style={s.input} type="number" value={form.whales_pts} onChange={e=>setForm(f=>({...f,whales_pts:e.target.value}))}/></div>
          <div><div style={s.label}>MVP</div><input style={s.input} value={form.mvp} onChange={e=>setForm(f=>({...f,mvp:e.target.value}))} placeholder="Player name"/></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Notes</div><textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={save}>{editing?"Save":"Add Year"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(blank);}}>Cancel</button>}
        </div>
      </div>

      {[...history].sort((a,b)=>b.year-a.year).map(h=>(
        <div key={h.id} style={s.card}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:20, fontWeight:900, color:"rgba(255,255,255,0.15)", minWidth:46 }}>{h.year}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:h.winner==="THE NUKES"?"#ff4500":"#00aaff" }}>{h.winner}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>MVP: {h.mvp} · {h.nukes_pts}–{h.whales_pts}</div>
            </div>
            <button style={s.btnGhost} onClick={()=>setExpanded(expanded===h.id?null:h.id)}>{expanded===h.id?"▲":"▼"}</button>
            <button style={s.btnGhost} onClick={()=>{setEditing(h.id);setForm({year:h.year,winner:h.winner,mvp:h.mvp||"",notes:h.notes||"",nukes_pts:h.nukes_pts||"",whales_pts:h.whales_pts||""});}}>Edit</button>
            <button style={s.btnDanger} onClick={async()=>{if(window.confirm("Delete?"))await firestore.delete("history",h.id);}}>✕</button>
          </div>
          {expanded===h.id&&(
            <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
              <MatchesEditor year={h} showToast={showToast}/>
              <SuperlativesEditor year={h} showToast={showToast}/>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MatchesEditor({ year, showToast }) {
  const blankMatch = { nukes:["",""], whales:["",""], winner:null, roundName:"", pointsWorth:"" };
  const [form, setForm] = useState(blankMatch);

  const addMatch = async () => {
    const matches = [...(year.matches||[]), { ...form, pointsWorth:Number(form.pointsWorth)||0 }];
    await firestore.update("history",year.id,{matches});
    setForm(blankMatch); showToast("Match added!");
  };
  const remove = async (mi) => { await firestore.update("history",year.id,{matches:(year.matches||[]).filter((_,i)=>i!==mi)}); };
  const updateWinner = async (mi, winner) => { await firestore.update("history",year.id,{matches:(year.matches||[]).map((m,i)=>i===mi?{...m,winner}:m)}); };

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Match Results</div>
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:12, marginBottom:8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#4ade80", marginBottom:10 }}>+ Add Match</div>
        <div style={s.grid2}>
          <div><div style={{ fontSize:10, color:"#ff4500", marginBottom:4 }}>☢️ NUKES (2 players)</div>
            {[0,1].map(i=><input key={i} style={{ ...s.input, marginBottom:5 }} value={form.nukes[i]||""} onChange={e=>{const n=[...form.nukes];n[i]=e.target.value;setForm(f=>({...f,nukes:n}));}} placeholder={`Player ${i+1}`}/>)}
          </div>
          <div><div style={{ fontSize:10, color:"#00aaff", marginBottom:4 }}>🐋 WHALES (2 players)</div>
            {[0,1].map(i=><input key={i} style={{ ...s.input, marginBottom:5 }} value={form.whales[i]||""} onChange={e=>{const w=[...form.whales];w[i]=e.target.value;setForm(f=>({...f,whales:w}));}} placeholder={`Player ${i+1}`}/>)}
          </div>
          <div><div style={s.label}>Round Name</div><input style={s.input} value={form.roundName} onChange={e=>setForm(f=>({...f,roundName:e.target.value}))}/></div>
          <div><div style={s.label}>Points Worth</div><input style={s.input} type="number" value={form.pointsWorth} onChange={e=>setForm(f=>({...f,pointsWorth:e.target.value}))}/></div>
        </div>
        <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap", alignItems:"center" }}>
          <div style={s.label}>Winner:</div>
          {["nukes","tie","whales"].map(w=>(
            <button key={w} onClick={()=>setForm(f=>({...f,winner:w}))}
              style={{ padding:"4px 10px", borderRadius:8, border:`1px solid ${form.winner===w?(w==="nukes"?"#ff4500":w==="whales"?"#00aaff":"#ffd700"):"rgba(255,255,255,0.1)"}`, background:form.winner===w?"rgba(255,255,255,0.08)":"none", color:form.winner===w?"#fff":"rgba(255,255,255,0.4)", fontFamily:"inherit", fontSize:12, cursor:"pointer" }}>
              {w==="nukes"?"☢️ Nukes":w==="whales"?"🐋 Whales":"🤝 Tie"}
            </button>
          ))}
        </div>
        <button style={{ ...s.btnFire, marginTop:10, fontSize:12 }} onClick={addMatch}>+ Add Match</button>
      </div>
      {(year.matches||[]).map((m,mi)=>(
        <div key={mi} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, padding:"9px 10px", marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
            <span style={{ color:m.winner==="nukes"?"#ff4500":"rgba(255,255,255,0.5)" }}>☢️ {(m.nukes||[]).join(" & ")}</span>
            <span style={{ color:"rgba(255,255,255,0.2)" }}>vs</span>
            <span style={{ color:m.winner==="whales"?"#00aaff":"rgba(255,255,255,0.5)" }}>{(m.whales||[]).join(" & ")} 🐋</span>
            {m.winner==="tie"&&<span style={{ color:"#ffd700" }}>TIE</span>}
            <span style={{ color:"rgba(255,255,255,0.25)", fontSize:11, marginLeft:"auto" }}>{m.pointsWorth}pts</span>
            <button style={s.btnDanger} onClick={()=>remove(mi)}>✕</button>
          </div>
          <div style={{ display:"flex", gap:5, marginTop:6 }}>
            {["nukes","tie","whales"].map(w=>(
              <button key={w} onClick={()=>updateWinner(mi,w)}
                style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${m.winner===w?(w==="nukes"?"#ff4500":w==="whales"?"#00aaff":"#ffd700"):"rgba(255,255,255,0.08)"}`, background:"none", color:m.winner===w?"#fff":"rgba(255,255,255,0.35)", fontFamily:"inherit", fontSize:11, cursor:"pointer" }}>
                {w==="nukes"?"☢️":w==="whales"?"🐋":"🤝"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SuperlativesEditor({ year, showToast }) {
  const [title, setTitle] = useState(""); const [player, setPlayer] = useState("");
  const add = async () => {
    if (!title||!player) return;
    await firestore.update("history",year.id,{superlatives:[...(year.superlatives||[]),{title,player}]});
    setTitle(""); setPlayer(""); showToast("Added!");
  };
  const remove = async (si) => { await firestore.update("history",year.id,{superlatives:(year.superlatives||[]).filter((_,i)=>i!==si)}); };
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Superlatives / Awards</div>
      <div style={{ display:"flex", gap:6, marginBottom:8 }}>
        <input style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#e8edf3", fontFamily:"inherit", fontSize:13, padding:"7px 10px", outline:"none" }} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Award (e.g. MVP)"/>
        <input style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#e8edf3", fontFamily:"inherit", fontSize:13, padding:"7px 10px", outline:"none" }} value={player} onChange={e=>setPlayer(e.target.value)} placeholder="Player name"/>
        <button style={s.btnFire} onClick={add}>+</button>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {(year.superlatives||[]).map((sup,si)=>(
          <div key={si} style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 8px 3px 10px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20 }}>
            <span style={{ fontSize:12 }}>🏅 <strong>{sup.title}:</strong> {sup.player}</span>
            <button onClick={()=>remove(si)} style={{ background:"none", border:"none", color:"rgba(255,80,80,0.6)", cursor:"pointer", fontSize:14, paddingLeft:4 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RULES ────────────────────────────────────────────────────────────────────
function RulesSection({ rules, showToast }) {
  const blank = { title:"", body:"", order:rules.length+1 };
  const [form, setForm]     = useState(blank);
  const [editing, setEditing] = useState(null);
  const save = async () => {
    if (!form.title||!form.body) return showToast("Title and body required",true);
    try {
      if (editing) { await firestore.update("rules",editing,{...form,order:Number(form.order)}); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("rules",{...form,order:Number(form.order)}); showToast("Added!"); }
      setForm({...blank,order:rules.length+2});
    } catch(e) { showToast(e.message,true); }
  };
  return (
    <div>
      <div style={s.sectionTitle}>📋 Rules</div>
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editing?"#ff8c00":"#4ade80" }}>{editing?"✏️ Edit":"➕ Add Rule"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Title</div><input style={s.input} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
          <div><div style={s.label}>Order</div><input style={s.input} type="number" value={form.order} onChange={e=>setForm(f=>({...f,order:e.target.value}))}/></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Body</div><textarea rows={3} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))}/></div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={save}>{editing?"Save":"Add"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(blank);}}>Cancel</button>}
        </div>
      </div>
      {rules.map(r=>(
        <div key={r.id} style={{ ...s.card, padding:"12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", minWidth:18 }}>#{r.order}</div>
            <div style={{ flex:1, fontWeight:700 }}>{r.title}</div>
            <button style={s.btnGhost} onClick={()=>{setEditing(r.id);setForm({title:r.title,body:r.body,order:r.order});}}>Edit</button>
            <button style={s.btnDanger} onClick={async()=>{await firestore.delete("rules",r.id);}}>✕</button>
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.5, fontFamily:"'Barlow',sans-serif" }}>{r.body}</div>
        </div>
      ))}
    </div>
  );
}

// ── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsSection({ meta, showToast }) {
  const [form, setForm] = useState({ name:"", year:"", date:"", location:"", tagline:"" });
  const [loaded, setLoaded] = useState(false);
  if (meta&&!loaded) { setForm({ name:meta.name||"", year:meta.year||"", date:meta.date||"", location:meta.location||"", tagline:meta.tagline||"" }); setLoaded(true); }
  const save = async () => {
    try { await firestore.set("meta","tournament",{...form,year:Number(form.year)}); showToast("Saved!"); }
    catch(e) { showToast(e.message,true); }
  };
  return (
    <div>
      <div style={s.sectionTitle}>⚙️ Settings</div>
      <div style={s.card}>
        <div style={s.grid2}>
          <div><div style={s.label}>Year</div><input style={s.input} type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))}/></div>
          <div><div style={s.label}>Date</div><input style={s.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Location</div><input style={s.input} value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))}/></div>
        <div style={{ marginTop:10, padding:"12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8 }}>
          <div style={s.label}>App Password (all users)</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>Current: <strong style={{ color:"#ff4500" }}>nwi2026</strong> — to change, ask Claude to update APP_PASSWORD in PublicApp.js</div>
        </div>
        <div style={{ marginTop:10, padding:"12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8 }}>
          <div style={s.label}>Admin Codes</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}><strong style={{ color:"#ff4500" }}>nuke2026</strong> · <strong style={{ color:"#00aaff" }}>whale2026</strong> · <strong style={{ color:"#ffd700" }}>admin2026</strong></div>
        </div>
        <button style={{ ...s.btnFire, marginTop:14 }} onClick={save}>Save Settings</button>
      </div>
    </div>
  );
}
