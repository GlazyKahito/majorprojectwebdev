import { NavLink, useNavigate } from "react-router-dom";
import { Bell, CheckSquare, KanbanSquare, LayoutDashboard, LogOut, Settings, Target, UserCircle, Users, Building2 } from "lucide-react";
import Brand from "./Brand";
import { Avatar, Dropdown, MenuItem, MenuSeparator } from "../ui";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { ROLES } from "../../utils/constants";
import { isAdmin } from "../../utils/permissions";

const MAIN_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Building2 },
  { to: "/leads", label: "Leads", icon: Target },
  { to: "/pipeline", label: "Sales Pipeline", icon: KanbanSquare },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/notifications", label: "Notifications", icon: Bell, badge: true },
];

export default function Sidebar({ open, onNavigate }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const workspace = [
    ...(isAdmin(user) ? [{ to: "/users", label: "Users", icon: Users }] : []),
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  const renderLink = (item) => {
    const Icon = item.icon;
    return (
      <NavLink key={item.to} to={item.to} className="nav-link" onClick={onNavigate}>
        <Icon />
        <span>{item.label}</span>
        {item.badge && unreadCount > 0 && <span className="nav-link__count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </NavLink>
    );
  };

  return (
    <aside className={`sidebar ${open ? "sidebar--open" : ""}`} aria-label="Primary">
      <div className="sidebar__brand">
        <NavLink to="/dashboard" onClick={onNavigate}>
          <Brand />
        </NavLink>
      </div>

      <nav className="sidebar__nav">
        {MAIN_NAV.map(renderLink)}
        <div className="sidebar__section">Workspace</div>
        {workspace.map(renderLink)}
      </nav>

      <div className="sidebar__footer">
        <Dropdown
          align="start"
          placement="top"
          width={214}
          className="sidebar__user-dropdown"
          trigger={({ toggle, open: menuOpen }) => (
            <button type="button" className="sidebar__user" onClick={toggle} aria-expanded={menuOpen} aria-haspopup="menu">
              <Avatar name={user?.name} size="md" />
              <span className="sidebar__user-meta">
                <span className="sidebar__user-name truncate" style={{ display: "block" }}>
                  {user?.name}
                </span>
                <span className="sidebar__user-role">{ROLES[user?.role]}</span>
              </span>
            </button>
          )}
        >
          <MenuItem
            icon={UserCircle}
            onClick={() => {
              onNavigate?.();
              navigate("/profile");
            }}
          >
            Profile
          </MenuItem>
          <MenuItem
            icon={Settings}
            onClick={() => {
              onNavigate?.();
              navigate("/settings");
            }}
          >
            Settings
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={LogOut} onClick={logout}>
            Sign out
          </MenuItem>
        </Dropdown>
      </div>
    </aside>
  );
}
