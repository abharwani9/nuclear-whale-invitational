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

  const mediaTabs = [
    { id: "photos", label: "📸 Photos", count: photos.length },
    { id: "audio",  label: "🎵 Audio",  count: audio.length },
    { id: "docs",   label: "📄 Docs",   count: docs.length },
    { id: "links",  label: "🔗 Links",  count: links.length },
  ];

  return (
    <div>
      <style>{`
        .media-tab-btn{padding:8px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:rgba(255,255,255,0.45);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
        .media-tab-btn.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.25);color:#fff;}
        .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;}
        .photo-thumb{aspect-ratio:1;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;background:rgba(255,255,255,0.06);}
        .photo-thumb img{width:100%;height:100%;object-fit:cover;transition:transform 0.2s;}
        .photo-thumb:hover img{transform:scale(1.04);}
        .photo-thumb .overlay{position:absolute;inset:0;background:rgba(0,0,0,0.45);opacity:0;transition:opacity 0.2s;display:flex;align-items:center;justify-content:center;font-size:22px;}
        .photo-thumb:hover .overlay{opacity:1;}
        .lightbox-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;}
        .lightbox-img{max-width:100%;max-height:75vh;border-radius:12px;object-fit:contain;}
        .pdf-backdrop{position:fixed;inset:0;background:#0d1117;z-index:200;display:flex;flex-direction:column;}
        audio{width:100%;height:36px;outline:none;border-radius:8px;margin-top:8px;}
        .dl-btn{padding:7px 14px;background:none;border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:rgba(255,255,255,0.6);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;transition:all 0.15s;}
        .dl-btn:hover{border-color:rgba(255,255,255,0.4);color:#fff;}
      `}</style>

      <div style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>Media Vault</div>

      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {mediaTabs.map(t=>(
          <button key={t.id} className={`media-tab-btn${mediaTab===t.id?" active":""}`} onClick={()=>setMediaTab(t.id)}>
            {t.label}{t.count>0&&<span style={{ marginLeft:4, fontSize:11, opacity:0.6 }}>({t.count})</span>}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:"40px 0", color:"rgba(255,255,255,0.25)" }}>Loading...</div>}

      {/* PHOTOS */}
      {mediaTab==="photos" && (
        <div>
          {photos.length===0
            ? <EmptyState icon="📸" text="No photos yet — upload from Admin Panel or add yours below"/>
            : (
              <>
                {[...new Set(photos.map(p=>p.year||"Misc"))].sort((a,b)=>b-a).map(year=>(
                  <div key={year} style={{ marginBottom:24 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>{year}</div>
                    <div className="photo-grid">
                      {photos.filter(p=>(p.year||"Misc")===year).map(p=>(
                        <div key={p.id} className="photo-thumb" onClick={()=>setLightbox({url:p.url,caption:p.caption,uploader:p.uploader})}>
                          <img src={p.url} alt={p.caption||"photo"} loading="lazy"/>
                          <div className="overlay">🔍</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )
          }
          <PlayerUploadZone/>
        </div>
      )}

      {/* AUDIO */}
      {mediaTab==="audio" && (
        <div>
          {audio.length===0
            ? <EmptyState icon="🎵" text="No audio yet — add theme songs from Admin Panel"/>
            : audio.map(a=>(
              <div key={a.id} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:16, marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <div style={{ fontSize:28 }}>🎵</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700 }}>{a.name}</div>
                    {a.description&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{a.description}</div>}
                    {a.year&&<span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.45)", marginLeft:4 }}>{a.year}</span>}
                  </div>
                  <a href={a.url} download={a.name} className="dl-btn">⬇ Save</a>
                </div>
                <audio controls src={a.url} preload="none">Your browser does not support audio.</audio>
              </div>
            ))
          }
        </div>
      )}

      {/* DOCS */}
      {mediaTab==="docs" && (
        <div>
          {docs.length===0
            ? <EmptyState icon="📄" text="No documents yet — add scorecards and PDFs from Admin Panel"/>
            : docs.map(d=>(
              <div key={d.id} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}
                onClick={()=>setPdfViewer({url:d.url,name:d.name})}>
                <div style={{ fontSize:32 }}>📋</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>{d.name}</div>
                  {d.description&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{d.description}</div>}
                  {d.year&&<span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.45)" }}>{d.year}</span>}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <a href={d.url} download={d.name} className="dl-btn" onClick={e=>e.stopPropagation()}>⬇ Save</a>
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
          {links.length===0
            ? <EmptyState icon="🔗" text="No links yet — add Rapchat, YouTube, or any external links from Admin Panel"/>
            : links.map(l=>(
              <a key={l.id} href={l.url} target="_blank" rel="noreferrer" style={{ display:"block", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"14px 16px", marginBottom:10, textDecoration:"none", transition:"border-color 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ fontSize:30 }}>{l.icon||"🔗"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:"#e8edf3" }}>{l.name}</div>
                    {l.description&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{l.description}</div>}
                    <div style={{ fontSize:11, color:"rgba(0,170,255,0.7)", marginTop:4 }}>{l.url}</div>
                  </div>
                  <div style={{ fontSize:18, color:"rgba(255,255,255,0.3)" }}>→</div>
                </div>
              </a>
            ))
          }
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-backdrop" onClick={()=>setLightbox(null)}>
          <div style={{ position:"absolute", top:16, right:16, display:"flex", gap:10 }}>
            <a href={lightbox.url} download className="dl-btn" onClick={e=>e.stopPropagation()}>⬇ Download</a>
            <button className="dl-btn" style={{ borderColor:"rgba(255,80,80,0.4)", color:"#ff5555" }} onClick={()=>setLightbox(null)}>✕ Close</button>
          </div>
          <img className="lightbox-img" src={lightbox.url} alt={lightbox.caption} onClick={e=>e.stopPropagation()}/>
          {(lightbox.caption||lightbox.uploader)&&(
            <div style={{ marginTop:12, textAlign:"center" }}>
              {lightbox.caption&&<div style={{ fontSize:14, color:"rgba(255,255,255,0.7)" }}>{lightbox.caption}</div>}
              {lightbox.uploader&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:4 }}>📸 {lightbox.uploader}</div>}
            </div>
          )}
        </div>
      )}

      {/* PDF Viewer */}
      {pdfViewer && (
        <div className="pdf-backdrop">
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", background:"#0d1520" }}>
            <button style={{ padding:"6px 14px", background:"none", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, color:"rgba(255,255,255,0.6)", fontFamily:"inherit", fontSize:12, cursor:"pointer" }} onClick={()=>setPdfViewer(null)}>← Back</button>
            <div style={{ flex:1, fontSize:14, fontWeight:700 }}>{pdfViewer.name}</div>
            <a href={pdfViewer.url} download={pdfViewer.name} className="dl-btn">⬇ Download</a>
          </div>
          <iframe src={pdfViewer.url} style={{ flex:1, border:"none", width:"100%", background:"#fff" }} title={pdfViewer.name}/>
        </div>
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

// Player photo upload zone
export function PlayerUploadZone() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const fileRef = useRef();

  const inputStyle = { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, color:"#e8edf3", fontFamily:"inherit", fontSize:13, padding:"8px 10px", width:"100%", outline:"none" };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 20*1024*1024) { alert("File too large — max 20MB"); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  const upload = async () => {
    if (!file) return alert("Please choose a photo first");
    setUploading(true); setProgress(0);
    try {
      const url = await uploadToCloudinary(file, "photo", setProgress);
      await firestore.add("media", {
        type:"photo", url,
        name: file.name,
        caption: caption||"",
        uploader: name||"Anonymous",
        year: parseInt(year)||new Date().getFullYear(),
        uploadedAt: new Date().toISOString(),
      });
      setFile(null); setPreview(null); setName(""); setCaption(""); setProgress(null);
      alert("✅ Photo uploaded!");
    } catch(e) { 
      const msg = e.message.includes("YOUR_CLOUD") ? "Cloudinary not configured — set your Cloud Name and Upload Preset in src/cloudinary/config.js" : "Upload failed: " + e.message;
      alert(msg); setProgress(null); }
    setUploading(false);
  };

  return (
    <div style={{ marginTop:24, background:"rgba(0,170,255,0.05)", border:"1px dashed rgba(0,170,255,0.25)", borderRadius:12, padding:18 }}>
      <div style={{ fontSize:14, fontWeight:700, color:"#00aaff", marginBottom:12 }}>📸 Upload Your Photos</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
        <div><div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>YOUR NAME (optional)</div><input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Mike T."/></div>
        <div><div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>YEAR (optional)</div><input style={inputStyle} value={year} onChange={e=>setYear(e.target.value)}/></div>
      </div>
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>CAPTION (optional)</div>
        <input style={inputStyle} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="What's happening in this photo?"/>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile}/>
      {preview && <img src={preview} alt="preview" style={{ width:"100%", maxHeight:200, objectFit:"cover", borderRadius:8, marginBottom:10 }}/>}
      {progress!==null&&(
        <div style={{ marginBottom:10 }}>
          <div style={{ height:5, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#0066cc,#00ccff)", transition:"width 0.3s", borderRadius:3 }}/>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:4 }}>{progress}% uploaded</div>
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <button style={{ flex:1, padding:"9px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"rgba(255,255,255,0.7)", fontFamily:"inherit", fontSize:13, cursor:"pointer" }} onClick={()=>fileRef.current.click()}>
          {file?"📷 Change Photo":"📷 Choose Photo"}
        </button>
        {file&&<button style={{ flex:2, padding:"9px", background:"linear-gradient(135deg,#0066cc,#00ccff)", border:"none", borderRadius:8, color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }} onClick={upload} disabled={uploading}>
          {uploading?`Uploading ${progress}%...`:"⬆ Upload"}
        </button>}
      </div>
    </div>
  );
}
