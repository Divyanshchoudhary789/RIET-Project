import React, { useContext } from 'react';
import {
  FilePlus2,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import {
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/dashboard.css';

const DashboardLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isNewRequirementPage =
    location.pathname === '/dashboard/new-requirement';

  const isDashboardPage =
    location.pathname.startsWith('/dashboard/') &&
    !isNewRequirementPage;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const openDashboard = () => {
    if (user?.role === 'Centre Head') {
      navigate('/dashboard/centre-head');
      return;
    }

    const rolePathMap = {
      'Cluster Manager': '/dashboard/cluster-manager',
      'Department Head': '/dashboard/department-head',
      'Regional Head': '/regional-head',
      Director: '/dashboard/director',
      Chairperson: '/dashboard/chairperson',
      'Purchase Manager': '/dashboard/purchase-manager',
      Accounts: '/dashboard/accounts',
    };

    navigate(rolePathMap[user?.role] || '/login');
  };

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <button
          type="button"
          className="header-left header-brand-button"
          onClick={openDashboard}
          aria-label="Open dashboard"
        >
          <div className="dashboard-logo">
            <img
              src="/sapiens-logo.png"
              alt="Sapiens Group"
            />
          </div>

          <div className="brand-text">
            <span className="brand-title">
              SAPIENS GROUP
            </span>
            <span className="brand-subtitle">
              Campus Portal
            </span>
          </div>
        </button>

        <nav className="header-center">
          <button
            type="button"
            className={`nav-item ${
              isDashboardPage ? 'active' : ''
            }`}
            onClick={openDashboard}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          {user?.role === 'Centre Head' && (
            <button
              type="button"
              className={`nav-item ${
                isNewRequirementPage ? 'active' : ''
              }`}
              onClick={() =>
                navigate('/dashboard/new-requirement')
              }
            >
              <FilePlus2 size={18} />
              New Requirement
            </button>
          )}
        </nav>

        <div className="header-right">
          <div className="user-profile-info">
            <span className="user-email">
              {user?.email}
            </span>

           <span className="user-role-text">
  {user?.centreName
    ? `${user.centreName} · ${user.role}`
    : user?.role}
</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="logout-button"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
