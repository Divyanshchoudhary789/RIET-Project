import React, { useState, useEffect } from 'react';
import { Check, X, Copy, Clock, CheckCircle2 } from 'lucide-react';
import RequirementTracker from '../../components/RequirementTracker';
import '../../styles/dashboard.css';

const ApproverDashboard = ({ roleName }) => {
  const [requirements, setRequirements] = useState([]);

  useEffect(() => {
    // Mock data for requirements awaiting this role's approval
    setRequirements([
      { 
        id: 1, 
        title: 'New Laptops for IT Lab', 
        type: 'Purchase Required', 
        status: 'Pending', 
        currentStage: roleName, 
        date: '2023-10-27',
        centreName: 'SGS Bharatpur',
        createdBy: 'John Centre'
      },
      { 
        id: 2, 
        title: 'Projector Maintenance', 
        type: 'Purchase Required', 
        status: 'Pending', 
        currentStage: roleName, 
        date: '2023-10-28',
        centreName: 'North Region',
        createdBy: 'Alice Dept'
      }
    ]);
  }, [roleName]);

  const handleAction = (id, action) => {
    setRequirements(prev => prev.filter(req => req.id !== id));
    // Simulate updating a local counter for presentation since we remove it from the 'Pending' queue
  };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <span className="page-subtitle">OVERVIEW</span>
        <h2 className="page-title">Welcome back</h2>
      </div>

      <div className="stats-row">
        <div className="stat-card border-blue">
          <div className="stat-header">
            <span className="stat-title">Total Assigned</span>
            <Copy size={18} className="stat-icon" />
          </div>
          <div className="stat-value">{requirements.length + 15}</div> {/* Mocked past numbers */}
        </div>
        <div className="stat-card border-yellow">
          <div className="stat-header">
            <span className="stat-title">Pending</span>
            <Clock size={18} className="stat-icon" />
          </div>
          <div className="stat-value">{requirements.length}</div>
        </div>
        <div className="stat-card border-green">
          <div className="stat-header">
            <span className="stat-title">Approved</span>
            <CheckCircle2 size={18} className="stat-icon" />
          </div>
          <div className="stat-value">15</div> {/* Mocked past approved */}
        </div>
      </div>

      <div className="panel full-width">
        <div className="panel-header space-between">
          <h3 className="panel-title-clean">Requirements Awaiting Action</h3>
          <span className="clean-badge">{requirements.length} total</span>
        </div>
        
        {requirements.length === 0 ? (
          <div className="empty-state">No requirements awaiting approval.</div>
        ) : (
          <div className="requirement-list">
            {requirements.map(req => (
              <div key={req.id} className="requirement-card detailed">
                <div className="req-header">
                  <div className="req-main">
                    <h4 className="req-title">{req.title}</h4>
                    <span className="req-type">{req.type}</span>
                  </div>
                  <div className="req-actions">
                    <button 
                      className="action-button approve" 
                      onClick={() => handleAction(req.id, 'Approved')}
                      title="Approve"
                    >
                      <Check size={18} /> Approve
                    </button>
                    <button 
                      className="action-button reject" 
                      onClick={() => handleAction(req.id, 'Rejected')}
                      title="Reject"
                    >
                      <X size={18} /> Reject
                    </button>
                  </div>
                </div>
                
                <div className="req-details">
                  <span className="detail-item"><strong>From:</strong> {req.createdBy} ({req.centreName})</span>
                  <span className="detail-item"><strong>Date:</strong> {req.date}</span>
                </div>

                <div className="tracker-wrapper">
                  <RequirementTracker currentStage={req.currentStage} status={req.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApproverDashboard;
