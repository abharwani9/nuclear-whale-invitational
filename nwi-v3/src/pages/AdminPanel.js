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

  // Keep in sync with Firebase updates (sync on any data change, not just ID changes)
  useEffect(() => { setItems(initialItems); }, [JSON.stringify(initialItems)]);

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

  // Touch support for mobile drag-to-reorder.
  // Only begin a drag when the touch starts on an element explicitly marked as a
  // drag handle (data-drag-handle). Touches on selects/buttons/inputs are ignored
  // so their native behavior (opening a dropdown, tapping a button) works normally.
  const dragActive = useRef(false);
  const onTouchStart = (i) => (e) => {
    const handle = e.target.closest?.('[data-drag-handle]');
    if (!handle) { dragActive.current = false; return; }
    dragActive.current = true;
    dragIdx.current = i;
    setDragOver(i);
  };
  const onTouchMove = (i) => (e) => {
    if (!dragActive.current) return; // not dragging — let the tap through
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = el?.closest('[data-drag-idx]');
    if (!row) return;
    const newIdx = parseInt(row.getAttribute('data-drag-idx'), 10);
    if (!isNaN(newIdx) && newIdx !== dragIdx.current) {
      setItems(prev => {
        const arr = [...prev];
        const [moved] = arr.splice(dragIdx.current, 1);
        arr.splice(newIdx, 0, moved);
        dragIdx.current = newIdx;
        return arr;
      });
      setDragOver(newIdx);
    }
  };
  const onTouchEnd = async (collection) => {
    if (!dragActive.current) return;
    dragActive.current = false;
    dragIdx.current = null;
    setDragOver(null);
    await saveOrder(items, collection);
  };

  return { items, dragOver, onDragStart, onDragEnter, onDragEnd, onTouchStart, onTouchMove, onTouchEnd };
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
  { id:"hole",         label:"Hole-in-One Pool", icon:"⛳" },
  { id:"media",        label:"Media Vault",      icon:"🎬" },
  { id:"history",      label:"History",          icon:"📜" },
  { id:"rules",        label:"Rules",            icon:"📋" },
  { id:"settings",     label:"Settings",         icon:"⚙️"  },
  { id:"analytics",    label:"Analytics",        icon:"📊" },
];

