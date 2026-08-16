import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Copy,
  FilePlus2,
  PackageOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../styles/dashboard.css';

const CentreHeadDashboard = () => {
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState([]);

  const loadRequirements = () => {
    try {
      const savedRequirements = JSON.parse(
        localStorage.getItem('centreRequirements') || '[]'
      );

      setRequirements(savedRequirements);
    } catch (error) {
      console.error('Could not read requirements:', error);
      setRequirements([]);
    }
  };

  useEffect(() => {
    loadRequirements();

    const handleStorageUpdate = () => {
      loadRequirements();
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener(
      'requirementsUpdated',
      handleStorageUpdate
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorageUpdate
      );
      window.removeEventListener(
        'requirementsUpdated',
        handleStorageUpdate
      );
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: requirements.length,
      pending: requirements.filter(
        (requirement) => requirement.status === 'Pending'
      ).length,
      approved: requirements.filter(
        (requirement) => requirement.status === 'Approved'
      ).length,
    };
  }, [requirements]);

  const formatDate = (dateValue) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateValue));
  };

  return (
    <section className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="page-subtitle">OVERVIEW</span>
          <h1 className="page-title">Welcome back</h1>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="primary-button-dark"
            onClick={() =>
              navigate('/dashboard/new-requirement')
            }
          >
            <FilePlus2 size={19} />
            New Requirement
          </button>
        </div>
      </div>

      <div className="stats-row">
        <article className="stat-card border-blue">
          <div className="stat-header">
            <span className="stat-title">
              Total Generated
            </span>
            <Copy size={21} className="stat-icon" />
          </div>

          <div className="stat-value">{stats.total}</div>
        </article>

        <article className="stat-card border-yellow">
          <div className="stat-header">
            <span className="stat-title">Pending</span>
            <Clock3 size={21} className="stat-icon" />
          </div>

          <div className="stat-value">{stats.pending}</div>
        </article>

        <article className="stat-card border-green">
          <div className="stat-header">
            <span className="stat-title">Approved</span>
            <CheckCircle2
              size={21}
              className="stat-icon"
            />
          </div>

          <div className="stat-value">{stats.approved}</div>
        </article>
      </div>

      <section className="panel recent-requirements-panel">
        <div className="panel-header space-between">
          <h2 className="panel-title-clean">
            Recent Requirements
          </h2>

          <span className="clean-badge">
            {requirements.length} total
          </span>
        </div>

        {requirements.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="empty-state-icon">
              <PackageOpen size={28} />
            </div>

            <p>No requirements yet.</p>

            <button
              type="button"
              onClick={() =>
                navigate('/dashboard/new-requirement')
              }
            >
              Generate your first requirement
            </button>
          </div>
        ) : (
          <div className="recent-requirements-list">
            {requirements.slice(0, 5).map((requirement) => (
              <article
                className="recent-requirement-row"
                key={requirement.id}
              >
                <div className="recent-requirement-main">
                  <div className="requirement-list-icon">
                    <FilePlus2 size={19} />
                  </div>

                  <div>
                    <h3>{requirement.title}</h3>

                    <p>
                      {requirement.items.length}{' '}
                      {requirement.items.length === 1
                        ? 'item'
                        : 'items'}{' '}
                      · {requirement.scope} ·{' '}
                      {formatDate(requirement.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="recent-requirement-meta">
                  {!requirement.alreadyInStock && (
                    <span className="requirement-amount">
                      ₹
                      {Number(
                        requirement.totalEstimation || 0
                      ).toLocaleString('en-IN')}
                    </span>
                  )}

                  <span
                    className={`requirement-status requirement-status-${requirement.status.toLowerCase()}`}
                  >
                    {requirement.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
};

export default CentreHeadDashboard;
