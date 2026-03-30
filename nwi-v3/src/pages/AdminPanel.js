// src/pages/AdminPanel.js
import { useState, useRef, useEffect } from "react";
import { useCollection, useDocument, firestore } from "../firebase/hooks";
import { uploadToCloudinary } from "../cloudinary/config";
import { seedDatabase } from "../firebase/seed";
import AdminMedia from "./AdminMedia";

// ── DRAG-TO-REORDER HOOK ─────────────────────────────────────────────────────
// Saves all item orders to Firebase in one batch when drag ends
async function saveOrder(items, collection) {
  for (let i = 0; i < items.length; i++) {
    await firestore.update(collection, items[i].id, { order: i * 10 });
  }
}

function useDragList(initialItems) {
  const [items, setItems] = useState(initialItems);
  const dragIdx = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  // Keep in sync with Firebase updates
  useEffect(() => { setItems(initialItems); }, [JSON.stringify(initialItems.map(x=>x.id))]);

  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragEnter = (i) => {
    if (dragIdx.current === null || dragIdx.current === i) return;
    setItems(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIdx.current, 1);
      arr.splice(i, 0, moved);
      dragIdx.current = i;
      return arr;
    });
    setDragOver(i);
  };
  const onDragEnd = async (collection) => {
    dragIdx.current = null;
    setDragOver(null);
    await saveOrder(items, collection);
  };

  return { items, dragOver, onDragStart, onDragEnter, onDragEnd };
}

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
        {section==="history"      && <HistorySection history={history} drafts={drafts} roster={roster} competitions={competitions} rounds={rounds} meta={meta} showToast={showToast}/>}
        {section==="rules"        && <RulesSection rules={rules} showToast={showToast}/>}
        {section==="settings"     && <SettingsSection meta={meta} showToast={showToast}/>}
      </div>
    </div>
  );
}

