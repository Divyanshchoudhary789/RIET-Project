import React, { useContext } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  GitBranch,
  LogOut,
  GraduationCap,
} from "lucide-react";

import { AuthContext } from "../../context/AuthContext";
import "./regional-head.css";

const NAV_ITEMS = [
  {
    label: "Overview",
    path: "/regional-head",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Notesheets",
    path: "/regional-head/notesheets",
    icon: FileText,
    end: false,
  },
  {
    label: "New Memo",
    path: "/regional-head/new-memo",
    icon: FilePlus2,
    end: false,
  },
  {
    label: "Approval Flow",
    path: "/regional-head/approval-flow",
    icon: GitBranch,
    end: false,
  },
];

const RegionalLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="rh-layout">

      {/* ================= SIDEBAR ================= */}
      <aside className="rh-sidebar">

        {/* Brand */}
        <div className="rh-sidebar-brand">
          <div className="rh-brand-logo">
            <GraduationCap size={24} />
          </div>
          <div className="rh-brand-text">
            <div className="rh-brand-name">Sapiens</div>
            <div className="rh-brand-role">REGIONAL HEAD</div>
          </div>
        </div>


        {/* Navigation */}
        <nav className="rh-sidebar-nav">
          {NAV_ITEMS.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `rh-nav-item${isActive ? " rh-nav-item-active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>


        {/* Bottom */}
        <div className="rh-sidebar-bottom">
          <div className="rh-user-email">
            {user?.email || "regional@sapiens.edu"}
          </div>

          <button
            type="button"
            className="rh-signout-button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>

      </aside>


      {/* ================= MAIN CONTENT ================= */}
      <main className="rh-main">
        <Outlet />
      </main>

    </div>
  );
};

export default RegionalLayout;
