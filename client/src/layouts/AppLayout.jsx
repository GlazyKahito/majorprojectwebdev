import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import CommandPalette from "../components/layout/CommandPalette";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const wide = location.pathname.startsWith("/pipeline");

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
      <div className="main">
        <Topbar onMenu={() => setSidebarOpen(true)} onSearch={() => setSearchOpen(true)} />
        <main className={`content ${wide ? "content--wide" : ""}`} key={location.pathname}>
          <Outlet />
        </main>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
