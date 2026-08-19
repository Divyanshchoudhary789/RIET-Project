import React from 'react';
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, Award, Clock, Package } from 'lucide-react';
import { formatDateTime } from '../utils/helpers';

const ACTION_CONFIG = {
  Submitted:  { icon: ArrowRight,   color: '#2563eb', label: 'Submitted' },
  Forwarded:  { icon: ArrowRight,   color: '#7c3aed', label: 'Forwarded' },
  Rejected:   { icon: XCircle,      color: '#dc2626', label: 'Rejected' },
  Approved:   { icon: CheckCircle2, color: '#16a34a', label: 'Approved' },
  Revised:    { icon: RefreshCw,    color: '#d97706', label: 'Revised' },
  Created:    { icon: ArrowRight,   color: '#2563eb', label: 'Created' },
  Received:   { icon: Package,      color: '#16a34a', label: 'Received' },
  Closed:     { icon: CheckCircle2, color: '#0f766e', label: 'Closed' },
};

const Timeline = ({ entries = [] }) => {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>
        No timeline entries yet.
      </div>
    );
  }

  return (
    <div className="timeline">
      {entries.map((entry, idx) => {
        const config = ACTION_CONFIG[entry.action] || { icon: Clock, color: '#64748b', label: entry.action };
        const Icon = config.icon;
        const isLast = idx === entries.length - 1;

        return (
          <div key={entry._id || idx} className="timeline-entry">
            <div className="timeline-left">
              <div className="timeline-dot" style={{ borderColor: config.color, background: `${config.color}15` }}>
                <Icon size={13} color={config.color} />
              </div>
              {!isLast && <div className="timeline-line" />}
            </div>

            <div className="timeline-body">
              <div className="timeline-action" style={{ color: config.color }}>
                {config.label}
              </div>
              <div className="timeline-actor">
                {entry.actorRole || 'System'}
                {entry.actor?.name && ` · ${entry.actor.name}`}
              </div>
              {entry.note && (
                <div className="timeline-note">"{entry.note}"</div>
              )}
              <div className="timeline-time">{formatDateTime(entry.timestamp)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
