import React from "react";
import { ArrowRight } from "lucide-react";

const RecentNotesheets = () => {
  return (
    <div className="recent-card">

      <div className="section-header">
        <h3>Recent notesheets</h3>

        <button className="view-all-btn">
          View all
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="empty-state">

        <div className="empty-icon">
          📄
        </div>

        <h4>No notesheets yet</h4>

        <p>
          Notesheets received from department heads
          will appear here.
        </p>

      </div>

    </div>
  );
};

export default RecentNotesheets;
