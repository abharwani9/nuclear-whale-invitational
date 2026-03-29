// src/pages/MediaGallery.js
import { useState, useRef } from "react";
import { useCollection, firestore } from "../firebase/hooks";
import { uploadToCloudinary } from "../cloudinary/config";

export default function MediaGallery() {
  const [mediaTab, setMediaTab] = useState("photos");
  const [lightbox, setLightbox] = useState(null);
  const [pdfViewer, setPdfViewer] = useState(null);
  const { data: media, loading } = useCollection("media");

  const photos = media.filter(m => m.type === "photo");
  const audio  = media.filter(m => m.type === "audio");
  const docs   = media.filter(m => m.type === "doc");
  const links  = media.filter(m => m.type === "link");

  return (
    <div>
      <style>{`
        .media-tab-btn{padding:7px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:rgba(255,255,255,0.45);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
        .media-tab-btn.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.25);color:#fff;}
        .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;}
        .photo-thumb{aspect-ratio:1;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;background:rgba(255,255,255,0.06);}
        .photo-thumb img{width:100%;height:100%;object-fit:cover;transition:transform 0.2s;}
        .photo-thumb:hover img{transform:scale(1.04);}
        .photo-thumb .ov{position:absolute;inset:0;background:rgba(0,0,0,0.5);opacity:0;transition:opacity 0.2s;display:flex;align-items:center;justify-content:center;font-size:20px;}
        .photo-thumb:hover .ov{opacity:1;}
        .lightbox-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;}
        .lightbox-img{max-width:100%;max-height:80vh;border-radius:10px;object-fit:contain;}
        .pdf-backdrop{position:fixed;inset:0;background:#0d1117;z-index:200;display:flex;flex-direction:column;}
        audio{width:100%;height:36px;outline:none;border-radius:8px;margin-top:6px;}
        .dl-btn{padding:6px 12px;background:none;border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;}
      `}</style>

      <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>Media Vault</div>

      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[["photos",`📸 Photos (${photos.length})`],["audio",`🎵 Audio (${audio.length})`],["docs",`📄 Docs (${docs.length})`],["links",`🔗 Links (${links.length})`]].map(([id,label])=>(
          <button key={id} className={`media-tab-btn${mediaTab===id?" active":""}`} onClick={()=>setMediaTab(id)}>{label}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,0.25)" }}>Loading...</div>}

      {/* PHOTOS */}
      {mediaTab==="photos" && (
        <div>
          {/* Public upload zone - always visible */}
          <PublicPhotoUpload/>

          {photos.length>0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Gallery ({photos.length})</div>
              <div className="photo-grid">
                {[...photos].reverse().map(p=>(
                  <div key={p.id} className="photo-thumb" onClick={()=>setLightbox({url:p.url,caption:p.caption,uploader:p.uploader})}>
                    <img src={p.url} alt={p.caption||"photo"} loading="lazy"/>
                    <div className="ov">🔍</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AUDIO */}
      {mediaTab==="audio" && (
        <div>
          {audio.length===0
            ? <EmptyState icon="🎵" text="No audio yet — admins can add theme songs from the Admin Panel"/>
            : audio.map(a=>(
              <div key={a.id} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:16, marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ fontSize:26 }}>🎵</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700 }}>{a.name||"Audio"}</div>
                    {a.description&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{a.description}</div>}
                  </div>
                  <a href={a.url} download={a.name||"audio"} className="dl-btn">⬇</a>
                </div>
                <audio controls src={a.url} preload="none"/>
              </div>
            ))
          }
        </div>
      )}

      {/* DOCS */}
      {mediaTab==="docs" && (
        <div>
          {docs.length===0
            ? <EmptyState icon="📄" text="No documents yet — admins can add scorecards and PDFs"/>
            : docs.map(d=>(
              <div key={d.id} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"13px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                onClick={()=>setPdfViewer({url:d.url,name:d.name||"Document"})}>
                <div style={{ fontSize:28 }}>📋</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>{d.name||"Document"}</div>
                  {d.description&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{d.description}</div>}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <a href={d.url} download={d.name} className="dl-btn" onClick={e=>e.stopPropagation()}>⬇</a>
                  <button className="dl-btn" style={{ borderColor:"rgba(0,170,255,0.3)", color:"#00aaff" }}>👁 View</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* LINKS */}
      {mediaTab==="links" && (
        <div>
          {/* Public link upload */}
          <PublicLinkUpload/>

          {links.length>0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>All Links ({links.length})</div>
              {[...links].reverse().map(l=>(
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer"
                  style={{ display:"block", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"13px 16px", marginBottom:10, textDecoration:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ fontSize:26 }}>{l.icon||"🔗"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#e8edf3" }}>{l.name||l.url}</div>
                      {l.description&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{l.description}</div>}
                      <div style={{ fontSize:11, color:"rgba(0,170,255,0.6)", marginTop:3 }}>{l.url}</div>
                    </div>
                    <div style={{ fontSize:16, color:"rgba(255,255,255,0.25)" }}>→</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-backdrop" onClick={()=>setLightbox(null)}>
          <div style={{ position:"absolute", top:16, right:16, display:"flex", gap:8 }}>
            <a href={lightbox.url} download className="dl-btn" onClick={e=>e.stopPropagation()}>⬇ Save</a>
            <button className="dl-btn" style={{ borderColor:"rgba(255,80,80,0.4)", color:"#ff5555" }} onClick={()=>setLightbox(null)}>✕</button>
          </div>
          <img className="lightbox-img" src={lightbox.url} alt={lightbox.caption||""} onClick={e=>e.stopPropagation()}/>
          {(lightbox.caption||lightbox.uploader)&&(
            <div style={{ marginTop:12, textAlign:"center" }}>
              {lightbox.caption&&<div style={{ fontSize:14, color:"rgba(255,255,255,0.7)" }}>{lightbox.caption}</div>}
              {lightbox.uploader&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:3 }}>📸 {lightbox.uploader}</div>}
            </div>
          )}
        </div>
      )}

      {/* PDF Viewer */}
      {pdfViewer && (
        <div className="pdf-backdrop">
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", background:"#0d1520" }}>
            <button className="dl-btn" onClick={()=>setPdfViewer(null)}>← Back</button>
            <div style={{ flex:1, fontSize:14, fontWeight:700 }}>{pdfViewer.name}</div>
            <a href={pdfViewer.url} download={pdfViewer.name} className="dl-btn">⬇ Save</a>
          </div>
          <iframe src={pdfViewer.url} style={{ flex:1, border:"none", width:"100%", background:"#fff" }} title={pdfViewer.name}/>
        </div>
      )}
    </div>
  );
}

// ── PUBLIC PHOTO UPLOAD (no required fields) ──────────────────────────────
function PublicPhotoUpload() {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [caption, setCaption]   = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [done, setDone]         = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 20*1024*1024) { alert("File too large — max 20MB"); return; }
    setFile(f); setPreview(URL.createObjectURL(f)); setDone(false);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true); setProgress(0);
    try {
      const url = await uploadToCloudinary(file, "photo", setProgress);
      await firestore.add("media", {
        type: "photo",
        url,
        caption: caption.trim() || "",
        uploader: uploaderName.trim() || "Anonymous",
        uploadedAt: new Date().toISOString(),
      });
      setFile(null); setPreview(null); setCaption(""); setUploaderName(""); setProgress(null); setDone(true);
      if (fileRef.current) fileRef.current.value = "";
    } catch(e) {
      const msg = e.message.includes("YOUR_CLOUD") ? "Cloudinary not configured yet — contact admin" : "Upload failed: " + e.message;
      alert(msg); setProgress(null);
    }
    setUploading(false);
  };

  const iStyle = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#e8edf3", fontFamily:"inherit", fontSize:13, padding:"8px 11px", width:"100%", outline:"none" };

  return (
    <div style={{ background:"rgba(0,170,255,0.05)", border:"1px dashed rgba(0,170,255,0.25)", borderRadius:12, padding:16 }}>
      <div style={{ fontSize:14, fontWeight:700, color:"#00aaff", marginBottom:12 }}>📸 Add a Photo</div>

      {done && (
        <div style={{ padding:"10px 14px", background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:8, fontSize:13, color:"#4ade80", marginBottom:12, textAlign:"center" }}>
          ✅ Photo uploaded! <button onClick={()=>setDone(false)} style={{ background:"none", border:"none", color:"#4ade80", cursor:"pointer", textDecoration:"underline", fontSize:13 }}>Add another</button>
        </div>
      )}

      {!done && (
        <>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile}/>
          {preview
            ? <div style={{ position:"relative", marginBottom:10 }}>
                <img src={preview} alt="preview" style={{ width:"100%", maxHeight:200, objectFit:"cover", borderRadius:8 }}/>
                <button onClick={()=>{setFile(null);setPreview(null);if(fileRef.current)fileRef.current.value="";}}
                  style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.7)", border:"none", borderRadius:"50%", width:28, height:28, color:"#fff", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              </div>
            : <button onClick={()=>fileRef.current.click()}
                style={{ width:"100%", padding:"14px", background:"rgba(255,255,255,0.04)", border:"2px dashed rgba(255,255,255,0.15)", borderRadius:10, color:"rgba(255,255,255,0.4)", fontFamily:"inherit", fontSize:13, cursor:"pointer", marginBottom:10 }}>
                📷 Choose Photo
              </button>
          }

          {file && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4, letterSpacing:"0.08em" }}>YOUR NAME (optional)</div>
                  <input style={iStyle} value={uploaderName} onChange={e=>setUploaderName(e.target.value)} placeholder="e.g. Mike T."/>
                </div>
                <div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4, letterSpacing:"0.08em" }}>CAPTION (optional)</div>
                  <input style={iStyle} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="What's this?"/>
                </div>
              </div>

              {progress !== null && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ height:5, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#0066cc,#00ccff)", borderRadius:3, transition:"width 0.3s" }}/>
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:3 }}>{progress}% uploading...</div>
                </div>
              )}

              <button onClick={upload} disabled={uploading}
                style={{ width:"100%", padding:"11px", background:"linear-gradient(135deg,#0066cc,#00ccff)", border:"none", borderRadius:8, color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:uploading?"not-allowed":"pointer", opacity:uploading?0.7:1 }}>
                {uploading ? `Uploading ${progress}%...` : "⬆ Upload Photo"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── PUBLIC LINK UPLOAD (no required fields) ───────────────────────────────
function PublicLinkUpload() {
  const [url, setUrl]       = useState("");
  const [name, setName]     = useState("");
  const [icon, setIcon]     = useState("🔗");
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);

  const save = async () => {
    if (!url.trim()) return alert("Please enter a URL");
    setSaving(true);
    try {
      await firestore.add("media", {
        type: "link",
        url: url.trim(),
        name: name.trim() || url.trim(),
        icon: icon || "🔗",
        uploadedAt: new Date().toISOString(),
      });
      setUrl(""); setName(""); setIcon("🔗"); setDone(true);
    } catch(e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  const iStyle = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#e8edf3", fontFamily:"inherit", fontSize:13, padding:"8px 11px", width:"100%", outline:"none" };

  return (
    <div style={{ background:"rgba(255,69,0,0.05)", border:"1px dashed rgba(255,69,0,0.25)", borderRadius:12, padding:16, marginBottom:4 }}>
      <div style={{ fontSize:14, fontWeight:700, color:"#ff8c00", marginBottom:12 }}>🔗 Add a Link</div>

      {done && (
        <div style={{ padding:"10px 14px", background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:8, fontSize:13, color:"#4ade80", marginBottom:12, textAlign:"center" }}>
          ✅ Link added! <button onClick={()=>setDone(false)} style={{ background:"none", border:"none", color:"#4ade80", cursor:"pointer", textDecoration:"underline", fontSize:13 }}>Add another</button>
        </div>
      )}

      {!done && (
        <>
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4, letterSpacing:"0.08em" }}>URL *</div>
            <input style={iStyle} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://rapchat.com/..."/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4, letterSpacing:"0.08em" }}>LABEL (optional)</div>
              <input style={iStyle} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Nukes Theme Song"/>
            </div>
            <div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4, letterSpacing:"0.08em" }}>ICON</div>
              <input style={{ ...iStyle, width:60, textAlign:"center" }} value={icon} onChange={e=>setIcon(e.target.value)}/>
            </div>
          </div>
          <button onClick={save} disabled={saving}
            style={{ width:"100%", padding:"11px", background:"linear-gradient(135deg,#ff4500,#ff8c00)", border:"none", borderRadius:8, color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
            {saving ? "Saving..." : "+ Add Link"}
          </button>
        </>
      )}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"50px 20px", color:"rgba(255,255,255,0.2)" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14, lineHeight:1.6 }}>{text}</div>
    </div>
  );
}

// Keep PlayerUploadZone export for backward compatibility
export function PlayerUploadZone() { return null; }
