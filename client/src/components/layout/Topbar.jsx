import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, Search, Settings, Sun, UserCircle } from "lucide-react";
import NotificationBell from "../notifications/NotificationBell";
import { Avatar, Dropdown, MenuItem, MenuLabel, MenuSeparator } from "../ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authService } from "../../services";
import { ROLES } from "../../utils/constants";

export default function Topbar({ onMenu, onSearch }) {
  const { user, logout, setUser, previewTheme } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const dark = document.documentElement.dataset.theme === "dark";

  const toggleTheme = async () => {
    const theme = dark ? "light" : "dark";
    previewTheme(theme);
    try {
      const res = await authService.updatePreferences({ theme });
      setUser(res.user);
    } catch (error) {
      toast.error("Couldn't save theme", error.message);
    }
  };

  return (
    <header className="topbar">
      <button type="button" className="icon-button topbar__menu" onClick={onMenu} aria-label="Open navigation">
        <Menu />
      </button>

      <button type="button" className="topbar__search" onClick={onSearch} aria-label="Search">
        <Search />
        <span>Search customers, leads, tasks…</span>
        <span className="kbd">{isMac ? "⌘K" : "Ctrl K"}</span>
      </button>

      <div className="topbar__right">
        <span className={`role-pill role-pill--${user?.role}`} title="Your role">
          <span className="role-pill__dot" />
          {ROLES[user?.role]}
        </span>
        <button type="button" className="icon-button" onClick={toggleTheme} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
          {dark ? <Sun /> : <Moon />}
        </button>
        <NotificationBell />
        <Dropdown
          width={230}
          trigger={({ toggle, open }) => (
            <button type="button" className="topbar__user" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu">
              <Avatar name={user?.name} size="md" />
            </button>
          )}
        >
          <div style={{ padding: "8px 8px 6px" }}>
            <div style={{ fontWeight: 500, fontSize: 13 }} className="truncate">
              {user?.name}
            </div>
            <div className="subtle truncate" style={{ fontSize: 12 }}>
              {user?.email}
            </div>
          </div>
          <MenuSeparator />
          <MenuLabel>{ROLES[user?.role]}</MenuLabel>
          <MenuItem icon={UserCircle} onClick={() => navigate("/profile")}>
            Profile
          </MenuItem>
          <MenuItem icon={Settings} onClick={() => navigate("/settings")}>
            Settings
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={LogOut} onClick={logout}>
            Sign out
          </MenuItem>
        </Dropdown>
      </div>
    </header>
  );
}
