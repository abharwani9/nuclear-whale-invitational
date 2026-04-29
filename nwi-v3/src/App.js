// src/App.js
import { useState } from "react";
import PublicApp from "./pages/PublicApp";
import AdminPanel from "./pages/AdminPanel";

export default function App() {
  const [page, setPage] = useState(() => sessionStorage.getItem("nwi_page") || "public");
  const [adminAuthed, setAdminAuthed] = useState(() => sessionStorage.getItem("nwi_admin_authed") === "true");

  const goAdmin = () => { sessionStorage.setItem("nwi_page","admin"); setPage("admin"); };
  const onAuth = () => { sessionStorage.setItem("nwi_admin_authed","true"); setAdminAuthed(true); };
  const onBack = () => { sessionStorage.setItem("nwi_page","public"); sessionStorage.removeItem("nwi_admin_authed"); sessionStorage.removeItem("nwi_admin_section"); window.location.href = window.location.href; };

  return (
    <>
      {page === "public" && (
        <PublicApp onGoAdmin={goAdmin} />
      )}
      {page === "admin" && (
        <AdminPanel
          authed={adminAuthed}
          onAuth={onAuth}
          onBack={onBack}
        />
      )}
    </>
  );
}
