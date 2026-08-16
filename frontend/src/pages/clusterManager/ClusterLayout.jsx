import React, { useContext } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus2,
  LogOut,
  GraduationCap,
} from "lucide-react";

import { AuthContext } from "../../context/AuthContext";
import "../../styles/cluster-manager.css";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/cluster-manager",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "New Work proposal",
    path: "/cluster-manager/new-proposal",
    icon: FilePlus2,
    end: false,
  },
];

const ClusterLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="cm-layout">

      {/* SIDEBAR */}
      <aside className="cm-sidebar">

        {/* Brand Header */}
        <div className="cm-sidebar-brand">
          <div className="cm-brand-logo">
            <GraduationCap size={22} />
          </div>
          <div className="cm-brand-text">
            <div className="cm-brand-name">
              Sapiens Group of Institutes
            </div>
            <div className="cm-brand-role">
              CLUSTER MANAGER PORTAL
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="cm-sidebar-nav">
          {NAV_ITEMS.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `cm-nav-item${isActive ? " cm-nav-item-active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom signout */}
        <div className="cm-sidebar-bottom">
          <button
            type="button"
            className="cm-signout-button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="cm-main">
        <Outlet />
      </main>

    </div>
  );
};

export default ClusterLayout;
