import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, LayoutDashboard, LogOut, Menu, X,
  FilePlus2, FileText, Users, Building2, Briefcase,
  ClipboardList, Package, ShoppingCart, BarChart2,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel, getDashboardPath, timeAgo } from '../utils/helpers';
import useSocketEvent from '../hooks/useSocketEvent';
import api from '../utils/api';
import '../styles/layout.css';

const NAV_CONFIG = {
  center_head: [
    { label: 'Dashboard', path: '/center-head', icon: LayoutDashboard, end: true },
    { label: 'New Requirement', path: '/center-head/new-requirement', icon: FilePlus2 },
    { label: 'My Requirements', path: '/center-head/requirements', icon: FileText },
    { label: 'Stock', path: '/center-head/stock', icon: Package },
  ],
  cluster_manager: [
    { label: 'Dashboard', path: '/cluster-manager', icon: LayoutDashboard, end: true },
    { label: 'Requirements', path: '/cluster-manager/requirements', icon: FileText },
    { label: 'Work Proposals', path: '/cluster-manager/proposals', icon: ClipboardList },
    { label: 'Stock View', path: '/cluster-manager/stock', icon: Package },
  ],
  department_admin: [
    { label: 'Dashboard', path: '/department-admin', icon: LayoutDashboard, end: true },
    { label: 'Work Proposals', path: '/department-admin/proposals', icon: ClipboardList },
    { label: 'Assessments', path: '/department-admin/assessments', icon: FileCheck },
    { label: 'Stock', path: '/department-admin/stock', icon: Package },
  ],
  director: [
    { label: 'Dashboard', path: '/director', icon: LayoutDashboard, end: true },
    { label: 'Assessments', path: '/director/assessments', icon: FileCheck },
    { label: 'Notesheets', path: '/director/notesheets', icon: FileText },
    { label: 'Memos', path: '/director/memos', icon: Briefcase },
    { label: 'Campuses', path: '/director/campuses', icon: Building2 },
    { label: 'Departments', path: '/director/departments', icon: BarChart2 },
    { label: 'Users', path: '/director/users', icon: Users },
    { label: 'Stock', path: '/director/stock', icon: Package },
  ],
  po_office: [
    { label: 'Dashboard', path: '/po-office', icon: LayoutDashboard, end: true },
    { label: 'Assessments', path: '/po-office/assessments', icon: FileCheck },
    { label: 'Notesheets', path: '/po-office/notesheets', icon: FileText },
  ],
  chairperson: [
    { label: 'Dashboard', path: '/chairperson', icon: LayoutDashboard, end: true },
    { label: 'Memos', path: '/chairperson/memos', icon: Briefcase },
    { label: 'Campuses', path: '/chairperson/campuses', icon: Building2 },
    { label: 'Departments', path: '/chairperson/departments', icon: BarChart2 },
    { label: 'Users', path: '/chairperson/users', icon: Users },
    { label: 'Stock', path: '/chairperson/stock', icon: Package },
  ],
  accounts: [
    { label: 'Dashboard', path: '/accounts', icon: LayoutDashboard, end: true },
    { label: 'Memos', path: '/accounts/memos', icon: Briefcase },
    { label: 'Purchase Orders', path: '/accounts/purchase-orders', icon: ShoppingCart },
    { label: 'Stock', path: '/accounts/stock', icon: Package },
  ],
};

const NOTIF_NAV_MAP = {
  Requirement:    (id, role) => {
    const paths = { center_head: '/center-head/requirements', cluster_manager: '/cluster-manager/requirements' };
    return paths[role] || null;
  },
  WorkProposal:   (id, role) => {
    const paths = { cluster_manager: '/cluster-manager/proposals', department_admin: '/department-admin/proposals' };
    return paths[role] || null;
  },
  Assessment:     (id, role) => {
    const paths = { department_admin: '/department-admin/assessments', director: '/director/assessments', po_office: '/po-office/assessments' };
    return paths[role] || null;
  },
  Notesheet:      (id, role) => {
    const paths = { po_office: '/po-office/notesheets', director: '/director/notesheets' };
    return paths[role] || null;
  },
  Memo:           (id, role) => {
    const paths = { accounts: '/accounts/memos', chairperson: '/chairperson/memos', director: '/director/memos' };
    return paths[role] || null;
  },
  PurchaseOrder:  (id) => id ? `/accounts/purchase-orders/${id}` : '/accounts/purchase-orders',
};

const NotificationPanel = ({ onClose, userRole }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get('/api/notifications?limit=15');
        setNotifications(r.data.data || []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications/mark-all-read');
      setNotifications((p) => p.map((n) => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  const handleNotifClick = async (n) => {
    // Mark as read if unread
    if (!n.isRead) {
      try {
        await api.patch(`/api/notifications/${n._id}/read`);
        setNotifications((p) => p.map((x) => x._id === n._id ? { ...x, isRead: true } : x));
      } catch { /* ignore */ }
    }
    // Navigate to the document
    if (n.documentType && n.documentId) {
      const navFn = NOTIF_NAV_MAP[n.documentType];
      if (navFn) {
        const path = navFn(n.documentId, userRole);
        if (path) { onClose(); navigate(path); return; }
      }
    }
    onClose();
  };

  return (
    <div className="notif-panel" ref={ref}>
      <div className="notif-panel-header">
        <span className="notif-panel-title">Notifications</span>
        <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
      </div>
      <div className="notif-list">
        {loading ? (
          <div className="notif-loading"><span className="spinner spinner-sm" /></div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">No notifications</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              className={`notif-item${n.isRead ? '' : ' notif-item-unread'}`}
              onClick={() => handleNotifClick(n)}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleNotifClick(n)}
            >
              <div className="notif-item-title">{n.title}</div>
              <div className="notif-item-msg">{n.message}</div>
              <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = NAV_CONFIG[user?.role] || [];

  // Derive topbar title reactively from current pathname
  const currentTitle = (() => {
    const path = location.pathname;
    // exact match first
    const exact = navItems.find((n) => n.end ? path === n.path : path.startsWith(n.path));
    return exact?.label || 'Dashboard';
  })();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const r = await api.get('/api/notifications/unread-count');
        setUnreadCount(r.data.data?.unreadCount || 0);
      } catch { /* ignore */ }
    };
    fetchCount();
  }, []);

  // Increment badge on every new notification — works even if socket connected after mount
  useSocketEvent('notification:new', () => {
    setUnreadCount((c) => c + 1);
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <img src="/sapiens-logo.png" alt="RIET" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">RIET</span>
            <span className="sidebar-brand-role">{getRoleLabel(user?.role)}</span>
          </div>
          <button className="sidebar-close show-mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title="Sign out" aria-label="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <button className="topbar-menu show-mobile-only" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="topbar-title">
            {currentTitle}
          </div>

          <div className="topbar-actions">
            <div className="notif-wrapper">
              <button
                className="topbar-icon-btn"
                onClick={() => { setNotifOpen((p) => !p); if (!notifOpen) setUnreadCount(0); }}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} userRole={user?.role} />}
            </div>

            <button className="topbar-icon-btn hide-mobile" onClick={handleLogout} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
