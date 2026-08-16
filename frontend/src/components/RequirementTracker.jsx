import React from 'react';
import '../styles/dashboard.css';

const stages = [
  'Centre Head',
  'Cluster Manager',
  'Department Head',
  'Regional Head',
  'Director',
  'Chairperson',
  'Purchase Manager',
  'Accounts'
];

const RequirementTracker = ({ currentStage, status }) => {
  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="tracker-container">
      {stages.map((stage, index) => {
        let nodeClass = 'tracker-node';
        if (index < currentIndex || (index === currentIndex && status === 'Approved')) {
          nodeClass += ' completed';
        } else if (index === currentIndex && status === 'Pending') {
          nodeClass += ' active';
        } else if (index === currentIndex && status === 'Rejected') {
          nodeClass += ' rejected';
        }

        return (
          <React.Fragment key={stage}>
            <div className="tracker-step">
              <div className={nodeClass}></div>
              <span className="tracker-label">{stage}</span>
            </div>
            {index < stages.length - 1 && (
              <div className={`tracker-line ${index < currentIndex ? 'completed' : ''}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default RequirementTracker;