export default function AdminPanel({ authed, onAuth, onBack }) {
  const [code, setCode]       = useState("");
  const [section, setSection] = useState(()=>{ try{ return sessionStorage.getItem("nwi_admin_section")||"rounds"; }catch(e){ return "rounds"; } });
  const [toast, setToast]     = useState(null);
  const [seeding, setSeeding] = useState(false);

  const { data: roster }       = useCollection("roster");
  const { data: rounds }       = useCollection("rounds");
  const { data: schedule }     = useCollection("schedule");
  const { data: competitions } = useCollection("competitions");
  const { data: history }      = useCollection("history");
  const { data: rules }        = useCollection("rules", "order");
  const { data: analytics }    = useCollection("analytics");
  const { data: meta }         = useDocument("meta", "tournament");
  const { data: drafts }       = useCollection("drafts");
  const { data: holePool }     = useCollection("holepool");

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
        button,select,a,input,[role="button"]{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
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
          <button key={sec.id} className={`sec-btn${section===sec.id?" active":""}`} onClick={()=>{sessionStorage.setItem("nwi_admin_section",sec.id);setSection(sec.id);}}>{sec.icon} {sec.label}</button>
        ))}
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 16px 60px" }}>
        {toast&&<div style={{ marginBottom:12, padding:"10px 14px", borderRadius:8, background:toast.err?"rgba(220,30,30,0.15)":"rgba(74,222,128,0.12)", border:`1px solid ${toast.err?"rgba(220,30,30,0.4)":"rgba(74,222,128,0.3)"}`, fontSize:14, color:toast.err?"#ff5555":"#4ade80" }}>{toast.msg}</div>}

        {section==="roster"       && <RosterSection roster={roster} showToast={showToast}/>}
        {section==="draft"        && <DraftSection roster={roster} drafts={drafts} showToast={showToast}/>}
        {section==="rounds"       && <RoundsSection rounds={rounds} roster={roster} drafts={drafts} competitions={competitions} meta={meta} showToast={showToast}/>}
        {section==="schedule"     && <ScheduleSection schedule={schedule} meta={meta} showToast={showToast}/>}
        {section==="competitions" && <CompetitionsSection competitions={competitions} showToast={showToast}/>}
        {section==="hole"         && <HoleInOneSection roster={roster} holePool={holePool} meta={meta} showToast={showToast}/>}
        {section==="media"        && <AdminMedia showToast={showToast}/>}
        {section==="history"      && <HistorySection history={history} drafts={drafts} roster={roster} competitions={competitions} rounds={rounds} meta={meta} showToast={showToast}/>}
        {section==="rules"        && <RulesSection rules={rules} showToast={showToast}/>}
        {section==="settings"     && <SettingsSection meta={meta} history={history} competitions={competitions} showToast={showToast}/>}
        {section==="analytics"    && <AnalyticsSection sessions={analytics||[]}/>}
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
  const blankRound = { name:"", day:"Day 1", competitionName:"" };
  const [form, setForm]           = useState(blankRound);
  const [editingRound, setEditingRound] = useState(null);
  const [newSegment, setNewSegment] = useState("");
  const [addingSegment, setAddingSegment] = useState(false);
  const sortedRounds = [...rounds].sort((a,b)=>(a.order??0)-(b.order??0));
  const { items:dragRounds, dragOver:dragOverRound, onDragStart:roundDragStart, onDragEnter:roundDragEnter, onDragEnd:roundDragEnd, onTouchStart:roundTouchStart, onTouchMove:roundTouchMove, onTouchEnd:roundTouchEnd } = useDragList(sortedRounds);

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
    const data = { name:form.name, day:form.day, competitionName:form.competitionName||"" };
    try {
      if (editingRound) { await firestore.update("rounds",editingRound,data); showToast("Updated!"); setEditingRound(null); }
      else { await firestore.add("rounds",{...data,matchups:[]}); showToast("Round added!"); }
      setForm(blankRound);
    } catch(e) { showToast(e.message,true); }
  };

  const addMatchup = async (round) => {
    const curr = getMatchups(round);
    // Get last used competition in this round, or use round's competitionName
    const lastComp = curr.length>0 ? curr[curr.length-1].competitionName : (round.competitionName||"");
    const comp = competitions.find(c=>c.name===lastComp);
    const defPts = comp&&meta?.compPts?.[comp.id] ? Number(meta.compPts[comp.id]) : (round.pointsPerWin||2);
    await saveMatchups(round, [...curr, {nukes:["",""],whales:["",""],winner:null,competitionName:lastComp,pointsWorth:""}]);
  };

  // Local matchup state per round — avoids Firebase re-render flicker
  const [localMatchups, setLocalMatchups] = useState({});
  const [collapsedRounds, setCollapsedRounds] = useState({});
  const toggleRound = (id) => setCollapsedRounds(c=>({...c,[id]:c[id]===false?true:false}));


  // Keep local state in sync when Firebase updates (but don't overwrite mid-edit)
  useEffect(() => {
    setLocalMatchups(() => {
      const next = {};
      rounds.forEach(r => { next[r.id] = r.matchups || []; });
      return next;
    });
  }, [rounds]);



  const getMatchups = (round) => localMatchups[round.id] ?? round.matchups ?? [];

  const updateLocal = (roundId, newMatchups) => {
    setLocalMatchups(prev => ({...prev, [roundId]: newMatchups}));
  };

  const saveMatchups = async (round, newMatchups) => {
    updateLocal(round.id, newMatchups);
    await firestore.update("rounds", round.id, {matchups: newMatchups});
  };

  const updateMatchupPlayer = async (round, mi, side, idx, value) => {
    const current = getMatchups(round);
    const updated = current.map((m,i) => {
      if (i !== mi) return m;
      const arr = [...(m[side] || ["",""])];
      arr[idx] = value;
      return {...m, [side]: arr};
    });
    await saveMatchups(round, updated);
  };

  const updateWinner = async (round, mi, winner) => {
    const current = getMatchups(round);
    const updated = current.map((m,i) => i===mi ? {...m, winner} : m);
    await saveMatchups(round, updated);
    showToast("Result saved!");
  };

  const delMatchup = async (round, mi) => {
    const current = getMatchups(round);
    await saveMatchups(round, current.filter((_,i) => i !== mi));
  };

  const updateMatchupField = async (round, mi, field, value) => {
    const current = getMatchups(round);
    const updated = current.map((m,i) => i===mi ? {...m, [field]: value} : m);
    await saveMatchups(round, updated);
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
        </div>
        <div style={{ marginTop:10 }}>
          <div style={s.label}>Competition (optional)</div>
          <select style={s.select} value={form.competitionName} onChange={e=>setForm(f=>({...f,competitionName:e.target.value}))}>
            <option value="">— None —</option>
            {[...competitions].filter(c=>c.section!=="side").sort((a,b)=>(a.order??0)-(b.order??0)).map(c=><option key={c.id} value={c.name}>{c.icon||"🏅"} {c.name}</option>)}
          </select>
        </div>
        <div style={{ ...s.row, marginTop:14 }}>
          <button style={s.btnFire} onClick={saveRound}>{editingRound?"Save":"Add Round"}</button>
          {editingRound&&<button style={s.btnGhost} onClick={()=>{setEditingRound(null);setForm(blankRound);}}>Cancel</button>}
        </div>
      </div>

      {/* Add segment button */}
      <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center" }}>
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
            data-drag-idx={ri}
            onDragStart={()=>roundDragStart(ri)}
            onDragEnter={()=>roundDragEnter(ri)}
            onDragEnd={()=>roundDragEnd("rounds")}
            onTouchStart={roundTouchStart(ri)}
            onTouchMove={roundTouchMove(ri)}
            onTouchEnd={()=>roundTouchEnd("rounds")}
            onDragOver={e=>e.preventDefault()}
            style={{ display:"flex", alignItems:"center", gap:8, marginTop:16, marginBottom:8, cursor:"grab", opacity:dragOverRound===ri?0.5:1 }}>
            <span data-drag-handle style={{ color:"rgba(255,255,255,0.3)", fontSize:20, cursor:"grab", padding:"4px 8px", touchAction:"none" }}>⠿</span>
            <div style={{ fontSize:13, fontWeight:800, color:"rgba(255,255,255,0.55)", letterSpacing:"0.08em", textTransform:"uppercase", flex:1 }}>{round.label}</div>
            <button style={{ ...s.btnDanger, padding:"2px 8px", fontSize:11 }} onClick={async()=>{ if(window.confirm("Delete subsection?")) await firestore.delete("rounds",round.id); }}>✕</button>
          </div>
        ) : (
        <div key={round.id} draggable data-drag-idx={ri}
          onDragStart={()=>roundDragStart(ri)}
          onDragEnter={()=>roundDragEnter(ri)}
          onDragEnd={()=>roundDragEnd("rounds")}
          onTouchStart={roundTouchStart(ri)}
          onTouchMove={roundTouchMove(ri)}
          onTouchEnd={()=>roundTouchEnd("rounds")}
          onDragOver={e=>e.preventDefault()}
          style={{ ...s.card, borderColor:dragOverRound===ri?"rgba(255,255,255,0.4)":"rgba(255,200,0,0.15)", marginBottom:12, cursor:"grab", opacity:dragOverRound===ri?0.6:1 }}>
          {(()=>{ const isC = collapsedRounds[round.id]!==false; return (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:isC?4:12, cursor:"pointer" }}
            onClick={e=>{ if(e.target.closest('button')) return; toggleRound(round.id); }}>
            <span style={{ color:"rgba(255,255,255,0.4)", fontSize:11, width:14 }}>{collapsedRounds[round.id]!==false?"▶":"▼"}</span>
            <span data-drag-handle style={{ color:"rgba(255,255,255,0.3)", fontSize:20, cursor:"grab", padding:"4px 8px", touchAction:"none" }}>⠿</span>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              <button style={{ background:"none", border:"none", color:ri===0?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.35)", cursor:ri===0?"default":"pointer", fontSize:13, padding:"0 3px", lineHeight:1.2, fontFamily:"inherit" }} onClick={async e=>{e.stopPropagation(); if(ri<=0) return; const arr=[...dragRounds]; const [m]=arr.splice(ri,1); arr.splice(ri-1,0,m); await saveOrder(arr,"rounds"); }}>▲</button>
              <button style={{ background:"none", border:"none", color:ri>=dragRounds.filter(r=>r.type!=="segment").length-1?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.35)", cursor:ri>=dragRounds.length-1?"default":"pointer", fontSize:13, padding:"0 3px", lineHeight:1.2, fontFamily:"inherit" }} onClick={async e=>{e.stopPropagation(); if(ri>=dragRounds.length-1) return; const arr=[...dragRounds]; const [m]=arr.splice(ri,1); arr.splice(ri+1,0,m); await saveOrder(arr,"rounds"); }}>▼</button>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:800 }}>{round.name} <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>{round.day}</span></div>
              {round.competitionName&&<div style={{ fontSize:12, color:"#ffd700" }}>🏅 {round.competitionName}</div>}
            </div>
            <button style={s.btnGhost} onClick={e=>{e.stopPropagation();setEditingRound(round.id);setForm({name:round.name||"",day:round.day||"Day 1",competitionName:round.competitionName||""});}}>Edit</button>
            <button style={s.btnDanger} onClick={async e=>{e.stopPropagation();if(window.confirm("Delete?"))await firestore.delete("rounds",round.id);}}>✕</button>
          </div>
          ); })()}
          {collapsedRounds[round.id]===false && (()=>{
            // Group matchups by competition for display
            const matchupList = getMatchups(round);
            const mainComps = competitions.filter(c=>c.section!=="side").sort((a,b)=>(a.order??0)-(b.order??0));
            
            // Find scramble competitions
            const scrambleComps = competitions.filter(c=>c.isScramble);
            const scrambleCompIds = new Set(scrambleComps.map(c=>c.id));
            const scrambleCompNames = new Set(scrambleComps.map(c=>c.name));
            
            // Group by competition, preserving scramble groups
            const groups = [];
            const seen = new Set();
            
            mainComps.forEach(comp => {
              const compMatchups = matchupList.map((m,mi)=>({m,mi})).filter(({m})=>m.competitionName===comp.name);
              if(compMatchups.length===0) return;
              
              if(comp.isScramble) {
                // Group scramble by scrambleGroup or just show all together
                const grouped = {};
                compMatchups.forEach(({m,mi})=>{
                  const grp = m.scrambleGroup||`sg_${mi}`;
                  if(!grouped[grp]) grouped[grp]=[];
                  grouped[grp].push({m,mi});
                });
                Object.entries(grouped).forEach(([grp,rows])=>{
                  groups.push({type:"scramble",comp,rows,grp});
                });
              } else {
                compMatchups.forEach(({m,mi})=>{
                  groups.push({type:"standard",comp,m,mi});
                });
              }
              seen.add(comp.name);
            });
            
            // Any matchups not matching a main comp — show ungrouped
            matchupList.forEach((m,mi)=>{
              if(!seen.has(m.competitionName)) {
                groups.push({type:"standard",comp:null,m,mi});
              }
            });

            const WinnerBtns = ({m,mi}) => (
              <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                {["nukes","tie","whales",null].map(w=>(
                  <button key={String(w)} onClick={()=>updateWinner(round,mi,w)}
                    style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${m.winner===w?(w==="nukes"?"#ff4500":w==="whales"?"#00aaff":w==="tie"?"#ffd700":"rgba(255,255,255,0.3)"):"rgba(255,255,255,0.1)"}`,background:m.winner===w?"rgba(255,255,255,0.08)":"none",color:m.winner===w?"#fff":"rgba(255,255,255,0.4)",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {w==="nukes"?"☢️ Win":w==="whales"?"🐋 Win":w==="tie"?"🤝 Tie":"⏳"}
                  </button>
                ))}
              </div>
            );

            const PlayerPickers = ({m,mi,side,names,color,emoji}) => (
              <div>
                <div style={{fontSize:10,color,marginBottom:4}}>{emoji} {side==="nukes"?"Nukes":"Whales"}</div>
                {[0,1].map(idx=>(
                  <select key={idx} style={{...s.select,marginBottom:4}} value={(m[side]||["",""])[idx]||""} onChange={e=>updateMatchupPlayer(round,mi,side,idx,e.target.value)}>
                    <option value="">— Player —</option>
                    {names.map(n=><option key={n}>{n}</option>)}
                  </select>
                ))}
              </div>
            );

            return (
              <>
                {groups.map((g,gi)=>{
                  if(g.type==="scramble") {
                    const firstM = g.rows[0]?.m||{};
                    const firstMi = g.rows[0]?.mi??0;
                    const subNames = {
                      "Front 9":2, "Back 9":2, "18-Holes":4
                    };
                    // Find actual sub-row competition names
                    const f9 = scrambleComps.find(c=>c.name?.toLowerCase().includes("front")||c.name?.toLowerCase().includes("9-hole")||c.name?.toLowerCase().includes("front 9"));
                    const b9 = scrambleComps.find(c=>c.name?.toLowerCase().includes("back")||c.name?.toLowerCase().includes("back 9"));
                    const full18 = scrambleComps.find(c=>!c.name?.toLowerCase().includes("front")&&!c.name?.toLowerCase().includes("back")&&(c.name?.toLowerCase().includes("18")||c.name?.toLowerCase().includes("full")));
                    
                    return (
                      <div key={gi} style={{background:"rgba(255,200,0,0.04)",border:"1px solid rgba(255,200,0,0.2)",borderRadius:10,padding:"12px",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#ffd700"}}>🏌️ 9-9-18 Scramble</div>
                          <button style={{...s.btnGhost,fontSize:11}} onClick={()=>{
                            // Split into independent matchups
                            if(window.confirm("Split scramble into 3 independent matchup rows?")) {
                              const cur = getMatchups(round);
                              const others = cur.filter((_,i)=>!g.rows.some(r=>r.mi===i));
                              const split = g.rows.map(r=>({...r.m,scrambleGroup:undefined}));
                              saveMatchups(round,[...others,...split]);
                            }
                          }}>Split ↗</button>
                        </div>
                        {/* Shared players — changes sync to all sub-rows */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                          <div>
                            <div style={{fontSize:10,color:"#ff4500",marginBottom:4}}>☢️ Nukes</div>
                            {[0,1].map(pi=>(
                              <select key={pi} style={{...s.select,marginBottom:4}} value={(firstM.nukes||["",""])[pi]||""} onChange={async e=>{
                                const cur=getMatchups(round);
                                const updated=cur.map((mu,i)=>{
                                  if(!g.rows.some(r=>r.mi===i)) return mu;
                                  const arr=[...(mu.nukes||["",""])];
                                  arr[pi]=e.target.value;
                                  return {...mu,nukes:arr};
                                });
                                await saveMatchups(round,updated);
                              }}>
                                <option value="">— Player —</option>
                                {nukeNames.map(n=><option key={n}>{n}</option>)}
                              </select>
                            ))}
                          </div>
                          <div>
                            <div style={{fontSize:10,color:"#00aaff",marginBottom:4}}>🐋 Whales</div>
                            {[0,1].map(pi=>(
                              <select key={pi} style={{...s.select,marginBottom:4}} value={(firstM.whales||["",""])[pi]||""} onChange={async e=>{
                                const cur=getMatchups(round);
                                const updated=cur.map((mu,i)=>{
                                  if(!g.rows.some(r=>r.mi===i)) return mu;
                                  const arr=[...(mu.whales||["",""])];
                                  arr[pi]=e.target.value;
                                  return {...mu,whales:arr};
                                });
                                await saveMatchups(round,updated);
                              }}>
                                <option value="">— Player —</option>
                                {whaleNames.map(n=><option key={n}>{n}</option>)}
                              </select>
                            ))}
                          </div>
                        </div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:4}}>Players sync to all sub-matches automatically</div>
                        {/* Sub-rows */}
                        {g.rows.map(({m,mi},si)=>{
                          const pts=m.pointsWorth||(si===2?4:2);
                          const label=m.subLabel||(si===0?"Front 9":si===1?"Back 9":"18-Holes");
                          return (
                            <div key={mi} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:7,marginBottom:4}}>
                              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,200,0,0.7)",width:60,flexShrink:0}}>{label}</div>
                              <input type="number" step="0.5" style={{...s.input,width:50,padding:"3px 6px"}} value={m.pointsWorth||""} placeholder={String(pts)}
                                onChange={e=>updateMatchupField(round,mi,"pointsWorth",Number(e.target.value)||"")}/>
                              <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>pts</div>
                              <div style={{flex:1}}><WinnerBtns m={m} mi={mi}/></div>
                              <button style={{...s.btnDanger,padding:"2px 7px",fontSize:10}} onClick={()=>delMatchup(round,mi)}>✕</button>
                            </div>
                          );
                        })}
                        {/* Add sub-row */}
                        <button style={{...s.btnGhost,fontSize:11,marginTop:6}} onClick={()=>{
                          const cur=getMatchups(round);
                          const si=g.rows.length;
                          const label=si===0?"Front 9":si===1?"Back 9":"18-Holes";
                          const pts=si===2?4:2;
                          const newRow={nukes:firstM.nukes||["",""],whales:firstM.whales||["",""],winner:null,competitionName:g.comp.name,pointsWorth:pts,scrambleGroup:g.grp,subLabel:label};
                          saveMatchups(round,[...cur,newRow]);
                        }}>+ Add Sub-match</button>
                      </div>
                    );
                  }

                  // Standard matchup
                  const {m,mi,comp} = g;
                  const pts = m.pointsWorth||round.pointsPerWin||2;
                  return (
                    <div key={gi} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"12px",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div>
                          <select style={{...s.select,maxWidth:180}} value={m.competitionName||""} onChange={e=>updateMatchupField(round,mi,"competitionName",e.target.value)}>
                            <option value="">— Competition —</option>
                            {(()=>{
                              const mainComps = [...competitions].filter(c=>c.section!=="side").sort((a,b)=>(a.order??0)-(b.order??0));
                              return mainComps.map(c=><option key={c.id} value={c.name}>{c.icon||"🏅"} {c.name}</option>);
                            })()}
                          </select>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          {(()=>{
                            const comp=competitions.find(c=>c.name===m.competitionName);
                            const defPts=comp&&meta?.compPts?.[comp.id]?Number(meta.compPts[comp.id]):round.pointsPerWin||2;
                            return <input type="number" step="0.5" style={{...s.input,width:52,textAlign:"center"}} value={m.pointsWorth||""}
                              placeholder={String(defPts)}
                              onChange={e=>updateMatchupField(round,mi,"pointsWorth",e.target.value===''?'':Number(e.target.value))}/>;
                          })()}
                          <span style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>pts/win</span>
                          <button style={{...s.btnDanger,padding:"3px 8px",fontSize:10}} onClick={()=>delMatchup(round,mi)}>✕</button>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <PlayerPickers m={m} mi={mi} side="nukes" names={nukeNames} color="#ff4500" emoji="☢️"/>
                        <PlayerPickers m={m} mi={mi} side="whales" names={whaleNames} color="#00aaff" emoji="🐋"/>
                      </div>
                      <WinnerBtns m={m} mi={mi}/>
                    </div>
                  );
                })}

                {/* Add matchup buttons */}
                <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                  <button style={{...s.btnGhost,fontSize:11}} onClick={()=>addMatchup(round)}>+ Standard Matchup</button>
                  {competitions.some(c=>c.isScramble)&&(
                    <button style={{...s.btnGhost,fontSize:11,color:"#ffd700",borderColor:"rgba(255,200,0,0.3)"}} onClick={()=>{
                      const scrComp=competitions.find(c=>c.isScramble);
                      if(!scrComp) return;
                      const cur=getMatchups(round);
                      const grp=`sg_${Date.now()}`;
                      const newRows=[
                        {nukes:["",""],whales:["",""],winner:null,competitionName:scrComp.name,pointsWorth:2,scrambleGroup:grp,subLabel:"Front 9"},
                        {nukes:["",""],whales:["",""],winner:null,competitionName:scrComp.name,pointsWorth:2,scrambleGroup:grp,subLabel:"Back 9"},
                        {nukes:["",""],whales:["",""],winner:null,competitionName:scrComp.name,pointsWorth:4,scrambleGroup:grp,subLabel:"18-Holes"},
                      ];
                      saveMatchups(round,[...cur,...newRows]);
                    }}>+ Scramble Entry</button>
                  )}
                </div>
              </>
            );
          })()}
        </div>
        )
      ))}
    </div>
  );
}

// ── SCHEDULE ────────────────────────────────────────────────────────────────
// Convert a stored time to 24h "HH:MM" for <input type=time> (handles legacy "8:30 AM").
function to24h(t) {
  if (!t) return "";
  const m = String(t).match(/^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?/i);
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ap = (m[3] || "").toUpperCase();
  if (ap.startsWith("P") && h !== 12) h += 12;
  if (ap.startsWith("A") && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

// Format a stored time for display. Accepts 24h "14:30" (from <input type=time>)
// or legacy "2:30 PM" strings and always returns a friendly 12-hour label.
function fmtTime(t) {
  if (!t) return "";
  if (/[ap]\.?m\.?/i.test(t)) return t.trim();
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${min} ${period}`;
}

function SchedDayList({ items, showToast, setEditing, setForm }) {
  // Items arrive already sorted by time from the parent; no manual reordering needed.
  return (
    <>
      {items.map((item)=>(
        <div key={item.id}
          style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"10px 12px", display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <span style={{ fontSize:16 }}>{item.icon}</span>
          <span style={{ color:"#ff8c00", fontWeight:700, minWidth:70, fontSize:13 }}>{fmtTime(item.time)}</span>
          <div style={{ flex:1 }}><div>{item.event}</div>{item.course&&<div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>📍 {item.course}</div>}</div>
          <button style={{ padding:"8px 14px", background:"none", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, color:"rgba(255,255,255,0.6)", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer" }} onClick={()=>{setEditing(item.id);setForm({day:item.day,time:to24h(item.time),event:item.event,icon:item.icon||"",course:item.course||""});}}>Edit</button>
          <button style={{ padding:"7px 12px", background:"rgba(220,30,30,0.15)", border:"1px solid rgba(220,30,30,0.4)", borderRadius:8, color:"#ff5555", fontFamily:"inherit", fontSize:12, cursor:"pointer" }} onClick={async()=>{await firestore.delete("schedule",item.id);}}>✕</button>
        </div>
      ))}
    </>
  );
}

function ScheduleSection({ schedule, meta, showToast }) {
  // Days come from meta.scheduleDays persisted in Firestore, fall back to days found in schedule
  const existingDays = [...new Set(schedule.map(i=>i.day))];
  const metaDays = meta?.scheduleDays||[];
  const allDays = [...new Set([...metaDays, ...existingDays])];

  const [customDay, setCustomDay] = useState("");
  const [days, setDays] = useState(allDays);
  const [editingDayName, setEditingDayName] = useState(null);
  const [editingDayValue, setEditingDayValue] = useState("");
  const [form, setForm] = useState({ day:days[0]||"Day 1", time:"", event:"", icon:"⛳", course:"" });
  const [editing, setEditing] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // Accommodations state
  const [accomm, setAccomm] = useState({ address:"", link:"", notes:"" });
  useEffect(()=>{
    if(meta?.accommodation) setAccomm({
      address: meta.accommodation.address||"",
      link: meta.accommodation.link||"",
      notes: meta.accommodation.notes||"",
    });
  }, [JSON.stringify(meta?.accommodation)]);

  // Re-sync days when meta.scheduleDays changes (from Firestore)
  useEffect(()=>{
    if(meta?.scheduleDays?.length) {
      // Also include any days from existing schedule items not in meta
      const fresh = [...new Set([...meta.scheduleDays, ...existingDays])];
      setDays(fresh);
    }
  }, [JSON.stringify(meta?.scheduleDays)]);

  const saveDays = async (newDays) => {
    setDays(newDays);
    await firestore.update("meta","tournament",{scheduleDays:newDays});
  };

  // Keep days in sync with schedule data
  const allCurrentDays = [...new Set([...days, ...schedule.map(i=>i.day)])];

  // Move a day earlier/later in the order (persists to meta.scheduleDays, which
  // drives the order everywhere including the public schedule).
  const moveDay = async (day, dir) => {
    const arr = [...allCurrentDays];
    const idx = arr.indexOf(day);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    await saveDays(arr);
  };

  const save = async () => {
    if (!form.event||!form.time) return showToast("Time and event required",true);
    try {
      if (editing) { await firestore.update("schedule",editing,form); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("schedule",form); showToast("Added!"); }
      setForm(f=>({...f,time:"",event:"",icon:"⛳",course:""}));
    } catch(e) { showToast(e.message,true); }
  };

  const addCustomDay = async () => {
    if (!customDay.trim()) return;
    await saveDays([...days, customDay.trim()]);
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
    const renamedDays = days.map(d2=>d2===oldName?newName.trim():d2);
    await saveDays(renamedDays);
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

      {/* Accommodations */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:16, fontWeight:800, marginBottom:12 }}>🏠 Accommodations</div>
        <div style={s.card}>
          <div style={s.grid2}>
            <div>
              <div style={s.label}>Airbnb Address</div>
              <input style={s.input} value={accomm.address} onChange={e=>setAccomm(a=>({...a,address:e.target.value}))} placeholder="123 Beach Rd, Myrtle Beach SC"/>
            </div>
            <div>
              <div style={s.label}>Airbnb Link</div>
              <input style={s.input} value={accomm.link} onChange={e=>setAccomm(a=>({...a,link:e.target.value}))} placeholder="https://airbnb.com/rooms/..."/>
            </div>
          </div>
          <div style={{ marginTop:10 }}>
            <div style={s.label}>Notes (check-in time, house code, parking, etc.)</div>
            <textarea style={{ ...s.input, minHeight:70, resize:"vertical", fontFamily:"inherit", fontSize:13, lineHeight:1.5 }}
              value={accomm.notes}
              onChange={e=>setAccomm(a=>({...a,notes:e.target.value}))}
              placeholder="Check-in: 4pm&#10;House code: 1234&#10;Parking in driveway"/>
          </div>
          <button style={{ ...s.btnFire, marginTop:12 }} onClick={async()=>{
            await firestore.update("meta","tournament",{accommodation:accomm});
            showToast("Accommodations saved!");
          }}>Save Accommodations</button>
        </div>
      </div>

      {/* Day management */}
      <div style={{ ...s.card, marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.5)", marginBottom:4 }}>Days</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:10 }}>Use ◀ ▶ to set the order days appear in the app.</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
          {allCurrentDays.map(day=>(
            <div key={day} style={{ display:"flex", alignItems:"center", gap:4 }}>
              {editingDayName===day
                ? <input autoFocus style={{ ...s.input, width:120, fontSize:12, padding:"4px 8px" }} value={editingDayValue} onChange={e=>setEditingDayValue(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter") renameDay(day,editingDayValue); if(e.key==="Escape") setEditingDayName(null); }}
                    onBlur={()=>renameDay(day,editingDayValue)}/>
                : <div style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20 }}>
                    <button onClick={()=>moveDay(day,-1)} title="Move earlier" style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:12, padding:"0 2px 0 0" }}>◀</button>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.7)" }}>{day}</span>
                    <button onClick={()=>moveDay(day,1)} title="Move later" style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:12, padding:"0 0 0 2px" }}>▶</button>
                    <button onClick={()=>{setEditingDayName(day);setEditingDayValue(day);}} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", cursor:"pointer", fontSize:11, padding:"0 0 0 2px" }}>✏️</button>
                    <button onClick={async()=>{
                      const hasItems=schedule.some(i=>i.day===day);
                      if(hasItems&&!window.confirm(`Delete "${day}" and all its events?`)) return;
                      if(hasItems) { for(const i of schedule.filter(x=>x.day===day)) await firestore.delete("schedule",i.id); }
                      const newDays2 = days.filter(d2=>d2!==day);
                      await saveDays(newDays2);
                      showToast(`"${day}" deleted`);
                    }} style={{ background:"none", border:"none", color:"rgba(255,85,85,0.5)", cursor:"pointer", fontSize:10, padding:"0 0 0 2px" }}>✕</button>
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
          <div><div style={s.label}>Time</div><input style={s.input} type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></div>
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
          </div>
        );
      })}

    </div>
  );
}

// ── COMPETITIONS ────────────────────────────────────────────────────────────
function CompetitionsSection({ competitions, showToast }) {
  const blank = { name:"", icon:"🏅", desc:"", section:"main", isScramble:false };
  const [form, setForm]     = useState(blank);
  const [editing, setEditing] = useState(null);

  const sorted = [...competitions].sort((a,b)=>(a.order??0)-(b.order??0));
  const mainComps = sorted.filter(c=>c.section!=="side");
  const sideComps = sorted.filter(c=>c.section==="side");

  const save = async () => {
    try {
      if (editing) {
        await firestore.update("competitions", editing, {...form});
        showToast("Updated!");
        setEditing(null);
      } else {
        const maxOrder = competitions.reduce((m,c)=>Math.max(m,c.order??0),0);
        await firestore.add("competitions", {...form, order:maxOrder+10});
        showToast("Added!");
      }
      setForm(blank);
    } catch(e) { showToast("Error: "+e.message, true); }
  };

  const CompCard = ({c}) => (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,marginBottom:6}}>
      <span style={{fontSize:20}}>{c.icon||"🏅"}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700}}>{c.name}</div>
        <div style={{display:"flex",gap:8,marginTop:3}}>
          {c.isScramble&&<span style={{fontSize:10,color:"#ffd700",background:"rgba(255,200,0,0.1)",padding:"1px 6px",borderRadius:4}}>🏌️ Scramble</span>}
          <span style={{fontSize:10,color:c.section==="side"?"rgba(255,255,255,0.3)":"rgba(74,222,128,0.7)",background:c.section==="side"?"rgba(255,255,255,0.04)":"rgba(74,222,128,0.08)",padding:"1px 6px",borderRadius:4}}>{c.section==="side"?"Side":"Main Event"}</span>
        </div>
      </div>
      <button style={{...s.btnGhost,padding:"2px 6px",fontSize:14}} onClick={async()=>{
        const effSec=(s)=>s==="side"?"side":"main";
        const list=[...competitions].sort((a,b)=>(a.order??0)-(b.order??0)).filter(x=>effSec(x.section)===effSec(c.section));
        const ci=list.findIndex(x=>x.id===c.id);
        if(ci<=0) return;
        const aId=list[ci].id, bId=list[ci-1].id;
        const aOrd=ci*10, bOrd=(ci-1)*10;
        await firestore.update("competitions",aId,{order:bOrd});
        await firestore.update("competitions",bId,{order:aOrd});
      }}>↑</button>
      <button style={{...s.btnGhost,padding:"2px 6px",fontSize:14}} onClick={async()=>{
        const effSec=(s)=>s==="side"?"side":"main";
        const list=[...competitions].sort((a,b)=>(a.order??0)-(b.order??0)).filter(x=>effSec(x.section)===effSec(c.section));
        const ci=list.findIndex(x=>x.id===c.id);
        if(ci>=list.length-1) return;
        const aId=list[ci].id, bId=list[ci+1].id;
        const aOrd=(ci+1)*10, bOrd=ci*10;
        await firestore.update("competitions",aId,{order:aOrd});
        await firestore.update("competitions",bId,{order:bOrd});
      }}>↓</button>
      <button style={s.btnGhost} onClick={()=>{setEditing(c.id);setForm({name:c.name||"",icon:c.icon||"🏅",desc:c.desc||"",section:c.section||"main",isScramble:c.isScramble||false});}}>✏️</button>
      <button style={s.btnDanger} onClick={async()=>{if(window.confirm("Delete?"))await firestore.delete("competitions",c.id);}}>✕</button>
    </div>
  );

  return (
    <div>
      <div style={s.sectionTitle}>🎯 Competitions</div>

      {/* Form */}
      <div className="card" style={{padding:16,marginBottom:20}}>
        <div style={s.label}>{editing?"Edit Competition":"Add Competition"}</div>
        <div style={s.grid2}>
          <div>
            <div style={s.label}>Icon</div>
            <input style={{...s.input,width:60}} value={form.icon} onChange={e=>setForm(f=>({...f,icon:e.target.value}))} placeholder="🏅"/>
          </div>
          <div>
            <div style={s.label}>Name</div>
            <input style={s.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Four-Ball"/>
          </div>
        </div>
        <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
            <input type="radio" checked={form.section==="main"} onChange={()=>setForm(f=>({...f,section:"main"}))}/>
            <span style={{color:"rgba(74,222,128,0.8)"}}>Main Event</span>
          </label>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
            <input type="radio" checked={form.section==="side"} onChange={()=>setForm(f=>({...f,section:"side"}))}/>
            <span style={{color:"rgba(255,255,255,0.5)"}}>Side Competition</span>
          </label>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
            <input type="checkbox" checked={form.isScramble||false} onChange={e=>setForm(f=>({...f,isScramble:e.target.checked}))}/>
            <span style={{color:"#ffd700"}}>🏌️ Is Scramble (F9/B9/18H)</span>
          </label>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button style={s.btnPrimary} onClick={save}>{editing?"Save":"Add"}</button>
          {editing&&<button style={s.btnGhost} onClick={()=>{setEditing(null);setForm(blank);}}>Cancel</button>}
        </div>
      </div>

      {/* Main Events */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:700,color:"rgba(74,222,128,0.7)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>⭐ Main Events</div>
        {mainComps.length===0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.25)"}}>No main events yet</div>}
        {mainComps.map(c=><CompCard key={c.id} c={c}/>)}
      </div>

      {/* Side Competitions */}
      <div>
        <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>🎪 Side Competitions</div>
        {sideComps.length===0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.25)"}}>No side competitions yet</div>}
        {sideComps.map(c=><CompCard key={c.id} c={c}/>)}
      </div>
    </div>
  );
}


function CloseOutTournament({ history, rounds, competitions, meta, showToast }) {
  const [busy, setBusy] = useState(false);
  const curYear = Number(meta?.year || new Date().getFullYear());

  const closeOut = async () => {
    if (!window.confirm(`Close out the ${curYear} tournament?\n\nThis will:\n• Import all completed matches from Rounds into ${curYear} history\n• Calculate & save the final score and winner\n\n(Captains and other fields already on the ${curYear} entry are kept as-is.)`)) return;
    setBusy(true);
    try {
      // 1) Find or create the history doc for the current year
      let yearDoc = history.find(h => Number(h.year) === curYear);
      let yearId = yearDoc?.id;
      if (!yearId) {
        const ref = await firestore.add("history", { year: curYear, winner:"TBD", notes:"", nukes_pts:0, whales_pts:0, location:meta?.location||"", course:meta?.course||"", matches:[], superlatives:[] });
        yearId = ref.id;
        yearDoc = { matches: [] };
      }
      const currentMatches = yearDoc.matches || [];

      // 2) Import completed matches (same dedupe as Import Matches)
      const newMatches = [];
      rounds.forEach(round => {
        (round.matchups || []).forEach(m => {
          if (!m.nukes?.some(Boolean) && !m.whales?.some(Boolean)) return;
          if (!m.winner) return;
          const alreadyImported = currentMatches.some(em =>
            JSON.stringify((em.nukes||[]).sort()) === JSON.stringify((m.nukes||[]).filter(Boolean).sort()) &&
            JSON.stringify((em.whales||[]).sort()) === JSON.stringify((m.whales||[]).filter(Boolean).sort())
          );
          if (alreadyImported) return;
          const comp = (competitions||[]).find(c=>c.name===m.competitionName);
          const defaultPts = Number(meta?.compPts?.[comp?.id]) || 2;
          newMatches.push({
            nukes: (m.nukes||[]).filter(Boolean),
            whales: (m.whales||[]).filter(Boolean),
            winner: m.winner || null,
            roundName: m.subLabel==="Front 9"?"Front 9 Scramble":m.subLabel==="Back 9"?"Back 9 Scramble":m.subLabel==="18-Holes"?"18-Hole Scramble":m.subLabel||m.competitionName||round.name||"",
            pointsWorth: Number(m.pointsWorth) || defaultPts,
            ...(m.subLabel ? { subLabel: m.subLabel } : {}),
            ...(m.scrambleGroup ? { scrambleGroup: m.scrambleGroup } : {}),
          });
        });
      });

      // 3) Compute final score + winner from ALL matches on the year
      const allMatches = [...currentMatches, ...newMatches];
      let nukesPts = 0, whalesPts = 0;
      allMatches.forEach(m => {
        if (!m.winner || m.type==="heading") return;
        const pts = Number(m.pointsWorth) || 0;
        if (m.winner === "nukes") nukesPts += pts;
        else if (m.winner === "whales") whalesPts += pts;
        else if (m.winner === "tie") { nukesPts += pts/2; whalesPts += pts/2; }
      });
      const winner = nukesPts > whalesPts ? "THE NUKES" : whalesPts > nukesPts ? "THE WHALES" : "TBD";
      await firestore.update("history", yearId, {
        matches: allMatches,
        nukes_pts: Math.round(nukesPts*10)/10,
        whales_pts: Math.round(whalesPts*10)/10,
        winner,
      });

      // 4) Optionally clear rounds
      if (rounds.length > 0 && window.confirm(`${curYear} archived: ${winner==="TBD"?"Tie":winner} wins ${Math.round(nukesPts*10)/10}–${Math.round(whalesPts*10)/10}.\n\nDelete all ${rounds.length} round(s) and their matchups now?\n\nOK = delete rounds   ·   Cancel = keep rounds`)) {
        for (const r of rounds) await firestore.delete("rounds", r.id);
      }

      // 5) Optionally advance the tournament year
      if (window.confirm(`Advance tournament year from ${curYear} to ${curYear+1}?\n\nOK = advance to ${curYear+1}   ·   Cancel = stay on ${curYear}`)) {
        await firestore.update("meta","tournament",{ year: curYear+1 });
      }

      showToast(`🏁 ${curYear} closed out!`);
    } catch(e) { showToast("Error: " + e.message, true); }
    setBusy(false);
  };

  return (
    <div style={{ ...s.card, marginBottom:16, borderColor:"rgba(255,200,0,0.25)", background:"rgba(255,200,0,0.04)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontSize:14, fontWeight:800, color:"#ffd700" }}>🏁 Close Out {curYear} Tournament</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:3, lineHeight:1.5 }}>
            One-tap archive: imports completed matches, saves final score & winner, then (optionally) clears rounds and advances the year. Captains you've set are preserved.
          </div>
        </div>
        <button style={{ padding:"10px 18px", background:"rgba(255,200,0,0.15)", border:"1px solid rgba(255,200,0,0.4)", borderRadius:10, color:"#ffd700", fontFamily:"inherit", fontSize:13, fontWeight:800, cursor:"pointer" }}
          onClick={closeOut} disabled={busy}>
          {busy ? "Archiving..." : "Close Out"}
        </button>
      </div>
    </div>
  );
}

function HistorySection({ history, drafts, roster, competitions, rounds, meta, showToast }) {
  const blank = { year:new Date().getFullYear()-1, winner:"TBD", notes:"", nukes_pts:"", whales_pts:"", location:"", course:"" };
  const [form, setForm]       = useState(blank);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const save = async () => {
    try {
      const data = { ...form, year:Number(form.year), nukes_pts:Number(form.nukes_pts)||0, whales_pts:Number(form.whales_pts)||0, nukes_captain:form.nukes_captain||"", whales_captain:form.whales_captain||"" };
      if (editing) { await firestore.update("history",editing,data); showToast("Updated!"); setEditing(null); }
      else { await firestore.add("history",{...data,matches:[],superlatives:[]}); showToast("Year added!"); }
      setForm(blank);
    } catch(e) { showToast(e.message,true); }
  };

  return (
    <div>
      <div style={s.sectionTitle}>📜 Tournament History</div>

      <CloseOutTournament history={history} rounds={rounds} competitions={competitions} meta={meta} showToast={showToast}/>

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
          <div><div style={s.label}>☢️ Nukes Captain</div>
            <select style={s.select} value={form.nukes_captain||""} onChange={e=>setForm(f=>({...f,nukes_captain:e.target.value}))}>
              <option value="">— Select —</option>
              {[...roster].filter(p=>{const d=drafts.find(dr=>String(dr.year)===String(form.year));return !d||d.assignments?.[p.name]==="nukes";}).sort((a,b)=>a.name.localeCompare(b.name)).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div><div style={s.label}>🐋 Whales Captain</div>
            <select style={s.select} value={form.whales_captain||""} onChange={e=>setForm(f=>({...f,whales_captain:e.target.value}))}>
              <option value="">— Select —</option>
              {[...roster].filter(p=>{const d=drafts.find(dr=>String(dr.year)===String(form.year));return !d||d.assignments?.[p.name]==="whales";}).sort((a,b)=>a.name.localeCompare(b.name)).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div style={s.grid2}>
          <div style={{ marginTop:10 }}><div style={s.label}>Location</div><input style={s.input} value={form.location||""} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Myrtle Beach, SC"/></div>
          <div style={{ marginTop:10 }}><div style={s.label}>Golf Course</div><input style={s.input} value={form.course||""} onChange={e=>setForm(f=>({...f,course:e.target.value}))} placeholder="e.g. Barefoot Resort"/></div>
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
                    {h.nukes_pts||0}–{h.whales_pts||0}
                    {matchCount>0&&<span style={{ marginLeft:8, color:"rgba(255,255,255,0.3)" }}>{matchCount} match{matchCount!==1?"es":""}</span>}
                    {supCount>0&&<span style={{ marginLeft:8, color:"rgba(255,200,0,0.5)" }}>🏅 {supCount}</span>}
                  </div>
                  {(h.location||h.course)&&<div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:2 }}>📍 {[h.course,h.location].filter(Boolean).join(" · ")}</div>}
                </div>
                <div style={s.row}>
                  <button style={s.btnGhost} onClick={()=>setExpanded(isExpanded?null:h.id)}>{isExpanded?"▲ Hide":"▼ Edit"}</button>
                  <button style={s.btnGhost} onClick={()=>{setEditing(h.id);setForm({year:h.year,winner:h.winner,notes:h.notes||"",nukes_pts:h.nukes_pts||"",whales_pts:h.whales_pts||"",location:h.location||"",course:h.course||"",nukes_captain:h.nukes_captain||"",whales_captain:h.whales_captain||""});}}>✏️</button>
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
                  <ImportFromRounds year={h} rounds={rounds} competitions={competitions} meta={meta} showToast={showToast}/>
                )}

                {/* Year in Review admin controls */}
                <div style={{ padding:"12px 16px", background:"rgba(255,200,0,0.04)", borderBottom:"1px solid rgba(255,200,0,0.1)" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#ffd700", marginBottom:10 }}>🏆 Year in Review</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button style={{ padding:"7px 14px", background:"rgba(255,200,0,0.15)", border:"1px solid rgba(255,200,0,0.3)", borderRadius:8, color:"#ffd700", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}
                      onClick={async()=>{
                        if(!window.confirm("Generate Year in Review? This saves it to this year's history entry.")) return;
                        await firestore.update("history", h.id, { reviewData: { generated: new Date().toISOString() } });
                        showToast("Year in Review generated!");
                      }}>⚡ Generate</button>
                    <button style={{ padding:"7px 14px", background:h.reviewUnlocked?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)", border:`1px solid ${h.reviewUnlocked?"rgba(74,222,128,0.3)":"rgba(255,255,255,0.15)"}`, borderRadius:8, color:h.reviewUnlocked?"#4ade80":"rgba(255,255,255,0.4)", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}
                      onClick={async()=>{
                        await firestore.update("history", h.id, { reviewUnlocked: !h.reviewUnlocked });
                        showToast(h.reviewUnlocked?"Review hidden from players":"Review unlocked for players!");
                      }}>{h.reviewUnlocked?"✓ Unlocked":"🔒 Locked"}</button>
                    {h.reviewData&&<button style={{ padding:"7px 14px", background:"rgba(255,85,85,0.1)", border:"1px solid rgba(255,85,85,0.2)", borderRadius:8, color:"#ff5555", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}
                      onClick={async()=>{
                        if(!window.confirm("Delete the Year in Review card?")) return;
                        await firestore.update("history", h.id, { reviewData: null, reviewUnlocked: false });
                        showToast("Year in Review deleted.");
                      }}>🗑 Delete</button>}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:8 }}>
                    {h.reviewData ? `Generated ${new Date(h.reviewData.generated).toLocaleDateString()}` : "Not generated yet"} · {h.reviewUnlocked ? "Visible to players" : "Hidden from players"}
                  </div>
                </div>

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

function ImportFromRounds({ year, rounds, competitions, meta, showToast }) {
  const [importing, setImporting] = useState(false);

  const doImport = async () => {
    const currentMatches = year.matches || [];
    const newMatches = [];

    rounds.forEach(round => {
      (round.matchups || []).forEach(m => {
        if (!m.nukes?.some(Boolean) && !m.whales?.some(Boolean)) return; // skip empty
        if (!m.winner) return; // only import completed matches
        // Check if this matchup already exists (by player names) to avoid double counting
        const alreadyImported = currentMatches.some(em =>
          JSON.stringify((em.nukes||[]).sort()) === JSON.stringify((m.nukes||[]).filter(Boolean).sort()) &&
          JSON.stringify((em.whales||[]).sort()) === JSON.stringify((m.whales||[]).filter(Boolean).sort())
        );
        if (alreadyImported) return;
        const comp = (competitions||[]).find(c=>c.name===m.competitionName);
        const defaultPts = Number(meta?.compPts?.[comp?.id]) || 2;
        newMatches.push({
          nukes: (m.nukes||[]).filter(Boolean),
          whales: (m.whales||[]).filter(Boolean),
          winner: m.winner || null,
          roundName: m.subLabel==="Front 9"?"Front 9 Scramble":m.subLabel==="Back 9"?"Back 9 Scramble":m.subLabel==="18-Holes"?"18-Hole Scramble":m.subLabel||m.competitionName||round.name||"",
          pointsWorth: Number(m.pointsWorth) || defaultPts,
          ...(m.subLabel ? { subLabel: m.subLabel } : {}),
          ...(m.scrambleGroup ? { scrambleGroup: m.scrambleGroup } : {}),
        });
      });
    });

    if (newMatches.length === 0) {
      showToast("No new matches to import — all already imported or rounds are empty", true);
      return;
    }

    setImporting(true);
    try {
      const allMatches = [...currentMatches, ...newMatches];
      // Calculate points and winner from all matches
      let nukesPts = 0, whalesPts = 0;
      allMatches.forEach(m => {
        if (!m.winner) return;
        const pts = m.pointsWorth || 0;
        const tie = pts / 2;
        if (m.winner === "nukes") nukesPts += pts;
        else if (m.winner === "whales") whalesPts += pts;
        else if (m.winner === "tie") { nukesPts += tie; whalesPts += tie; }
      });
      const winner = nukesPts > whalesPts ? "THE NUKES" : whalesPts > nukesPts ? "THE WHALES" : "TBD";
      await firestore.update("history", year.id, {
        matches: allMatches,
        nukes_pts: Math.round(nukesPts * 10) / 10,
        whales_pts: Math.round(whalesPts * 10) / 10,
        winner,
      });
      showToast(`Imported ${newMatches.length} match${newMatches.length!==1?"es":""}! Score: Nukes ${Math.round(nukesPts*10)/10} – Whales ${Math.round(whalesPts*10)/10}`);
    } catch(e) { showToast("Error: " + e.message, true); }
    setImporting(false);
  };

  return (
    <div style={{ padding:"12px 16px", background:"rgba(74,222,128,0.06)", borderBottom:"1px solid rgba(74,222,128,0.15)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#4ade80" }}>⬇ Import Matches Only</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
            Pull results mid-tournament without archiving. To finalize the year, use 🏁 Close Out at the top instead (it imports, scores, and archives in one step).
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
  // Build options from actual rounds and competitions — no hardcoded Day/Round names
  const compOptions = [
    ...new Set([
      ...(competitions||[]).filter(c=>c.section!=="side").map(c=>c.name),
      "Front 9 Scramble","Back 9 Scramble","18-Hole Scramble",
      // Also include any roundNames already used in this year's matches
      ...(year?.matches||[]).filter(m=>m.roundName).map(m=>m.roundName),
    ])
  ];

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
          <input style={s.input} type="number" step="0.5" value={vals.pointsWorth} onChange={e=>setVals(v=>({...v,pointsWorth:e.target.value}))} placeholder="e.g. 2"/>
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
          {(year.matches||[]).length>0&&(
            <button style={{ ...s.btnDanger, fontSize:11, padding:"5px 10px" }} onClick={async()=>{
              if(!window.confirm(`Clear all ${(year.matches||[]).length} matches from ${year.year}? This can't be undone.`)) return;
              setLocalMatches([]);
              await saveAll([]);
              showToast("All results cleared");
            }}>🗑️ Clear All</button>
          )}
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
                <span data-drag-handle style={{ color:"rgba(255,255,255,0.3)", fontSize:20, paddingTop:4, cursor:"grab", flexShrink:0, padding:"4px 8px", touchAction:"none" }}>⠿</span>
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
  const { items:dragRules, dragOver:dragOverRule, onDragStart:ruleDragStart, onDragEnter:ruleDragEnter, onDragEnd:ruleDragEnd, onTouchStart:ruleTouchStart, onTouchMove:ruleTouchMove, onTouchEnd:ruleTouchEnd } = useDragList(sortedRules);
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
          data-drag-idx={ri}
          onDragStart={()=>ruleDragStart(ri)}
          onDragEnter={()=>ruleDragEnter(ri)}
          onDragEnd={()=>ruleDragEnd("rules")}
          onTouchStart={ruleTouchStart(ri)}
          onTouchMove={ruleTouchMove(ri)}
          onTouchEnd={()=>ruleTouchEnd("rules")}
          onDragOver={e=>e.preventDefault()}
          style={{ ...s.card, padding:"12px 14px", cursor:"grab", opacity:dragOverRule===ri?0.5:1, borderColor:dragOverRule===ri?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
            <span data-drag-handle style={{ color:"rgba(255,255,255,0.3)", fontSize:20, cursor:"grab", padding:"4px 8px", touchAction:"none" }}>⠿</span>
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
// ── HOLE-IN-ONE POOL ─────────────────────────────────────────────────────────
function HoleInOneSection({ roster, holePool, meta, showToast }) {
  const currentYear = meta?.year || new Date().getFullYear();
  const ledger = holePool?.find(h => h.id === "ledger");
  const [poolDesc, setPoolDesc] = useState(meta?.holePoolDescription||"");

  // Sync poolDesc when meta loads from Firestore (useState only runs once on mount)
  useEffect(()=>{
    if(meta?.holePoolDescription !== undefined) setPoolDesc(meta.holePoolDescription);
  }, [meta?.holePoolDescription]);

  const [winnerYear, setWinnerYear]     = useState(String(currentYear));
  const [winnerName, setWinnerName]     = useState("");
  const [winnerDate, setWinnerDate]     = useState("");
  const [showWinner, setShowWinner]     = useState(false);
  const [editYear, setEditYear]         = useState(null);
  const [editBuyIn, setEditBuyIn]       = useState("");
  const [expanded, setExpanded]         = useState({});
  const [editingWinner, setEditingWinner]   = useState(null);
  const [editWinnerForm, setEditWinnerForm] = useState({});

  const yearEntries = (ledger?.yearEntries || []).sort((a,b)=>b.year-a.year);
  const winners     = ledger?.winners || [];

  // ── Vesting-by-tenure model ─────────────────────────────────────────────────
  // Each year is a "layer" worth (players opted in that year × that year's buy-in).
  // Acing wins the FULL layer of every year you opted into that is still outstanding;
  // those years are then consumed and can never be won again. Years you sat out roll
  // forward for someone who was in them. No catch-up — you simply can't win years you
  // weren't part of, and you can join any year for that year's buy-in.
  const layerOf   = (e) => (e?.optedIn||[]).length * Number(e?.buyIn||0);
  const consumedYears = new Set(winners.flatMap(w => (w.yearsWon||[]).map(Number)));
  const isConsumed = (yr) => consumedYears.has(Number(yr));

  const totalContributed = yearEntries.reduce((s,e)=>s+layerOf(e), 0);
  const totalPaidOut     = winners.reduce((s,w)=>s+Number(w.amount||0), 0);
  const runningTotal     = totalContributed - totalPaidOut; // == sum of outstanding layers

  // Money a player would take if they aced now: full OUTSTANDING layers for every year
  // they opted into (optionally capped at an ace year).
  const couldWin = (name, upToYear=Infinity) => yearEntries
    .filter(e => (e.optedIn||[]).includes(name) && !isConsumed(e.year) && Number(e.year) <= Number(upToYear))
    .reduce((s,e)=>s+layerOf(e), 0);
  // What a player has personally put in across the years they opted into.
  const boughtIn = (name) => yearEntries
    .filter(e => (e.optedIn||[]).includes(name))
    .reduce((s,e)=>s+Number(e.buyIn||0), 0);

  const sortedRoster = [...roster].sort((a,b)=>a.name.localeCompare(b.name));
  const toggleExpanded = (yr) => setExpanded(e=>({...e,[yr]:!e[yr]}));

  const saveLedger = async (updates) => {
    try {
      if (ledger) { await firestore.update("holepool", "ledger", updates); }
      else { await firestore.set("holepool", "ledger", { yearEntries:[], winners:[], ...updates }); }
    } catch(e) { showToast(e.message, true); }
  };

  const upsertYearEntry = (year, patch, entries=yearEntries) => {
    const existing = entries.find(e=>String(e.year)===String(year)) || { year:Number(year), buyIn:0, optedIn:[], contributions:0 };
    const updated = { ...existing, ...patch };
    updated.contributions = (updated.optedIn||[]).length * (Number(updated.buyIn)||0);
    const rest = entries.filter(e=>String(e.year)!==String(year));
    return [...rest, updated].sort((a,b)=>b.year-a.year);
  };

  // Replays recorded wins (in order) against the CURRENT year data so each winner's
  // consumed years + payout always reflect the latest opt-ins. This keeps the pool
  // total, could-win, and player-card amounts consistent no matter what an admin
  // edits — including toggling players in/out of a year that was already won.
  const reconcileWinners = (entries, wins) => {
    const consumed = new Set();
    return (wins||[]).map(w => {
      const yearsWon = entries
        .filter(e => (e.optedIn||[]).includes(w.name) && !consumed.has(Number(e.year)) && Number(e.year) <= Number(w.year) && ((e.optedIn||[]).length * Number(e.buyIn||0)) > 0)
        .map(e => Number(e.year));
      yearsWon.forEach(y => consumed.add(y));
      const amount = yearsWon.reduce((s,y)=>s+layerOf(entries.find(x=>Number(x.year)===y)),0);
      return { ...w, yearsWon, amount };
    });
  };

  // Single commit path: whatever changed (years or winners), re-reconcile the wins
  // against the resulting year data and persist both together.
  const commit = async ({ entries = yearEntries, wins = winners }) => {
    await saveLedger({ yearEntries: entries, winners: reconcileWinners(entries, wins) });
  };

  // Informational only now (no locking) — flags which years a recorded win consumed.
  const yearIsWon = (yr) => isConsumed(yr);

  const togglePlayer = async (name, year) => {
    const entry = yearEntries.find(e=>String(e.year)===String(year)) || { year:Number(year), buyIn:0, optedIn:[], contributions:0 };
    const optedIn = entry.optedIn||[];
    const newOptedIn = optedIn.includes(name) ? optedIn.filter(n=>n!==name) : [...optedIn, name];
    await commit({ entries: upsertYearEntry(year, { optedIn: newOptedIn }) });
  };

  const addYear = async () => {
    if (!editYear||!editBuyIn) return showToast("Year and buy-in required", true);
    await commit({ entries: upsertYearEntry(editYear, { buyIn: Number(editBuyIn) }) });
    showToast(`${editYear} added — toggle players below`);
    setEditYear(null); setEditBuyIn("");
  };

  const recordWinner = async () => {
    if (!winnerName.trim()) return showToast("Select a winner", true);
    const take = couldWin(winnerName, Number(winnerYear));
    if (take <= 0) return showToast(`${winnerName} has no outstanding pool to win`, true);
    const winnerInput = { name:winnerName.trim(), year:Number(winnerYear), date:winnerDate ? new Date(winnerDate).toISOString() : null };
    await commit({ wins:[...winners, winnerInput] });
    setWinnerName(""); setWinnerDate(""); setShowWinner(false);
    showToast(`🎉 ${winnerName} wins $${Math.round(take)}!`);
  };

  // Players sorted by what they could win right now (for the standings card)
  const standings = [...roster]
    .map(p => ({ name:p.name, photoURL:p.photoURL, boughtIn:boughtIn(p.name), couldWin:couldWin(p.name) }))
    .filter(p => p.boughtIn > 0)
    .sort((a,b)=> b.couldWin - a.couldWin || b.boughtIn - a.boughtIn || a.name.localeCompare(b.name));

  const previewTake = winnerName ? couldWin(winnerName, Number(winnerYear)) : 0;

  return (
    <div>
      <div style={s.sectionTitle}>⛳ Hole-in-One Pool</div>

      {/* Editable description */}
      <div style={{ ...s.card, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>📝 Pool Description</div>
        <textarea
          style={{ ...s.input, width:"100%", minHeight:72, resize:"vertical", fontFamily:"inherit", fontSize:12, lineHeight:1.5 }}
          value={poolDesc}
          onChange={e=>setPoolDesc(e.target.value)}
          placeholder="Describe the pool rules, how it works, etc."
        />
        <button style={{ ...s.btn, marginTop:8, fontSize:12 }} onClick={async()=>{
          await firestore.update("meta","tournament",{holePoolDescription:poolDesc});
          showToast("Description saved!");
        }}>Save Description</button>
      </div>

      {/* Running total */}
      <div style={{ ...s.card, background:"rgba(74,222,128,0.06)", borderColor:"rgba(74,222,128,0.2)", textAlign:"center", marginBottom:16 }}>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>💰 Total Pool (Outstanding)</div>
        <div style={{ fontSize:52, fontWeight:900, color:"#4ade80", lineHeight:1 }}>${Math.round(runningTotal)}</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:6 }}>${Math.round(totalContributed)} contributed · ${Math.round(totalPaidOut)} paid out</div>
      </div>

      {/* Add historical year */}
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>📋 Add / Edit a Year</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Year</div><input style={s.input} type="number" value={editYear||""} onChange={e=>setEditYear(e.target.value)} placeholder={String(currentYear-1)}/></div>
          <div><div style={s.label}>Buy-In Per Player ($)</div><input style={s.input} type="number" step="1" value={editBuyIn} onChange={e=>setEditBuyIn(e.target.value)} placeholder="e.g. 20"/></div>
        </div>
        <button style={{ ...s.btnFire, marginTop:12 }} onClick={addYear}>Save Year</button>
      </div>

      {/* Per-year opt-in toggles — collapsible */}
      {yearEntries.map(entry=>{
        const isCurrentYear = String(entry.year)===String(currentYear);
        const isExpanded = isCurrentYear ? (expanded[entry.year] !== false) : !!expanded[entry.year];
        const isCollapsed = !isExpanded;
        const won = yearIsWon(entry.year);
        return (
          <div key={entry.year} style={s.card}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ flex:1, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }} onClick={()=>toggleExpanded(entry.year)}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>
                    {isCurrentYear?`⭐ ${entry.year} (Current Year)`:String(entry.year)}
                    {won&&<span style={{ fontSize:11, fontWeight:700, color:"#ffd700", marginLeft:8 }}>🏆 WON</span>}
                    <span style={{ fontSize:12, fontWeight:400, color:"rgba(255,255,255,0.35)", marginLeft:8 }}>
                      ${entry.buyIn||0}/player · {(entry.optedIn||[]).length} players · ${layerOf(entry)} layer
                    </span>
                  </div>
                </div>
                <span style={{ color:"rgba(255,255,255,0.3)", fontSize:12 }}>{isCollapsed?"▶ Show":"▼ Hide"}</span>
              </div>
              <button style={{ ...s.btnDanger, padding:"3px 8px", fontSize:11, flexShrink:0 }} onClick={async()=>{
                if(window.confirm(`Delete ${entry.year} from the pool?${won?" It was won — the winner's payout will be recalculated.":""} This cannot be undone.`)) {
                  await commit({ entries: yearEntries.filter(e=>String(e.year)!==String(entry.year)) });
                  showToast(`${entry.year} removed`);
                }
              }}>✕</button>
            </div>
            {!isCollapsed&&(
              <div style={{ marginTop:12 }}>
                {won&&<div style={{ fontSize:12, color:"#ffd700", marginBottom:8 }}>🏆 This year was won — editing opt-ins here will recompute the winner's payout.</div>}
                {!entry.buyIn&&!won&&<div style={{ fontSize:12, color:"rgba(255,200,0,0.7)", marginBottom:8 }}>⚠️ Set a buy-in amount first</div>}
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {sortedRoster.map(p=>{
                    const inPool = (entry.optedIn||[]).includes(p.name);
                    return (
                      <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:inPool?"rgba(74,222,128,0.07)":"rgba(255,255,255,0.02)", border:`1px solid ${inPool?"rgba(74,222,128,0.2)":"rgba(255,255,255,0.06)"}`, borderRadius:8 }}>
                        {p.photoURL?<img src={p.photoURL} alt={p.name} style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover" }}/>:<div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 }}>{p.name?.[0]}</div>}
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600 }}>{p.name}</div>
                        </div>
                        {inPool&&<div style={{ fontSize:11, color:"#4ade80" }}>${entry.buyIn||0}/yr</div>}
                        <button onClick={()=>togglePlayer(p.name, entry.year)}
                          style={{ padding:"4px 12px", borderRadius:8, border:`1px solid ${inPool?"rgba(74,222,128,0.4)":"rgba(255,255,255,0.12)"}`, background:inPool?"rgba(74,222,128,0.12)":"none", color:inPool?"#4ade80":"rgba(255,255,255,0.35)", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                          {inPool?"✓ In":"Out"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Player standings — bought in vs. potential winnings */}
      {standings.length>0&&(
        <div style={s.card}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📊 Player Standings</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:12 }}>What each player has put in, and what they'd win if they aced now (full pot from their opted-in years).</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {standings.map(p=>(
              <div key={p.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8 }}>
                {p.photoURL?<img src={p.photoURL} alt={p.name} style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover" }}/>:<div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 }}>{p.name?.[0]}</div>}
                <div style={{ flex:1, fontSize:13, fontWeight:600 }}>{p.name}</div>
                <div style={{ textAlign:"right", minWidth:70 }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>in ${p.boughtIn}</div>
                </div>
                <div style={{ textAlign:"right", minWidth:80 }}>
                  <div style={{ fontSize:16, fontWeight:900, color:"#4ade80" }}>${p.couldWin}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>could win</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record winner — toggle with year selector */}
      <div style={s.card}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#ffd700" }}>🏆 Record Hole-in-One Winner</div>
          <button style={{ ...s.btnGhost, fontSize:11 }} onClick={()=>setShowWinner(w=>!w)}>{showWinner?"Cancel":"Record Winner"}</button>
        </div>
        {showWinner&&(
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:12 }}>
              The winner takes the full pot from every year they opted into (up to the ace year) that hasn't already been won. Those years are then locked.
            </div>
            <div style={s.grid2}>
              <div>
                <div style={s.label}>Ace Year</div>
                <select style={s.select} value={winnerYear} onChange={e=>setWinnerYear(e.target.value)}>
                  {yearEntries.map(e=><option key={e.year} value={e.year}>{e.year}</option>)}
                </select>
              </div>
              <div>
                <div style={s.label}>Winner (from roster)</div>
                <select style={s.select} value={winnerName} onChange={e=>setWinnerName(e.target.value)}>
                  <option value="">— Select player —</option>
                  {sortedRoster.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
            </div>
            {winnerName&&(
              <div style={{ fontSize:12, color:"#4ade80", marginTop:8 }}>
                {winnerName} would win <b>${Math.round(previewTake)}</b>{previewTake<runningTotal?` · $${Math.round(runningTotal-previewTake)} rolls over`:" · takes the whole pot"}
              </div>
            )}
            <div style={{ marginTop:10 }}>
              <div style={s.label}>Date (optional)</div>
              <input style={s.input} type="date" value={winnerDate} onChange={e=>setWinnerDate(e.target.value)}/>
            </div>
            <button style={{ ...s.btnFire, width:"100%", marginTop:12 }} onClick={recordWinner} disabled={!winnerName||previewTake<=0}>
              Confirm — Pay ${Math.round(previewTake)} to {winnerName||"..."}
            </button>
          </div>
        )}
      </div>

      {/* Past payouts */}
      {winners.length>0&&(
        <div style={s.card}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.5)", marginBottom:10 }}>🎉 Past Payouts</div>
          {[...winners].reverse().map((w,i)=>{
            const realIdx = winners.length - 1 - i;
            const isEditing = editingWinner === realIdx;
            return (
              <div key={i} style={{ background:"rgba(255,200,0,0.06)", border:"1px solid rgba(255,200,0,0.15)", borderRadius:10, padding:"10px 12px", marginBottom:6 }}>
                {isEditing ? (
                  <div>
                    <div style={s.grid2}>
                      <div>
                        <div style={s.label}>Winner</div>
                        <select style={s.select} value={editWinnerForm.name} onChange={e=>setEditWinnerForm(f=>({...f,name:e.target.value}))}>
                          {sortedRoster.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={s.label}>Ace Year</div>
                        <select style={s.select} value={editWinnerForm.year} onChange={e=>setEditWinnerForm(f=>({...f,year:Number(e.target.value)}))}>
                          {yearEntries.map(e=><option key={e.year} value={e.year}>{e.year}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop:10 }}>
                      <div style={s.label}>Date (optional)</div>
                      <input style={s.input} type="date" value={editWinnerForm.date||""} onChange={e=>setEditWinnerForm(f=>({...f,date:e.target.value}))}/>
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:10 }}>
                      <button style={s.btnFire} onClick={async()=>{
                        const date = editWinnerForm.date ? new Date(editWinnerForm.date).toISOString() : null;
                        const updated = winners.map((w2,i2)=>i2===realIdx?{...w2, name:editWinnerForm.name, year:Number(editWinnerForm.year), date}:w2);
                        await commit({ wins: updated });
                        setEditingWinner(null); showToast("Updated!");
                      }}>Save</button>
                      <button style={s.btnGhost} onClick={()=>setEditingWinner(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ fontSize:20 }}>⛳</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700 }}>{w.name}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{w.year}{w.date?` · ${new Date(w.date).toLocaleDateString()}`:""}{(w.yearsWon||[]).length>0?` · won ${(w.yearsWon||[]).length} year${(w.yearsWon||[]).length>1?"s":""}`:""}</div>
                    </div>
                    <div style={{ fontSize:18, fontWeight:900, color:"#ffd700" }}>${Math.round(w.amount||0)}</div>
                    <button style={{ ...s.btnGhost, padding:"3px 8px", fontSize:11 }} onClick={()=>{setEditingWinner(realIdx);setEditWinnerForm({name:w.name,year:w.year,date:w.date?new Date(w.date).toISOString().split("T")[0]:""});}}>✏️</button>
                    <button style={{ ...s.btnDanger, padding:"3px 8px", fontSize:11 }} onClick={async()=>{
                      if(window.confirm("Remove this winner? Its years will be released back into the pool.")) {
                        await commit({ wins: winners.filter((_,i2)=>i2!==realIdx) });
                        showToast("Removed!");
                      }
                    }}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── LOCATION AUTOCOMPLETE ─────────────────────────────────────────────────
function LocationAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value||"");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useState(null);

  const search = async (q) => {
    if (q.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
      const data = await res.json();
      setSuggestions((data.results||[]).map(r => ({
        label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      })));
    } catch(e) {}
    setLoading(false);
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    setOpen(true);
    clearTimeout(debounceRef[0]);
    debounceRef[0] = setTimeout(() => search(q), 400);
  };

  const select = (label) => {
    setQuery(label);
    onChange(label);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div style={{ position:"relative" }}>
      <input style={s.input} value={query} onChange={handleChange}
        onFocus={()=>query.length>=3&&setOpen(true)}
        onBlur={()=>setTimeout(()=>setOpen(false),200)}
        placeholder="e.g. Pebble Beach, CA"/>
      {loading && <div style={{ position:"absolute", right:10, top:10, fontSize:11, color:"rgba(255,255,255,0.3)" }}>...</div>}
      {open && suggestions.length>0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:100, background:"#1a2235", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, marginTop:4, overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
          {suggestions.map((s,i)=>(
            <div key={i} onMouseDown={()=>select(s.label)}
              style={{ padding:"10px 12px", fontSize:13, color:"rgba(255,255,255,0.8)", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.06)", lineHeight:1.4 }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              📍 {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsSection({ meta, history, competitions, showToast }) {
  const { data: votes } = useCollection("votes");
  const [form, setForm] = useState({ name:"", year:"", date:"", startTime:"10:00", location:"", tagline:"" });
  const [loaded, setLoaded] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody]   = useState("");
  const [sending, setSending]       = useState(false);
  const { data: fcmTokens } = useCollection("fcm_tokens");
  const [uploadingImg, setUploadingImg] = useState(false);

  // Countdown "It's Time" image — uploads to Cloudinary and saves the URL immediately
  // (merge-update so it never clobbers other settings).
  const handleItsTimeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = await uploadToCloudinary(file, "photo");
      await firestore.update("meta","tournament",{ itsTimeImage:url });
      showToast("Countdown image saved!");
    } catch(err) { showToast(err.message || "Upload failed", true); }
    setUploadingImg(false);
    if (e.target) e.target.value = "";
  };

  if (meta&&!loaded) {
    const hcpFields = {};
    (competitions||[]).forEach(c => {
      hcpFields[`hcpAllowance_${c.id}`] = meta?.hcpAllowances?.[c.id] ?? "";
      hcpFields[`teamFormat_${c.id}`] = meta?.teamFormats?.[c.id] ?? false;
      hcpFields[`compPts_${c.id}`] = meta?.compPts?.[c.id] ?? "";
    });
    setForm({ name:meta.name||"", year:meta.year||"", date:meta.date||"", startTime:meta.startTime||"10:00", location:meta.location||"", course:meta.course||"", tagline:meta.tagline||"", workerUrl:meta.workerUrl||"", workerSecret:meta.workerSecret||"", weatherLocation:meta.weatherLocation||"", votingOpen:meta.votingOpen||false, superlativeCategories:(meta.superlativeCategories||[]), defaultHcpAllowance:meta.defaultHcpAllowance||"", defaultMatchPts:meta.defaultMatchPts||"2", dynamicColors:meta.dynamicColors||false, ...hcpFields });
    setLoaded(true);
  }

  const save = async () => {
    try {
      const cats = (Array.isArray(form.superlativeCategories) ? form.superlativeCategories : String(form.superlativeCategories||"").split("\n")).map(s=>s.trim()).filter(Boolean);
      // Build hcpAllowances map from per-competition fields
      const hcpAllowances = {};
      (competitions||[]).forEach(c => {
        const val = form[`hcpAllowance_${c.id}`];
        if (val !== "" && val !== undefined) hcpAllowances[c.id] = Number(val);
      });
      const teamFormats = {};
      const compPts = {};
      (competitions||[]).forEach(c => {
        if (form[`teamFormat_${c.id}`]) teamFormats[c.id] = true;
        const p = form[`compPts_${c.id}`];
        if (p !== "" && p !== undefined) compPts[c.id] = Number(p);
      });
      // Use update (merge) — NOT set — so fields owned by other admin sections
      // (holePoolDescription, scheduleDays, accommodation, etc.) are preserved.
      // firestore.set overwrites the whole meta/tournament doc and was silently
      // wiping those fields every time Settings was saved.
      await firestore.update("meta","tournament",{...form,year:Number(form.year),superlativeCategories:cats,hcpAllowances,teamFormats,compPts,defaultMatchPts:Number(form.defaultMatchPts)||2,compSettingsOrder:meta?.compSettingsOrder||[]});
      showToast("Saved!");
    }
    catch(e) { showToast(e.message,true); }
  };

  const sendNotification = async () => {
    if (!notifTitle.trim()) return showToast("Title is required", true);
    const tokens = (fcmTokens||[]).map(t=>t.token).filter(Boolean);
    if (tokens.length === 0) return showToast("No subscribers yet — no one has allowed notifications", true);
    const workerUrl = meta?.workerUrl;
    const workerSecret = meta?.workerSecret;
    if (!workerUrl) return showToast("Cloudflare Worker URL not set — add it in Settings", true);
    setSending(true);
    try {
      const res = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${workerSecret||""}` },
        body: JSON.stringify({ tokens, title: notifTitle.trim(), message: notifBody.trim() }),
      });
      const data = await res.json();
      await firestore.add("notifications", { title:notifTitle.trim(), body:notifBody.trim(), sentAt:new Date().toISOString(), sentTo:data.sent||0 });
      showToast(`📬 Sent to ${data.sent} subscriber${data.sent!==1?"s":""}!`);
      setNotifTitle(""); setNotifBody("");
    } catch(e) { showToast("Failed: " + e.message, true); }
    setSending(false);
  };

  return (
    <div>
      <div style={s.sectionTitle}>⚙️ Settings</div>
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🏆 Tournament Info</div>
        <div style={s.grid2}>
          <div><div style={s.label}>Year</div><input style={s.input} type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))}/></div>
          <div><div style={s.label}>Tournament Date</div><input style={s.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          <div><div style={s.label}>Countdown Start Time</div><input style={s.input} type="time" value={form.startTime||"10:00"} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))}/></div>
          <div style={{ display:"flex", alignItems:"flex-end" }}><div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", lineHeight:1.5 }}>Time is based on each viewer's device timezone</div></div>
        </div>
        <div style={{ marginTop:10 }}>
          <div style={s.label}>Location</div>
          <input style={s.input} value={form.location||""} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Thornton, NH"/>
        </div>
        <div style={{ marginTop:10 }}>
          <div style={s.label}>Golf Course</div>
          <input style={s.input} value={form.course||""} onChange={e=>setForm(f=>({...f,course:e.target.value}))} placeholder="e.g. Whittaker Woods Golf Club"/>
        </div>
      </div>

      {/* Countdown screen image */}
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>⏳ Countdown Screen</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:14 }}>Shown centered below the countdown at all times — both before and after it reaches zero.</div>
        {meta?.itsTimeImage ? (
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <img src={meta.itsTimeImage} alt="It's time" style={{ maxWidth:180, maxHeight:120, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", objectFit:"contain", background:"rgba(255,255,255,0.03)" }}/>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <label style={{ ...s.btnGhost, cursor:uploadingImg?"default":"pointer", textAlign:"center", opacity:uploadingImg?0.6:1 }}>
                {uploadingImg?"Uploading...":"Replace Image"}
                <input type="file" accept="image/*" style={{ display:"none" }} disabled={uploadingImg} onChange={handleItsTimeUpload}/>
              </label>
              <button style={s.btnDanger} onClick={async()=>{ await firestore.update("meta","tournament",{ itsTimeImage:"" }); showToast("Image removed"); }}>Remove</button>
            </div>
          </div>
        ) : (
          <label style={{ ...s.btnFire, cursor:uploadingImg?"default":"pointer", display:"inline-block", opacity:uploadingImg?0.6:1 }}>
            {uploadingImg?"Uploading...":"Upload Image"}
            <input type="file" accept="image/*" style={{ display:"none" }} disabled={uploadingImg} onChange={handleItsTimeUpload}/>
          </label>
        )}
      </div>

      {/* Display & Weather */}
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🎨 Display &amp; Weather</div>
        <div style={{ marginTop:10, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600 }}>Dynamic Team Colors</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>App accent colors shift based on which team is winning</div>
          </div>
          <button style={{ padding:"8px 18px", borderRadius:10, border:`1px solid ${form.dynamicColors?"rgba(74,222,128,0.4)":"rgba(255,255,255,0.15)"}`, background:form.dynamicColors?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)", color:form.dynamicColors?"#4ade80":"rgba(255,255,255,0.5)", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }}
            onClick={()=>setForm(f=>({...f,dynamicColors:!f.dynamicColors}))}>
            {form.dynamicColors?"✓ On":"Off"}
          </button>
        </div>
        <div style={{ marginTop:10 }}>
          <div style={s.label}>Weather City</div>
          <input style={s.input} value={form.weatherLocation||""} onChange={e=>setForm(f=>({...f,weatherLocation:e.target.value}))} placeholder="e.g. Plymouth (nearest city for weather forecast)"/>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>Enter the nearest large city — this is what the weather forecast uses</div>
        </div>
      </div>

      {/* Competition Settings */}
      <div style={s.card}>
        <div style={{ marginTop:10 }}>
          <div style={{fontSize:15,fontWeight:800,color:'#e8edf3',letterSpacing:'0.04em',marginBottom:4}}>Competition Settings</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:10, lineHeight:1.5 }}>
            <strong style={{color:"rgba(255,255,255,0.5)"}}>HCP %</strong> — how much of the handicap difference applies to this format (100% = full strokes, 75% = common for 4-ball).&nbsp;
            <strong style={{color:"rgba(255,255,255,0.5)"}}>Pts</strong> — default points awarded per win in this competition.&nbsp;
            <strong style={{color:"rgba(255,255,255,0.5)"}}>Team?</strong> — whether this is a team format (affects odds model).
          </div>
          {(competitions||[]).length === 0 ? (
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)" }}>No competitions set up yet — add them in the Competitions tab</div>
          ) : (()=>{
            // Use meta.compSettingsOrder for independent ordering, fall back to competitions order
            const savedOrder = meta?.compSettingsOrder || [];
            const orderedComps = [
              ...savedOrder.map(id=>(competitions||[]).find(c=>c.id===id)).filter(Boolean),
              ...(competitions||[]).filter(c=>!savedOrder.includes(c.id))
            ];
            return (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {/* Column headers */}
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0 12px" }}>
                <div style={{ width:20 }}/>
                <div style={{ flex:1 }}/>
                <div style={{ width:75, textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em" }}>HCP %</div>
                <div style={{ width:84, textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em" }}>Pts/Win</div>
                <div style={{ width:60, textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em" }}>Team?</div>
              </div>
              {orderedComps.map((c,ci) => {
                const key = `hcpAllowance_${c.id}`;
                const teamKey = `teamFormat_${c.id}`;
                const ptsKey = `compPts_${c.id}`;
                const val = form[key] ?? (meta?.hcpAllowances?.[c.id] || "");
                const isTeam = form[teamKey] ?? (meta?.teamFormats?.[c.id] || false);
                const ptsVal = form[ptsKey] ?? (meta?.compPts?.[c.id] || "");
                const moveComp = async (fromIdx, toIdx) => {
                  const newOrder = [...orderedComps];
                  const [moved] = newOrder.splice(fromIdx, 1);
                  newOrder.splice(toIdx, 0, moved);
                  const orderIds = newOrder.map(x=>x.id);
                  await firestore.update("meta","tournament",{ compSettingsOrder: orderIds });
                };
                return (
                  <div key={c.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                      <button onClick={()=>ci>0&&moveComp(ci,ci-1)} disabled={ci===0}
                        style={{ background:"none", border:"none", color:ci===0?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.4)", cursor:ci===0?"default":"pointer", fontSize:10, lineHeight:1, padding:"1px 3px" }}>▲</button>
                      <button onClick={()=>ci<orderedComps.length-1&&moveComp(ci,ci+1)} disabled={ci===orderedComps.length-1}
                        style={{ background:"none", border:"none", color:ci===orderedComps.length-1?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.4)", cursor:ci===orderedComps.length-1?"default":"pointer", fontSize:10, lineHeight:1, padding:"1px 3px" }}>▼</button>
                    </div>
                    <div style={{ flex:1, fontSize:13, fontWeight:600 }}>{c.icon||"🏅"} {c.name}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <input style={{ ...s.input, width:55, textAlign:"center" }} type="number" step="5" min="0" max="100"
                        value={val} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                        placeholder="100"/>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>%</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <input style={{ ...s.input, width:64, textAlign:"center" }} type="text" inputMode="decimal"
                        value={ptsVal} onChange={e=>setForm(f=>({...f,[ptsKey]:e.target.value}))}
                        placeholder="2"/>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>pts</span>
                    </div>
                    <button style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${isTeam?"rgba(74,222,128,0.4)":"rgba(255,255,255,0.15)"}`, background:isTeam?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)", color:isTeam?"#4ade80":"rgba(255,255,255,0.4)", fontFamily:"inherit", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}
                      onClick={()=>setForm(f=>({...f,[teamKey]:!isTeam}))}>
                      {isTeam?"✓ Team":"Team?"}
                    </button>
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
      </div>

      {/* Notifications & Access */}
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🔔 Notifications &amp; Access</div>
        <div style={{ marginTop:10, padding:"12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8 }}>
          <div style={s.label}>Admin Codes</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}><strong style={{ color:"#ff4500" }}>nuke2026</strong> · <strong style={{ color:"#00aaff" }}>whale2026</strong> · <strong style={{ color:"#ffd700" }}>admin2026</strong></div>
        </div>
        <div style={{ marginTop:10 }}>
          <div style={s.label}>Cloudflare Worker URL (for push notifications)</div>
          <input style={s.input} value={form.workerUrl||""} onChange={e=>setForm(f=>({...f,workerUrl:e.target.value}))} placeholder="https://nwi-notif.your-name.workers.dev"/>
        </div>
        <div style={{ marginTop:10 }}>
          <div style={s.label}>Worker Secret</div>
          <input style={s.input} type="password" value={form.workerSecret||""} onChange={e=>setForm(f=>({...f,workerSecret:e.target.value}))} placeholder="The secret you set in Cloudflare"/>
        </div>
        <button style={{ ...s.btnFire, marginTop:14, width:"100%" }} onClick={save}>Save Settings</button>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:8, textAlign:"center" }}>Saves Tournament Info, Display &amp; Weather, and Competition Settings. (The countdown image saves on upload.)</div>
      </div>

      {/* Superlatives voting */}
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🏅 Superlatives Voting</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600 }}>Voting Status</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{form.votingOpen?"Players can currently submit votes":"Voting is closed"}</div>
          </div>
          <button style={{ padding:"8px 18px", borderRadius:10, border:`1px solid ${form.votingOpen?"rgba(74,222,128,0.4)":"rgba(255,255,255,0.15)"}`, background:form.votingOpen?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)", color:form.votingOpen?"#4ade80":"rgba(255,255,255,0.5)", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }}
            onClick={async()=>{
              const newVal = !form.votingOpen;
              setForm(f=>({...f,votingOpen:newVal}));
              await firestore.update("meta","tournament",{ votingOpen:newVal });
              showToast(newVal?"Voting opened!":"Voting closed!");
            }}>
            {form.votingOpen?"✓ Open":"Closed"}
          </button>
        </div>
        <div>
          <div style={s.label}>Superlative Categories</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
            {(form.superlativeCategories||[]).length === 0 && (
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", padding:"4px 0" }}>No categories yet — add one below.</div>
            )}
            {(form.superlativeCategories||[]).map((cat,i)=>(
              <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)", minWidth:18, textAlign:"right" }}>{i+1}.</span>
                <input style={{ ...s.input, flex:1 }} value={cat} placeholder="e.g. Most Clutch"
                  onChange={e=>setForm(f=>{ const arr=[...(f.superlativeCategories||[])]; arr[i]=e.target.value; return {...f,superlativeCategories:arr}; })}/>
                <button title="Remove" style={{ padding:"9px 13px", background:"rgba(220,30,30,0.15)", border:"1px solid rgba(220,30,30,0.4)", borderRadius:8, color:"#ff5555", fontFamily:"inherit", fontSize:13, cursor:"pointer", flexShrink:0 }}
                  onClick={()=>setForm(f=>{ const arr=[...(f.superlativeCategories||[])]; arr.splice(i,1); return {...f,superlativeCategories:arr}; })}>✕</button>
              </div>
            ))}
          </div>
          <button style={{ ...s.btnGhost, marginBottom:12 }}
            onClick={()=>setForm(f=>({...f,superlativeCategories:[...(f.superlativeCategories||[]),""]}))}>+ Add Category</button>
          <button style={{ ...s.btnFire, width:"100%" }} onClick={async()=>{
            const cats = (form.superlativeCategories||[]).map(s=>s.trim()).filter(Boolean);
            await firestore.update("meta","tournament",{ superlativeCategories:cats });
            setForm(f=>({...f,superlativeCategories:cats}));
            showToast("Superlatives saved!");
          }}>Save Superlatives</button>
        </div>
      </div>

      {/* Vote results */}
      {(votes||[]).length > 0 && (meta?.superlativeCategories||[]).length > 0 && (
        <div style={s.card}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>📊 Vote Results</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{(votes||[]).length} submission{(votes||[]).length!==1?"s":""}</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...s.btnFire, fontSize:11, padding:"4px 10px" }} onClick={async()=>{
                // Find the current year in history
                const currentYear = meta?.year;
                const histYear = (history||[]).find(h => String(h.year) === String(currentYear));
                if (!histYear) { showToast(`No history entry for ${currentYear} — add it in History tab first`, true); return; }
                if (!window.confirm(`Import superlative winners into ${currentYear} history? This will replace existing superlatives for that year.`)) return;
                // Calculate winners from votes
                const cats = meta?.superlativeCategories || [];
                const newSuperlatives = [];
                cats.forEach(cat => {
                  const tally = {};
                  (votes||[]).forEach(v => { const pick = v.votes?.[cat]; if (pick) tally[pick] = (tally[pick]||0) + 1; });
                  const sorted = Object.entries(tally).sort((a,b)=>b[1]-a[1]);
                  if (sorted.length > 0) {
                    const topCount = sorted[0][1];
                    const winners = sorted.filter(([,c]) => c === topCount).map(([n]) => n);
                    // Only import if clear winner (no tie)
                    if (winners.length === 1) {
                      newSuperlatives.push({ title: cat, player: winners[0] });
                    }
                    // Skip ties — those need manual resolution
                  }
                });
                await firestore.update("history", histYear.id, { superlatives: newSuperlatives });
                showToast(`✅ Imported ${newSuperlatives.length} superlatives into ${currentYear} history!`);
              }}>⬆ Import to History</button>
              <button style={{ ...s.btnDanger, fontSize:11, padding:"4px 10px" }} onClick={async()=>{
                if(!window.confirm("Clear ALL votes? This cannot be undone.")) return;
                for(const v of (votes||[])) await firestore.delete("votes", v.id);
                showToast("All votes cleared!");
              }}>Clear All Votes</button>
            </div>
          </div>
          {(meta.superlativeCategories||[]).map(cat => {
            const tally = {};
            const totalVoters = (votes||[]).length;
            (votes||[]).forEach(v => {
              const pick = v.votes?.[cat];
              if (pick) tally[pick] = (tally[pick]||0) + 1;
            });
            const votesForCat = Object.values(tally).reduce((s,n)=>s+n,0);
            const sorted = Object.entries(tally).sort((a,b)=>b[1]-a[1]);
            return (
              <div key={cat} style={{ marginBottom:18, paddingBottom:18, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#ffd700", letterSpacing:"0.08em", textTransform:"uppercase" }}>{cat}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{votesForCat}/{totalVoters} voted</div>
                </div>
                {sorted.length === 0 ? (
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)" }}>No votes yet</div>
                ) : sorted.map(([name, count], i) => {
                  const pct = Math.round((count / totalVoters) * 100);
                  const isWinner = i === 0 && (sorted.length === 1 || sorted[1][1] < count);
                  const isTied = i === 0 && sorted.length > 1 && sorted[1][1] === count;
                  return (
                    <div key={name} style={{ marginBottom:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                        <span style={{ fontWeight:isWinner||isTied?700:400, color:isWinner?"#4ade80":isTied?"#ffd700":"rgba(255,255,255,0.6)" }}>
                          {isWinner?"🏅 ":isTied?"🤝 ":""}{name}
                        </span>
                        <span style={{ color:"rgba(255,255,255,0.4)" }}>{count}/{totalVoters} · {pct}%</span>
                      </div>
                      <div style={{ height:5, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:isWinner?"#4ade80":isTied?"#ffd700":"rgba(255,255,255,0.2)", borderRadius:3, transition:"width 0.4s" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Send Notification */}
      <div style={s.card}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🔔 Send Push Notification</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:14 }}>
          {(fcmTokens||[]).length} subscriber{(fcmTokens||[]).length!==1?"s":""} · Sends to everyone who allowed notifications
        </div>
        <div><div style={s.label}>Title</div><input style={{ ...s.input, marginBottom:10 }} value={notifTitle} onChange={e=>setNotifTitle(e.target.value)} placeholder="e.g. Day 1 Results Are In!"/></div>
        <div><div style={s.label}>Message</div><textarea rows={2} value={notifBody} onChange={e=>setNotifBody(e.target.value)} placeholder="e.g. Nukes lead 18-12 after Day 1. Check the leaderboard!"/></div>
        <button style={{ ...s.btnFire, marginTop:12, width:"100%" }} onClick={sendNotification} disabled={sending||!notifTitle.trim()}>
          {sending ? "Sending..." : `📬 Send to ${(fcmTokens||[]).length} Subscriber${(fcmTokens||[]).length!==1?"s":""}`}
        </button>
      </div>

      {/* Subscriber management */}
      {(fcmTokens||[]).length>0&&(
        <div style={s.card}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:10 }}>📱 Subscribers ({(fcmTokens||[]).length})</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:12 }}>Tokens are anonymous. Remove stale ones if someone stopped using the app.</div>
          {[...(fcmTokens||[])].sort((a,b)=>b.updatedAt?.localeCompare(a.updatedAt||"")||0).map((t,i)=>(
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, marginBottom:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontFamily:"monospace" }}>...{(t.token||"").slice(-16)}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:2 }}>Added {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : "unknown"}</div>
              </div>
              <button style={{ ...s.btnDanger, padding:"3px 8px", fontSize:11 }} onClick={async()=>{
                if(window.confirm("Remove this subscriber?")) {
                  await firestore.delete("fcm_tokens", t.id);
                  showToast("Subscriber removed");
                }
              }}>✕</button>
            </div>
          ))}
          <button style={{ ...s.btnDanger, marginTop:8, width:"100%" }} onClick={async()=>{
            if(window.confirm(`Remove ALL ${(fcmTokens||[]).length} subscribers? They will need to re-allow notifications.`)) {
              for (const t of (fcmTokens||[])) await firestore.delete("fcm_tokens", t.id);
              showToast("All subscribers removed");
            }
          }}>Remove All Subscribers</button>
        </div>
      )}
    </div>
  );
}

function AnalyticsSection({ sessions: rawSessions }) {
  const [filter, setFilter] = useState("today");
  const [customMonths, setCustomMonths] = useState(3);

  // Normalize dates from Firestore
  const sessions = (rawSessions||[]).map(s => {
    let startedAt = s.startedAt;
    if (!startedAt) return { ...s, startedAt: null };
    if (typeof startedAt === "object" && startedAt.toDate) startedAt = startedAt.toDate().toISOString();
    else if (typeof startedAt === "object" && startedAt.seconds) startedAt = new Date(startedAt.seconds*1000).toISOString();
    return { ...s, startedAt };
  }).sort((a,b) => (b.startedAt||"").localeCompare(a.startedAt||""));
  
  const loading = rawSessions === null || rawSessions === undefined;

  // Filter sessions
  const getFiltered = () => {
    const now = Date.now();
    const localDate = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    };
    const todayStr = localDate(new Date().toISOString());
    return sessions.filter(s => {
      if (!s.startedAt) return filter === "all";
      const ms = new Date(s.startedAt).getTime();
      if (isNaN(ms)) return filter === "all";
      if (filter === "today") return localDate(s.startedAt) === todayStr;
      if (filter === "week") return ms >= now - 7 * 864e5;
      if (filter === "custom") return ms >= now - customMonths * 30 * 864e5;
      return true;
    });
  };

  // Debug: show what we have
  const withDate = sessions.filter(s=>s.startedAt);
  const debugInfo = `${sessions.length} total · ${withDate.length} with date · sample: ${withDate[0]?.startedAt?.slice(0,19)||"none"}`;

  const filtered = getFiltered();
  const uniqueDevices = new Set(filtered.map(s => s.deviceId).filter(Boolean)).size;
  const avgDur = filtered.length ? Math.round(filtered.reduce((a,s) => a + (s.duration||0), 0) / filtered.length) : 0;
  const fmtDur = s => s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;
  const fmt12 = h => `${h%12||12}${h>=12?"pm":"am"}`;
  const localDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const TAB_LABELS = {
    leaderboard:"Leaderboard", individual:"Individual", alltime:"All-Time",
    matchups:"Matchups", countdown:"Countdown", schedule:"Schedule",
    competitions:"Competitions", "hole-in-one":"Hole-in-One", superlatives:"Superlatives",
    players:"Players", history:"History", media:"Media", rules:"Rules", mockdraft:"Mock Draft"
  };

  const tabCounts = {};
  filtered.forEach(s => (s.tabsVisited||[]).forEach(t => { tabCounts[t] = (tabCounts[t]||0)+1; }));
  const tabsSorted = Object.entries(tabCounts).sort((a,b) => b[1]-a[1]);
  const maxTab = tabsSorted[0]?.[1] || 1;

  const deviceCounts = { ios:0, android:0, desktop:0, unknown:0 };
  filtered.forEach(s => {
    const dt = s.deviceType||"unknown";
    deviceCounts[dt] = (deviceCounts[dt]||0)+1;
  });

  const useHourChart = filter === "today" || filter === "week";
  const hourCounts = Array(24).fill(0);
  filtered.forEach(s => { if(s.startedAt){ const h = new Date(s.startedAt).getHours(); if(!isNaN(h)) hourCounts[h]++; }});
  const maxHour = Math.max(...hourCounts, 1);
  const peakHour = hourCounts.indexOf(maxHour);

  const dateCounts = {};
  filtered.forEach(s => { const d = localDate(s.startedAt); if(d) dateCounts[d] = (dateCounts[d]||0)+1; });
  const dates = Object.keys(dateCounts).sort();
  const maxDate = Math.max(...Object.values(dateCounts), 1);

  const st = {
    card: { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"14px", marginBottom:12 },
    lbl: { fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 },
    val: { fontSize:28, fontWeight:900, color:"#e8edf3", lineHeight:1 },
    sub: { fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:3 },
  };

  return (
    <div>
      <div style={{fontSize:20,fontWeight:800,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>📊 Analytics</div>

      <div style={{display:"flex",gap:6,marginBottom:filter==="custom"?8:16,flexWrap:"wrap"}}>
        {[["today","Today"],["week","This Week"],["custom","Last X Months"],["all","All Time"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)}
            style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${filter===v?"rgba(255,200,0,0.5)":"rgba(255,255,255,0.1)"}`,background:filter===v?"rgba(255,200,0,0.1)":"transparent",color:filter===v?"#ffd700":"rgba(255,255,255,0.5)",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {l}
          </button>
        ))}
      </div>

      {filter==="custom"&&(
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Show last</span>
          {[1,2,3,6,12].map(m=>(
            <button key={m} onClick={()=>setCustomMonths(m)}
              style={{padding:"4px 10px",borderRadius:16,border:`1px solid ${customMonths===m?"rgba(255,200,0,0.4)":"rgba(255,255,255,0.1)"}`,background:customMonths===m?"rgba(255,200,0,0.08)":"transparent",color:customMonths===m?"#ffd700":"rgba(255,255,255,0.4)",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              {m}mo
            </button>
          ))}
        </div>
      )}

      <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginBottom:8,fontFamily:"monospace"}}>{debugInfo}</div>

      {loading ? (
        <div style={{color:"rgba(255,255,255,0.3)",textAlign:"center",padding:40}}>Loading...</div>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[
              ["Sessions", filtered.length, "opens"],
              ["Unique Devices", uniqueDevices, "distinct users"],
              ["Avg Duration", fmtDur(avgDur), "per session"],
              ["Devices", `📱${deviceCounts.ios+deviceCounts.android} 💻${deviceCounts.desktop}${deviceCounts.unknown?` ❓${deviceCounts.unknown}`:""}`, "mobile · desktop · unknown"],
            ].map(([label,val,sub])=>(
              <div key={label} style={st.card}>
                <div style={st.lbl}>{label}</div>
                <div style={st.val}>{val}</div>
                <div style={st.sub}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={st.card}>
            <div style={{...st.lbl,marginBottom:12}}>Tab Popularity</div>
            {tabsSorted.length===0?<div style={{fontSize:12,color:"rgba(255,255,255,0.25)"}}>No data</div>:
              tabsSorted.map(([t,count])=>(
                <div key={t} style={{marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:600}}>{TAB_LABELS[t]||t}</span>
                    <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{count}</span>
                  </div>
                  <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(count/maxTab)*100}%`,background:"linear-gradient(90deg,#ff8c00,#ffd700)",borderRadius:3}}/>
                  </div>
                </div>
              ))
            }
          </div>

          <div style={st.card}>
            <div style={{...st.lbl,marginBottom:12}}>{useHourChart?"Opens by Hour":"Opens by Date"}</div>
            {filtered.length===0?<div style={{fontSize:12,color:"rgba(255,255,255,0.25)"}}>No data for this period</div>:
              useHourChart?(
                <>
                  <div style={{display:"flex",alignItems:"flex-end",gap:2,height:56,marginBottom:4}}>
                    {hourCounts.map((count,h)=>(
                      <div key={h} style={{flex:1,height:"100%",display:"flex",alignItems:"flex-end"}}>
                        <div style={{width:"100%",height:`${Math.max(count?4:1,(count/maxHour)*52)}px`,
                          background:count?h===peakHour?"#ffd700":"rgba(255,140,0,0.7)":"rgba(255,255,255,0.05)",borderRadius:2}}/>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"rgba(255,255,255,0.3)"}}>
                    {[0,6,12,18,23].map(h=><span key={h}>{fmt12(h)}</span>)}
                  </div>
                  {maxHour>0&&<div style={{fontSize:11,color:"#ffd700",marginTop:6}}>Peak: {fmt12(peakHour)} · {hourCounts[peakHour]} session{hourCounts[peakHour]!==1?"s":""}</div>}
                </>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {dates.length===0?<div style={{fontSize:12,color:"rgba(255,255,255,0.25)"}}>No data</div>:
                    dates.map(d=>(
                      <div key={d} style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",width:95,flexShrink:0}}>
                          {new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                        </div>
                        <div style={{flex:1,height:14,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${(dateCounts[d]/maxDate)*100}%`,background:"rgba(255,140,0,0.7)",borderRadius:3}}/>
                        </div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",width:16,textAlign:"right"}}>{dateCounts[d]}</div>
                      </div>
                    ))
                  }
                </div>
              )
            }
          </div>

          <div style={st.card}>
            <div style={{...st.lbl,marginBottom:12}}>Recent Sessions ({filtered.length})</div>
            {filtered.length===0?<div style={{fontSize:12,color:"rgba(255,255,255,0.25)",textAlign:"center",padding:"12px 0"}}>No sessions in this period</div>:
              filtered.slice(0,25).map(sess=>{
                const dt = sess.startedAt ? new Date(sess.startedAt) : null;
                const timeStr = dt&&!isNaN(dt) ? dt.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "—";
                const icon = sess.deviceType==="ios"?"📱":sess.deviceType==="android"?"🤖":"💻";
                return (
                  <div key={sess.id} style={{padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                        <span style={{fontSize:13,marginTop:1}}>{icon}</span>
                        <div>
                          <div style={{fontSize:11,fontWeight:600}}>{timeStr}</div>
                          <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:1}}>{fmtDur(sess.duration||0)} · {(sess.tabsVisited||[]).map(t=>TAB_LABELS[t]||t).join(" → ")}</div>
                        </div>
                      </div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,0.2)"}}>{sess.deviceId?.slice(0,6)}</div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </>
      )}
    </div>
  );
}