// ── MASTER ROSTER (no team assignment here) ────────────────────────────────
function RosterSection({ roster, showToast }) {
  const blank = { name:"", handicap:"", hometown:"", nickname:"", bio:"", photoURL:"", favoriteClub:"", strengths:"", weaknesses:"", golferComparison:"", bestPartOfGame:"" };
  const [form, setForm]       = useState(blank);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(null);
  const [cropSrc, setCropSrc]     = useState(null);   // raw image for cropping
  const [cropFile, setCropFile]   = useState(null);   // raw file
  const fileRef  = useRef();
  const canvasRef = useRef();
  const imgRef    = useRef();
  const dragRef   = useRef({ dragging:false, lastX:0, lastY:0 });
  const cropState = useRef({ offsetX:0, offsetY:0, scale:1 });

  const openCropper = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCropFile(file);
    const reader = new FileReader();
    reader.onload = ev => { setCropSrc(ev.target.result); };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const drawCrop = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const size = canvas.width;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    // Draw circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
    ctx.clip();
    const { offsetX, offsetY, scale } = cropState.current;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, size/2 - w/2 + offsetX, size/2 - h/2 + offsetY, w, h);
    ctx.restore();
    // Dim outside circle
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
    ctx.clip();
    ctx.clearRect(0, 0, size, size);
    ctx.restore();
    // Redraw image inside circle only
    ctx.save();
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
    ctx.clip();
    ctx.drawImage(img, size/2 - w/2 + offsetX, size/2 - h/2 + offsetY, w, h);
    ctx.restore();
    // Circle border
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2-1, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const onImgLoad = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const size = canvas.width;
    const fitScale = Math.max(size/img.naturalWidth, size/img.naturalHeight);
    cropState.current = { offsetX:0, offsetY:0, scale:fitScale };
    drawCrop();
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    dragRef.current = { dragging:true, lastX: e.clientX || e.touches?.[0]?.clientX, lastY: e.clientY || e.touches?.[0]?.clientY };
  };
  const onMouseMove = (e) => {
    if (!dragRef.current.dragging) return;
    const x = e.clientX || e.touches?.[0]?.clientX;
    const y = e.clientY || e.touches?.[0]?.clientY;
    cropState.current.offsetX += x - dragRef.current.lastX;
    cropState.current.offsetY += y - dragRef.current.lastY;
    dragRef.current.lastX = x; dragRef.current.lastY = y;
    drawCrop();
  };
  const onMouseUp = () => { dragRef.current.dragging = false; };
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    cropState.current.scale = Math.max(0.2, Math.min(10, cropState.current.scale * delta));
    drawCrop();
  };
  const onZoom = (dir) => {
    cropState.current.scale = Math.max(0.2, Math.min(10, cropState.current.scale * (dir > 0 ? 1.15 : 0.87)));
    drawCrop();
  };

  const uploadCropped = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setUploading(true); setProgress(0);
    try {
      // Export square canvas as blob
      const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.92));
      const file = new File([blob], "profile.jpg", { type:"image/jpeg" });
      const url = await uploadToCloudinary(file, "photo", setProgress);
      setForm(f => ({ ...f, photoURL: url }));
      setCropSrc(null); setCropFile(null);
      showToast("Photo uploaded!");
    } catch(err) { showToast("Upload failed: " + err.message, true); }
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
          <div><div style={s.label}>Nickname (optional)</div><input style={s.input} value={form.nickname||""} onChange={e=>setForm(f=>({...f,nickname:e.target.value}))} placeholder={'e.g. "The Shark"' }/></div>
          <div><div style={s.label}>Handicap</div><input style={s.input} type="number" value={form.handicap} onChange={e=>setForm(f=>({...f,handicap:e.target.value}))} placeholder="e.g. 12"/></div>
          <div><div style={s.label}>Hometown</div><input style={s.input} value={form.hometown} onChange={e=>setForm(f=>({...f,hometown:e.target.value}))} placeholder="e.g. Rochester, NY"/></div>
          <div>
            <div style={s.label}>Profile Photo</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={openCropper}/>

            {/* Cropper modal */}
            {cropSrc&&(
              <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:300, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:12, letterSpacing:"0.08em" }}>DRAG TO REPOSITION · SCROLL TO ZOOM</div>
                <div style={{ position:"relative", touchAction:"none" }}
                  onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                  onTouchStart={e=>onMouseDown(e.touches[0])} onTouchMove={e=>onMouseMove(e.touches[0])} onTouchEnd={onMouseUp}
                  onWheel={onWheel}>
                  <canvas ref={canvasRef} width={280} height={280} style={{ borderRadius:"50%", cursor:"grab", display:"block" }}/>
                  <img ref={imgRef} src={cropSrc} alt="crop" style={{ display:"none" }} onLoad={onImgLoad}/>
                </div>
                {/* Zoom controls */}
                <div style={{ display:"flex", gap:12, marginTop:16, alignItems:"center" }}>
                  <button onClick={()=>onZoom(-1)} style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", fontSize:20, cursor:"pointer", fontFamily:"inherit" }}>−</button>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Zoom</div>
                  <button onClick={()=>onZoom(1)} style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", fontSize:20, cursor:"pointer", fontFamily:"inherit" }}>+</button>
                </div>
                {progress!==null&&(
                  <div style={{ width:280, marginTop:12 }}>
                    <div style={{ height:4, background:"rgba(255,255,255,0.1)", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${progress}%`, background:"#ff4500", borderRadius:2, transition:"width 0.3s" }}/>
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:4, textAlign:"center" }}>{progress}% uploading...</div>
                  </div>
                )}
                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button style={{ padding:"10px 24px", background:"linear-gradient(135deg,#ff4500,#ff8c00)", border:"none", borderRadius:8, color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }} onClick={uploadCropped} disabled={uploading}>
                    {uploading?"Uploading...":"✓ Use This Photo"}
                  </button>
                  <button style={{ padding:"10px 20px", background:"none", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, color:"rgba(255,255,255,0.6)", fontFamily:"inherit", fontSize:13, cursor:"pointer" }} onClick={()=>{setCropSrc(null);setCropFile(null);}}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {form.photoURL
              ? <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <img src={form.photoURL} alt="preview" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(255,255,255,0.2)" }}/>
                  <button style={s.btnGhost} onClick={()=>fileRef.current.click()} disabled={uploading}>Change</button>
                  <button style={s.btnDanger} onClick={()=>setForm(f=>({...f,photoURL:""}))}>✕</button>
                </div>
              : <button style={{ ...s.btnGhost, width:"100%" }} onClick={()=>fileRef.current.click()} disabled={uploading}>
                  📷 Upload Photo
                </button>
            }
          </div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Bio / Fun Fact</div><textarea rows={2} value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} placeholder="Fun facts, past wins, nickname..."/></div>
        <div style={s.grid2}>
          <div style={{ marginTop:10 }}><div style={s.label}>Favorite Club</div><input style={s.input} value={form.favoriteClub} onChange={e=>setForm(f=>({...f,favoriteClub:e.target.value}))} placeholder="e.g. 7-iron"/></div>
          <div style={{ marginTop:10 }}><div style={s.label}>Golfer Comparison</div><input style={s.input} value={form.golferComparison} onChange={e=>setForm(f=>({...f,golferComparison:e.target.value}))} placeholder="e.g. Budget Tiger Woods"/></div>
          <div style={{ marginTop:10 }}><div style={s.label}>Strengths</div><input style={s.input} value={form.strengths} onChange={e=>setForm(f=>({...f,strengths:e.target.value}))} placeholder="e.g. Long drive, putting"/></div>
          <div style={{ marginTop:10 }}><div style={s.label}>Weaknesses</div><input style={s.input} value={form.weaknesses} onChange={e=>setForm(f=>({...f,weaknesses:e.target.value}))} placeholder="e.g. Sand traps"/></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Best Part of Golf Game</div><input style={s.input} value={form.bestPartOfGame||""} onChange={e=>setForm(f=>({...f,bestPartOfGame:e.target.value}))} placeholder="e.g. Short game, reading greens"/></div>
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
              <button style={s.btnGhost} onClick={()=>{setEditing(p.id);setForm({name:p.name||"",handicap:p.handicap||"",hometown:p.hometown||"",nickname:p.nickname||"",bio:p.bio||"",photoURL:p.photoURL||"",favoriteClub:p.favoriteClub||"",strengths:p.strengths||"",weaknesses:p.weaknesses||"",golferComparison:p.golferComparison||"",bestPartOfGame:p.bestPartOfGame||""});}}>Edit</button>
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
    Object.entries(assignments).forEach(([n, t]) => { if (t !== "out") active[n] = t; }); // tbd, nukes, whales all saved
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
                    {[["nukes","☢️","#ff4500"],["whales","🐋","#00aaff"],["tbd","❓","#ffd700"],["out","✗","rgba(255,255,255,0.3)"]].map(([val,emoji,color])=>(
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
              {[["☢️ Nukes",nukes.length,"#ff4500"],["🐋 Whales",whales.length,"#00aaff"],["❓ TBD",roster.filter(p=>assignments[p.name]==="tbd").length,"#ffd700"],["Not Playing",out.length,"rgba(255,255,255,0.3)"]].map(([l,n,c])=>(
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
  const [newSegment, setNewSegment] = useState("");
  const [addingSegment, setAddingSegment] = useState(false);
  const sortedRounds = [...rounds].sort((a,b)=>(a.order??0)-(b.order??0));
  const { items:dragRounds, dragOver:dragOverRound, onDragStart:roundDragStart, onDragEnter:roundDragEnter, onDragEnd:roundDragEnd } = useDragList(sortedRounds);

  const addSegment = async () => {
    if (!newSegment.trim()) return;
    // segments stored as special round entries with type:"segment"
    const maxOrder = Math.max(0,...rounds.map(r=>r.order||0));
    await firestore.add("rounds",{type:"segment",label:newSegment.trim(),order:maxOrder+10,matchups:[]});
    setNewSegment(""); setAddingSegment(false); showToast("Subsection added!");
  };

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
    await firestore.update("rounds",round.id,{matchups:[...(round.matchups||[]),{nukes:["",""],whales:["",""],winner:null,competitionName:"",pointsWorth:""}]});
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

  const updateMatchupField = async (round, mi, field, value) => {
    const updated = (round.matchups||[]).map((m,i)=>i===mi?{...m,[field]:value}:m);
    await firestore.update("rounds",round.id,{matchups:updated});
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

      {/* Add segment button */}
      <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center" }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>Use ▲▼ to reorder · Add subsection headers to group rounds</div>
        <button style={{ ...s.btnGhost, marginLeft:"auto", fontSize:11, padding:"5px 10px" }} onClick={()=>setAddingSegment(a=>!a)}>+ Subsection</button>
      </div>
      {addingSegment&&(
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input autoFocus style={{ flex:1,...s.input,fontSize:13 }} value={newSegment} onChange={e=>setNewSegment(e.target.value)}
            placeholder="e.g. Day 1, Morning Rounds..." onKeyDown={e=>{if(e.key==="Enter")addSegment();if(e.key==="Escape")setAddingSegment(false);}}/>
          <button style={s.btnFire} onClick={addSegment}>Add</button>
          <button style={s.btnGhost} onClick={()=>setAddingSegment(false)}>Cancel</button>
        </div>
      )}
      {dragRounds.map((round,ri)=>(
        round.type==="segment" ? (
          /* Segment subheading */
          <div key={round.id} draggable
            onDragStart={()=>roundDragStart(ri)}
            onDragEnter={()=>roundDragEnter(ri)}
            onDragEnd={()=>roundDragEnd("rounds")}
            onDragOver={e=>e.preventDefault()}
            style={{ display:"flex", alignItems:"center", gap:8, marginTop:16, marginBottom:8, cursor:"grab", opacity:dragOverRound===ri?0.5:1 }}>
            <span style={{ color:"rgba(255,255,255,0.25)", fontSize:16 }}>⠿</span>
            <div style={{ fontSize:13, fontWeight:800, color:"rgba(255,255,255,0.55)", letterSpacing:"0.08em", textTransform:"uppercase", flex:1 }}>{round.label}</div>
            <button style={{ ...s.btnDanger, padding:"2px 8px", fontSize:11 }} onClick={async()=>{ if(window.confirm("Delete subsection?")) await firestore.delete("rounds",round.id); }}>✕</button>
          </div>
        ) : (
        <div key={round.id} draggable
          onDragStart={()=>roundDragStart(ri)}
          onDragEnter={()=>roundDragEnter(ri)}
          onDragEnd={()=>roundDragEnd("rounds")}
          onDragOver={e=>e.preventDefault()}
          style={{ ...s.card, borderColor:dragOverRound===ri?"rgba(255,255,255,0.4)":"rgba(255,200,0,0.15)", marginBottom:12, cursor:"grab", opacity:dragOverRound===ri?0.6:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <span style={{ color:"rgba(255,255,255,0.2)", fontSize:16 }}>⠿</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:800 }}>{round.name} <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>{round.day}</span></div>
              <div style={{ fontSize:12, color:"#ffd700" }}>Win={round.pointsPerWin}pts · Tie={round.pointsPerTie}pts{round.competitionName?` · 🏅 ${round.competitionName}`:""}</div>
            </div>
            <button style={s.btnGhost} onClick={()=>{setEditingRound(round.id);setForm({name:round.name||"",day:round.day||"Day 1",pointsPerWin:round.pointsPerWin||3,pointsPerTie:round.pointsPerTie||1.5,competitionName:round.competitionName||""});}}>Edit</button>
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
                <div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:5 }}>🏅 COMPETITION</div>
                  <select style={s.select} value={m.competitionName||""} onChange={e=>updateMatchupField(round,mi,"competitionName",e.target.value)}>
                    <option value="">— None —</option>
                    {compNames.map(n=><option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:5 }}>💰 POINTS WORTH</div>
                  <input style={s.input} type="number" step="0.5" placeholder={`Default: ${round.pointsPerWin}`}
                    value={m.pointsWorth||""} onChange={e=>updateMatchupField(round,mi,"pointsWorth",Number(e.target.value)||"")}/>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:3 }}>Leave blank to use round default ({round.pointsPerWin}pts)</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Result:</div>
                {["nukes","tie","whales",null].map(w=>(
                  <button key={String(w)} onClick={()=>updateWinner(round,mi,w)}
                    style={{ padding:"4px 10px", borderRadius:8, border:`1px solid ${m.winner===w?(w==="nukes"?"#ff4500":w==="whales"?"#00aaff":w==="tie"?"#ffd700":"rgba(255,255,255,0.3)"):"rgba(255,255,255,0.1)"}`, background:m.winner===w?"rgba(255,255,255,0.08)":"none", color:m.winner===w?"#fff":"rgba(255,255,255,0.4)", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    {w==="nukes"?"☢️ Win":w==="whales"?"🐋 Win":w==="tie"?"🤝 Tie":"Pending"}
                  </button>
                ))}
                <div style={{ marginLeft:"auto", fontSize:12, color:"rgba(255,200,0,0.6)", fontWeight:700 }}>
                  {(m.pointsWorth||round.pointsPerWin)}pts
                </div>
                <button style={{ ...s.btnDanger, padding:"4px 10px" }} onClick={()=>delMatchup(round,mi)}>✕</button>
              </div>
            </div>
          ))}
          <button style={{ ...s.btnGhost, marginTop:4 }} onClick={()=>addMatchup(round)}>+ Add Matchup</button>
        </div>
        )
      ))}
    </div>
  );
}

// ── SCHEDULE ────────────────────────────────────────────────────────────────
function SchedDayList({ items, showToast, setEditing, setForm }) {
  const { items:dragItems, dragOver, onDragStart, onDragEnter, onDragEnd } = useDragList(items);
  return (
    <>
      {dragItems.map((item,ii)=>(
        <div key={item.id} draggable
          onDragStart={()=>onDragStart(ii)}
          onDragEnter={()=>onDragEnter(ii)}
          onDragEnd={()=>onDragEnd("schedule")}
          onDragOver={e=>e.preventDefault()}
          style={{ ...{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"10px 12px", marginBottom:10 }, display:"flex", alignItems:"center", gap:10, marginBottom:6, cursor:"grab", opacity:dragOver===ii?0.5:1, borderColor:dragOver===ii?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.08)" }}>
          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:14 }}>⠿</span>
          <span style={{ fontSize:16 }}>{item.icon}</span>
          <span style={{ color:"#ff8c00", fontWeight:700, minWidth:64, fontSize:13 }}>{item.time}</span>
          <div style={{ flex:1 }}><div>{item.event}</div>{item.course&&<div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>📍 {item.course}</div>}</div>
          <button style={{ padding:"8px 14px", background:"none", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, color:"rgba(255,255,255,0.6)", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer" }} onClick={()=>{setEditing(item.id);setForm({day:item.day,time:item.time,event:item.event,icon:item.icon||"",course:item.course||""});}}>Edit</button>
          <button style={{ padding:"7px 12px", background:"rgba(220,30,30,0.15)", border:"1px solid rgba(220,30,30,0.4)", borderRadius:8, color:"#ff5555", fontFamily:"inherit", fontSize:12, cursor:"pointer" }} onClick={async()=>{await firestore.delete("schedule",item.id);}}>✕</button>
        </div>
      ))}
    </>
  );
}

function ScheduleSection({ schedule, showToast }) {
  // Custom days management
  const defaultDays = ["Day 1","Day 2","Day 3"];
  const existingDays = [...new Set(schedule.map(i=>i.day))];
  const allDays = [...new Set([...defaultDays, ...existingDays])];

  const [customDay, setCustomDay] = useState("");
  const [days, setDays] = useState(allDays);
  const [editingDayName, setEditingDayName] = useState(null);
  const [editingDayValue, setEditingDayValue] = useState("");
  const [form, setForm] = useState({ day:days[0]||"Day 1", time:"", event:"", icon:"⛳", course:"" });
  const [editing, setEditing] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // Keep days in sync with schedule data
  const allCurrentDays = [...new Set([...days, ...schedule.map(i=>i.day)])];

  const save = async () => {
    if (!form.event||!form.time) return showToast("Time and event required",true);
    try {
      if (editing) { await firestore.update("schedule",editing,form); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("schedule",form); showToast("Added!"); }
      setForm(f=>({...f,time:"",event:"",icon:"⛳",course:""}));
    } catch(e) { showToast(e.message,true); }
  };

  const addCustomDay = () => {
    if (!customDay.trim()) return;
    setDays(d=>[...d,customDay.trim()]);
    setForm(f=>({...f,day:customDay.trim()}));
    setCustomDay("");
  };

  const renameDay = async (oldName, newName) => {
    if (!newName.trim()||newName===oldName) { setEditingDayName(null); return; }
    // Update all schedule items with this day
    const toUpdate = schedule.filter(i=>i.day===oldName);
    for (const item of toUpdate) {
      await firestore.update("schedule",item.id,{day:newName.trim()});
    }
    setDays(d=>d.map(d2=>d2===oldName?newName.trim():d2));
    if (form.day===oldName) setForm(f=>({...f,day:newName.trim()}));
    setEditingDayName(null);
    showToast("Day renamed!");
  };

  // Sort items by time for each day
  const parseTime = (t) => {
    if (!t) return 0;
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return 0;
    let h=parseInt(m[1]),min=parseInt(m[2]);
    const period=(m[3]||"").toUpperCase();
    if (period==="PM"&&h!==12) h+=12;
    if (period==="AM"&&h===12) h=0;
    return h*60+min;
  };

  // Drag reorder for schedule items
  const handleDragStart = (e, id) => { e.dataTransfer.setData("scheduleId", id); };
  const handleDrop = async (e, targetId) => {
    const srcId = e.dataTransfer.getData("scheduleId");
    if (!srcId||srcId===targetId) { setDragOver(null); return; }
    // Swap times
    const src = schedule.find(i=>i.id===srcId);
    const tgt = schedule.find(i=>i.id===targetId);
    if (src&&tgt) {
      await firestore.update("schedule",srcId,{time:tgt.time});
      await firestore.update("schedule",targetId,{time:src.time});
    }
    setDragOver(null);
  };

  return (
    <div>
      <div style={s.sectionTitle}>📅 Schedule</div>

      {/* Day management */}
      <div style={{ ...s.card, marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.5)", marginBottom:10 }}>Days</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
          {allCurrentDays.map(day=>(
            <div key={day} style={{ display:"flex", alignItems:"center", gap:4 }}>
              {editingDayName===day
                ? <input autoFocus style={{ ...s.input, width:120, fontSize:12, padding:"4px 8px" }} value={editingDayValue} onChange={e=>setEditingDayValue(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter") renameDay(day,editingDayValue); if(e.key==="Escape") setEditingDayName(null); }}
                    onBlur={()=>renameDay(day,editingDayValue)}/>
                : <div style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20 }}>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.7)" }}>{day}</span>
                    <button onClick={()=>{setEditingDayName(day);setEditingDayValue(day);}} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", cursor:"pointer", fontSize:11, padding:"0 0 0 2px" }}>✏️</button>
                  </div>
              }
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ flex:1, ...s.input, fontSize:13 }} value={customDay} onChange={e=>setCustomDay(e.target.value)} placeholder="Add day (e.g. Friday, Saturday...)" onKeyDown={e=>e.key==="Enter"&&addCustomDay()}/>
          <button style={s.btnFire} onClick={addCustomDay}>+ Add Day</button>
        </div>
      </div>

      {/* Add/edit event form */}
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editing?"#ff8c00":"#4ade80" }}>{editing?"✏️ Edit":"➕ Add Event"}</div>
        <div style={s.grid2}>
          <div>
            <div style={s.label}>Day</div>
            <select style={s.select} value={form.day} onChange={e=>setForm(f=>({...f,day:e.target.value}))}>
              {allCurrentDays.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div><div style={s.label}>Time</div><input style={s.input} value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} placeholder="8:30 AM"/></div>
          <div><div style={s.label}>Icon</div><input style={s.input} value={form.icon} onChange={e=>setForm(f=>({...f,icon:e.target.value}))} placeholder="⛳"/></div>
          <div><div style={s.label}>Course Name</div><input style={s.input} value={form.course} onChange={e=>setForm(f=>({...f,course:e.target.value}))} placeholder="e.g. Pebble Beach"/></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Event</div><input style={s.input} value={form.event} onChange={e=>setForm(f=>({...f,event:e.target.value}))} placeholder="Event description"/></div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={save}>{editing?"Save":"Add"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(f=>({...f,time:"",event:"",icon:"⛳",course:""}));}}>Cancel</button>}
        </div>
      </div>

      {/* Events grouped by day, sorted by time, draggable */}
      {allCurrentDays.map(day=>{
        const items = schedule.filter(i=>i.day===day).sort((a,b)=>parseTime(a.time)-parseTime(b.time));
        if(!items.length) return null;
        return (
          <div key={day} style={{ marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:"0.1em", textTransform:"uppercase" }}>{day}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)" }}>{items.length} event{items.length!==1?"s":""}</div>
            </div>
            <SchedDayList items={items} showToast={showToast} setEditing={setEditing} setForm={setForm}/>
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
  const [form, setForm]       = useState(blank);
  const [editing, setEditing] = useState(null);
  const [resultFor, setResultFor] = useState(null);
  const sortedComps = [...competitions].sort((a,b)=>(a.order??0)-(b.order??0));
  const { items:dragComps, dragOver:dragOverComp, onDragStart:compDragStart, onDragEnter:compDragEnter, onDragEnd:compDragEnd } = useDragList(sortedComps);

  const save = async () => {
    if (!form.name) return showToast("Name required", true);
    try {
      if (editing) { await firestore.update("competitions",editing,form); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("competitions",{name:form.name,icon:form.icon,desc:form.desc,winner:"",winnerTeam:"nukes",detail:""}); showToast("Competition added!"); }
      setForm(blank);
    } catch(e) { showToast(e.message,true); }
  };

  const saveResult = async (id) => {
    try { await firestore.update("competitions",id,{winner:form.winner,detail:form.detail}); showToast("Result saved!"); setResultFor(null); setForm(blank); }
    catch(e) { showToast(e.message,true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>🎯 Competitions</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:16, fontFamily:"'Barlow',sans-serif" }}>
        Master list of side competitions. These appear as a dropdown when setting up rounds, and show on the public app.
      </div>

      {/* Add / edit form */}
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editing?"#ff8c00":"#4ade80" }}>{editing?"✏️ Edit Competition":"➕ Add Competition"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Name *</div><input style={s.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Closest to the Pin"/></div>
          <div><div style={s.label}>Icon</div><input style={s.input} value={form.icon} onChange={e=>setForm(f=>({...f,icon:e.target.value}))} placeholder="🎯"/></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Description</div><input style={s.input} value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Rules, hole number, etc."/></div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={save}>{editing?"Save Changes":"Add Competition"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(blank);}}>Cancel</button>}
        </div>
      </div>

      {/* Competition list */}
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8 }}>⠿ Drag to reorder</div>
      {dragComps.map((c,ci)=>(
        <div key={c.id} draggable
          onDragStart={()=>compDragStart(ci)}
          onDragEnter={()=>compDragEnter(ci)}
          onDragEnd={()=>compDragEnd("competitions")}
          onDragOver={e=>e.preventDefault()}
          style={{ ...s.card, cursor:"grab", opacity:dragOverComp===ci?0.5:1, borderColor:dragOverComp===ci?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ color:"rgba(255,255,255,0.2)", fontSize:16 }}>⠿</span>
            <span style={{ fontSize:24 }}>{c.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>{c.name}</div>
              {c.desc&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{c.desc}</div>}
              {c.winner&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginTop:2 }}>
                🏅 {c.winner}{c.detail?` — ${c.detail}`:""}
              </div>}
            </div>
            <div style={s.row}>
              <button style={{ ...s.btnGhost, fontSize:11 }} onClick={()=>{setResultFor(resultFor===c.id?null:c.id);setForm({winner:c.winner||"",winnerTeam:c.winnerTeam||"nukes",detail:c.detail||""});}}>
                {resultFor===c.id?"Cancel":"🏅 Result"}
              </button>
              <button style={s.btnGhost} onClick={()=>{setEditing(c.id);setResultFor(null);setForm({name:c.name,icon:c.icon||"🏅",desc:c.desc||"",winner:c.winner||"",winnerTeam:c.winnerTeam||"nukes",detail:c.detail||""});}}>Edit</button>
              <button style={s.btnDanger} onClick={async()=>{if(window.confirm("Delete?"))await firestore.delete("competitions",c.id);}}>✕</button>
            </div>
          </div>
          {/* Result entry */}
          {resultFor===c.id&&(
            <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.5)", marginBottom:10 }}>Enter Result</div>
              <div style={s.grid2}>
                <div><div style={s.label}>Winner / Leader</div><input style={s.input} value={form.winner} onChange={e=>setForm(f=>({...f,winner:e.target.value}))} placeholder="Player name or team"/></div>
                <div><div style={s.label}>Detail (optional)</div><input style={s.input} value={form.detail} onChange={e=>setForm(f=>({...f,detail:e.target.value}))} placeholder="e.g. 4ft 2in, -12"/></div>
              </div>
              <button style={{ ...s.btnFire, marginTop:12 }} onClick={()=>saveResult(c.id)}>Save Result</button>
            </div>
          )}
        </div>
      ))}

      {competitions.length===0&&(
        <div style={{ textAlign:"center", padding:"30px 0", color:"rgba(255,255,255,0.2)", fontSize:14 }}>
          No competitions yet — add some above. They'll appear as a dropdown when creating rounds.
        </div>
      )}
    </div>
  );
}

// ── HISTORY ─────────────────────────────────────────────────────────────────
function HistorySection({ history, drafts, roster, competitions, rounds, meta, showToast }) {
  const blank = { year:new Date().getFullYear()-1, winner:"TBD", mvp:"", notes:"", nukes_pts:"", whales_pts:"" };
  const [form, setForm]       = useState(blank);
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

      {/* Add / Edit year form */}
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editing?"#ff8c00":"#4ade80" }}>{editing?"✏️ Edit Year":"➕ Add Tournament Year"}</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Year</div><input style={s.input} type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))}/></div>
          <div><div style={s.label}>Winner</div>
            <select style={s.select} value={form.winner} onChange={e=>setForm(f=>({...f,winner:e.target.value}))}>
              <option value="TBD">— TBD (auto from import) —</option>
              <option value="THE NUKES">☢️ THE NUKES</option>
              <option value="THE WHALES">🐋 THE WHALES</option>
            </select>
          </div>
          <div><div style={s.label}>Nukes Points</div><input style={s.input} type="number" value={form.nukes_pts} onChange={e=>setForm(f=>({...f,nukes_pts:e.target.value}))}/></div>
          <div><div style={s.label}>Whales Points</div><input style={s.input} type="number" value={form.whales_pts} onChange={e=>setForm(f=>({...f,whales_pts:e.target.value}))}/></div>
          <div><div style={s.label}>MVP</div><input style={s.input} value={form.mvp} onChange={e=>setForm(f=>({...f,mvp:e.target.value}))} placeholder="Player name"/></div>
        </div>
        <div style={{ marginTop:10 }}><div style={s.label}>Notes / Recap</div><textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Memorable moments..."/></div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={save}>{editing?"Save Changes":"Add Year"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(blank);}}>Cancel</button>}
        </div>
      </div>

      {/* Year cards */}
      {[...history].sort((a,b)=>b.year-a.year).map(h=>{
        const isTBD = !h.winner || h.winner==="TBD";
        const isNuke = h.winner==="THE NUKES";
        const isWhale = h.winner==="THE WHALES";
        const headerBg = isNuke?"rgba(255,69,0,0.08)":isWhale?"rgba(0,170,255,0.06)":"rgba(255,255,255,0.04)";
        const headerBorder = isNuke?"rgba(255,69,0,0.25)":isWhale?"rgba(0,170,255,0.2)":"rgba(255,255,255,0.1)";
        const winnerColor = isNuke?"#ff4500":isWhale?"#00aaff":"rgba(255,255,255,0.4)";
        const winnerEmoji = isNuke?"☢️ ":isWhale?"🐋 ":"⏳ ";
        const isExpanded = expanded===h.id;
        const matchCount = (h.matches||[]).length;
        const supCount = (h.superlatives||[]).length;
        const yearDraft = drafts.find(d=>String(d.year)===String(h.year));
        const yearAssign = yearDraft?.assignments || {};
        const nukeNames = Object.entries(yearAssign).filter(([,t])=>t==="nukes").map(([n])=>n);
        const whaleNames = Object.entries(yearAssign).filter(([,t])=>t==="whales").map(([n])=>n);
        const allYearPlayers = [...nukeNames, ...whaleNames];

        return (
          <div key={h.id} style={{ marginBottom:12 }}>
            {/* Year header */}
            <div style={{ background:headerBg, border:`1px solid ${headerBorder}`, borderRadius:isExpanded?"12px 12px 0 0":"12px", padding:"14px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontSize:26, fontWeight:900, color:"rgba(255,255,255,0.12)", minWidth:50, lineHeight:1 }}>{h.year}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:winnerColor }}>{winnerEmoji}{isTBD?"TBD":h.winner}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                    MVP: {h.mvp||"—"} · {h.nukes_pts||0}–{h.whales_pts||0}
                    {matchCount>0&&<span style={{ marginLeft:8, color:"rgba(255,255,255,0.3)" }}>{matchCount} match{matchCount!==1?"es":""}</span>}
                    {supCount>0&&<span style={{ marginLeft:8, color:"rgba(255,200,0,0.5)" }}>🏅 {supCount}</span>}
                  </div>
                </div>
                <div style={s.row}>
                  <button style={s.btnGhost} onClick={()=>setExpanded(isExpanded?null:h.id)}>{isExpanded?"▲ Hide":"▼ Edit"}</button>
                  <button style={s.btnGhost} onClick={()=>{setEditing(h.id);setForm({year:h.year,winner:h.winner,mvp:h.mvp||"",notes:h.notes||"",nukes_pts:h.nukes_pts||"",whales_pts:h.whales_pts||""});}}>✏️</button>
                  <button style={s.btnDanger} onClick={async()=>{if(window.confirm("Delete this year?"))await firestore.delete("history",h.id);}}>✕</button>
                </div>
              </div>
            </div>

            {/* Expanded subsections */}
            {isExpanded&&(
              <div style={{ border:`1px solid ${headerBorder}`, borderTop:"none", borderRadius:"0 0 12px 12px", overflow:"hidden" }}>

                {/* Notes */}
                {h.notes&&(
                  <div style={{ padding:"10px 16px", background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,255,255,0.06)", fontSize:13, color:"rgba(255,255,255,0.4)", fontStyle:"italic" }}>
                    {h.notes}
                  </div>
                )}

                {/* Draft info notice */}
                {allYearPlayers.length===0&&(
                  <div style={{ padding:"10px 16px", background:"rgba(255,200,0,0.06)", borderBottom:"1px solid rgba(255,200,0,0.1)", fontSize:12, color:"rgba(255,200,0,0.7)" }}>
                    ⚠️ No draft found for {h.year} — create one in Draft / Teams to get player dropdowns
                  </div>
                )}

                {/* Import from current tournament - show only once */}
                {String(h.year)===String(meta?.year||2026)&&(
                  <ImportFromRounds year={h} rounds={rounds} showToast={showToast}/>
                )}

                {/* Matches subsection */}
                <div style={{ padding:"14px 16px", background:"rgba(0,0,0,0.2)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  <MatchesEditor year={h} nukeNames={nukeNames} whaleNames={whaleNames} competitions={competitions} showToast={showToast}/>
                </div>

                {/* Superlatives subsection */}
                <div style={{ padding:"14px 16px", background:"rgba(0,0,0,0.15)" }}>
                  <SuperlativesEditor year={h} allPlayers={allYearPlayers} showToast={showToast}/>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ImportFromRounds({ year, rounds, showToast }) {
  const [importing, setImporting] = useState(false);

  const doImport = async () => {
    const currentMatches = year.matches || [];
    const newMatches = [];

    rounds.forEach(round => {
      (round.matchups || []).forEach(m => {
        if (!m.nukes?.some(Boolean) && !m.whales?.some(Boolean)) return; // skip empty
        // Check if this matchup already exists (by player names) to avoid double counting
        const alreadyImported = currentMatches.some(em =>
          JSON.stringify((em.nukes||[]).sort()) === JSON.stringify((m.nukes||[]).filter(Boolean).sort()) &&
          JSON.stringify((em.whales||[]).sort()) === JSON.stringify((m.whales||[]).filter(Boolean).sort())
        );
        if (alreadyImported) return;
        newMatches.push({
          nukes: (m.nukes||[]).filter(Boolean),
          whales: (m.whales||[]).filter(Boolean),
          winner: m.winner || null,
          roundName: m.competitionName || round.name || "",
          pointsWorth: m.pointsWorth || round.pointsPerWin || 0,
        });
      });
    });

    if (newMatches.length === 0) {
      showToast("No new matches to import — all already imported or rounds are empty", true);
      return;
    }

    setImporting(true);
    try {
      await firestore.update("history", year.id, { matches: [...currentMatches, ...newMatches] });
      showToast(`Imported ${newMatches.length} match${newMatches.length!==1?"es":""}!`);
    } catch(e) { showToast("Error: " + e.message, true); }
    setImporting(false);
  };

  return (
    <div style={{ padding:"12px 16px", background:"rgba(74,222,128,0.06)", borderBottom:"1px solid rgba(74,222,128,0.15)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#4ade80" }}>⬇ Import from Current Tournament</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
            Pulls matchup results from Rounds into this year. Already-imported matches are skipped automatically.
          </div>
        </div>
        <button style={{ padding:"8px 16px", background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:8, color:"#4ade80", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}
          onClick={doImport} disabled={importing}>
          {importing ? "Importing..." : "Import Matches"}
        </button>
      </div>
    </div>
  );
}


function MatchesEditor({ year, nukeNames, whaleNames, competitions, showToast }) {
  const blankMatch = { nukes:["",""], whales:["",""], winner:null, roundName:"", pointsWorth:"" };
  const [form, setForm]       = useState(blankMatch);
  const [adding, setAdding]   = useState(false);
  const [editingMi, setEditingMi] = useState(null);
  const [editForm, setEditForm]   = useState(null);
  const [newHeading, setNewHeading] = useState("");
  const [addingHeading, setAddingHeading] = useState(false);
  const allPlayers = [...nukeNames,...whaleNames];
  const compOptions = ["Round 1","Round 2","Round 3",...(competitions||[]).map(c=>c.name)];

  const saveAll = async (newMatches) => {
    await firestore.update("history", year.id, { matches: newMatches });
  };

  // Drag reorder — local state, save on drag end
  const [localMatches, setLocalMatches] = useState(year.matches||[]);
  useEffect(()=>{ setLocalMatches(year.matches||[]); }, [JSON.stringify(year.matches)]);
  const matchDragIdx = useRef(null);
  const [matchDragOver, setMatchDragOver] = useState(null);

  const matchDragStart = (i) => { matchDragIdx.current = i; };
  const matchDragEnter = (i) => {
    if (matchDragIdx.current===null||matchDragIdx.current===i) return;
    setLocalMatches(prev=>{
      const arr=[...prev];
      const [moved]=arr.splice(matchDragIdx.current,1);
      arr.splice(i,0,moved);
      matchDragIdx.current=i;
      return arr;
    });
    setMatchDragOver(i);
  };
  const matchDragEnd = async () => {
    matchDragIdx.current=null; setMatchDragOver(null);
    await saveAll(localMatches);
  };

  // Add subheading (stored as a special match entry with type:"heading")
  const addHeading = async () => {
    if (!newHeading.trim()) return;
    const arr = [...localMatches, { type:"heading", label:newHeading.trim() }];
    setLocalMatches(arr);
    await saveAll(arr);
    setNewHeading(""); setAddingHeading(false); showToast("Subheading added!");
  };

  const addMatch = async () => {
    if (!form.winner) return showToast("Please select a winner", true);
    const arr = [...localMatches, { ...form, pointsWorth:Number(form.pointsWorth)||0 }];
    setLocalMatches(arr);
    await saveAll(arr);
    setForm(blankMatch); setAdding(false); showToast("Match added!");
  };

  const startEdit = (mi) => {
    const m = year.matches[mi];
    setEditForm({ nukes:[...(m.nukes||["",""])], whales:[...(m.whales||["",""])], winner:m.winner||null, roundName:m.roundName||"", pointsWorth:m.pointsWorth||"" });
    setEditingMi(mi);
  };

  const saveEdit = async () => {
    const updated = localMatches.map((m,i)=>i===editingMi?{...editForm,pointsWorth:Number(editForm.pointsWorth)||0}:m);
    setLocalMatches(updated);
    await saveAll(updated);
    setEditingMi(null); setEditForm(null); showToast("Match updated!");
  };

  const remove = async (mi) => {
    if (!window.confirm("Remove this match?")) return;
    const arr = localMatches.filter((_,i)=>i!==mi);
    setLocalMatches(arr);
    await saveAll(arr);
  };

  const updateWinnerOnly = async (mi, winner) => {
    const updated = localMatches.map((m,i)=>i===mi?{...m,winner}:m);
    setLocalMatches(updated);
    await saveAll(updated);
  };

  const MatchForm = ({ vals, setVals, onSave, onCancel, saveLabel }) => (
    <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:14, marginBottom:12 }}>
      <div style={s.grid2}>
        <div>
          <div style={{ fontSize:11, color:"#ff4500", fontWeight:700, marginBottom:6 }}>☢️ NUKES</div>
          {[0,1].map(i=>(
            <select key={i} style={{ ...s.select, marginBottom:6 }} value={vals.nukes[i]||""} onChange={e=>{const n=[...vals.nukes];n[i]=e.target.value;setVals(v=>({...v,nukes:n}));}}>
              <option value="">— Player {i+1} —</option>
              {(nukeNames.length>0?nukeNames:allPlayers).map(n=><option key={n}>{n}</option>)}
            </select>
          ))}
        </div>
        <div>
          <div style={{ fontSize:11, color:"#00aaff", fontWeight:700, marginBottom:6 }}>🐋 WHALES</div>
          {[0,1].map(i=>(
            <select key={i} style={{ ...s.select, marginBottom:6 }} value={vals.whales[i]||""} onChange={e=>{const w=[...vals.whales];w[i]=e.target.value;setVals(v=>({...v,whales:w}));}}>
              <option value="">— Player {i+1} —</option>
              {(whaleNames.length>0?whaleNames:allPlayers).map(n=><option key={n}>{n}</option>)}
            </select>
          ))}
        </div>
        <div>
          <div style={s.label}>Competition / Round</div>
          <select style={s.select} value={vals.roundName} onChange={e=>setVals(v=>({...v,roundName:e.target.value}))}>
            <option value="">— Select —</option>
            {compOptions.map(name=><option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div>
          <div style={s.label}>Points Worth</div>
          <input style={s.input} type="number" value={vals.pointsWorth} onChange={e=>setVals(v=>({...v,pointsWorth:e.target.value}))} placeholder="e.g. 3"/>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:"0.08em" }}>WINNER:</div>
        {["nukes","tie","whales"].map(w=>(
          <button key={w} onClick={()=>setVals(v=>({...v,winner:w}))}
            style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${vals.winner===w?(w==="nukes"?"#ff4500":w==="whales"?"#00aaff":"#ffd700"):"rgba(255,255,255,0.12)"}`, background:vals.winner===w?"rgba(255,255,255,0.1)":"none", color:vals.winner===w?"#fff":"rgba(255,255,255,0.4)", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            {w==="nukes"?"☢️ Nukes Win":w==="whales"?"🐋 Whales Win":"🤝 Tie"}
          </button>
        ))}
      </div>
      <div style={{ ...s.row, marginTop:12 }}>
        <button style={s.btnFire} onClick={onSave}>{saveLabel}</button>
        <button style={s.btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase" }}>
          ⚔️ Match Results <span style={{ color:"rgba(255,255,255,0.25)", fontWeight:400 }}>({(year.matches||[]).length})</span>
        </div>
        {!adding&&editingMi===null&&<div style={{ display:"flex", gap:6 }}>
          <button style={{ ...s.btnGhost, fontSize:11, padding:"5px 10px" }} onClick={()=>setAddingHeading(a=>!a)}>+ Subheading</button>
          <button style={{ ...s.btnFire, fontSize:11, padding:"5px 12px" }} onClick={()=>setAdding(true)}>+ Add Match</button>
        </div>}
      </div>

      {adding&&<MatchForm vals={form} setVals={setForm} onSave={addMatch} onCancel={()=>{setAdding(false);setForm(blankMatch);}} saveLabel="Save Match"/>}

      {/* Add subheading UI */}
      {addingHeading&&(
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <input autoFocus style={{ flex:1, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#e8edf3", fontFamily:"inherit", fontSize:13, padding:"8px 10px", outline:"none" }}
            value={newHeading} onChange={e=>setNewHeading(e.target.value)} placeholder="Subheading (e.g. Round 1, Day 1...)"
            onKeyDown={e=>{ if(e.key==="Enter") addHeading(); if(e.key==="Escape") setAddingHeading(false); }}/>
          <button style={s.btnFire} onClick={addHeading}>Add</button>
          <button style={s.btnGhost} onClick={()=>setAddingHeading(false)}>Cancel</button>
        </div>
      )}

      {(year.matches||[]).length===0&&!adding&&(
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)", textAlign:"center", padding:"16px 0" }}>No matches yet — tap + Add Match</div>
      )}

      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8 }}>⠿ Drag to reorder matches and subheadings</div>
      {localMatches.map((m,mi)=>(
        <div key={mi} draggable
          onDragStart={()=>matchDragStart(mi)}
          onDragEnter={()=>matchDragEnter(mi)}
          onDragEnd={matchDragEnd}
          onDragOver={e=>e.preventDefault()}>
          {/* Subheading */}
          {m.type==="heading"&&(
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:14, marginBottom:6 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"rgba(255,255,255,0.6)", letterSpacing:"0.08em", textTransform:"uppercase" }}>{m.label}</div>
              <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.1)" }}/>
              <button style={{ ...s.btnDanger, padding:"2px 8px", fontSize:10 }} onClick={()=>{ const arr=localMatches.filter((_,i)=>i!==mi); setLocalMatches(arr); saveAll(arr); }}>✕</button>
            </div>
          )}
          {m.type!=="heading"&&editingMi===mi&&editForm
            ? <MatchForm vals={editForm} setVals={setEditForm} onSave={saveEdit} onCancel={()=>{setEditingMi(null);setEditForm(null);}} saveLabel="Save Changes"/>
            : m.type!=="heading"&&(
              <div style={{ background:matchDragOver===mi?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.03)", border:`1px solid ${matchDragOver===mi?"rgba(255,255,255,0.3)":m.winner==="nukes"?"rgba(255,69,0,0.2)":m.winner==="whales"?"rgba(0,170,255,0.2)":m.winner==="tie"?"rgba(255,200,0,0.15)":"rgba(255,255,255,0.06)"}`, borderRadius:10, padding:"11px 12px", marginBottom:8, display:"flex", gap:8, alignItems:"flex-start", cursor:"grab" }}>
                <span style={{ color:"rgba(255,255,255,0.15)", fontSize:16, paddingTop:4, cursor:"grab", flexShrink:0 }}>⠿</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"center", marginBottom:8 }}>
                    <div style={{ background:m.winner==="nukes"?"rgba(255,69,0,0.12)":"rgba(255,69,0,0.04)", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                      <div style={{ fontSize:11, color:"#ff4500", marginBottom:3 }}>☢️</div>
                      {(m.nukes||[]).filter(Boolean).map((n,ni)=><div key={ni} style={{ fontSize:13, fontWeight:700, color:m.winner==="nukes"?"#ff4500":"rgba(255,255,255,0.7)" }}>{n}</div>)}
                      {m.winner==="nukes"&&<div style={{ fontSize:10, color:"#ff4500", marginTop:4 }}>✓ WIN</div>}
                    </div>
                    <div style={{ textAlign:"center", fontSize:11, fontWeight:900, color:"rgba(255,255,255,0.15)" }}>VS</div>
                    <div style={{ background:m.winner==="whales"?"rgba(0,170,255,0.12)":"rgba(0,170,255,0.04)", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                      <div style={{ fontSize:11, color:"#00aaff", marginBottom:3 }}>🐋</div>
                      {(m.whales||[]).filter(Boolean).map((n,ni)=><div key={ni} style={{ fontSize:13, fontWeight:700, color:m.winner==="whales"?"#00aaff":"rgba(255,255,255,0.7)" }}>{n}</div>)}
                      {m.winner==="whales"&&<div style={{ fontSize:10, color:"#00aaff", marginTop:4 }}>✓ WIN</div>}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    {m.roundName&&<span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)" }}>🏅 {m.roundName}</span>}
                    {m.pointsWorth>0&&<span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"rgba(255,200,0,0.08)", color:"rgba(255,200,0,0.7)" }}>{m.pointsWorth}pts</span>}
                    {m.winner==="tie"&&<span style={{ fontSize:11, color:"#ffd700" }}>🤝 TIE</span>}
                    <div style={{ marginLeft:"auto", display:"flex", gap:5, alignItems:"center" }}>
                      {["nukes","tie","whales"].map(w=>(
                        <button key={w} onClick={()=>updateWinnerOnly(mi,w)}
                          style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${m.winner===w?(w==="nukes"?"#ff4500":w==="whales"?"#00aaff":"#ffd700"):"rgba(255,255,255,0.08)"}`, background:"none", color:m.winner===w?"#fff":"rgba(255,255,255,0.3)", fontFamily:"inherit", fontSize:11, cursor:"pointer" }}>
                          {w==="nukes"?"☢️":w==="whales"?"🐋":"🤝"}
                        </button>
                      ))}
                      <button style={{ ...s.btnGhost, padding:"3px 10px", fontSize:11 }} onClick={()=>startEdit(mi)}>✏️ Edit</button>
                      <button style={{ ...s.btnDanger, padding:"3px 8px", fontSize:11 }} onClick={()=>remove(mi)}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        </div>
      ))}
    </div>
  );
}

function SuperlativesEditor({ year, allPlayers, showToast }) {
  const [title, setTitle]   = useState("");
  const [player, setPlayer] = useState("");

  const add = async () => {
    if (!title||!player) return showToast("Award name and player required", true);
    await firestore.update("history",year.id,{superlatives:[...(year.superlatives||[]),{title,player}]});
    setTitle(""); setPlayer(""); showToast("Award added!");
  };
  const remove = async (si) => {
    await firestore.update("history",year.id,{superlatives:(year.superlatives||[]).filter((_,i)=>i!==si)});
  };

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>
        🏅 Superlatives / Awards
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8, marginBottom:10, alignItems:"end" }}>
        <div>
          <div style={s.label}>Award Name</div>
          <input style={{ ...s.input, fontSize:13 }} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. MVP, Most Improved"/>
        </div>
        <div>
          <div style={s.label}>Player</div>
          {allPlayers.length>0
            ? <select style={{ ...s.select, fontSize:13 }} value={player} onChange={e=>setPlayer(e.target.value)}>
                <option value="">— Select —</option>
                {allPlayers.map(n=><option key={n}>{n}</option>)}
              </select>
            : <input style={{ ...s.input, fontSize:13 }} value={player} onChange={e=>setPlayer(e.target.value)} placeholder="Player name"/>
          }
        </div>
        <button style={{ ...s.btnFire, padding:"9px 14px" }} onClick={add}>+ Add</button>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {(year.superlatives||[]).map((sup,si)=>(
          <div key={si} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 8px 4px 12px", background:"rgba(255,200,0,0.08)", border:"1px solid rgba(255,200,0,0.2)", borderRadius:20 }}>
            <span style={{ fontSize:12 }}>🏅 <strong>{sup.title}:</strong> {sup.player}</span>
            <button onClick={()=>remove(si)} style={{ background:"none", border:"none", color:"rgba(255,80,80,0.6)", cursor:"pointer", fontSize:14, paddingLeft:4, lineHeight:1 }}>✕</button>
          </div>
        ))}
        {(year.superlatives||[]).length===0&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>No awards yet</div>}
      </div>
    </div>
  );
}

// ── RULES ────────────────────────────────────────────────────────────────────
function RulesSection({ rules, showToast }) {
  const blank = { title:"", body:"", order:rules.length+1 };
  const [form, setForm]     = useState(blank);
  const [editing, setEditing] = useState(null);
  const sortedRules = [...rules].sort((a,b)=>(a.order||0)-(b.order||0));
  const { items:dragRules, dragOver:dragOverRule, onDragStart:ruleDragStart, onDragEnter:ruleDragEnter, onDragEnd:ruleDragEnd } = useDragList(sortedRules);
  const sorted = dragRules;

  const save = async () => {
    if (!form.title||!form.body) return showToast("Title and body required",true);
    try {
      const maxOrder = rules.length ? Math.max(...rules.map(r=>r.order||0))+10 : 0;
      if (editing) { await firestore.update("rules",editing,{...form,order:Number(form.order)||0}); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("rules",{...form,order:maxOrder}); showToast("Added!"); }
      setForm({...blank,order:0});
    } catch(e) { showToast(e.message,true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>📋 Rules</div>
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginBottom:14 }}>Use ▲▼ to reorder</div>
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14, color:editing?"#ff8c00":"#4ade80" }}>{editing?"✏️ Edit":"➕ Add Rule"}</div>
        <div><div style={s.label}>Title</div><input style={{...s.input,marginBottom:10}} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
        <div><div style={s.label}>Body</div><textarea rows={3} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))}/></div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={save}>{editing?"Save":"Add"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(blank);}}>Cancel</button>}
        </div>
      </div>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:8 }}>⠿ Drag to reorder</div>
      {sorted.map((r,ri)=>(
        <div key={r.id} draggable
          onDragStart={()=>ruleDragStart(ri)}
          onDragEnter={()=>ruleDragEnter(ri)}
          onDragEnd={()=>ruleDragEnd("rules")}
          onDragOver={e=>e.preventDefault()}
          style={{ ...s.card, padding:"12px 14px", cursor:"grab", opacity:dragOverRule===ri?0.5:1, borderColor:dragOverRule===ri?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
            <span style={{ color:"rgba(255,255,255,0.2)", fontSize:16 }}>⠿</span>
            <div style={{ flex:1, fontWeight:700 }}>{r.title}</div>
            <button style={s.btnGhost} onClick={()=>{setEditing(r.id);setForm({title:r.title,body:r.body,order:r.order});}}>Edit</button>
            <button style={s.btnDanger} onClick={async()=>{await firestore.delete("rules",r.id);}}>✕</button>
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.5, fontFamily:"'Barlow',sans-serif" }}>
            {(r.body||"").split("\n").map((line,li)=>{
              const isBullet = line.trimStart().startsWith("-") || line.trimStart().startsWith("•");
              const text = isBullet ? line.trimStart().replace(/^[-•]\s*/,"") : line;
              if (!text.trim()) return <div key={li} style={{ height:"0.5em" }}/>;
              return (
                <div key={li} style={{ display:"flex", gap:8, marginBottom:2 }}>
                  {isBullet&&<span style={{ color:"rgba(255,255,255,0.25)", flexShrink:0 }}>•</span>}
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsSection({ meta, showToast }) {
  const [form, setForm] = useState({ name:"", year:"", date:"", startTime:"10:00", location:"", tagline:"" });
  const [loaded, setLoaded] = useState(false);
  if (meta&&!loaded) { setForm({ name:meta.name||"", year:meta.year||"", date:meta.date||"", startTime:meta.startTime||"10:00", location:meta.location||"", tagline:meta.tagline||"" }); setLoaded(true); }
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
          <div><div style={s.label}>Tournament Date</div><input style={s.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          <div><div style={s.label}>Countdown Start Time</div><input style={s.input} type="time" value={form.startTime||"10:00"} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))}/></div>
          <div style={{ display:"flex", alignItems:"flex-end" }}><div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", lineHeight:1.5 }}>Time is based on each viewer's device timezone</div></div>
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
