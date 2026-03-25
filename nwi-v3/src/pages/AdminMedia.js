// src/pages/AdminMedia.js
import { useState, useRef } from "react";
import { uploadToCloudinary } from "../cloudinary/config";
import { useCollection, firestore } from "../firebase/hooks";

const s = {
  label: { fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 },
  input: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8edf3", fontFamily: "inherit", fontSize: 14, padding: "9px 12px", width: "100%", outline: "none" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px", marginBottom: 10 },
  btnFire: { padding: "9px 18px", background: "linear-gradient(135deg,#ff4500,#ff8c00)", border: "none", borderRadius: 8, color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnDanger: { padding: "7px 12px", background: "rgba(220,30,30,0.15)", border: "1px solid rgba(220,30,30,0.35)", borderRadius: 8, color: "#ff5555", fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  btnGhost: { padding: "8px 14px", background: "none", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, color: "rgba(255,255,255,0.55)", fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer" },
};

const ACCEPTED = { photo: "image/*", audio: "audio/*,.mp3,.wav,.m4a,.aac", doc: ".pdf,.doc,.docx,.txt" };
const TYPE_ICONS = { photo: "📸", audio: "🎵", doc: "📄" };
const TYPE_LABELS = { photo: "Photo", audio: "Audio / Theme Song", doc: "Document / PDF" };

export default function AdminMedia({ showToast }) {
  const [mediaTab, setMediaTab] = useState("photo");
  const [form, setForm] = useState({ name: "", description: "", year: new Date().getFullYear().toString() });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef();

  const { data: media } = useCollection("media");
  const filtered = media.filter(m => m.type === mediaTab);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const maxMB = mediaTab === "audio" ? 50 : 20;
    if (f.size > maxMB * 1024 * 1024) { showToast(`File too large — max ${maxMB}MB`, true); return; }
    setFile(f);
    if (mediaTab === "photo") setPreview(URL.createObjectURL(f));
    else setPreview(null);
    if (!form.name) setForm(f2 => ({ ...f2, name: f.name.replace(/\.[^.]+$/, "") }));
  };

  const upload = async () => {
    if (!file) return showToast("Please select a file first", true);
    if (!form.name) return showToast("Please enter a name", true);
    setProgress(0);
    try {
      const url = await uploadToCloudinary(file, mediaTab, setProgress);
      await firestore.add("media", {
        type: mediaTab, url,
        name: form.name, description: form.description,
        year: parseInt(form.year) || new Date().getFullYear(),
        uploadedAt: new Date().toISOString(),
        uploader: "admin", fileSize: file.size, mimeType: file.type,
      });
      showToast(`${TYPE_LABELS[mediaTab]} uploaded!`);
      setFile(null); setPreview(null); setProgress(null);
      setForm(f => ({ ...f, name: "", description: "" }));
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) { showToast("Upload failed: " + e.message, true); setProgress(null); }
  };

  const deleteMedia = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from the app?`)) return;
    setDeleting(item.id);
    try {
      await firestore.delete("media", item.id);
      showToast("Removed. To free storage, delete from your Cloudinary dashboard.");
    } catch (e) { showToast("Error: " + e.message, true); }
    setDeleting(null);
  };

  const formatSize = (b) => !b ? "" : b < 1048576 ? `${Math.round(b/1024)}KB` : `${(b/1048576).toFixed(1)}MB`;

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>🗄️ Media Vault</div>

      <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(0,200,100,0.07)", border: "1px solid rgba(0,200,100,0.2)", borderRadius: 10, fontSize: 12, color: "rgba(0,220,120,0.9)" }}>
        ☁️ <strong>Powered by Cloudinary</strong> — Free, no credit card required. 25GB/month.
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {["photo","audio","doc"].map(t => (
          <button key={t} onClick={() => { setMediaTab(t); setFile(null); setPreview(null); setForm(f => ({...f, name:"", description:""})); }}
            style={{ padding: "7px 16px", background: mediaTab===t ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${mediaTab===t ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, color: mediaTab===t ? "#fff" : "rgba(255,255,255,0.4)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {TYPE_ICONS[t]} {TYPE_LABELS[t]}s
          </button>
        ))}
      </div>

      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", marginBottom: 14 }}>⬆ Upload {TYPE_LABELS[mediaTab]}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><div style={s.label}>Name / Title</div>
            <input style={s.input} value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder={mediaTab==="audio" ? "e.g. Nukes Theme Song" : mediaTab==="doc" ? "e.g. 2024 Scorecard" : "e.g. Day 1 Group Photo"} /></div>
          <div><div style={s.label}>Year</div>
            <input style={s.input} type="number" value={form.year} onChange={e => setForm(f=>({...f,year:e.target.value}))} /></div>
        </div>
        <div style={{ marginBottom: 14 }}><div style={s.label}>Description (optional)</div>
          <input style={s.input} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Optional note about this file" /></div>

        <input ref={fileRef} type="file" accept={ACCEPTED[mediaTab]} style={{ display:"none" }} onChange={handleFile} />
        {preview && <img src={preview} alt="preview" style={{ width:"100%", maxHeight:180, objectFit:"cover", borderRadius:8, marginBottom:10 }} />}
        {file && !preview && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(255,255,255,0.05)", borderRadius:8, marginBottom:10 }}>
            <span style={{ fontSize:22 }}>{TYPE_ICONS[mediaTab]}</span>
            <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600 }}>{file.name}</div><div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{formatSize(file.size)}</div></div>
            <button style={s.btnGhost} onClick={() => { setFile(null); if(fileRef.current) fileRef.current.value=""; }}>✕</button>
          </div>
        )}

        {progress !== null && (
          <div style={{ marginBottom:12 }}>
            <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#ff4500,#ff8c00)", transition:"width 0.3s", borderRadius:3 }} />
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:4 }}>{progress < 100 ? `${progress}% uploading...` : "Finishing up..."}</div>
          </div>
        )}

        <div style={{ display:"flex", gap:8 }}>
          <button style={{ ...s.btnGhost, flex:1 }} onClick={() => fileRef.current.click()}>{file ? "📁 Change file" : `📁 Choose ${TYPE_LABELS[mediaTab]}`}</button>
          {file && <button style={{ ...s.btnFire, flex:2 }} onClick={upload} disabled={progress !== null}>{progress !== null ? `Uploading ${progress}%...` : "⬆ Upload"}</button>}
        </div>
      </div>

      <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>
        Uploaded ({filtered.length})
      </div>

      {filtered.length === 0 && <div style={{ textAlign:"center", padding:"30px 0", color:"rgba(255,255,255,0.2)", fontSize:14 }}>No {TYPE_LABELS[mediaTab].toLowerCase()}s yet</div>}

      {mediaTab === "photo" && filtered.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8 }}>
          {filtered.map(item => (
            <div key={item.id} style={{ position:"relative", aspectRatio:"1", borderRadius:10, overflow:"hidden", background:"rgba(255,255,255,0.05)" }}
              onMouseEnter={e => e.currentTarget.querySelector(".ov").style.opacity=1}
              onMouseLeave={e => e.currentTarget.querySelector(".ov").style.opacity=0}>
              <img src={item.url} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              <div className="ov" style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.65)", opacity:0, transition:"opacity 0.2s", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, padding:6 }}>
                <div style={{ fontSize:10, color:"#fff", textAlign:"center" }}>{item.name}</div>
                <button style={{ ...s.btnDanger, fontSize:10, padding:"3px 8px" }} onClick={() => deleteMedia(item)} disabled={deleting===item.id}>{deleting===item.id ? "..." : "✕ Remove"}</button>
              </div>
              {item.uploader !== "admin" && <div style={{ position:"absolute", top:4, right:4, fontSize:9, background:"rgba(0,170,255,0.85)", color:"#fff", padding:"2px 5px", borderRadius:10, fontWeight:700 }}>PLAYER</div>}
            </div>
          ))}
        </div>
      )}

      {(mediaTab === "audio" || mediaTab === "doc") && filtered.map(item => (
        <div key={item.id} style={{ ...s.card, padding:"13px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:26 }}>{TYPE_ICONS[mediaTab]}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>{item.name}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{item.year}{item.description ? ` · ${item.description}` : ""}{item.fileSize ? ` · ${formatSize(item.fileSize)}` : ""}</div>
          </div>
          <a href={item.url} target="_blank" rel="noreferrer" style={{ ...s.btnGhost, textDecoration:"none", fontSize:11 }}>👁 View</a>
          <button style={s.btnDanger} onClick={() => deleteMedia(item)} disabled={deleting===item.id}>{deleting===item.id ? "..." : "✕"}</button>
        </div>
      ))}

      <div style={{ marginTop:24, padding:"12px 16px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, fontSize:12, color:"rgba(255,255,255,0.3)", lineHeight:1.6 }}>
        ☁️ Files stored on <strong style={{ color:"rgba(255,255,255,0.5)" }}>Cloudinary</strong>. Manage at <span style={{ color:"#00aaff" }}>cloudinary.com/console</span>.
        Removing here hides from app — delete from Cloudinary dashboard to free up storage.
      </div>
    </div>
  );
}
