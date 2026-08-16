import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import sapiensLogo from "../../assets/sapiens-logo-reference.png";
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  GitBranch,
  LogOut,
} from "lucide-react";

import { AuthContext } from "../../context/AuthContext";
import "./Sidebar.css";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, path: "/regional-head" },
  { label: "Notesheets", icon: FileText, path: "/regional-head/notesheets" },
  { label: "New Memo", icon: FilePlus, path: "/regional-head/new-memo" },
  { label: "Approval Flow", icon: GitBranch, path: "/regional-head/approval-flow" },
];

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="rh-sidebar">
      <div className="sidebar-logo">
       <div className="logo-circle">
  <img src={sapiensLogo} alt="Sapiens" />
</div>

        <div>
          <h2>Sapiens</h2>
          <span>REGIONAL HEAD</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={label}
            to={path}
            end={path === "/regional-head"}
            className={({ isActive }) => `sidebar-nav-link ${isActive ? "active" : ""}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>{user?.email || "regional@sapiens.edu"}</p>

        <button type="button" onClick={handleSignOut}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
