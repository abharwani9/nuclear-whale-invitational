// src/App.js
import { useState } from "react";
import PublicApp from "./pages/PublicApp";
import AdminPanel from "./pages/AdminPanel";

export default function App() {
  const [page, setPage] = useState("public"); // "public" | "admin"
  const [adminAuthed, setAdminAuthed] = useState(false);

  return (
    <>
      {page === "public" && (
        <PublicApp onGoAdmin={() => setPage("admin")} />
      )}
      {page === "admin" && (
        <AdminPanel
          authed={adminAuthed}
          onAuth={() => setAdminAuthed(true)}
          onBack={() => { setPage("public"); setAdminAuthed(false); }}
        />
      )}
    </>
  );
}
